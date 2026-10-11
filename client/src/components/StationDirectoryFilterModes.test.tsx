// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import StationDirectoryFilterModes from "./StationDirectoryFilterModes";

afterEach(cleanup);

describe("premium station filter modes", () => {
  it("exposes four one-tap accessible mobile modes with an active pressed state", () => {
    const onSelect = vi.fn();
    render(<StationDirectoryFilterModes mode="all" onSelect={onSelect} />);
    const rail = screen.getByRole("group", { name: "Modos de filtro dos postos" });
    const buttons = within(rail).getAllByRole("button");
    expect(buttons).toHaveLength(4);
    expect(buttons[0].getAttribute("aria-pressed")).toBe("true");
    for (const button of buttons.slice(1))
      expect(button.getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(within(rail).getByRole("button", { name: /Dados ANP/ }));
    expect(onSelect).toHaveBeenCalledWith("anp");
    fireEvent.click(within(rail).getByRole("button", { name: /Com rota/ }));
    expect(onSelect).toHaveBeenCalledWith("route");
    fireEvent.click(within(rail).getByRole("button", { name: /Endereço/ }));
    expect(onSelect).toHaveBeenCalledWith("address");
  });

  it("reflects advanced custom combinations without claiming a preset is selected", () => {
    const onSelect = vi.fn();
    const { rerender } = render(<StationDirectoryFilterModes mode="custom" onSelect={onSelect} />);
    expect(screen.getByRole("status").textContent).toBe("Personalizado");
    expect(within(screen.getByRole("group", { name: "Modos de filtro dos postos" }))
      .getAllByRole("button").every(b => b.getAttribute("aria-pressed") === "false")).toBe(true);
    rerender(<StationDirectoryFilterModes mode="route" onSelect={onSelect} />);
    expect(screen.queryByRole("status")).toBeNull();
    expect(screen.getByRole("button", { name: /Com rota/ }).getAttribute("aria-pressed")).toBe("true");
  });
});
