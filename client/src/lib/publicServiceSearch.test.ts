import { expect, it } from "vitest";
import { createCatalogSearchIndex, matchesCatalogTerms, normalizeCatalogText } from "./catalogSearch";
import type { PublicService, PublicServiceCategory } from "./publicServices";
import { searchPublicServicesIn } from "./publicServiceSearch";

function service(id: string, name: string, category: PublicServiceCategory, description = "", keywords: string[] = []): PublicService {
  return {
    id, name, category, description, keywords,
    sourceLabel: "Prefeitura de Águas Lindas",
    sourceUrl: "https://www.aguaslindasdegoias.go.gov.br",
  };
}

const records: PublicService[] = [
  service("receita-federal-pav", "Receita Federal", "cidadania", "Ajuda CPF e CNPJ", ["cpf", "cnpj"]),
  service("cras-1", "CRAS Central", "assistencia", "Cadastro Único", ["cras", "cadunico"]),
  service("cras-2", "CRAS Norte", "assistencia", "Auxílio familiar", ["cras"]),
  service("escola", "Escola Municipal São José", "educacao", "Matrícula escolar", ["matricula"]),
  service("ouvidoria", "Ouvidoria Municipal", "cidadania", "Informações de CRAS e CPF"),
];

/** Original search logic, retained only as a regression oracle. */
function previousSearch(items: readonly PublicService[], query = "", category: PublicServiceCategory | "todos" = "todos") {
  const indexes = items.map(s => {
    const concise = [s.name, s.category, s.actionLabel, ...(s.keywords ?? [])];
    const complete = [s.name, s.description, s.address, s.phone, s.extraPhone, s.guidance, s.actionLabel, s.hours, ...(s.keywords ?? [])];
    return { service: s, concise: createCatalogSearchIndex(concise), complete: createCatalogSearchIndex(complete), withCategory: createCatalogSearchIndex([...complete, s.category]) };
  });
  const search = normalizeCatalogText(query).split(" ").filter(term => !["de", "da", "do", "das", "dos", "e", "para"].includes(term)).join(" ");
  const terms = search.replace(/[ºª]/g, "").split(" ").filter(Boolean);
  const conciseIntent = /^[a-z0-9]{2,4}$/.test(search);
  const includeCategoryIntent = terms.length <= 2;
  return indexes.filter(entry => {
    const { service: s } = entry;
    if (category !== "todos" && s.category !== category) return false;
    if (search === "cras" && !s.id.startsWith("cras-")) return false;
    if (search === "cpf" && s.id !== "receita-federal-pav") return false;
    return matchesCatalogTerms(terms, conciseIntent ? entry.concise : includeCategoryIntent ? entry.withCategory : entry.complete);
  }).map(entry => entry.service);
}

it("preserves existing category, acronym, accent and multiword results in catalog order", () => {
  const queries = ["", "   ", "de da para", "cras", "cpf", "CNpj", "sao jose", "MATRÍCULA", "cadunico", "informacoes cras", "teste inexistente"];
  for (const category of ["todos", "cidadania", "educacao", "assistencia"] as const) {
    for (const query of queries) {
      expect(searchPublicServicesIn(records, query, category).map(s => s.id))
        .toEqual(previousSearch(records, query, category).map(s => s.id));
    }
  }
});

it("returns independent lists for category browsing and keeps indexes per immutable snapshot", () => {
  const baseline = records.map(s => s.id);
  const first = searchPublicServicesIn(records);
  first.pop();
  expect(searchPublicServicesIn(records).map(s => s.id)).toEqual(baseline);
  const categoryList = searchPublicServicesIn(records, "de e da", "assistencia");
  categoryList.shift();
  expect(searchPublicServicesIn(records, "", "assistencia").map(s => s.id)).toEqual(["cras-1", "cras-2"]);
  const added = service("new-entry", "Nova Escola São José", "educacao", "Matrícula", ["matricula"]);
  const snapshot = [...records, added];
  expect(searchPublicServicesIn(snapshot, "matricula", "educacao").map(s => s.id)).toEqual(["escola", "new-entry"]);
  expect(searchPublicServicesIn(records, "matricula", "educacao").map(s => s.id)).toEqual(["escola"]);
});
