// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { csvCell, downloadCsvFile, serializeSemicolonCsv } from "./csvSerialization";

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  delete (URL as any).createObjectURL;
  delete (URL as any).revokeObjectURL;
});

it("preserves BOM, semicolons, embedded quotes, line breaks and empty cells", () => {
  expect(csvCell('Loja "Centro"; A')).toBe('"Loja ""Centro""; A"');
  expect(csvCell(null)).toBe('""');
  expect(csvCell(0)).toBe('"0"');
  expect(serializeSemicolonCsv([
    ["nome", "telefone", "bairro"],
    ['Loja "Centro"; A', null, "Jardim\nSul"],
  ])).toBe('\uFEFF"nome";"telefone";"bairro"\n"Loja ""Centro""; A";"";"Jardim\nSul"');
});

it("initiates a CSV download before releasing its blob URL, including on slow devices", () => {
  vi.useFakeTimers();
  const create = vi.fn().mockReturnValue("blob:trajeto/csv");
  const revoke = vi.fn();
  Object.defineProperty(URL, "createObjectURL", { configurable: true, value: create });
  Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: revoke });
  let connectedDuringClick = false;
  const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
    connectedDuringClick = document.body.contains(this);
    expect(this.download).toBe("trajeto-postos.csv");
  });
  downloadCsvFile(serializeSemicolonCsv([["Posto A"]]), "trajeto-postos.csv");
  expect(create).toHaveBeenCalledOnce();
  expect(click).toHaveBeenCalledOnce();
  expect(connectedDuringClick).toBe(true);
  expect(revoke).not.toHaveBeenCalled();
  vi.advanceTimersByTime(1000);
  expect(revoke).toHaveBeenCalledWith("blob:trajeto/csv");
  expect(document.querySelector('a[download="trajeto-postos.csv"]')).toBeNull();
});
