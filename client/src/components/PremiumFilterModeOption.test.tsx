// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MapPin } from "lucide-react";
import PremiumFilterModeOption from "./PremiumFilterModeOption";

afterEach(cleanup);

describe("shared Premium filter option", () => {
  it("exposes availability as an accessible description while retaining the action label", () => {
    const { rerender } = render(<PremiumFilterModeOption layout="grid" ariaLabel="Resolver online"
      label="Resolver online" detail="Serviços digitais" availability="5 serviços"
      icon={MapPin} selected onSelect={() => undefined} />);
    const button = screen.getByRole("button", { name: "Resolver online" });
    const descriptionId = button.getAttribute("aria-describedby");
    expect(descriptionId).toBeTruthy();
    expect(document.getElementById(descriptionId!)?.textContent).toBe("5 serviços");
    rerender(<PremiumFilterModeOption layout="grid" ariaLabel="Resolver online"
      label="Resolver online" detail="Serviços digitais" availability="Atualizando"
      icon={MapPin} selected onSelect={() => undefined} />);
    expect(button.getAttribute("aria-describedby")).toBe(descriptionId);
    expect(document.getElementById(descriptionId!)?.textContent).toBe("Atualizando");
  });

  it("preserves a pressable rail mode and selected state", () => {
    const onSelect = vi.fn();
    const { rerender } = render(
      <PremiumFilterModeOption layout="rail" label="Com rota" detail="Com coordenadas"
        icon={MapPin} selected={false} onSelect={onSelect} />
    );
    const button = screen.getByRole("button", { name: /Com rota/ });
    expect(button.getAttribute("aria-pressed")).toBe("false");
    expect(button.className).toContain("min-w-[9.5rem]");
    expect(button.className).toContain("min-h-[4.25rem]");
    fireEvent.click(button);
    expect(onSelect).toHaveBeenCalledTimes(1);
    rerender(
      <PremiumFilterModeOption layout="rail" label="Com rota" detail="Com coordenadas"
        icon={MapPin} selected onSelect={onSelect} />
    );
    expect(button.getAttribute("aria-pressed")).toBe("true");
    expect(button.className).toContain("bg-primary/15");
  });

  it("preserves an exact accessible label for grid resource mode", () => {
    const onSelect = vi.fn();
    render(
      <PremiumFilterModeOption layout="grid" ariaLabel="Resolver online"
        label="Resolver online" detail="Serviços digitais"
        icon={MapPin} selected onSelect={onSelect} />
    );
    const button = screen.getByRole("button", { name: "Resolver online" });
    expect(button.className).toContain("min-h-[4.5rem]");
    expect(button.className).toContain("min-w-0");
    expect(button.getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(button);
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(button.querySelector("svg")?.closest('[aria-hidden="true"]')).not.toBeNull();
  });
});
