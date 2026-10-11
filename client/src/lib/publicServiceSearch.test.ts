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

it("keeps all search scopes independent when changing from acronyms to longer needs", () => {
  const queries = [
    "cras", "cpf", "cidades", "matricula escolar", "informações de cras e cpf",
    "segunda via documento escolar", "São José", "CRAS Norte", "educacao", "xyz",
  ];
  for (const query of queries) {
    expect(searchPublicServicesIn(records, query).map(s => s.id))
      .toEqual(previousSearch(records, query).map(s => s.id));
  }
  // Revisiting an earlier query must not accidentally reuse an index built
  // for a different search scope (concise, with-category or full details).
  for (const query of queries.slice().reverse()) {
    expect(searchPublicServicesIn(records, query).map(s => s.id))
      .toEqual(previousSearch(records, query).map(s => s.id));
  }
});

it("does not reuse a previous catalog snapshot after official records change", () => {
  const fresh = records.map(s => s.id === "escola"
    ? { ...s, description: "Laboratório de robótica municipal", keywords: ["robotica"] }
    : s);
  expect(searchPublicServicesIn(fresh, "robotica").map(s => s.id)).toEqual(["escola"]);
  expect(searchPublicServicesIn(records, "robotica")).toEqual([]);
  expect(searchPublicServicesIn(fresh, "matricula").map(s => s.id))
    .toEqual(previousSearch(fresh, "matricula").map(s => s.id));
});


it("does not read or index unrelated categories while searching a narrow category", () => {
  const allowed = service("escola-nova", "Escola Municipal Central", "educacao", "Matrícula escolar");
  const unrelated = service("secretaria", "Secretaria Pública", "cidadania", "Atendimento");
  const forbidden = Object.defineProperty({ ...unrelated }, "description", {
    get: () => { throw new Error("Nonmatching category must not be indexed"); },
    enumerable: true,
  }) as PublicService;
  expect(searchPublicServicesIn([allowed, forbidden], "matricula", "educacao").map(s => s.id))
    .toEqual(["escola-nova"]);
});

it("reuses the same normalized fields on repeated category searches without rebuilding indexes", () => {
  let descriptions = 0;
  const inspected = Object.defineProperty(
    service("escola-2", "Escola do Centro", "educacao", "Matrícula pública"),
    "description",
    { get: () => { descriptions++; return "Matrícula pública"; }, enumerable: true },
  ) as PublicService;
  const catalog: PublicService[] = [inspected, service("cras-3", "CRAS", "assistencia")];
  for (const query of ["matricula", "matricul", "MATRÍCULA", "matricula"]) {
    expect(searchPublicServicesIn(catalog, query, "educacao").map(s => s.id)).toEqual(["escola-2"]);
  }
  expect(descriptions).toBe(1);
});

it("preserves every category and intention when switching scope and catalog snapshots", () => {
  const categories = ["todos", "saude", "assistencia", "educacao", "cidadania"] as const;
  const queries = ["", "cras", "cpf", "cnpj", "assistencia", "educacao", "matricula",
    "MATRÍCULA ESCOLAR", "São José", "informacoes de cras e cpf", "ouvidoria"];
  for (const category of categories) {
    for (const query of queries) {
      expect(searchPublicServicesIn(records, query, category).map(s => s.id))
        .toEqual(previousSearch(records, query, category).map(s => s.id));
    }
  }
  const fresh = records.map(s => s.id === "escola"
    ? { ...s, description: "Formação tecnológica", keywords: ["tecnologia"] }
    : s);
  expect(searchPublicServicesIn(fresh, "tecnologia", "educacao").map(s => s.id))
    .toEqual(["escola"]);
  expect(searchPublicServicesIn(records, "tecnologia", "educacao")).toEqual([]);
});


it("reuses the last normalized query after changing only resource/favorite filters", () => {
  let categoryReads = 0;
  const measured = Object.defineProperty(
    service("cras-cache", "CRAS Regional", "assistencia", "Apoio e Cadastro Único", ["cras"]),
    "category",
    {
      configurable: true,
      enumerable: true,
      get: () => { categoryReads++; return "assistencia"; },
    },
  ) as PublicService;
  const snapshot = [measured, service("escola-cache", "Escola do Bairro", "educacao")];
  const first = searchPublicServicesIn(snapshot, "CRAS", "assistencia");
  expect(first.map(s => s.id)).toEqual(["cras-cache"]);
  const before = categoryReads;
  const repeated = searchPublicServicesIn(snapshot, "  cras  ", "assistencia");
  expect(repeated.map(s => s.id)).toEqual(["cras-cache"]);
  expect(repeated).not.toBe(first);
  expect(categoryReads).toBe(before);
  repeated.splice(0, 1);
  expect(searchPublicServicesIn(snapshot, "cras", "assistencia").map(s => s.id))
    .toEqual(["cras-cache"]);
  expect(searchPublicServicesIn(snapshot, "escola", "educacao").map(s => s.id))
    .toEqual(["escola-cache"]);
  expect(searchPublicServicesIn(snapshot, "cras", "assistencia").map(s => s.id))
    .toEqual(["cras-cache"]);
});

it("keeps one bounded search entry per catalog snapshot and preserves category browsing", () => {
  const first = searchPublicServicesIn(records, "de e da", "educacao");
  first.pop();
  expect(searchPublicServicesIn(records, "", "educacao").map(s => s.id)).toEqual(["escola"]);
  const changed = records.map(s => s.id === "escola"
    ? { ...s, name: "Nova escola de tecnologia", keywords: ["tecnologia"] }
    : s);
  expect(searchPublicServicesIn(changed, "tecnologia", "educacao").map(s => s.id))
    .toEqual(["escola"]);
  expect(searchPublicServicesIn(records, "tecnologia", "educacao")).toEqual([]);
  for (const category of ["todos", "cidadania", "educacao", "assistencia"] as const) {
    for (const query of ["", "CRAS", "cpf", "cnpj", "matricula escolar"]) {
      expect(searchPublicServicesIn(records, query, category).map(s => s.id))
        .toEqual(previousSearch(records, query, category).map(s => s.id));
    }
  }
});
