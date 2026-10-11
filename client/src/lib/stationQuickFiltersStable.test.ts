import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("station corridor quick-filter options", () => {
  const source = readFileSync(new URL("../pages/Stations.tsx", import.meta.url), "utf8");

  it("defines the six unchanged quick choices once, outside the page component", () => {
    const start = source.indexOf("const STATION_CORRIDOR_QUICK_FILTERS = [");
    const page = source.indexOf("export default function Stations(");
    expect(start).toBeGreaterThan(-1);
    expect(start).toBeLessThan(page);
    const options = source.slice(start, source.indexOf("];", start));
    for (const name of [
      "Águas Lindas", "BR-070", "Jardim Brasília",
      "Parque da Barragem", "Centro", "Rodoviária",
    ]) expect(options).toContain(`label: "${name}"`);
    expect(source).toContain("options={STATION_CORRIDOR_QUICK_FILTERS}");
    expect(source).not.toContain("options={[");
  });

  it("keeps chip normalization and scroll dependent on actual choices, not parent renders", () => {
    const chips = readFileSync(new URL("../components/QuickFilterChips.tsx", import.meta.url), "utf8");
    expect(chips).toContain("useMemo(() => options.map(");
    expect(chips).toContain("}, [normalizedValue, normalizedOptions]);");
  });
});
