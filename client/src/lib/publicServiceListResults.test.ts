import { describe, expect, it } from "vitest";
import { publicServiceContacts } from "./contactActions";
import {
  PUBLIC_SERVICES, searchPublicServices,
  type PublicService, type PublicServiceCategory,
} from "./publicServices";
import type { PublicServiceResourceFilter } from "./publicServiceListFilters";
import { countPublicServiceResources, filterPublicServiceCandidates, filterPublicServiceResults } from "./publicServiceListResults";

function original({
  query, category, resource, savedOnly, favoriteIds, selectedService,
}: {
  query: string;
  category: PublicServiceCategory | "todos";
  resource: PublicServiceResourceFilter;
  savedOnly: boolean;
  favoriteIds: Set<string>;
  selectedService?: PublicService;
}): PublicService[] {
  if (selectedService) return [selectedService];
  const matches = searchPublicServices(query, category).filter(service =>
    (!savedOnly || favoriteIds.has(service.id)) &&
    (resource === "todos" ||
      (resource === "contato" && publicServiceContacts(service).length > 0) ||
      (resource === "rota" && Boolean(service.mapQuery)) ||
      (resource === "online" && Boolean(service.actionUrl)))
  );
  return [...matches].sort((a, b) => Number(favoriteIds.has(b.id)) - Number(favoriteIds.has(a.id)));
}

describe("official directory filter parity", () => {
  it("previews every resource against the same search, category and saved scope", () => {
    const favoriteIds = new Set(PUBLIC_SERVICES.filter((_, i) => i % 13 === 0).map(s => s.id));
    const categories = ["todos", "saude", "educacao", "telecom"] as const;
    const resources = ["todos", "contato", "rota", "online"] as const;
    for (const query of ["", "upa", "anatel", "cpf", "zzzx-sem-servicos"]) {
      for (const category of categories) for (const savedOnly of [false, true]) {
        const services = searchPublicServices(query, category);
        const idsBefore = services.map(s => s.id);
        const counts = countPublicServiceResources(services, savedOnly, favoriteIds);
        for (const resource of resources) {
          const args = { query, category, resource, savedOnly, favoriteIds };
          const candidates = filterPublicServiceCandidates(services, resource, savedOnly, favoriteIds);
          expect(candidates.map(s => s.id)).toEqual(original(args).map(s => s.id));
          expect(counts[resource]).toBe(candidates.length);
          candidates.pop();
        }
        expect(services.map(s => s.id)).toEqual(idsBefore);
      }
    }
  });

  it("keeps the exact original order across categories, resources, saved and text searches", () => {
    const favoriteIds = new Set(PUBLIC_SERVICES.filter((_, i) => i % 13 === 0).map(s => s.id));
    const categories: Array<PublicServiceCategory | "todos"> = [
      "todos", "saude", "educacao", "assistencia", "seguranca", "cidadania",
    ];
    const resources: PublicServiceResourceFilter[] = ["todos", "contato", "rota", "online"];
    for (const query of ["", "upa", "ESF", "CRAS", "180", "cpf", "bolsa família"]) {
      for (const category of categories) for (const resource of resources) for (const savedOnly of [false, true]) {
        const args = { query, category, resource, savedOnly, favoriteIds };
        expect(filterPublicServiceResults(args).map(s => s.id)).toEqual(original(args).map(s => s.id));
      }
    }
  });

  it("preserves a valid deep link, even if its directory filters would hide it", () => {
    const selectedService = PUBLIC_SERVICES.find(service => service.id === "ligue-180")!;
    expect(selectedService).toBeDefined();
    expect(filterPublicServiceResults({
      query: "inexistente", category: "educacao", resource: "rota",
      savedOnly: true, favoriteIds: new Set(), selectedService,
    })).toEqual([selectedService]);
  });

  it("does not expose the returned list for accidental mutation", () => {
    const args = {
      query: "", category: "todos" as const, resource: "todos" as const,
      savedOnly: false, favoriteIds: new Set<string>(),
    };
    const first = filterPublicServiceResults(args);
    const expected = first.map(item => item.id);
    first.pop();
    expect(filterPublicServiceResults(args).map(item => item.id)).toEqual(expected);
  });
});
