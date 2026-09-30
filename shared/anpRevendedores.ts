export type AnpFuelRow = {
  codigoSimp: string | null;
  autorizacao: string | null;
  dataPublicacao: string | null;
  razaoSocial: string | null;
  cnpj: string;
  endereco: string | null;
  complemento: string | null;
  bairro: string | null;
  cep: string | null;
  uf: string | null;
  municipio: string | null;
  distribuidora: string | null;
  dataVinculacao: string | null;
  classe: string | null;
  produto: string | null;
  tancagem: number | null;
  unidadeMedidaTancagem: string | null;
  quantidadeBicos: number | null;
  latitude: number | null;
  longitude: number | null;
  latitudeAnp4c: number | null;
  longitudeAnp4c: number | null;
  validacao: string | null;
  estimativaAcuraciaM: number | null;
  srid: string | null;
  sistemaReferenciaCoordenadas: string | null;
  dataObtencao: string | null;
  origemInformacao: string | null;
  situacaoConstatada: string | null;
  observacao: string | null;
  statusSigaf: string | null;
};

export type AnpStationProduct = {
  produto: string | null;
  tancagem: number | null;
  unidadeMedidaTancagem: string | null;
  quantidadeBicos: number | null;
  classe: string | null;
};

export type AnpStation = {
  cnpj: string;
  codigoSimp: string | null;
  autorizacao: string | null;
  dataPublicacao: string | null;
  razaoSocial: string | null;
  endereco: string | null;
  complemento: string | null;
  bairro: string | null;
  cep: string | null;
  uf: string | null;
  municipio: string | null;
  distribuidora: string | null;
  dataVinculacao: string | null;
  latitude: number | null;
  longitude: number | null;
  latitudeAnp4c: number | null;
  longitudeAnp4c: number | null;
  validacao: string | null;
  estimativaAcuraciaM: number | null;
  srid: string | null;
  sistemaReferenciaCoordenadas: string | null;
  dataObtencao: string | null;
  origemInformacao: string | null;
  situacaoConstatada: string | null;
  observacao: string | null;
  statusSigaf: string | null;
  products: AnpStationProduct[];
};

const aliases: Record<keyof AnpFuelRow, string[]> = {
  codigoSimp: ["codigoSIMP","codigoSimp","CodigoSIMP","CODIGOISIMP"],
  autorizacao: ["autorizacao","Autorizacao","AUTORIZACAO"],
  dataPublicacao: ["dataPublicacao","DataPublicacao","DATAPUBLICACAO"],
  razaoSocial: ["razaoSocial","RazaoSocial","RAZAOSOCIAL"],
  cnpj: ["cnpj","CNPJ"],
  endereco: ["endereco","Endereco","ENDERECO"],
  complemento: ["complemento","Complemento","COMPLEMENTO"],
  bairro: ["bairro","Bairro","BAIRRO"],
  cep: ["cep","CEP"],
  uf: ["uf","UF"],
  municipio: ["municipio","Municipio","MUNICIPIO"],
  distribuidora: ["distribuidora","Distribuidora","DISTRIBUIDORA","bandeira","BANDEIRA"],
  dataVinculacao: ["dataVinculacao","DataVinculacao","DATAVINCULACAO"],
  classe: ["classe","Classe","CLASSE"],
  produto: ["produto","Produto","PRODUTO"],
  tancagem: ["tancagem","Tancagem","TANCAGEM"],
  unidadeMedidaTancagem: ["unidadeMedidaTancagem","UnidadeMedidaTancagem","UNIDADEMEDIDATANCAGEM"],
  quantidadeBicos: ["quantidadeBicos","QuantidadeBicos","QUANTIDADEBICOS"],
  latitude: ["latitude","Latitude","LATITUDE"],
  longitude: ["longitude","Longitude","LONGITUDE"],
  latitudeAnp4c: ["latitudeANP4C","latitudeAnp4c","LATITUDEANP4C"],
  longitudeAnp4c: ["longitudeANP4C","longitudeAnp4c","LONGITUDEANP4C"],
  validacao: ["validacao","Validacao","VALIDACAO"],
  estimativaAcuraciaM: ["estimativaAcuraciaM","EstimativaAcuraciaM","ESTIMATIVAACURACIAM"],
  srid: ["srid","SRID"],
  sistemaReferenciaCoordenadas: ["sistemaReferenciaCoordenadas","SistemaReferenciaCoordenadas","SISTEMAREFERENCIACOORDENADAS"],
  dataObtencao: ["dataObtencao","DataObtencao","DATAOBTENCAO"],
  origemInformacao: ["origemInformacao","OrigemInformacao","ORIGEMINFORMACAO"],
  situacaoConstatada: ["situacaoConstatada","SituacaoConstatada","SITUACAOCONSTATADA"],
  observacao: ["observacao","Observacao","OBSERVACAO"],
  statusSigaf: ["statusSIGAF","statusSigaf","StatusSIGAF","STATUSSIGAF"],
};

function valueFor(row: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null && String(row[key]).trim() !== "") return row[key];
  }
  return null;
}

function textFor(row: Record<string, unknown>, key: keyof AnpFuelRow) {
  const value = valueFor(row, aliases[key]);
  return value == null ? null : String(value).trim() || null;
}

function numberFor(row: Record<string, unknown>, key: keyof AnpFuelRow) {
  const value = valueFor(row, aliases[key]);
  if (value == null) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const normalized = String(value).trim().replace(/\./g, "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function normalizeAnpFuelRow(input: Record<string, unknown>): AnpFuelRow | null {
  const cnpj = textFor(input, "cnpj")?.replace(/\D/g, "") ?? "";
  if (!cnpj) return null;
  return {
    codigoSimp: textFor(input, "codigoSimp"),
    autorizacao: textFor(input, "autorizacao"),
    dataPublicacao: textFor(input, "dataPublicacao"),
    razaoSocial: textFor(input, "razaoSocial"),
    cnpj,
    endereco: textFor(input, "endereco"),
    complemento: textFor(input, "complemento"),
    bairro: textFor(input, "bairro"),
    cep: textFor(input, "cep"),
    uf: textFor(input, "uf"),
    municipio: textFor(input, "municipio"),
    distribuidora: textFor(input, "distribuidora"),
    dataVinculacao: textFor(input, "dataVinculacao"),
    classe: textFor(input, "classe"),
    produto: textFor(input, "produto"),
    tancagem: numberFor(input, "tancagem"),
    unidadeMedidaTancagem: textFor(input, "unidadeMedidaTancagem"),
    quantidadeBicos: numberFor(input, "quantidadeBicos"),
    latitude: numberFor(input, "latitude"),
    longitude: numberFor(input, "longitude"),
    latitudeAnp4c: numberFor(input, "latitudeAnp4c"),
    longitudeAnp4c: numberFor(input, "longitudeAnp4c"),
    validacao: textFor(input, "validacao"),
    estimativaAcuraciaM: numberFor(input, "estimativaAcuraciaM"),
    srid: textFor(input, "srid"),
    sistemaReferenciaCoordenadas: textFor(input, "sistemaReferenciaCoordenadas"),
    dataObtencao: textFor(input, "dataObtencao"),
    origemInformacao: textFor(input, "origemInformacao"),
    situacaoConstatada: textFor(input, "situacaoConstatada"),
    observacao: textFor(input, "observacao"),
    statusSigaf: textFor(input, "statusSigaf"),
  };
}

export function groupAnpFuelRows(rows: AnpFuelRow[]): AnpStation[] {
  const grouped = new Map<string, AnpStation>();
  for (const row of rows) {
    const current = grouped.get(row.cnpj);
    const product: AnpStationProduct = {
      produto: row.produto,
      tancagem: row.tancagem,
      unidadeMedidaTancagem: row.unidadeMedidaTancagem,
      quantidadeBicos: row.quantidadeBicos,
      classe: row.classe,
    };
    if (!current) {
      grouped.set(row.cnpj, {
        cnpj: row.cnpj,
        codigoSimp: row.codigoSimp,
        autorizacao: row.autorizacao,
        dataPublicacao: row.dataPublicacao,
        razaoSocial: row.razaoSocial,
        endereco: row.endereco,
        complemento: row.complemento,
        bairro: row.bairro,
        cep: row.cep,
        uf: row.uf,
        municipio: row.municipio,
        distribuidora: row.distribuidora,
        dataVinculacao: row.dataVinculacao,
        latitude: row.latitude,
        longitude: row.longitude,
        latitudeAnp4c: row.latitudeAnp4c,
        longitudeAnp4c: row.longitudeAnp4c,
        validacao: row.validacao,
        estimativaAcuraciaM: row.estimativaAcuraciaM,
        srid: row.srid,
        sistemaReferenciaCoordenadas: row.sistemaReferenciaCoordenadas,
        dataObtencao: row.dataObtencao,
        origemInformacao: row.origemInformacao,
        situacaoConstatada: row.situacaoConstatada,
        observacao: row.observacao,
        statusSigaf: row.statusSigaf,
        products: [product],
      });
      continue;
    }
    current.products.push(product);
  }
  return [...grouped.values()].sort((a, b) =>
    (a.bairro ?? "").localeCompare(b.bairro ?? "", "pt-BR") ||
    (a.razaoSocial ?? "").localeCompare(b.razaoSocial ?? "", "pt-BR")
  );
}
