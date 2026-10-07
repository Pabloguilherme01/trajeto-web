import { expect, it, vi } from "vitest";
import { loadCatalogChunks } from "./catalogChunks";

it("bounds concurrent loads, yields between parts and preserves unique records", async () => {
  let active = 0, peak = 0;
  const loaders = Array.from({ length: 7 }, (_, id) => async () => {
    peak = Math.max(peak, ++active);
    await Promise.resolve();
    active--;
    return [{ id: String(id), name: "record" }, { id: "shared", name: String(id) }];
  });
  const yields = vi.fn(async () => {});
  const rows = await loadCatalogChunks(loaders, chunk => chunk as Array<{ id: string; name: string }>, row => row.id, yields);
  expect(peak).toBeLessThanOrEqual(2);
  expect(yields).toHaveBeenCalledTimes(7);
  expect(rows).toHaveLength(8);
  expect(rows.find(row => row.id === "shared")?.name).toBe("6");
});

it("rejects incomplete catalogs and allows a complete retry", async () => {
  const bad = vi.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValue(["b"]);
  const loaders = [async () => ["a"], bad];
  const normalize = (value: unknown) => value as string[];
  await expect(loadCatalogChunks(loaders, normalize, row => row)).rejects.toThrow("offline");
  expect(await loadCatalogChunks(loaders, normalize, row => row)).toEqual(["a", "b"]);
});
