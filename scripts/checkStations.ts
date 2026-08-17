import { appRouter } from "../server/routers";

const caller = appRouter.createCaller({ user: null, req: {} as never, res: {} as never });
const result = await caller.stationDirectory.search({ query: "Brasília, DF" });
console.log(JSON.stringify({
  query: result.query,
  stations: result.stations.length,
  firstStation: result.stations[0] ?? null,
}, null, 2));
