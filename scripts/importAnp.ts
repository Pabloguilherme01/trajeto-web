import { replaceAnpPriceSnapshots } from "../server/db";
import { DEFAULT_ANP_SOURCE_URL, downloadAndParseAnp } from "../server/lib/anpImport";

const rows = await downloadAndParseAnp(DEFAULT_ANP_SOURCE_URL);
const result = await replaceAnpPriceSnapshots(DEFAULT_ANP_SOURCE_URL, rows);
console.log(JSON.stringify({ source: DEFAULT_ANP_SOURCE_URL, ...result }, null, 2));
