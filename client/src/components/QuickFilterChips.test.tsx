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


it("brings a deep-linked active filter into the horizontal rail without page scrolling", () => {
  const originalRect = HTMLElement.prototype.getBoundingClientRect;
  const scroll = vi.fn();
  const originalScrollBy = HTMLElement.prototype.scrollBy;
  HTMLElement.prototype.scrollBy = scroll;
  HTMLElement.prototype.getBoundingClientRect = function () {
    const bounds = { left: 0, right: 320, width: 320, top: 0, bottom: 40, height: 40 };
    if (this.tagName === "BUTTON" && this.textContent === "Postos")
      return { ...bounds, left: 390, right: 470 } as DOMRect;
    return bounds as DOMRect;
  };
  try {
    render(<QuickFilterChips
      options={[{ label: "Saúde", value: "upa" }, { label: "Postos", value: "posto" }]}
      value="posto" onPick={vi.fn()}
    />);
    expect(scroll).toHaveBeenCalledWith({ left: 158, behavior: "auto" });
    expect(screen.getByRole("button", { name: "Postos" }).getAttribute("aria-pressed")).toBe("true");
  } finally {
    HTMLElement.prototype.getBoundingClientRect = originalRect;
    HTMLElement.prototype.scrollBy = originalScrollBy;
  }
});
