import { describe, expect, it } from "vitest";
import {
  OFFLINE_DESTINATIONS,
  OFFLINE_DESTINATION_CATEGORIES,
  searchOfflineDestinations,
} from "./offlineDestinations";

describe("offlineDestinations", () => {
  it("mantém os principais pontos institucionais em um catálogo local pequeno", () => {
    expect(OFFLINE_DESTINATIONS.length).toBeGreaterThanOrEqual(10);
    expect(new Set(OFFLINE_DESTINATIONS.map(item => item.id)).size).toBe(OFFLINE_DESTINATIONS.length);
    expect(OFFLINE_DESTINATION_CATEGORIES.length).toBeGreaterThan(3);
  });

  it("encontra pontos por nome, serviço e endereço", () => {
    expect(searchOfflineDestinations("vapt vupt")[0]?.id).toBe("vapt-vupt");
    expect(searchOfflineDestinations("mansões odisseia")[0]?.id).toBe("upa-mansoes-odisseia");
    expect(searchOfflineDestinations("avenida jk")[0]?.id).toBe("rodoviaria-nelson-alves");
  });

  it("filtra por categoria sem perder a precisão da busca", () => {
    const health = searchOfflineDestinations("", "saude");
    expect(health.every(item => item.category === "saude")).toBe(true);
    expect(searchOfflineDestinations("forum", "saude")).toEqual([]);
  });

  it("não cria pontos fictícios quando a busca não existe", () => {
    expect(searchOfflineDestinations("endereço que não existe em águas lindas")).toEqual([]);
  });
});
