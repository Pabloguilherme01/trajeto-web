import React from "react";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { OfflineRoutePreview, RouteMap } from "./RouteMap";
import {
  currentRouteGuidance,
  maneuverSymbol,
  nearbyRouteReferences,
} from "@/lib/routeMapLogic";

vi.mock("@/lib/runtimeCapabilities", () => ({ isGitHubPagesRuntime: vi.fn(() => false) }));
import { isGitHubPagesRuntime } from "@/lib/runtimeCapabilities";
afterEach(() => { cleanup(); vi.mocked(isGitHubPagesRuntime).mockReturnValue(false); });

Object.defineProperty(window, "google", {
  value: {
    maps: {
      TrafficLayer: vi.fn(() => ({ setMap: vi.fn() })),
      Polyline: vi.fn(() => ({ setMap: vi.fn() })),
      LatLngBounds: vi.fn(() => ({ extend: vi.fn() })),
    },
  },
  configurable: true,
});

vi.mock("@/components/Map", () => ({
  MapView: ({
    onMapReady,
    initialCenter,
  }: {
    onMapReady: (map: any) => void;
    initialCenter?: { lat: number; lng: number };
  }) => {
    const map = {
      fitBounds: vi.fn(),
      setMapTypeId: vi.fn(),
      setZoom: vi.fn(),
      getZoom: vi.fn(() => 11),
      addListener: vi.fn(() => ({ remove: vi.fn() })),
    };
    React.useEffect(() => onMapReady(map), [onMapReady]);
    return (
      <div
        data-testid="map-view"
        data-center={
          initialCenter ? initialCenter.lat + "," + initialCenter.lng : ""
        }
      />
    );
  },
}));

describe("nearbyRouteReferences", () => {
  it("adds only verified city references near the route", () => {
    const references = nearbyRouteReferences(
      { lat: -15.7545, lng: -48.2816 },
      { lat: -15.77665, lng: -48.27935 },
      [
        { lat: -15.7545, lng: -48.2816 },
        { lat: -15.765, lng: -48.281 },
        { lat: -15.77665, lng: -48.27935 },
      ]
    );
    expect(references.length).toBeGreaterThan(0);
    expect(
      references.some(item => item.name.includes("UPA Mansões Odisseia"))
    ).toBe(true);
    expect(references.every(item => item.source === "local")).toBe(true);
  });
});

describe("RouteMap", () => {
  it("keeps saved road geometry local when explicit offline mode is requested", () => {
    render(
      <RouteMap
        forceOffline
        origin={{ lat: -15.8, lng: -48 }}
        destination={{ lat: -15.9, lng: -47.9 }}
        stops={[]}
        routes={[
          { id: "saved", source: "osrm", polyline: "r`d_B~~teHbwFg_mA" },
        ]}
      />
    );
    expect(
      screen.getByRole("region", { name: "Mapa offline da viagem" })
    ).toBeTruthy();
    expect(screen.queryByTestId("map-view")).toBeNull();
    expect(
      screen.queryByRole("link", { name: "Abrir no Google Maps" })
    ).toBeNull();
  });
  it("does not invent endpoints or navigation before a trip is defined", () => {
    render(<OfflineRoutePreview stops={[]} />);
    expect(screen.getByText("Defina a origem e o destino")).toBeTruthy();
    expect(
      screen.queryByRole("link", { name: "Abrir no Google Maps" })
    ).toBeNull();
  });
  it("preserves stops in external navigation and distinguishes points from a calculated path", () => {
    render(
      <OfflineRoutePreview
        origin={{ lat: -15.8, lng: -48 }}
        destination={{ lat: -15.9, lng: -47.9 }}
        stops={[
          {
            placeId: "stop",
            name: "Parada confirmada",
            address: "Rua A",
            lat: -15.85,
            lng: -47.95,
          },
        ]}
      />
    );
    expect(screen.getByText(/Somente os pontos informados/)).toBeTruthy();
    expect(
      screen
        .getByRole("link", { name: "Abrir no Google Maps" })
        .getAttribute("href")
    ).toContain("waypoints=-15.85%2C-47.95");
    expect(screen.getByText(/Paradas: 1. Parada confirmada/)).toBeTruthy();
    fireEvent.click(
      screen.getByRole("button", { name: "Aumentar zoom da prévia" })
    );
    expect(
      screen
        .getByRole("button", { name: "Diminuir zoom da prévia" })
        .hasAttribute("disabled")
    ).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: "Ver rota inteira" }));
    expect(
      screen
        .getByRole("button", { name: "Diminuir zoom da prévia" })
        .hasAttribute("disabled")
    ).toBe(true);
  });
  it("keeps the selected travel mode in external navigation", () => {
    render(
      <OfflineRoutePreview
        origin={{ lat: -15.8, lng: -48 }}
        destination={{ lat: -15.9, lng: -47.9 }}
        stops={[]}
        travelMode="cycling"
      />
    );
    const href =
      screen
        .getByRole("link", { name: "Abrir no Google Maps" })
        .getAttribute("href") || "";
    expect(href).toContain("travelmode=bicycling");
    expect(href).not.toContain("travelmode=driving");
  });

  it("omits a private device origin from external map navigation", () => {
    render(
      <RouteMap
        origin={{ lat: -15.761, lng: -48.281 }}
        destination={{ lat: -15.8, lng: -48.2 }}
        stops={[]}
        privateOrigin
      />
    );
    const region = screen.getByRole("region", {
      name: "Prévia privada da viagem",
    });
    expect(region).toBeTruthy();
    const href =
      within(region)
        .getByRole("link", { name: "Abrir no Google Maps" })
        .getAttribute("href") || "";
    expect(href).not.toContain("origin=");
    expect(href).toContain("destination=");
  });

  it("shows street-by-street instructions when the route provider supplies steps", () => {
    render(
      <OfflineRoutePreview
        origin={{ lat: -15.8, lng: -48 }}
        destination={{ lat: -15.9, lng: -47.9 }}
        stops={[]}
        routes={[
          {
            id: "road",
            source: "osrm",
            polyline: "r`d_B~~teHbwFg_mA",
            steps: [
              {
                instruction: "Saia em Avenida JK",
                name: "Avenida JK",
                distanceMeters: 120,
                durationSeconds: 30,
              },
              {
                instruction: "Vire à direita em BR-070",
                name: "BR-070",
                distanceMeters: 900,
                durationSeconds: 100,
              },
            ],
          },
        ]}
      />
    );
    const summary = screen.getByText(/Instruções pelas ruas · 2 passos/);
    expect(summary).toBeTruthy();
    fireEvent.click(summary);
    expect(screen.getByText("Saia em Avenida JK")).toBeTruthy();
    expect(screen.getByText("Vire à direita em BR-070")).toBeTruthy();
  });

  it("oferece mapa grande, enquadramento, trânsito, satélite e zoom", () => {
    render(
      <RouteMap
        origin={{ lat: -15.8, lng: -48 }}
        destination={{ lat: -15.9, lng: -47.9 }}
        stops={[]}
      />
    );
    expect(
      screen.getByRole("region", { name: "Mapa interativo da viagem" })
    ).toBeTruthy();
    expect(screen.getByTestId("map-view").getAttribute("data-center")).toBe(
      "-15.7545,-48.2816"
    );
    const fitTrip = screen.getByRole("button", { name: "Enquadrar viagem" });
    expect(fitTrip).toBeTruthy();
    expect(fitTrip.className).toContain("border-border");
    expect(fitTrip.className).toContain("text-foreground");
    expect(fitTrip.className).not.toContain("border-white");
    expect(screen.getByRole("button", { name: "Aumentar zoom" }).className).toContain("border-border");
    const trafficButton = screen.getByRole("button", { name: "Trânsito" });
    expect(trafficButton.className).toContain("border-border");
    fireEvent.click(trafficButton);
    expect(
      screen
        .getByRole("button", { name: "Trânsito" })
        .getAttribute("aria-pressed")
    ).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: "Satélite" }));
    expect(
      screen
        .getByRole("button", { name: "Satélite" })
        .getAttribute("aria-pressed")
    ).toBe("true");
  });
});

it("focuses endpoints and pauses GPS following when the map is explored", () => {
  render(
    <OfflineRoutePreview
      origin={{ lat: -15.75, lng: -48.29 }}
      destination={{ lat: -15.76, lng: -48.27 }}
      livePosition={{ lat: -15.755, lng: -48.28 }}
      stops={[]}
    />
  );
  fireEvent.click(screen.getByRole("button", { name: "Ver destino" }));
  expect(
    parseFloat(
      screen.getByRole("button", { name: "Selecionar Destino" }).style.left
    )
  ).toBeCloseTo(160);
  const follow = screen.getByRole("button", { name: "Seguir GPS" });
  fireEvent.click(follow);
  expect(follow.getAttribute("aria-pressed")).toBe("true");
  expect(
    parseFloat(
      screen.getByRole("button", { name: "Selecionar Você agora" }).style.left
    )
  ).toBeCloseTo(160);
  fireEvent.keyDown(
    screen.getByRole("region", { name: "Explorar mapa offline" }),
    { key: "ArrowRight" }
  );
  expect(follow.getAttribute("aria-pressed")).toBe("false");
  fireEvent.click(follow);
  fireEvent.click(screen.getByRole("button", { name: "Ver rota inteira" }));
  expect(follow.getAttribute("aria-pressed")).toBe("false");
});

describe("currentRouteGuidance", () => {
  const steps = [
    {
      instruction: "Siga pela Avenida JK",
      name: "Avenida JK",
      distanceMeters: 300,
      durationSeconds: 60,
    },
    {
      instruction: "Vire à direita na BR-070",
      name: "BR-070",
      distanceMeters: 700,
      durationSeconds: 120,
    },
    {
      instruction: "Chegue ao destino",
      distanceMeters: 200,
      durationSeconds: 30,
    },
  ];

  it("advances the active street instruction from remaining route distance", () => {
    expect(currentRouteGuidance(steps, 1200, 1100)?.step.name).toBe(
      "Avenida JK"
    );
    const guidance = currentRouteGuidance(steps, 1200, 700);
    expect(guidance?.step.name).toBe("BR-070");
    expect(guidance?.distanceToManeuver).toBe(500);
    expect(guidance?.nextStep?.instruction).toBe("Chegue ao destino");
  });

  it("does not invent guidance without valid route metrics", () => {
    expect(currentRouteGuidance([], 1200, 600)).toBeNull();
    expect(currentRouteGuidance(steps, null, 600)).toBeNull();
  });
});

it("shows live street guidance and route telemetry while following GPS", () => {
  render(
    <OfflineRoutePreview
      origin={{ lat: -15.8, lng: -48 }}
      destination={{ lat: -15.9, lng: -47.9 }}
      livePosition={{
        lat: -15.82,
        lng: -47.98,
        accuracy: 12,
        timestamp: Date.now(),
      }}
      liveProgress={{
        distanceMeters: 700,
        durationSeconds: 420,
        offRoute: false,
        nearDestination: false,
      }}
      liveSpeedMps={10}
      stops={[]}
      routes={[
        {
          id: "road",
          source: "osrm",
          polyline: "r`d_B~~teHbwFg_mA",
          distanceMeters: 1200,
          durationSeconds: 600,
          steps: [
            {
              instruction: "Siga pela Avenida JK",
              name: "Avenida JK",
              distanceMeters: 300,
              durationSeconds: 60,
            },
            {
              instruction: "Vire à direita na BR-070",
              name: "BR-070",
              distanceMeters: 700,
              durationSeconds: 120,
            },
            {
              instruction: "Chegue ao destino",
              distanceMeters: 200,
              durationSeconds: 30,
            },
          ],
        },
      ]}
    />
  );
  const navigationPanel = screen.getByRole("region", {
    name: "Painel de navegação",
  });
  expect(
    within(navigationPanel).getByText("Vire à direita na BR-070")
  ).toBeTruthy();
  expect(within(navigationPanel).getByText("Via: BR-070")).toBeTruthy();
  expect(screen.getByText("36 km/h")).toBeTruthy();
  expect(screen.getByText("±12 m")).toBeTruthy();
  expect(screen.getByText("OpenStreetMap/OSRM")).toBeTruthy();
  expect(screen.getByText("Agora")).toBeTruthy();
  expect(screen.getByText("Depois")).toBeTruthy();
  expect(screen.getByText(/42% concluído/)).toBeTruthy();
  expect(
    screen
      .getByRole("progressbar", { name: "Progresso da viagem" })
      .getAttribute("aria-valuenow")
  ).toBe("42");
  expect(screen.getByText("GPS bom")).toBeTruthy();
  expect(screen.getByText("Guia completo")).toBeTruthy();
  expect(screen.getByText("Chegada estimada")).toBeTruthy();
  expect(navigationPanel).toBeTruthy();
});

it("warns instead of showing misleading guidance when GPS is off route", () => {
  render(
    <OfflineRoutePreview
      origin={{ lat: -15.8, lng: -48 }}
      destination={{ lat: -15.9, lng: -47.9 }}
      livePosition={{
        lat: -15.7,
        lng: -47.7,
        accuracy: 15,
        timestamp: Date.now(),
      }}
      liveProgress={{
        distanceMeters: 700,
        durationSeconds: 420,
        offRoute: true,
        nearDestination: false,
      }}
      stops={[]}
      routes={[
        {
          id: "road",
          source: "osrm",
          polyline: "r`d_B~~teHbwFg_mA",
          distanceMeters: 1200,
          steps: [
            {
              instruction: "Vire à direita na BR-070",
              name: "BR-070",
              distanceMeters: 1200,
              durationSeconds: 120,
            },
          ],
        },
      ]}
    />
  );
  expect(screen.getByText("Fora do trajeto calculado")).toBeTruthy();
});

describe("navigation completeness", () => {
  it("uses the provider maneuver for turns, roundabouts and arrival", () => {
    expect(maneuverSymbol("turn:right")).toBe("right");
    expect(maneuverSymbol("turn:slight left")).toBe("slight-left");
    expect(maneuverSymbol("turn:uturn")).toBe("uturn");
    expect(maneuverSymbol("roundabout:right")).toBe("roundabout");
    expect(maneuverSymbol("arrive")).toBe("arrival");
    expect(maneuverSymbol()).toBe("straight");
  });
  it("advances at the exact boundary instead of keeping a finished step", () => {
    const steps = [
      { instruction: "Siga", distanceMeters: 100, durationSeconds: 10 },
      { instruction: "Vire", distanceMeters: 200, durationSeconds: 20 },
    ];
    expect(currentRouteGuidance(steps, 300, 200)?.step.instruction).toBe(
      "Vire"
    );
  });
  it("shows the final instruction for trips longer than thirty steps", () => {
    render(
      <OfflineRoutePreview
        origin={{ lat: -15.8, lng: -48 }}
        destination={{ lat: -15.9, lng: -47.9 }}
        stops={[]}
        routes={[
          {
            id: "long",
            source: "osrm",
            polyline: "r`d_B~~teHbwFg_mA",
            steps: Array.from({ length: 65 }, (_, i) => ({
              instruction: "Instrução " + (i + 1),
              distanceMeters: 100,
              durationSeconds: 20,
            })),
          },
        ]}
      />
    );
    fireEvent.click(screen.getByText(/Instruções pelas ruas/));
    expect(screen.getByText("Instrução 65")).toBeTruthy();
  });
});

it("starts following when GPS arrives later and respects manual exploration until resumed", () => {
  const trip = {
    origin: { lat: -15.8, lng: -48 },
    destination: { lat: -15.9, lng: -47.9 },
    stops: [],
  };
  const { rerender } = render(<OfflineRoutePreview {...trip} />);
  expect(screen.queryByRole("button", { name: "Seguir GPS" })).toBeNull();
  rerender(
    <OfflineRoutePreview
      {...trip}
      livePosition={{ lat: -15.81, lng: -47.99 }}
    />
  );
  expect(
    screen
      .getByRole("button", { name: "Seguir GPS" })
      .getAttribute("aria-pressed")
  ).toBe("true");
  const map = screen.getByRole("region", { name: "Explorar mapa offline" });
  fireEvent.keyDown(map, { key: "ArrowRight" });
  expect(
    screen
      .getByRole("button", { name: "Seguir GPS" })
      .getAttribute("aria-pressed")
  ).toBe("false");
  rerender(
    <OfflineRoutePreview
      {...trip}
      livePosition={{ lat: -15.82, lng: -47.98 }}
    />
  );
  expect(
    screen
      .getByRole("button", { name: "Seguir GPS" })
      .getAttribute("aria-pressed")
  ).toBe("false");
  fireEvent.click(screen.getByRole("button", { name: "Seguir GPS" }));
  expect(
    screen
      .getByRole("button", { name: "Seguir GPS" })
      .getAttribute("aria-pressed")
  ).toBe("true");
  rerender(<OfflineRoutePreview {...trip} />);
  rerender(
    <OfflineRoutePreview
      {...trip}
      livePosition={{ lat: -15.83, lng: -47.97 }}
    />
  );
  expect(
    screen
      .getByRole("button", { name: "Seguir GPS" })
      .getAttribute("aria-pressed")
  ).toBe("true");
});

it("keeps zoom and framing inside the map and does not pause following when zooming", () => {
  render(
    <OfflineRoutePreview
      origin={{ lat: -15.8, lng: -48 }}
      destination={{ lat: -15.9, lng: -47.9 }}
      stops={[]}
      livePosition={{ lat: -15.81, lng: -47.99 }}
    />
  );
  const map = screen.getByRole("region", { name: "Explorar mapa offline" });
  fireEvent.click(
    within(map).getByRole("button", { name: "Aumentar zoom da prévia" })
  );
  expect(
    within(map)
      .getByRole("button", { name: "Seguir GPS" })
      .getAttribute("aria-pressed")
  ).toBe("true");
  fireEvent.click(within(map).getByRole("button", { name: "Ver rota inteira" }));
  expect(
    within(map)
      .getByRole("button", { name: "Seguir GPS" })
      .getAttribute("aria-pressed")
  ).toBe("false");
});


it("mostra resumo e guia completo no mapa online do Pages sem duplicar no fallback", () => {
  vi.mocked(isGitHubPagesRuntime).mockReturnValue(true);
  render(<RouteMap origin={{ lat: -15.8, lng: -48 }} destination={{ lat: -15.9, lng: -47.9 }} stops={[]} routes={[{
    id: "online", source: "osrm", polyline: "r`d_B~~teHbwFg_mA", distanceMeters: 12340, durationSeconds: 920,
    steps: [{ instruction: "Siga pela Avenida JK", name: "Avenida JK", distanceMeters: 100, durationSeconds: 30 }, { instruction: "Chegue ao destino", distanceMeters: 0, durationSeconds: 0, maneuver: "arrive" }],
  }]} />);
  const summary = screen.getByRole("region", { name: "Resumo do percurso no mapa" });
  expect(within(summary).getByText("12,3 km")).toBeTruthy();
  expect(within(summary).getByText("15 min")).toBeTruthy();
  expect(screen.getByRole("button", { name: "Ver origem" })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: /Instruções pelas ruas/ }));
  expect(screen.getByText("Chegue ao destino")).toBeTruthy();
  expect(screen.getByText("0 m")).toBeTruthy();
  Array.from(document.querySelectorAll('img[src*="tile.openstreetmap.org"]')).slice(0, 5).forEach(tile => fireEvent.error(tile));
  expect(screen.getAllByRole("region", { name: "Resumo do percurso no mapa" })).toHaveLength(1);
  expect(screen.getAllByRole("button", { name: /Instruções pelas ruas/ })).toHaveLength(1);
});

it("lets the user declutter offline references and labels straight-line estimates explicitly", () => {
  render(<OfflineRoutePreview origin={{ lat: -15.7545, lng: -48.2816 }} destination={{ lat: -15.74637, lng: -48.27584 }} stops={[]} forceOffline routes={[{ id: "estimate", source: "local-estimate", polyline: "r`d_B~~teHbwFg_mA" }]} />);
  expect(screen.getByText("Estimativa em linha reta · sem curvas confirmadas")).toBeTruthy();
  const button = screen.getByRole("button", { name: "Ocultar referências" });
  expect(button.getAttribute("aria-pressed")).toBe("true");
  fireEvent.click(button);
  expect(screen.getByRole("button", { name: "Mostrar referências" }).getAttribute("aria-pressed")).toBe("false");
  expect(screen.getByRole("button", { name: "Ver origem" })).toBeTruthy();
  expect(screen.getByRole("button", { name: "Ver destino" })).toBeTruthy();
});
