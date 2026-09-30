import { describe, expect, it } from "vitest";
import {
  PLACE_CATEGORY_ICONS,
  PLACE_CATEGORY_LABELS,
  type PlaceCategory,
} from "./placeEntity";

describe("placeEntity category metadata", () => {
  it("covers every supported category", () => {
    const categories: PlaceCategory[] = [
      "fuel",
      "health",
      "education",
      "transport",
      "government",
      "security",
      "leisure",
      "accessibility",
      "territory",
    ];

    for (const category of categories) {
      expect(PLACE_CATEGORY_LABELS[category]).toBeTruthy();
      expect(PLACE_CATEGORY_ICONS[category]).toBeTruthy();
    }
  });

  it("keeps the territorial category explicit", () => {
    expect(PLACE_CATEGORY_LABELS.territory).toBe("Território");
    expect(PLACE_CATEGORY_ICONS.territory).toBe("📍");
  });
});
