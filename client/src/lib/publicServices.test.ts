import { describe, expect, it } from "vitest";
import { phoneHref } from "./contactActions";
import { PUBLIC_SERVICES, PUBLIC_SERVICE_SHORTCUTS, searchPublicServices } from "./publicServices";

describe("public services catalog", () => {
  it("finds serviços without accents and retains category filtering", () => {
    expect(searchPublicServices("informacao cidadao", "cidadania").map(service => service.id)).toContain("sic");
    expect(searchPublicServices("informacao cidadao", "saude")).toEqual([]);
  });
  it("finds everyday needs and all shortcut queries locally", () => {
    expect(searchPublicServices("segunda via da conta de agua").map(item => item.id)).toEqual(["saneago"]);
    expect(searchPublicServices("falta de luz").map(item => item.id)).toEqual(["energia"]);
    expect(searchPublicServices("atualizar cad unico").map(item => item.id)).toEqual(["cadunico"]);
    expect(searchPublicServices("bolsa familia", "assistencia").map(item => item.id)).toContain("cadunico");
    expect(searchPublicServices("bolsa familia", "saude")).toEqual([]);
    expect(searchPublicServices("cras").map(item => item.id)).toEqual(["cras-1", "cras-2", "cras-3"]);
    for (const shortcut of PUBLIC_SERVICE_SHORTCUTS) expect(searchPublicServices(shortcut.query).length).toBeGreaterThan(0);
  });
  it("keeps every call action a single number and includes official support channels", () => {
    for (const service of PUBLIC_SERVICES) {
      if (service.phone) expect(phoneHref(service.phone)).toMatch(/^tel:(?:\d{3}|\d{10,11})$/);
      expect(service.sourceUrl.startsWith("https://")).toBe(true);
    }
    expect(phoneHref("190 / 193")).toBe("tel:190");
    expect(phoneHref("00000-0000")).toBeNull();
    const vapt = PUBLIC_SERVICES.find(service => service.id === "vapt-vupt")!;
    expect(vapt.address).toContain("Rua Um, 2210");
    expect(vapt.actionLabel).toBe("Agendar atendimento");
    expect(PUBLIC_SERVICES.find(service => service.id === "ouvidoria-municipal")?.email).toBe("ouvidoria@aguaslindasdegoias.go.gov.br");
  });
  it("keeps essential Águas Lindas services locally available", () => {
    expect(PUBLIC_SERVICES.some(item => item.id === "upa-mansoes-odisseia")).toBe(true);
    expect(PUBLIC_SERVICES.some(item => item.id === "hospital-bom-jesus")).toBe(true);
    expect(PUBLIC_SERVICES.some(item => item.id === "prefeitura")).toBe(true);
    expect(PUBLIC_SERVICES.some(item => item.id === "policia-civil-1")).toBe(true);
  });
  it("includes verified national protection and utility channels without fictitious routes", () => {
    for (const [id, number] of [["ligue-180", "180"], ["disque-100", "100"], ["energia", "0800 062 0196"], ["saneago", "0800 645 0115"]]) {
      const service = PUBLIC_SERVICES.find(item => item.id === id)!;
      expect(service.phone).toBe(number);
      expect(service.verifiedAt).toBe("01/10/2026");
      expect(service.mapQuery).toBeUndefined();
      expect(service.actionUrl).toMatch(/^https:\/\//);
    }
    expect(new Set(PUBLIC_SERVICES.map(item => item.id)).size).toBe(PUBLIC_SERVICES.length);
  });

  it("filters by category and text without case sensitivity", () => {
    expect(searchPublicServices("cora coralina", "educacao").map(item => item.id)).toContain("coralina");
    expect(searchPublicServices("upa", "saude").some(item => item.id === "upa-mansoes-odisseia")).toBe(true);
    expect(searchPublicServices("nao existe", "todos")).toEqual([]);
  });
  it("covers verified federal tax help and emergency intent without inventing local details", () => {
    const receita = searchPublicServices("receita federal")[0];
    expect(receita.id).toBe("receita-federal-pav");
    expect(receita.sourceLabel).toBe("Receita Federal");
    expect(receita.sourceUrl).toContain("gov.br/receitafederal");
    expect(receita.verifiedAt).toBe("01/10/2026");
    expect(receita.address).toBeUndefined();
    expect(receita.phone).toBeUndefined();
    expect(receita.mapQuery).toBeUndefined();
    expect(searchPublicServices("defesa civil").map(item => item.id)).toContain("defesa-civil");
  });

  it("offers official work and pension channels without a fictitious local route", () => {
    const work = searchPublicServices("ctps")[0];
    expect(work.phone).toBe("158");
    expect(work.sourceUrl).toContain("gov.br/pt-br/servicos/obter-a-carteira-de-trabalho");
    const inss = searchPublicServices("cnis")[0];
    expect(inss.phone).toBe("135");
    expect(inss.actionUrl).toBe("https://meu.inss.gov.br/");
    for (const item of [work, inss, PUBLIC_SERVICES.find(item => item.id === "defesa-civil")!]) expect(item.mapQuery).toBeUndefined();
  });
});
