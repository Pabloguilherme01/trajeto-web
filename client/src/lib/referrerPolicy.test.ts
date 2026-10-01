import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("public referrer policy", () => {
  const html = readFileSync(
    new URL("../../index.html", import.meta.url),
    "utf8",
  );

  it("sends only the site origin to cross-origin public map services", () => {
    expect(html).toContain(
      '<meta name="referrer" content="strict-origin-when-cross-origin" />',
    );
    expect(html).not.toContain(
      '<meta name="referrer" content="no-referrer" />',
    );
  });
});
