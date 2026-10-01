import React, { useState } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { MapView } from "./Map";

beforeEach(() => vi.stubGlobal("React", React));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it("lets the caller replace a failed map with local content outside the fixed viewport", async () => {
  function Owner() {
    const [failed, setFailed] = useState(false);
    return failed ? <p role="status">Referências locais disponíveis</p> :
      <MapView deferUntilVisible={false} onLoadError={() => setFailed(true)} />;
  }
  render(<Owner />);
  expect(await screen.findByRole("status")).toBeTruthy();
  expect(screen.queryByRole("region", { name: "Mapa da rota" })).toBeNull();
});
