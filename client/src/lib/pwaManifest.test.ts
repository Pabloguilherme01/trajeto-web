import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

type ManifestIcon = {
  src: string;
  sizes: string;
  type: string;
  purpose?: string;
};

type ManifestShortcut = {
  name: string;
  short_name?: string;
  description?: string;
  url: string;
  id?: string;
};

type WebManifest = {
  start_url?: string;
  scope?: string;
  icons?: ManifestIcon[];
  shortcuts?: ManifestShortcut[];
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

  it("keeps installed shortcuts aligned with the public flows they open", () => {
    expect(manifest.shortcuts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "Serviços públicos", url: "./servicos" }),
        expect.objectContaining({ name: "Canais de emergência" }),
        expect.objectContaining({ name: "Planejar rota", short_name: "Planejar", url: "./planejar", id: "planejar-rota" }),
        expect.objectContaining({ name: "Encontrar postos", url: "./postos?q=postos" }),
      ]),
    );
    expect(manifest.shortcuts?.some(item => /retomar/i.test(item.name))).toBe(false);
  });
});
