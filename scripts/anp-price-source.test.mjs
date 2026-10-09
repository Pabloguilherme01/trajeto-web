import { test } from "node:test";
import assert from "node:assert/strict";
import { selectWeeklyPriceSource, isAguasLindasPriceRow, findWeeklyPriceHeader, normalizeAnpCnpj } from "./anp-price-source.mjs";
const page = "https://www.gov.br/anp/pt-br/precos";

test("selects the newest dated workbook and derives its own period", () => {
  const html = '20/09/2026 a 26/09/2026 <a href="/anp/semanal-postos-2026-09-20_2026-09-26.xlsx">old</a><a href="/anp/semanal-postos-2026-09-27_2026-10-03.xlsx?download=1&amp;x=2">new</a>';
  assert.deepEqual(selectWeeklyPriceSource(html, page), {
    sourceUrl: "https://www.gov.br/anp/semanal-postos-2026-09-27_2026-10-03.xlsx?download=1&x=2",
    referencePeriod: "27/09/2026 a 03/10/2026",
  });
});
test("rejects unknown periods, impossible or reversed dates and unrelated hosts", () => {
  for (const href of ["/precos.xlsx", "/postos-2026-02-30_2026-03-06.xlsx", "/postos-2026-10-03_2026-09-27.xlsx", "https://example.org/postos-2026-09-27_2026-10-03.xlsx"]) {
    assert.throws(() => selectWeeklyPriceSource(`<a href="${href}">file</a>`, page), /período verificável/);
  }
});
test("requires both the correct municipality and state; missing columns cannot import national prices", () => {
  assert.equal(isAguasLindasPriceRow(" go ", "Águas Lindas de Goiás"), true);
  for (const [uf, city] of [["", "Águas Lindas de Goiás"], ["GO", ""], ["DF", "Águas Lindas de Goiás"], ["GO", "Não Águas Lindas de Goiás"], ["GO", "Goiânia"]]) {
    assert.equal(isAguasLindasPriceRow(uf, city), false);
  }
});

// The current ANP page publishes a summary before the individual-reseller file.
test("recognizes the real ANP revendas filename and never selects the aggregate summary", () => {
  const base = "https://www.gov.br/anp/pt-br/assuntos/precos-e-defesa-da-concorrencia/precos/arquivos-lpc/2026/";
  const html = `<a href="${base}resumo_semanal_lpc_2026-09-27_2026-10-03.xlsx">summary</a><a href="${base}revendas_lpc_2026-09-27_2026-10-03.xlsx">stations</a>`;
  assert.equal(selectWeeklyPriceSource(html, page).sourceUrl, base + "revendas_lpc_2026-09-27_2026-10-03.xlsx");
  assert.throws(() => selectWeeklyPriceSource(html.split("</a>")[0] + "</a>", page));
});
test("recognizes a dated workbook followed by a Plone download path", () => {
  const url = "https://www.gov.br/anp/revendas_lpc_2026-09-27_2026-10-03.xlsx/@@download/file";
  assert.equal(selectWeeklyPriceSource(`<a href="${url}">file</a>`, page).sourceUrl, url);
});

test("finds the reseller header after the report cover rows", () => {
  const rows = [["AGÊNCIA NACIONAL DO PETRÓLEO"], ["PERÍODO: 27/09/2026 A 03/10/2026"], [], ["CNPJ", "RAZÃO", "MUNICÍPIO", "ESTADO", "PRODUTO", "PREÇO DE REVENDA"]];
  assert.equal(findWeeklyPriceHeader(rows), 3);
});
test("rejects unrecognized or aggregate headers before changing the snapshot", () => {
  assert.throws(() => findWeeklyPriceHeader([["MUNICÍPIO", "ESTADO", "PRODUTO", "PREÇO MÉDIO"]]), /snapshot preservado/);
});

test("accepts the full state name published in the ANP report", () => {
  assert.equal(isAguasLindasPriceRow("GOIAS", "AGUAS LINDAS DE GOIAS"), true);
  assert.equal(isAguasLindasPriceRow("Goiás", "Águas Lindas de Goiás"), true);
  assert.equal(isAguasLindasPriceRow("MINAS GERAIS", "Águas Lindas de Goiás"), false);
});
test("restores leading zeroes only for numeric Excel CNPJs", () => {
  assert.equal(normalizeAnpCnpj(2316635000128), "02316635000128");
  assert.equal(normalizeAnpCnpj("02.316.635/0001-28"), "02316635000128");
  for (const value of ["2316635000128", null, 0, "00000000000000", -1, 1.5, Number.MAX_SAFE_INTEGER + 1, "unknown"]) assert.equal(normalizeAnpCnpj(value), "");
});
