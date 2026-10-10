import { readFileSync } from "node:fs";
import path from "node:path";
import type { Plugin } from "vite";

/** The street catalog needs named roads; routing still fetches the full snapshot. */
export function namedRoadsPlugin(): Plugin {
  return {
    name: "named-road-catalog",
    enforce: "pre",
    resolveId(source, importer) {
      if (!source.endsWith("aguas-lindas-offline-map.json?named-roads") || !importer) return;
      return "\0named-road-catalog:" + path.resolve(path.dirname(importer), source.split("?")[0]) + ".js";
    },
    load(id) {
      if (!id.startsWith("\0named-road-catalog:")) return;
      const file = id.slice("\0named-road-catalog:".length, -3);
      this.addWatchFile(file);
      const snapshot = JSON.parse(readFileSync(file, "utf8"));
      const roads = snapshot.roads
        .filter((road: { name: string; points: number[][] }) => road.name.trim() && road.points.length)
        .map((road: { id: number; name: string; kind: string; points: number[][] }) => ({
          id: road.id, name: road.name, kind: road.kind, points: road.points,
        }));
      return `export default ${JSON.stringify({ retrievedAt: snapshot.retrievedAt, roads })};`;
    },
  };
}
