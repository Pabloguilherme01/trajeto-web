import fs from "node:fs";
import { replaceAuthorizedStations } from "../server/db";
import type { AuthorizedStationImport } from "../server/lib/anpAuthorizedStations";

const sourcePath = "/home/ubuntu/trajeto_analysis/data/anp_aguas_lindas_20260817.json";
const sourceReference = "https://www.gov.br/anp/pt-br/centrais-de-conteudo/dados-abertos/arquivos/arquivos-dados-cadastrais-dos-revendedores-varejistas-de-combustiveis-automotivos/dados-cadastrais-revendedores-varejistas-combustiveis-automoveis.csv";
const sourceUpdatedAt = new Date("2026-08-17T09:22:00-03:00");
const data = JSON.parse(fs.readFileSync(sourcePath, "utf8")) as { municipality: string; stations: Array<Omit<AuthorizedStationImport, "municipality" | "state" | "sourceReference" | "sourceUpdatedAt">> };
const stations: AuthorizedStationImport[] = data.stations.map(station => ({ ...station, municipality: data.municipality, state: "GO", sourceReference, sourceUpdatedAt }));

const result = await replaceAuthorizedStations(stations);
console.log(JSON.stringify(result));
