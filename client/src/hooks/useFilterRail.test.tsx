// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import StationDirectoryFilterModes from "@/components/StationDirectoryFilterModes";

afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

it("reveals an externally selected station mode and keyboard focus only inside the rail", () => {
  const scroll = vi.fn();
  vi.stubGlobal("scrollBy", vi.fn());
  const original = HTMLElement.prototype.scrollBy;
  HTMLElement.prototype.scrollBy = scroll;
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
    const left = this.tagName === "BUTTON" && this.textContent?.includes("Endereço") ? 480 : 0;
    return { left, right: left + (left ? 152 : 320), top: 0, bottom: 68, width: left ? 152 : 320, height: 68, x: left, y: 0, toJSON() {} };
  });
  try {
    const { rerender } = render(<StationDirectoryFilterModes mode="address" onSelect={vi.fn()} />);
    expect(scroll).toHaveBeenCalledWith({ left: 320, behavior: "auto" });
    expect(window.scrollBy).not.toHaveBeenCalled();
    scroll.mockClear();
    rerender(<StationDirectoryFilterModes mode="address" onSelect={vi.fn()} />);
    expect(scroll).not.toHaveBeenCalled();
    fireEvent.focus(screen.getByRole("button", { name: /Endereço/ }));
    expect(scroll).toHaveBeenCalledWith({ left: 320, behavior: "auto" });
    expect(window.scrollBy).not.toHaveBeenCalled();
  } finally { HTMLElement.prototype.scrollBy = original; }
});

it("does not move a pressed pointer target before its click can complete", () => {
  const originalScroll = HTMLElement.prototype.scrollBy;
  const scroll = vi.fn();
  HTMLElement.prototype.scrollBy = scroll;
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
    const left = this.tagName === "BUTTON" ? 480 : 0;
    return { left, right: left + 152, top: 0, bottom: 48, width: 152, height: 48, x: left, y: 0, toJSON() {} };
  });
  try {
    render(<StationDirectoryFilterModes mode="address" onSelect={vi.fn()} />);
    const button = screen.getByRole("button", { name: /Endereço/ });
    // jsdom has no pointer hit-testing. Simulate the browser's :active state
    // observed between pointerdown and pointerup, while focus is delivered.
    const matches = button.matches.bind(button);
    vi.spyOn(button, "matches").mockImplementation(selector => selector === ":active" || matches(selector));
    scroll.mockClear();
    fireEvent.focus(button);
    expect(scroll).not.toHaveBeenCalled();
  } finally {
    HTMLElement.prototype.scrollBy = originalScroll;
  }
});
