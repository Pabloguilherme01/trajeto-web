import { describe, expect, it } from "vitest";
import {
  plannerExperienceDetail,
  resolvePlannerExperience,
} from "./plannerModes";

describe("planner modes", () => {
  it("defaults to smart mode", () => {
    expect(resolvePlannerExperience(new URLSearchParams())).toBe("smart");
  });

  it("preserves legacy economy and driving links", () => {
    expect(
      resolvePlannerExperience(new URLSearchParams("economia=1"))
    ).toBe("economy");
    expect(
      resolvePlannerExperience(new URLSearchParams("conducao=1"))
    ).toBe("driving");
  });

  it("lets the explicit experience override legacy query flags", () => {
    expect(
      resolvePlannerExperience(
        new URLSearchParams("experiencia=offline&economia=1")
      )
    ).toBe("offline");
  });

  it("recognizes the explicit privacy-first mode", () => {
    expect(
      resolvePlannerExperience(new URLSearchParams("experiencia=private"))
    ).toBe("private");
  });

  it("keeps each mode explanatory", () => {
    expect(plannerExperienceDetail("offline")).toMatch(/rotas salvas/i);
    expect(plannerExperienceDetail("smart")).toMatch(/melhor camada/i);
    expect(plannerExperienceDetail("private")).toMatch(/somente nesta sessão/i);
  });
});
