import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

type ManifestIcon = {
  src: string;
  sizes: string;
  type: string;
  purpose?: string;
};

type WebManifest = {
  start_url?: string;
  scope?: string;
  icons?: ManifestIcon[];
};

describe("PWA manifest", () => {
  const manifest = JSON.parse(
    readFileSync(new URL("../../public/site.webmanifest", import.meta.url), "utf8"),
  ) as WebManifest;

  it("declares the installable icon set used by the Pages artifact", () => {
    expect(manifest.icons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ src: "./icon-192.png", sizes: "192x192", type: "image/png" }),
        expect.objectContaining({ src: "./icon-512.png", sizes: "512x512", type: "image/png" }),
        expect.objectContaining({ src: "./icon-512-maskable.png", sizes: "512x512", purpose: "maskable" }),
        expect.objectContaining({ src: "./icon-1024.png", sizes: "1024x1024", type: "image/png" }),
      ]),
    );
  });

  it("keeps start_url inside the declared scope", () => {
    expect(manifest.scope).toBe("./");
    expect(manifest.start_url?.startsWith("./")).toBe(true);
  });
});
