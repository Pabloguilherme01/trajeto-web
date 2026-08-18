import { downloadAuthorizedStations } from "../server/lib/anpAuthorizedStations.ts";
import { replaceAuthorizedStations } from "../server/db.ts";

const { stations, queriedAt } = await downloadAuthorizedStations();
const result = await replaceAuthorizedStations(stations);
const byMunicipality = Object.entries(stations.reduce((counts, station) => {
  const key = `${station.municipality}/${station.state}`;
  counts[key] = (counts[key] ?? 0) + 1;
  return counts;
}, {}));

console.log(JSON.stringify({ ...result, queriedAt: queriedAt.toISOString(), byMunicipality }, null, 2));
