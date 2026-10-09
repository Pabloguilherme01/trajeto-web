import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { RouteAlertPreferences } from "./RouteAlertPreferences";
vi.mock("@/lib/trpc", () => ({ trpc: {
  useUtils: () => ({}),
  personal: {
    saveRouteAlert: { useMutation: () => ({}) }, removeRouteAlert: { useMutation: () => ({}) },
    markTrafficNotificationsRead: { useMutation: () => ({}) },
    liveAlerts: { useQuery: () => ({ data: { newNotifications: [{ title: "Traffic", detail: "Notice", corridorId: "test", incidentId: "1" }] } }) },
  },
} }));
beforeEach(() => { vi.stubGlobal("React", React); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); localStorage.clear(); });
it("keeps route preferences usable when local storage access is denied", () => {
  vi.spyOn(window, "localStorage", "get").mockImplementation(() => { throw new DOMException("Blocked", "SecurityError"); });
  render(<RouteAlertPreferences alerts={[]} />);
  expect(screen.getByText("Assine uma rota favorita.")).toBeTruthy();
});
it("keeps in-app alerts visible if the browser rejects Notification construction", () => {
  localStorage.setItem("trajeto-traffic-browser-alerts", "enabled");
  class UnsupportedNotification {
    static permission = "granted";
    constructor() { throw new TypeError("Illegal constructor"); }
  }
  vi.stubGlobal("Notification", UnsupportedNotification);
  render(<RouteAlertPreferences alerts={[]} />);
  expect(screen.getByText("Assine uma rota favorita.")).toBeTruthy();
});
