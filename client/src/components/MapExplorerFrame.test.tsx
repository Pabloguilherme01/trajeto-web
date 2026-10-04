import React, { useEffect, useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import MapExplorerFrame from "./MapExplorerFrame";
afterEach(cleanup);
it("preserves the map instance, restores focus and unlocks scrolling on Escape", () => {
  const mounted = vi.fn();
  function Map() {
    const [value, setValue] = useState(0);
    useEffect(mounted, []);
    return <button onClick={() => setValue(value + 1)}>Câmera {value}</button>;
  }
  document.body.style.overflow = "auto";
  render(
    <MapExplorerFrame label="Mapa">
      <Map />
    </MapExplorerFrame>
  );
  fireEvent.click(screen.getByText("Câmera 0"));
  const open = screen.getByRole("button", { name: "Abrir mapa em tela cheia" });
  open.focus();
  fireEvent.click(open);
  expect(screen.getByRole("dialog").getAttribute("aria-modal")).toBe("true");
  expect(screen.getByRole("dialog").parentNode).toBe(document.body);
  expect(document.body.style.overflow).toBe("hidden");
  expect(screen.getByText("Câmera 1")).toBeTruthy();
  fireEvent.keyDown(document, { key: "Escape" });
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(open.closest(".map-explorer-frame")?.parentNode).not.toBe(document.body);
  expect(document.activeElement).toBe(open);
  expect(document.body.style.overflow).toBe("auto");
  expect(mounted).toHaveBeenCalledTimes(1);
});
it("restores scrolling if an expanded map is unmounted", () => {
  document.body.style.overflow = "scroll";
  const view = render(
    <MapExplorerFrame label="Mapa">
      <p>Mapa</p>
    </MapExplorerFrame>
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Abrir mapa em tela cheia" })
  );
  view.unmount();
  expect(document.body.style.overflow).toBe("scroll");
  document.body.style.overflow = "";
});
