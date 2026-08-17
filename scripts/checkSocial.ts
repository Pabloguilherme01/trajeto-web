import { appRouter } from "../server/routers";

const caller = appRouter.createCaller({ user: null, req: {} as never, res: {} as never });
const links = await caller.social.publicLinks();
console.log(JSON.stringify({ activePublicLinks: links.length }, null, 2));
