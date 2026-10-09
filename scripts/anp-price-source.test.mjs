import { test } from "node:test";
import assert from "node:assert/strict";
import { selectWeeklyPriceSource, isAguasLindasPriceRow } from "./anp-price-source.mjs";
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
