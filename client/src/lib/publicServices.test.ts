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
  it("keeps short acronym searches focused on explicit service metadata", () => {
    expect(searchPublicServices("CPF").map(item => item.id)).toEqual(["receita-federal-pav"]);
    expect(searchPublicServices("CPF").some(item => item.id === "id-jovem")).toBe(false);
    expect(searchPublicServices("MEI").map(item => item.id)).toEqual(
      expect.arrayContaining(["sala-empreendedor", "portal-empreendedor-mei"])
    );
  });

  it("finds both Receita Federal and REDESIM for CNPJ without inventing a local route", () => {
    const results = searchPublicServices("CNPJ");
    expect(results.map(item => item.id)).toEqual(
      expect.arrayContaining(["receita-federal-pav", "abrir-cnpj-redesim"])
    );
    expect(results.every(item => item.mapQuery === undefined && item.address === undefined)).toBe(true);
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
    const health = PUBLIC_SERVICES.find(
      service => service.id === "secretaria-saude"
    )!;
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
    const bomJesus = PUBLIC_SERVICES.find(
      item => item.id === "hospital-bom-jesus"
    )!;
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
    const firstDp = PUBLIC_SERVICES.find(
      item => item.id === "policia-civil-1"
    )!;
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
  it.each([
    ["meu sus", "meu-sus-digital"],
    ["ciptea", "carteira-autista-goias"],
    ["carteira idoso", "carteira-pessoa-idosa"],
    ["eleitoral", "autoatendimento-eleitoral"],
    ["reclamacao empresa", "consumidor-gov"],
    ["boletim ocorrencia", "delegacia-virtual-goias"],
    ["seguro desemprego", "seguro-desemprego"],
    ["expresso goias", "expresso-goias"],
    ["regulacao saude", "saude-digital-goias"],
    ["alistamento militar", "alistamento-militar"],
  ])(
    "finds the new official need %s without inventing a local route",
    (query, id) => {
      const service = searchPublicServices(query).find(item => item.id === id)!;
      expect(service).toBeDefined();
      expect(service.verifiedAt).toBe("06/10/2026");
      expect(service.sourceUrl).toMatch(/^https:\/\//);
      expect(service.actionUrl).toMatch(/^https:\/\//);
      expect(service.mapQuery).toBeUndefined();
      expect(service.address).toBeUndefined();
    }
  );

  it("adds richer official digital channels without inventing local addresses", () => {
    for (const id of [
      "delegacia-virtual-goias",
      "seguro-desemprego",
      "expresso-goias",
      "saude-digital-goias",
      "alistamento-militar",
    ]) {
      const service = PUBLIC_SERVICES.find(item => item.id === id)!;
      expect(service).toBeDefined();
      expect(service.verifiedAt).toBe("06/10/2026");
      expect(service.actionUrl).toMatch(/^https:\/\//);
      expect(service.sourceUrl).toMatch(/^https:\/\//);
      expect(service.address).toBeUndefined();
      expect(service.mapQuery).toBeUndefined();
    }
    const detran = PUBLIC_SERVICES.find(item => item.id === "detran")!;
    expect(detran.actionUrl).toBe("https://www.detran.go.gov.br/");
    expect(detran.verifiedAt).toBe("06/10/2026");
  });

  it("organizes the expanded premium utility categories without duplicate records", () => {
    for (const [query, id, category] of [
      ["celular seguro", "celular-seguro", "seguranca"],
      ["tarifa social", "tarifa-social-energia", "assistencia"],
      ["nota fiscal iss", "nota-fiscal-iss", "tributos"],
      ["itbi", "itbi-municipal", "tributos"],
      ["pcd", "secretaria-pcd-igualdade", "inclusao"],
      ["apreensao animais", "apreensao-animais", "animais"],
      ["iptu", "emitir-taxas-municipais", "tributos"],
      ["castracao", "bem-estar-animal-castracao", "animais"],
      ["biblioteca", "biblioteca-municipal", "educacao"],
      ["medicamentos sus", "medicamentos-sus-municipal", "saude"],
      ["alto custo", "medicamentos-alto-custo-municipal", "saude"],
      ["estoque farmacias", "estoque-farmacias-publicas", "saude"],
      ["regulacao municipal", "regulacao-municipal-lista-espera", "saude"],
      ["creche", "creches-lista-espera", "educacao"],
    ] as const) {
      const service = searchPublicServices(query).find(item => item.id === id)!;
      expect(service).toBeDefined();
      expect(service.category).toBe(category);
      expect(service.verifiedAt).toBe("06/10/2026");
      expect(service.sourceUrl).toMatch(/^https:\/\//);
    }
    expect(PUBLIC_SERVICES.find(item => item.id === "procon")?.category).toBe("consumidor");
    expect(PUBLIC_SERVICES.find(item => item.id === "consumidor-gov")?.category).toBe("consumidor");
    expect(PUBLIC_SERVICES.find(item => item.id === "secretaria-meio-ambiente")?.category).toBe("ambiente");
    expect(PUBLIC_SERVICES.find(item => item.id === "carteira-autista-goias")?.category).toBe("inclusao");
    expect(PUBLIC_SERVICES.find(item => item.id === "passe-livre-pcd-goias")?.category).toBe("inclusao");
    expect(new Set(PUBLIC_SERVICES.map(item => item.id)).size).toBe(PUBLIC_SERVICES.length);
  });

  it("finds the new public-utility services by practical intent", () => {
    expect(searchPublicServices("farmacia popular").some(service => service.id === "farmacia-popular")).toBe(true);
    expect(searchPublicServices("ouvsus").some(service => service.id === "ouvsus-136")).toBe(true);
    expect(searchPublicServices("deam").some(service => service.id === "deam-depai-dpca")).toBe(true);
    expect(searchPublicServices("2 delegacia").some(service => service.id === "policia-civil-2")).toBe(true);
  });

  it("groups transparency services and keeps digital portals route-free", () => {
    expect(searchPublicServices("", "transparencia").map(item => item.id)).toEqual(
      expect.arrayContaining(["sic", "ouvidoria-municipal", "portal-transparencia-municipal", "portal-sei-processos", "legislacao-municipal"])
    );
    for (const id of ["portal-transparencia-municipal", "portal-sei-processos", "legislacao-municipal"]) {
      const service = PUBLIC_SERVICES.find(item => item.id === id)!;
      expect(service.category).toBe("transparencia");
      expect(service.actionUrl).toMatch(/^https:\/\//);
      expect(service.address).toBeUndefined();
      expect(service.mapQuery).toBeUndefined();
    }
    expect(PUBLIC_SERVICES.find(item => item.id === "sic")?.category).toBe("transparencia");
    expect(PUBLIC_SERVICES.find(item => item.id === "ouvidoria-municipal")?.category).toBe("transparencia");
  });

  it("groups youth services without inventing local routes or vacancies", () => {
    expect(searchPublicServices("", "juventude").map(item => item.id)).toEqual(
      expect.arrayContaining(["atendimento-juventude", "id-jovem", "aprendizagem-profissional-jovem"])
    );
    const idJovem = PUBLIC_SERVICES.find(item => item.id === "id-jovem")!;
    expect(idJovem.actionUrl).toContain("idjovem.juventude.gov.br");
    expect(idJovem.mapQuery).toBeUndefined();
    expect(idJovem.address).toBeUndefined();
    const aprendizagem = PUBLIC_SERVICES.find(item => item.id === "aprendizagem-profissional-jovem")!;
    expect(aprendizagem.guidance).toMatch(/não representa vaga aberta garantida/i);
    expect(aprendizagem.mapQuery).toBeUndefined();
    const municipal = PUBLIC_SERVICES.find(item => item.id === "atendimento-juventude")!;
    expect(municipal.phone).toBe("(61) 99291-2169");
    expect(municipal.mapQuery).toBeUndefined();
  });

  it("groups current sport services without assuming open enrollment or inventing locations", () => {
    expect(searchPublicServices("", "esporte").map(item => item.id)).toEqual(
      expect.arrayContaining(["secretaria-esporte-lazer", "projeto-multiesportes"])
    );
    const secretaria = PUBLIC_SERVICES.find(item => item.id === "secretaria-esporte-lazer")!;
    expect(secretaria.phone).toBe("(61) 99310-2157");
    expect(secretaria.email).toBe("esporteelazer@aguaslindasdegoias.go.gov.br");
    expect(secretaria.mapQuery).toBeUndefined();
    const projeto = PUBLIC_SERVICES.find(item => item.id === "projeto-multiesportes")!;
    expect(projeto.category).toBe("esporte");
    expect(projeto.guidance).toMatch(/não implica turma ou vaga aberta hoje/i);
    expect(projeto.address).toBeUndefined();
    expect(projeto.mapQuery).toBeUndefined();
  });

  it("groups official culture services without inventing routes for digital modules", () => {
    expect(searchPublicServices("", "cultura").map(item => item.id)).toEqual(
      expect.arrayContaining(["secretaria-cultura-turismo", "cadastro-agente-cultural", "editais-cultura", "mapa-cultural", "calendario-cultural"])
    );
    const sede = PUBLIC_SERVICES.find(item => item.id === "secretaria-cultura-turismo")!;
    expect(sede.whatsappOnly).toContain("(61) 99310-0497");
    expect(sede.mapQuery).toContain("Instituto Marques Paiva");
    for (const id of ["cadastro-agente-cultural", "editais-cultura", "mapa-cultural", "calendario-cultural"]) {
      const service = PUBLIC_SERVICES.find(item => item.id === id)!;
      expect(service.category).toBe("cultura");
      expect(service.actionUrl).toMatch(/^https:\/\/cultura\.aguaslindasdegoias\.go\.gov\.br\//);
      expect(service.mapQuery).toBeUndefined();
      expect(service.address).toBeUndefined();
    }
  });

  it("groups entrepreneurship and business services in a dedicated category", () => {
    expect(searchPublicServices("", "empreendedor").map(item => item.id)).toEqual(
      expect.arrayContaining(["desenvolvimento-economico", "sala-empreendedor", "portal-empreendedor-mei", "abrir-cnpj-redesim"])
    );
    for (const id of ["desenvolvimento-economico", "sala-empreendedor", "portal-empreendedor-mei", "abrir-cnpj-redesim"])
      expect(PUBLIC_SERVICES.find(item => item.id === id)?.category).toBe("empreendedor");
    const sala = PUBLIC_SERVICES.find(item => item.id === "sala-empreendedor")!;
    expect(sala.whatsappOnly).toContain("(61) 99248-6697");
    expect(sala.mapQuery).toContain("Parque da Barragem");
    expect(sala.sourceUrl).toContain("/servico/sala-do-empreendedor/");
  });

  it("groups services for older adults in a dedicated utility category", () => {
    expect(searchPublicServices("idoso", "idoso").map(item => item.id)).toEqual(
      expect.arrayContaining(["cmdi", "cci-idoso", "carteira-pessoa-idosa"])
    );
    for (const id of ["cmdi", "cci-idoso", "carteira-pessoa-idosa"])
      expect(PUBLIC_SERVICES.find(item => item.id === id)?.category).toBe("idoso");
    const cmdi = PUBLIC_SERVICES.find(item => item.id === "cmdi")!;
    expect(cmdi.phone).toBe("(61) 99302-7803");
    expect(cmdi.mapQuery).toContain("Quadra 53");
    expect(cmdi.sourceUrl).toContain("conselho-municipal-do-direito-do-idoso-cmdi");
  });

  it("groups animal care and zoonoses in a dedicated utility category", () => {
    expect(searchPublicServices("zoonoses", "animais").map(item => item.id)).toEqual(
      expect.arrayContaining(["bem-estar-animal-castracao", "vigilancia-saude-zoonoses"])
    );
    for (const id of ["apreensao-animais", "bem-estar-animal-castracao", "vigilancia-saude-zoonoses"])
      expect(PUBLIC_SERVICES.find(item => item.id === id)?.category).toBe("animais");
    const vigilancia = PUBLIC_SERVICES.find(item => item.id === "vigilancia-saude-zoonoses")!;
    expect(vigilancia.phone).toBe("(61) 3618-1409");
    expect(vigilancia.mapQuery).toContain("Avenida Brasília");
    expect(vigilancia.sourceUrl).toMatch(/^https:\/\/legislacao\.aguaslindasdegoias\.go\.gov\.br/);
  });

  it("groups women protection services in a dedicated utility category", () => {
    expect(searchPublicServices("mulher", "mulher").map(item => item.id)).toEqual(expect.arrayContaining(["secretaria-mulher", "ligue-180", "deam-depai-dpca"]));
    for (const id of ["secretaria-mulher", "ligue-180", "deam-depai-dpca"])
      expect(PUBLIC_SERVICES.find(item => item.id === id)?.category).toBe("mulher");
  });

});
