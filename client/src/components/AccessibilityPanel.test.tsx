// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import AccessibilityPanel from "./AccessibilityPanel";

describe("AccessibilityPanel", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => cleanup());

  it("opens the accessibility panel and persists a setting", () => {
    render(<AccessibilityPanel />);
    fireEvent.click(screen.getAllByRole("button", { name: "Abrir acessibilidade" })[0]);
    expect(screen.getByRole("dialog")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Texto maior/ }));
    expect(JSON.parse(localStorage.getItem("trajeto-accessibility-preferences") || "{}").largeText).toBe(true);
  });

  it("applies the economy preset locally", () => {
    render(<AccessibilityPanel />);
    fireEvent.click(screen.getAllByRole("button", { name: "Abrir acessibilidade" })[0]);
    fireEvent.click(screen.getByRole("button", { name: /Economia/ }));
    expect(JSON.parse(localStorage.getItem("trajeto-accessibility-preferences") || "{}")).toMatchObject({ compactMode:true, reduceMotion:true });
    expect(localStorage.getItem("trajeto-mobile-economy")).toBe("1");
  });
});
