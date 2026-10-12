import { describe, expect, it } from "vitest";
import { publicServiceContacts } from "./contactActions";
import {
  PUBLIC_SERVICES, searchPublicServices,
  type PublicService, type PublicServiceCategory,
} from "./publicServices";
import type { PublicServiceResourceFilter } from "./publicServiceListFilters";
import { filterPublicServiceResults, preparePublicServiceResourceModes } from "./publicServiceListResults";

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
  it("prepares all mode previews from one search with the same results and favorite ordering", () => {
    const favoriteIds = new Set(PUBLIC_SERVICES.filter((_, i) => i % 13 === 0).map(s => s.id));
    for (const query of ["", "CRAS", "anatel", "zzzx-sem-servicos"]) {
      for (const category of ["todos", "saude", "assistencia"] as const) {
        for (const savedOnly of [false, true]) {
          const args = { query, category, savedOnly, favoriteIds };
          const base = filterPublicServiceResults({ ...args, resource: "todos" });
          const prepared = preparePublicServiceResourceModes(base);
          for (const resource of ["todos", "contato", "rota", "online"] as const) {
            const expected = original({ ...args, resource });
            expect(prepared.results[resource].map(s => s.id)).toEqual(expected.map(s => s.id));
            expect(prepared.counts[resource]).toBe(expected.length);
          }
          expect(base.map(s => s.id)).toEqual(original({ ...args, resource: "todos" }).map(s => s.id));
        }
      }
    }
  });

  it("counts overlapping resources without duplicating services or exposing the input array", () => {
    const multi: PublicService = {
      id: "multi", name: "Atendimento", category: "cidadania", description: "",
      sourceLabel: "Fonte", sourceUrl: "https://example.org",
      phone: "(61) 3618-0000", mapQuery: "Prefeitura", actionUrl: "https://example.org/online",
    };
    const noChannels = { ...multi, id: "empty", phone: undefined, mapQuery: undefined, actionUrl: undefined };
    const input = [multi, noChannels];
    const prepared = preparePublicServiceResourceModes(input);
    expect(prepared.counts).toEqual({ todos: 2, contato: 1, rota: 1, online: 1 });
    expect(prepared.results.contato).toEqual([multi]);
    prepared.results.todos.pop();
    expect(input).toEqual([multi, noChannels]);
    expect(prepared.results.rota).toEqual([multi]);
    expect(preparePublicServiceResourceModes([]).counts).toEqual({ todos: 0, contato: 0, rota: 0, online: 0 });
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
