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

it("updates the active chip when a new filter-list snapshot replaces the previous options", () => {
  const onPick = vi.fn();
  const { rerender } = render(
    <QuickFilterChips options={[{ label: "UBS", value: "ubs" }]} value="ubs" onPick={onPick} />
  );
  expect(screen.getByRole("button", { name: "UBS" }).getAttribute("aria-pressed")).toBe("true");
  rerender(
    <QuickFilterChips options={[{ label: "Hospitais", value: "hospital" }]} value="hospital" onPick={onPick} />
  );
  expect(screen.queryByRole("button", { name: "UBS" })).toBeNull();
  expect(screen.getByRole("button", { name: "Hospitais" }).getAttribute("aria-pressed")).toBe("true");
  fireEvent.click(screen.getByRole("button", { name: "Hospitais" }));
  expect(onPick).toHaveBeenCalledWith("hospital");
});

it("does not repeatedly scroll the active chip during unrelated page rerenders", () => {
  const options = [
    { label: "Saúde", value: "upa" },
    { label: "Postos", value: "posto" },
  ];
  const originalRect = HTMLElement.prototype.getBoundingClientRect;
  const originalScrollBy = HTMLElement.prototype.scrollBy;
  const scroll = vi.fn();
  HTMLElement.prototype.scrollBy = scroll;
  HTMLElement.prototype.getBoundingClientRect = function () {
    const rect = { left: 0, right: 320, width: 320, top: 0, bottom: 40, height: 40 };
    if (this.tagName === "BUTTON" && this.textContent === "Postos")
      return { ...rect, left: 390, right: 470 } as DOMRect;
    return rect as DOMRect;
  };
  try {
    const { rerender } = render(
      <QuickFilterChips options={options} value="posto" onPick={vi.fn()} />
    );
    expect(scroll).toHaveBeenCalledTimes(1);
    rerender(<QuickFilterChips options={options} value="posto" className="mt-3" onPick={vi.fn()} />);
    rerender(<QuickFilterChips options={options} value="posto" className="mt-5" onPick={vi.fn()} />);
    expect(scroll).toHaveBeenCalledTimes(1);
    rerender(<QuickFilterChips options={options} value="upa" onPick={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Saúde" }).getAttribute("aria-pressed")).toBe("true");
    const afterActualSelectionChange = scroll.mock.calls.length;
    rerender(<QuickFilterChips options={options} value="posto" onPick={vi.fn()} />);
    expect(scroll).toHaveBeenCalledTimes(afterActualSelectionChange + 1);
  } finally {
    HTMLElement.prototype.getBoundingClientRect = originalRect;
    HTMLElement.prototype.scrollBy = originalScrollBy;
  }
});

it("preserves the user's horizontal scroll across equivalent mobile filter snapshots", () => {
  const originalRect = HTMLElement.prototype.getBoundingClientRect;
  const originalScroll = HTMLElement.prototype.scrollBy;
  const railScroll = vi.fn();
  const options = () => [
    { label: "Saúde", value: "upa" },
    { label: "Postos", value: "posto" },
  ];
  HTMLElement.prototype.scrollBy = railScroll;
  HTMLElement.prototype.getBoundingClientRect = function () {
    const rect = { left: 0, right: 320, width: 320, top: 0, bottom: 44, height: 44 };
    if (this.tagName === "BUTTON" && (this.textContent === "Postos" || this.textContent === "Abastecer")) {
      return { ...rect, left: 390, right: 470 } as DOMRect;
    }
    return rect as DOMRect;
  };
  try {
    const { rerender } = render(
      <QuickFilterChips options={options()} value="posto" onPick={vi.fn()} />
    );
    expect(railScroll).toHaveBeenCalledTimes(1);

    // A parent may create new arrays while updating counters or another
    // filter. Keep the user's manual horizontal position in that case.
    rerender(<QuickFilterChips options={options()} value="posto" onPick={vi.fn()} />);
    rerender(<QuickFilterChips options={options()} value="posto" className="mt-3" onPick={vi.fn()} />);
    expect(railScroll).toHaveBeenCalledTimes(1);

    // An actual replacement of the selected button still reveals it.
    rerender(<QuickFilterChips
      options={[{ label: "Saúde", value: "upa" }, { label: "Abastecer", value: "posto" }]}
      value="posto" onPick={vi.fn()}
    />);
    expect(railScroll).toHaveBeenCalledTimes(2);
    rerender(<QuickFilterChips options={options()} value="upa" onPick={vi.fn()} />);
    rerender(<QuickFilterChips options={options()} value="posto" onPick={vi.fn()} />);
    expect(railScroll).toHaveBeenCalledTimes(3);
    expect(screen.getByRole("button", { name: "Postos" }).getAttribute("aria-pressed")).toBe("true");
  } finally {
    HTMLElement.prototype.getBoundingClientRect = originalRect;
    HTMLElement.prototype.scrollBy = originalScroll;
  }
});
