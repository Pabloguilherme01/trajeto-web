import { describe, expect, it, vi } from "vitest";
import { buildAppleMapsDirectionsUrl, buildGoogleMapsDestinationUrl, buildGoogleMapsDirectionsUrl, buildGoogleMapsSearchUrl, buildNearbyStationsUrl, buildRouteShareText, buildWazeNavigationUrl, shareText } from "./mobileTools";

describe("mobile tools", () => {
  it("builds a nearby-stations URL with validated coordinates", () => {
    expect(buildNearbyStationsUrl("/postos", -15.86, -48.03)).toBe("/postos?q=postos&lat=-15.86&lng=-48.03");
    expect(buildNearbyStationsUrl("/postos", Number.NaN, Number.POSITIVE_INFINITY)).toBe("/postos?q=postos");
  });

  it("builds safe external fallbacks for routes and station searches", () => {
    expect(buildGoogleMapsDirectionsUrl("Águas Lindas, GO", "Brasília, DF")).toBe(
      "https://www.google.com/maps/dir/?api=1&origin=%C3%81guas+Lindas%2C+GO&destination=Bras%C3%ADlia%2C+DF&travelmode=driving",
    );
    expect(buildGoogleMapsSearchUrl("postos perto de Águas Lindas")).toBe(
      "https://www.google.com/maps/search/?api=1&query=postos+perto+de+%C3%81guas+Lindas",
    );
  });

  it("builds Waze navigation links with a search fallback", () => {
    expect(buildWazeNavigationUrl("Brasília, DF")).toBe("https://waze.com/ul?navigate=yes&q=Bras%C3%ADlia%2C+DF");
    expect(buildWazeNavigationUrl("Destino", { lat: -15.86, lng: -48.03 })).toBe("https://waze.com/ul?navigate=yes&ll=-15.86%2C-48.03&zoom=17");
  });

  it("builds Apple Maps driving directions", () => {
    expect(buildAppleMapsDirectionsUrl("Brasília, DF")).toBe("https://maps.apple.com/?daddr=Bras%C3%ADlia%2C+DF&dirflg=d");
    expect(buildAppleMapsDirectionsUrl("Brasília, DF", "Águas Lindas, GO")).toBe("https://maps.apple.com/?daddr=Bras%C3%ADlia%2C+DF&dirflg=d&saddr=%C3%81guas+Lindas%2C+GO");
  });

  it("shares the native route decision with useful context", () => {
    expect(buildRouteShareText("Águas Lindas", "Brasília", {
      name: "Posto Exemplo", price: 5.89, detourKm: 1.4, detourSource: "real",
    })).toBe("Planejei esta rota no Trajeto: Águas Lindas → Brasília. Parada sugerida: Posto Exemplo · referência de R$ 5,89/L · desvio real de 1,4 km.");
  });

  it("keeps a useful generic message when there is no recommendation", () => {
    expect(buildRouteShareText("Casa", "Trabalho")).toBe("Planejei esta rota no Trajeto: Casa → Trabalho. Veja distância, duração e opções de abastecimento.");
  });

  it("uses the native share API when available", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "share", { configurable: true, value: share });
    await shareText("Rota", "https://example.com/rota", "Trajeto");
    expect(share).toHaveBeenCalledWith({ title: "Trajeto", text: "Rota", url: "https://example.com/rota" });
  });

  it("falls back to clipboard when native sharing is unavailable", async () => {
    Object.defineProperty(navigator, "share", { configurable: true, value: undefined });
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    await shareText("Rota", "https://example.com/rota", "Trajeto");
    expect(writeText).toHaveBeenCalledWith("Rota\nhttps://example.com/rota");
  });

  it("falls back to clipboard when native sharing rejects", async () => {
    Object.defineProperty(navigator, "share", { configurable: true, value: vi.fn().mockRejectedValue(new Error("share unavailable")) });
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    await shareText("Rota", "https://example.com/rota", "Trajeto");
    expect(writeText).toHaveBeenCalledWith("Rota\nhttps://example.com/rota");
  });

  it("fails explicitly when neither sharing mechanism exists", async () => {
    Object.defineProperty(navigator, "share", { configurable: true, value: undefined });
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: undefined });
    await expect(shareText("Rota", "https://example.com/rota")).rejects.toThrow("Compartilhamento indisponível");
  });
});
