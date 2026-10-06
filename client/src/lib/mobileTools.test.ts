import { describe, expect, it, vi } from "vitest";
import { build99MobilityUrl, buildAppleMapsDirectionsUrl, buildOrganicMapsNavigationUrl, buildOrganicMapsSearchUrl, buildGoogleMapsDirectionsUrl, buildGoogleMapsMultiStopUrl, buildGoogleMapsNearbyStationsUrl, buildGoogleMapsSearchUrl, buildNearbyStationsUrl, buildRouteShareText, buildUberRideUrl, buildWazeNavigationUrl, getPreferredNavigationProvider, openExternalUrl, ORGANIC_MAPS_INSTALL_URL, setPreferredNavigationProvider, shareText } from "./mobileTools";

describe("mobile tools", () => {
  it("builds Organic Maps navigation links without exposing current GPS coordinates", () => {
    const drive = buildOrganicMapsNavigationUrl({ lat: -15.86, lng: -48.03 }, "UPA Águas Lindas", "drive");
    expect(drive).toContain("om://v2/nav?");
    expect(drive).toContain("origin=currentLocation");
    expect(drive).toContain("destination=-15.86%2C-48.03");
    expect(drive).toContain("destination_name=UPA+%C3%81guas+Lindas");
    expect(drive).toContain("mode=drive");
    expect(drive).not.toContain("origin_lat");
    expect(buildOrganicMapsNavigationUrl({ lat: -15.86, lng: -48.03 }, "UBS", "walk")).toContain("mode=walk");
    expect(buildOrganicMapsNavigationUrl({ lat: -15.86, lng: -48.03 }, "UBS", "bike")).toContain("mode=bike");
    expect(buildOrganicMapsNavigationUrl({ lat: Number.NaN, lng: -48.03 })).toBeNull();
    expect(buildOrganicMapsNavigationUrl({ lat: 95, lng: -48.03 })).toBeNull();
    expect(buildOrganicMapsSearchUrl("UPA Águas Lindas")).toContain("om://search?");
    expect(buildOrganicMapsSearchUrl("UPA Águas Lindas")).toContain("query=UPA+%C3%81guas+Lindas");
    expect(buildOrganicMapsSearchUrl("   ")).toBe("om://search");
    expect(ORGANIC_MAPS_INSTALL_URL).toBe("https://get.omaps.org/");
  });

  it("builds a nearby-stations URL with validated coordinates", () => {
    expect(buildNearbyStationsUrl("/postos", -15.86, -48.03)).toBe("/postos?q=postos&perto=1");
    expect(buildNearbyStationsUrl("/postos", Number.NaN, Number.POSITIVE_INFINITY)).toBe("/postos?q=postos");
  });

  it("builds safe external fallbacks for routes and station searches", () => {
    expect(buildGoogleMapsDirectionsUrl("Águas Lindas, GO", "Brasília, DF")).toBe(
      "https://www.google.com/maps/dir/?api=1&origin=%C3%81guas+Lindas%2C+GO&destination=Bras%C3%ADlia%2C+DF&travelmode=driving",
    );
    expect(buildGoogleMapsDirectionsUrl("", "Brasília, DF")).toBe(
      "https://www.google.com/maps/dir/?api=1&destination=Bras%C3%ADlia%2C+DF&travelmode=driving",
    );
    expect(buildGoogleMapsSearchUrl("postos perto de Águas Lindas")).toBe(
      "https://www.google.com/maps/search/?api=1&query=postos%20perto%20de%20%C3%81guas%20Lindas",
    );
    expect(buildGoogleMapsNearbyStationsUrl(-15.86, -48.03)).toBe(
      "https://www.google.com/maps/search/?api=1&query=postos%20de%20combust%C3%ADvel%20perto%20de%20mim",
    );
  });

  it("builds a Google Maps route with up to three intermediate stops", () => {
    const url = buildGoogleMapsMultiStopUrl("Brasília, DF", ["Posto A", "Posto B", "Posto C", "Extra"], true);
    expect(url).toContain("waypoints=Posto+A%7CPosto+B%7CPosto+C");
    expect(url).toContain("dir_action=navigate");
  });

  it("supports Google Maps route preferences", () => {
    const url = buildGoogleMapsMultiStopUrl("Brasília, DF", ["Posto A"], true, "avoid-tolls");
    expect(url).toContain("avoid=tolls");
  });

  it("supports Apple Maps multistop and avoidance preferences", () => {
    const url = buildAppleMapsDirectionsUrl("Brasília, DF", undefined, "avoid-tolls", ["Posto A", "Posto B"]);
    expect(url).toContain("maps.apple.com/directions?");
    expect(url).toContain("avoid=tolls");
    expect(url).toContain("waypoint=Posto+A");
    expect(url).toContain("waypoint=Posto+B");
  });

  it("builds Waze navigation links with a search fallback", () => {
    expect(buildWazeNavigationUrl("Brasília, DF")).toBe("https://waze.com/ul?navigate=yes&q=Bras%C3%ADlia%2C+DF");
    expect(buildWazeNavigationUrl("Destino", { lat: -15.86, lng: -48.03 })).toBe("https://waze.com/ul?navigate=yes&ll=-15.86%2C-48.03&zoom=17");
  });

  it("builds Apple Maps driving directions", () => {
    expect(buildAppleMapsDirectionsUrl("Brasília, DF")).toBe("https://maps.apple.com/directions?destination=Bras%C3%ADlia%2C+DF&mode=driving");
    expect(buildAppleMapsDirectionsUrl("Brasília, DF", "Águas Lindas, GO")).toBe("https://maps.apple.com/directions?destination=Bras%C3%ADlia%2C+DF&mode=driving&source=%C3%81guas+Lindas%2C+GO");
  });

  it("omits private or precise origins from external navigation URLs", () => {
    const privateGoogle = buildGoogleMapsDirectionsUrl("Minha localização", "Hospital");
    const preciseGoogle = buildGoogleMapsDirectionsUrl("-15.76123, -48.28123", "Hospital");
    const privateApple = buildAppleMapsDirectionsUrl("Hospital", "Minha localização");
    const preciseApple = buildAppleMapsDirectionsUrl("Hospital", "-15.76123, -48.28123");

    for (const url of [privateGoogle, preciseGoogle, privateApple, preciseApple]) {
      expect(url).not.toContain("15.76123");
      expect(url).not.toContain("48.28123");
      expect(url).not.toContain("Minha+localiza");
    }
    expect(privateGoogle).not.toContain("origin=");
    expect(preciseGoogle).not.toContain("origin=");
    expect(privateApple).not.toContain("source=");
    expect(preciseApple).not.toContain("source=");
  });

  it("shares the native route decision with useful context", () => {
    expect(buildRouteShareText("Águas Lindas", "Brasília", {
      name: "Posto Exemplo", price: 5.89, detourKm: 1.4, detourSource: "real",
    })).toBe("Planejei esta rota no Trajeto: Águas Lindas → Brasília. Parada sugerida: Posto Exemplo · referência de R$ 5,89/L · desvio real de 1,4 km.");
  });

  it("keeps a useful generic message when there is no recommendation", () => {
    expect(buildRouteShareText("Casa", "Trabalho")).toBe("Planejei esta rota no Trajeto: Casa → Trabalho. Veja distância, duração e opções de abastecimento.");
  });

  it("never exposes a precise GPS origin in shared route text", () => {
    const text = buildRouteShareText("-15.76123, -48.28123", "Hospital");
    expect(text).toContain("Minha localização → Hospital");
    expect(text).not.toContain("-15.76123");
    expect(text).not.toContain("-48.28123");
  });

  it("builds an official Uber universal link with the station as destination", () => {
    const url = buildUberRideUrl("Posto Exemplo, Águas Lindas de Goiás", { lat: -15.86, lng: -48.03 });
    expect(url).toContain("https://m.uber.com/looking?");
    expect(url).toContain("pickup=my_location");
    expect(url).toContain("drop%5B0%5D=");
    const drop = JSON.parse(new URL(url).searchParams.get("drop[0]") || "{}");
    expect(drop.formatted_address).toContain("Águas Lindas de Goiás");
    expect(drop.latitude).toBe(-15.86);
    expect(drop.longitude).toBe(-48.03);
  });

  it("keeps 99 on its verified public entrypoint without inventing private destination parameters", () => {
    expect(build99MobilityUrl("Posto Exemplo, Águas Lindas de Goiás")).toBe("https://99app.com/");
  });

  it("keeps legacy provider helpers synchronized with shared preferences", () => {
    const data = new Map<string, string>();
    const localStorage = {
      getItem: vi.fn((key: string) => data.get(key) ?? null),
      setItem: vi.fn((key: string, value: string) => { data.set(key, value); }),
    };
    vi.stubGlobal("window", { localStorage });

    setPreferredNavigationProvider("waze");

    expect(getPreferredNavigationProvider()).toBe("waze");
    expect(JSON.parse(data.get("trajeto-navigation-preferences") || "{}").provider).toBe("waze");
    vi.unstubAllGlobals();
  });

  it("opens external URLs through one safe browser boundary", () => {
    const open = vi.fn();
    vi.stubGlobal("window", { open });
    openExternalUrl("https://example.com/destino");
    expect(open).toHaveBeenCalledWith("https://example.com/destino", "_blank", "noopener,noreferrer");
    vi.unstubAllGlobals();
  });

  it("does not try to open external URLs outside the browser", () => {
    vi.stubGlobal("window", undefined);
    expect(() => openExternalUrl("https://example.com/destino")).not.toThrow();
    vi.unstubAllGlobals();
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
