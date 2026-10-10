import { expect, it } from "vitest";
import { matchesCatalogText } from "./catalogSearch";
import { filterPublicServiceRoutes, matchesPublicServiceRoute } from "./publicServiceRouteSearch";
import type { PublicService } from "./publicServices";

type TestRoute = { id: string; label: string; detail: string; destination: string };
const routes: TestRoute[] = [
  { id: "cadunico", label: "Cadastro Único", detail: "Assistência social", destination: "CRAS Central" },
  { id: "upa", label: "UPA", detail: "Atendimento de saúde", destination: "UPA Mansões Odisseia" },
  { id: "escola", label: "Escola Municipal", detail: "Educação básica", destination: "Rua São José" },
  { id: "cras", label: "CRAS II", detail: "Apoio familiar", destination: "Rua 123" },
];
const service: PublicService = {
  id: "cadunico", name: "Cadastro Único / Bolsa Família", category: "assistencia",
  description: "Cadastro e atualização para benefícios sociais",
  keywords: ["bolsa familia", "cadunico", "segunda via"],
  sourceLabel: "Prefeitura de Águas Lindas",
  sourceUrl: "https://www.aguaslindasdegoias.go.gov.br",
};
const linked = new Map<string, PublicService>([["cadunico", service]]);

function originalMatch(query: string, route: TestRoute, associated?: PublicService) {
  return matchesCatalogText(query, [
    route.label, route.detail, route.destination, associated?.name,
    associated?.description, ...(associated?.keywords ?? []),
  ]);
}

it("preserves original route and public-service needs across searches", () => {
  for (const query of [
    "", " ", "bolsa família", "CRAS", "UPA", "Mansões Odisseia",
    "SAÚDE", "123", "12", "Rua São José", "segunda via", "atualização",
    "escola", "sem resultados xyz",
  ]) {
    const expected = routes.filter(route => originalMatch(query, route, linked.get(route.id)));
    expect(filterPublicServiceRoutes(routes, query, linked).map(route => route.id))
      .toEqual(expected.map(route => route.id));
    for (const route of routes) {
      expect(matchesPublicServiceRoute(query, route, linked.get(route.id)))
        .toBe(originalMatch(query, route, linked.get(route.id)));
    }
  }
});

it("does not mix service keywords across different route or service versions", () => {
  const serviceWithNewKeywords = {
    ...service, description: "Atendimento atualizado", keywords: ["nova pesquisa"],
  };
  const updated = new Map<string, PublicService>([["cadunico", serviceWithNewKeywords]]);
  expect(filterPublicServiceRoutes(routes, "segunda via", linked).map(route => route.id))
    .toEqual(["cadunico"]);
  expect(filterPublicServiceRoutes(routes, "segunda via", updated)).toEqual([]);
  expect(filterPublicServiceRoutes(routes, "nova pesquisa", updated).map(route => route.id))
    .toEqual(["cadunico"]);
  expect(filterPublicServiceRoutes(routes, "segunda via", linked).map(route => route.id))
    .toEqual(["cadunico"]);
});

it("returns independent lists and respects exact numeric tokens", () => {
  const original = routes.map(route => route.id);
  const first = filterPublicServiceRoutes(routes, "", linked);
  first.pop();
  expect(filterPublicServiceRoutes(routes, "", linked).map(route => route.id)).toEqual(original);
  expect(filterPublicServiceRoutes(routes, "12", linked)).toEqual([]);
  expect(filterPublicServiceRoutes(routes, "123", linked).map(route => route.id)).toEqual(["cras"]);
});

it("preserves the selected group and offline-only filter order", () => {
  const groupIds = new Set(["cras", "cadunico"]);
  const availableIds = new Set(["cadunico", "escola"]);
  const subset = routes.filter(route => groupIds.has(route.id) && availableIds.has(route.id));
  expect(filterPublicServiceRoutes(subset, "", linked).map(route => route.id)).toEqual(["cadunico"]);
  expect(filterPublicServiceRoutes(subset, "bolsa", linked).map(route => route.id)).toEqual(["cadunico"]);
});
