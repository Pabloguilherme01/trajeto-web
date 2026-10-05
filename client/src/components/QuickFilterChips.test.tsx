import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import QuickFilterChips from "./QuickFilterChips";

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
