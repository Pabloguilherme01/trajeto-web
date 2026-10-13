import React from "react";
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";

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

it("keeps the route preview lightweight until a valid destination is known", () => {
  const view = render(<OfflineRoutePreview stops={[]} />);
  expect(catalogRequests.enabled.length).toBeGreaterThan(0);
  expect(catalogRequests.enabled.every(value => value === false)).toBe(true);

  view.rerender(<OfflineRoutePreview stops={[]} destination={{ lat: -15.77, lng: -48.28 }} />);
  expect(catalogRequests.enabled.at(-1)).toBe(true);

  view.rerender(<OfflineRoutePreview stops={[]} destination={{ lat: NaN, lng: -48.28 }} />);
  expect(catalogRequests.enabled.at(-1)).toBe(false);
});
