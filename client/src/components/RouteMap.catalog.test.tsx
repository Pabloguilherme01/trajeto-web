import React from "react";
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

const catalogRequests = vi.hoisted(() => ({ enabled: [] as boolean[] }));
vi.mock("@/hooks/useBusinessCatalog", () => ({
  useBusinessCatalog: (enabled = false) => {
    catalogRequests.enabled.push(enabled);
    return { items: [], loading: false, error: false, retry: vi.fn() };
  },
}));
import { OfflineRoutePreview } from "./RouteMap";

afterEach(() => {
  cleanup();
  catalogRequests.enabled = [];
});

it("does not download 21k companies automatically when a destination appears", () => {
  const view = render(<OfflineRoutePreview stops={[]} />);
  expect(catalogRequests.enabled.length).toBeGreaterThan(0);
  expect(catalogRequests.enabled.every(value => value === false)).toBe(true);

  view.rerender(<OfflineRoutePreview stops={[]} destination={{ lat: -15.77, lng: -48.28 }} />);
  expect(catalogRequests.enabled.at(-1)).toBe(false);
  expect(screen.getByRole("button", { name: "Carregar empresas próximas" })).toBeTruthy();

  fireEvent.click(screen.getByRole("button", { name: "Carregar empresas próximas" }));
  expect(catalogRequests.enabled.at(-1)).toBe(true);
  expect(screen.getByRole("button", { name: "Ocultar empresas próximas" }).getAttribute("aria-pressed")).toBe("true");

  fireEvent.click(screen.getByRole("button", { name: "Ocultar empresas próximas" }));
  expect(catalogRequests.enabled.at(-1)).toBe(false);

  fireEvent.click(screen.getByRole("button", { name: "Carregar empresas próximas" }));
  view.rerender(<OfflineRoutePreview stops={[]} destination={{ lat: NaN, lng: -48.28 }} />);
  expect(catalogRequests.enabled.at(-1)).toBe(false);
});

it("respects externally hidden references without fetching an optional catalog", () => {
  const view = render(<OfflineRoutePreview stops={[]} destination={{ lat: -15.77, lng: -48.28 }}
    referencesVisible={false} businessesVisible={true} showReferenceControl={false} showBusinessControl={false} />);
  expect(catalogRequests.enabled.at(-1)).toBe(false);
  expect(screen.queryByRole("button", { name: /empresas próximas/i })).toBeNull();
  view.rerender(<OfflineRoutePreview stops={[]} destination={{ lat: -15.77, lng: -48.28 }}
    referencesVisible={true} businessesVisible={true} showReferenceControl={false} showBusinessControl={false} />);
  expect(catalogRequests.enabled.at(-1)).toBe(true);
});
