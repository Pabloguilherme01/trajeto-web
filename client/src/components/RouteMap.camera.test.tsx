import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";

const captures = vi.hoisted(() => ({ markers: [] as unknown[][] }));
const emptyCatalog: never[] = [];
vi.mock("@/hooks/useBusinessCatalog", () => ({ useBusinessCatalog: () => ({ items: emptyCatalog, loading: false, error: false, retry: vi.fn() }) }));
vi.mock("@/components/OfflineMapCanvas", () => ({ default: ({ markers, controls }: { markers: unknown[]; controls: React.ReactNode }) => { captures.markers.push(markers); return <>{controls}</>; } }));
import { OfflineRoutePreview } from "./RouteMap";
afterEach(() => { cleanup(); captures.markers.length = 0; });

it("retains prepared markers through zoom, focus and reference visibility controls", () => {
  const trip = { origin: { lat: -15.7545, lng: -48.2816 }, destination: { lat: -15.77665, lng: -48.27935 }, stops: [] };
  render(<OfflineRoutePreview {...trip} />);
  const original = captures.markers.at(-1);
  fireEvent.click(screen.getByRole("button", { name: "Aumentar zoom da prévia" }));
  expect(captures.markers.at(-1)).toBe(original);
  fireEvent.click(screen.getByRole("button", { name: "Ver destino" }));
  expect(captures.markers.at(-1)).toBe(original);
  fireEvent.click(screen.getByRole("button", { name: "Ocultar referências" }));
  const primary = captures.markers.at(-1);
  expect(primary).toHaveLength(2);
  fireEvent.click(screen.getByRole("button", { name: "Aumentar zoom da prévia" }));
  expect(captures.markers.at(-1)).toBe(primary);
  fireEvent.click(screen.getByRole("button", { name: "Mostrar referências" }));
  expect(captures.markers.at(-1)).toBe(original);
});

it("honors parent reference visibility without duplicating fallback controls", () => {
  const trip = { origin: { lat: -15.7545, lng: -48.2816 }, destination: { lat: -15.77665, lng: -48.27935 }, stops: [] };
  const view = render(<OfflineRoutePreview {...trip} referencesVisible={false} showReferenceControl={false} />);
  expect(captures.markers.at(-1)).toHaveLength(2);
  expect(screen.queryByRole("button", { name: /referências/i })).toBeNull();
  view.rerender(<OfflineRoutePreview {...trip} referencesVisible showReferenceControl={false} />);
  expect(captures.markers.at(-1)!.length).toBeGreaterThan(2);
  expect(screen.queryByRole("button", { name: /referências/i })).toBeNull();
});

it("shows destination names on offline markers and refreshes names at unchanged coordinates", () => {
  const trip = { origin: { lat: -15.7545, lng: -48.2816 }, destination: { lat: -15.77665, lng: -48.27935 }, stops: [] };
  const view = render(<OfflineRoutePreview {...trip} originLabel="Prefeitura" destinationLabel="UPA Mansões Odisseia" />);
  expect(captures.markers.at(-1)).toEqual(expect.arrayContaining([
    expect.objectContaining({ id: "origin", name: "Prefeitura" }),
    expect.objectContaining({ id: "destination", name: "UPA Mansões Odisseia" }),
  ]));
  view.rerender(<OfflineRoutePreview {...trip} originLabel="Prefeitura" destinationLabel="Entrada da UPA" />);
  expect(captures.markers.at(-1)).toEqual(expect.arrayContaining([expect.objectContaining({ id: "destination", name: "Entrada da UPA" })]));
});
