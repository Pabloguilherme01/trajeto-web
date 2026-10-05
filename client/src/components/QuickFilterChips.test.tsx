import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import QuickFilterChips from "./QuickFilterChips";

afterEach(() => cleanup());

it("renders accessible ready filters and returns the selected value", () => {
  const onPick = vi.fn();
  render(<QuickFilterChips options={[{ label: "Saúde", value: "upa" }, { label: "Postos", value: "posto" }]} value="upa" onPick={onPick} />);
  expect(screen.getByRole("button", { name: "Saúde" }).getAttribute("aria-pressed")).toBe("true");
  fireEvent.click(screen.getByRole("button", { name: "Postos" }));
  expect(onPick).toHaveBeenCalledWith("posto");
});


it("marks equivalent accented text as the active quick filter", () => {
  render(<QuickFilterChips options={[{ label: "Rodoviária", value: "rodoviaria" }]} value="Rodoviária" onPick={vi.fn()} />);
  expect(screen.getByRole("button", { name: "Rodoviária" }).getAttribute("aria-pressed")).toBe("true");
});

it("uses semantic theme tokens in light and dark variants", () => {
  const { rerender } = render(
    <QuickFilterChips
      variant="light"
      options={[{ label: "Saúde", value: "upa" }]}
      value="upa"
      onPick={vi.fn()}
    />
  );
  const light = screen.getByRole("button", { name: "Saúde" });
  expect(light.className).toContain("border-accent/40");
  expect(light.className).toContain("text-accent");
  expect(light.className).toContain("focus-visible:outline-ring");
  expect(light.className).not.toContain("#");

  rerender(
    <QuickFilterChips
      variant="dark"
      options={[{ label: "Saúde", value: "upa" }]}
      value=""
      onPick={vi.fn()}
    />
  );
  const dark = screen.getByRole("button", { name: "Saúde" });
  expect(dark.className).toContain("border-border/60");
  expect(dark.className).toContain("text-foreground/80");
  expect(dark.className).toContain("focus-visible:outline-ring");
  expect(dark.className).not.toContain("#");
});

