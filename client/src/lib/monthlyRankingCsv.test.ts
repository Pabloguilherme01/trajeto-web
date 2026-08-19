import { describe, expect, it } from "vitest";
import { monthlyRankingCsv } from "./monthlyRankingCsv";
describe("monthlyRankingCsv", () => { it("preserva posição e entrada no ranking", () => { expect(monthlyRankingCsv("2026-08", [{ position: 1, corridorLabel: "BR-070", alerts: 3, unread: 1, previousPosition: null, positionChange: null }])).toContain('"entrada"'); }); });
