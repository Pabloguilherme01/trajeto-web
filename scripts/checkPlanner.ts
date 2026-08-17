import { appRouter } from "../server/routers";

const caller = appRouter.createCaller({ user: null, req: {} as never, res: {} as never });
const result = await caller.routes.plan({ origin: "Brasília, DF", destination: "Águas Lindas de Goiás, GO", locationConsent: false });
console.log(JSON.stringify({
  route: result.route,
  stops: result.stops.length,
  anpReferences: result.anpReferences.length,
  firstAnpReference: result.anpReferences[0] ?? null,
}, null, 2));
