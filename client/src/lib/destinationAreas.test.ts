import { describe, expect, it } from "vitest";
import { DESTINATION_AREAS, destinationAreaLabel, mentionsDestinationArea, readDestinationArea } from "./destinationAreas";

describe("municipal neighborhood/sector refinements", () => {
  const area = DESTINATION_AREAS.find(item => item.name === "Jardim Brasília");
  it("uses only named, sourced municipal area entries", () => {
    expect(DESTINATION_AREAS.length).toBeGreaterThanOrEqual(60);
    expect(area?.id).toBe("bairro-jardim-brasilia");
    expect(readDestinationArea(area?.id)).toBe(area?.id);
    expect(destinationAreaLabel(area!.id)).toBe("Jardim Brasília");
    expect(readDestinationArea("coordenadas-do-usuario")).toBe("");
    expect(readDestinationArea(null)).toBe("");
  });
  it("matches public address mentions without guessing geographic boundaries", () => {
    expect(mentionsDestinationArea(area!.id, "CRAS, Q 53, Jardim Brasília, GO")).toBe(true);
    expect(mentionsDestinationArea(area!.id, "UPA, outro bairro")).toBe(false);
    expect(mentionsDestinationArea(area!.id, "sem endereço")).toBe(false);
    expect(mentionsDestinationArea("", "qualquer destino")).toBe(true);
    expect(mentionsDestinationArea("bairro-nao-existe", "qualquer destino")).toBe(false);
  });
  it("does not confuse numbered sectors", () => {
    const first = DESTINATION_AREAS.find(item => item.name === "Setor 02");
    expect(first).toBeTruthy();
    expect(mentionsDestinationArea(first!.id, "Setor 02, Águas Lindas")).toBe(true);
    expect(mentionsDestinationArea(first!.id, "Setor 020, Águas Lindas")).toBe(false);
  });
});
