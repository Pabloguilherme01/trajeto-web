import { describe, expect, it } from "vitest";
import { phoneHref } from "./contactActions";
import {
  PUBLIC_SERVICES,
  PUBLIC_SERVICE_SHORTCUTS,
  searchPublicServices,
} from "./publicServices";

describe("public services catalog", () => {
  it.each([
    ["Receita Federal", "receita-federal-pav"],
    ["CPF", "receita-federal-pav"],
    ["CNPJ", "receita-federal-pav"],
    ["imposto de renda", "receita-federal-pav"],
    ["Defesa Civil", "defesa-civil"],
    ["alagamento", "defesa-civil"],
    ["enchente", "defesa-civil"],
    ["desabamento", "defesa-civil"],
    ["risco estrutural", "defesa-civil"],
  ])("finds %s without adding a route to its service", (query, id) => {
    const results = searchPublicServices(query);
    expect(results.map(item => item.id)).toEqual([id]);
    expect(results[0].mapQuery).toBeUndefined();
    expect(results[0].address).toBeUndefined();
  });
  it("finds serviços without accents and retains category filtering", () => {
    expect(
      searchPublicServices("informacao cidadao", "cidadania").map(
        service => service.id
      )
    ).toContain("sic");
    expect(searchPublicServices("informacao cidadao", "saude")).toEqual([]);
  });
  it("finds everyday needs and all shortcut queries locally", () => {
    expect(
      searchPublicServices("segunda via da conta de agua").map(item => item.id)
    ).toEqual(["saneago"]);
    expect(searchPublicServices("falta de luz").map(item => item.id)).toEqual([
      "energia",
    ]);
    expect(
      searchPublicServices("atualizar cad unico").map(item => item.id)
    ).toEqual(["cadunico"]);
    expect(
      searchPublicServices("bolsa familia", "assistencia").map(item => item.id)
    ).toContain("cadunico");
    expect(searchPublicServices("bolsa familia", "saude")).toEqual([]);
    expect(searchPublicServices("saude mental").map(item => item.id)).toEqual([
      "caps",
    ]);
    expect(searchPublicServices("cras").map(item => item.id)).toEqual([
      "cras-1",
      "cras-2",
      "cras-3",
    ]);
    for (const shortcut of PUBLIC_SERVICE_SHORTCUTS)
      expect(searchPublicServices(shortcut.query).length).toBeGreaterThan(0);
  });
  it.each([
    ["vacina", "unidades-saude"],
    ["matricula", "secretaria-educacao"],
    ["emprego", "vapt-vupt"],
    ["sine", "vapt-vupt"],
    ["cnh", "detran"],
    ["licenciamento", "detran"],
  ])("maps citizen intent %s to an existing official service", (query, id) => {
    expect(searchPublicServices(query).map(item => item.id)).toContain(id);
  });

  it("keeps every call action a single number and includes official support channels", () => {
    for (const service of PUBLIC_SERVICES) {
      if (service.phone)
        expect(phoneHref(service.phone)).toMatch(/^tel:(?:\d{3}|\d{10,11})$/);
      expect(service.sourceUrl.startsWith("https://")).toBe(true);
    }
    expect(phoneHref("190 / 193")).toBe("tel:190");
    expect(phoneHref("00000-0000")).toBeNull();
    const health = PUBLIC_SERVICES.find(service => service.id === "secretaria-saude")!;
    expect(health.phone).toBe("(61) 3618-4096 / (61) 99227-7937");
    expect(health.verifiedAt).toBe("01/10/2026");
    const vapt = PUBLIC_SERVICES.find(service => service.id === "vapt-vupt")!;
    expect(vapt.address).toContain("Rua Um, 2210");
    expect(vapt.actionLabel).toBe("Agendar atendimento");
    expect(
      PUBLIC_SERVICES.find(service => service.id === "ouvidoria-municipal")
        ?.email
    ).toBe("ouvidoria@aguaslindasdegoias.go.gov.br");
  });
  it("keeps essential Águas Lindas services locally available", () => {
    expect(
      PUBLIC_SERVICES.some(item => item.id === "upa-mansoes-odisseia")
    ).toBe(true);
    expect(PUBLIC_SERVICES.some(item => item.id === "hospital-bom-jesus")).toBe(
      true
    );
    const bomJesus = PUBLIC_SERVICES.find(item => item.id === "hospital-bom-jesus")!;
    expect(bomJesus.sourceLabel).toBe("CNES/DATASUS");
    expect(bomJesus.verifiedAt).toBe("01/10/2026");
    expect(bomJesus.hours).toMatch(/confirmar/i);
    expect(bomJesus.guidance).toMatch(/temporariamente por reforma/i);
    const caps = PUBLIC_SERVICES.find(item => item.id === "caps");
    expect(caps?.phone).toBe("(61) 3618-1559");
    expect(caps?.verifiedAt).toBe("01/10/2026");
    expect(caps?.sourceUrl).toContain("caps-centro-de-atencao-psicossocial");
    expect(PUBLIC_SERVICES.some(item => item.id === "prefeitura")).toBe(true);
    expect(PUBLIC_SERVICES.some(item => item.id === "policia-civil-1")).toBe(
      true
    );
    const regional = PUBLIC_SERVICES.find(item => item.id === "pcgo-17-drp")!;
    expect(regional.address).toContain("Quadra 27, Rua 22");
    expect(regional.address).toContain("Parque Águas Bonitas I");
    expect(regional.phone).toBe("(61) 3613-4160");
    expect(regional.verifiedAt).toBe("01/10/2026");
    expect(regional.sourceUrl).toContain("delegacias-regionais");
    const firstDp = PUBLIC_SERVICES.find(item => item.id === "policia-civil-1")!;
    expect(firstDp.address).toContain("Rua Adélia");
  });
  it("includes verified national protection and utility channels without fictitious routes", () => {
    for (const [id, number] of [
      ["ligue-180", "180"],
      ["disque-100", "100"],
      ["energia", "0800 062 0196"],
      ["saneago", "0800 645 0115"],
    ]) {
      const service = PUBLIC_SERVICES.find(item => item.id === id)!;
      expect(service.phone).toBe(number);
      expect(service.verifiedAt).toBe("01/10/2026");
      expect(service.mapQuery).toBeUndefined();
      expect(service.actionUrl).toMatch(/^https:\/\//);
    }
    expect(new Set(PUBLIC_SERVICES.map(item => item.id)).size).toBe(
      PUBLIC_SERVICES.length
    );
  });

  it("filters by category and text without case sensitivity", () => {
    expect(
      searchPublicServices("cora coralina", "educacao").map(item => item.id)
    ).toContain("coralina");
    expect(
      searchPublicServices("upa", "saude").some(
        item => item.id === "upa-mansoes-odisseia"
      )
    ).toBe(true);
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
    expect(searchPublicServices("defesa civil").map(item => item.id)).toContain(
      "defesa-civil"
    );
  });

  it("offers official work and pension channels without a fictitious local route", () => {
    const work = searchPublicServices("ctps")[0];
    expect(work.phone).toBe("158");
    expect(work.sourceUrl).toContain(
      "gov.br/pt-br/servicos/obter-a-carteira-de-trabalho"
    );
    const inss = searchPublicServices("cnis")[0];
    expect(inss.phone).toBe("135");
    expect(inss.actionUrl).toBe("https://meu.inss.gov.br/");
    for (const item of [
      work,
      inss,
      PUBLIC_SERVICES.find(item => item.id === "defesa-civil")!,
    ])
      expect(item.mapQuery).toBeUndefined();
  });
});
