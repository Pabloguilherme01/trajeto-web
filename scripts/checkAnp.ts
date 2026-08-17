import { DEFAULT_ANP_SOURCE_URL, downloadAndParseAnp } from "../server/lib/anpImport";

const rows = await downloadAndParseAnp(DEFAULT_ANP_SOURCE_URL);
console.log(JSON.stringify({ source: DEFAULT_ANP_SOURCE_URL, importedCandidates: rows.length, firstRecord: rows[0] }, null, 2));
