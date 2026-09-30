import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Link, Router, useLocation } from "wouter";
import { normalizeRouterTarget } from "@/lib/appUrl";

function Routes() {
  const [path, go] = useLocation();
  return <><p data-testid="path">{path}</p><button onClick={() => go("/trajeto-web/planejar?destino=Hospital")}>Planejar</button><Link href="/trajeto-web/salvos">Salvos</Link></>;
}
afterEach(() => { cleanup(); vi.unstubAllGlobals(); window.history.replaceState(null, "", "/"); });
describe("shared router for pages and navigation", () => {
  it("navigates and renders links with exactly one hosting base", async () => {
    vi.stubGlobal("React", React);
    window.history.replaceState(null, "", "/trajeto-web/");
    const normalize = (target: string) => normalizeRouterTarget(target, "/trajeto-web");
    render(<Router base="/trajeto-web" hrefs={target => normalize(target)} aroundNav={(navigate, target, options) => navigate(normalize(target), options)}><Routes /></Router>);
    expect(screen.getByRole("link", { name: "Salvos" }).getAttribute("href")).toBe("/trajeto-web/salvos");
    fireEvent.click(screen.getByRole("button", { name: "Planejar" }));
    await waitFor(() => expect(screen.getByTestId("path").textContent).toBe("/planejar"));
    expect(window.location.pathname).toBe("/trajeto-web/planejar");
    expect(window.location.search).toBe("?destino=Hospital");
    fireEvent.click(screen.getByRole("link", { name: "Salvos" }));
    await waitFor(() => expect(screen.getByTestId("path").textContent).toBe("/salvos"));
    expect(window.location.pathname).toBe("/trajeto-web/salvos");
  });
});
