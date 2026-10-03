import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import ArrivalTimePlannerCard from "./ArrivalTimePlannerCard";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("ArrivalTimePlannerCard", () => {
  it("calculates a local departure time from the selected arrival and margin", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 3, 18, 0, 0));
    render(<ArrivalTimePlannerCard durationSeconds={30 * 60} />);

    fireEvent.click(screen.getByText(/Precisa chegar em um horário/));
    fireEvent.change(screen.getByLabelText("Quero chegar às"), { target: { value: "19:00" } });
    fireEvent.change(screen.getByLabelText("Margem extra"), { target: { value: "10" } });

    expect(screen.getByText("18:20")).toBeTruthy();
    expect(screen.getByText("19:00")).toBeTruthy();
    expect(screen.getByText("40 min")).toBeTruthy();
    expect(screen.getByText(/Tudo calculado neste aparelho/)).toBeTruthy();
  });

  it("does not render without a usable route duration", () => {
    const { container } = render(<ArrivalTimePlannerCard durationSeconds={null} />);
    expect(container.firstChild).toBeNull();
  });
});
