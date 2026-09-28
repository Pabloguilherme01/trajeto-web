import { describe, expect, it, vi } from "vitest";
import { shareText } from "./mobileTools";

describe("mobile sharing", () => {
  it("uses the native share API when available", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "share", { configurable: true, value: share });
    await shareText("Rota", "https://example.com/rota", "Trajeto");
    expect(share).toHaveBeenCalledWith({
      title: "Trajeto",
      text: "Rota",
      url: "https://example.com/rota",
    });
  });

  it("falls back to clipboard when native sharing is unavailable", async () => {
    Object.defineProperty(navigator, "share", { configurable: true, value: undefined });
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    await shareText("Rota", "https://example.com/rota", "Trajeto");
    expect(writeText).toHaveBeenCalledWith("Rota\nhttps://example.com/rota");
  });

  it("fails explicitly when neither sharing mechanism exists", async () => {
    Object.defineProperty(navigator, "share", { configurable: true, value: undefined });
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: undefined });
    await expect(shareText("Rota", "https://example.com/rota")).rejects.toThrow("Compartilhamento indisponível");
  });
});
