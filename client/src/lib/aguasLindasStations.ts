export type LocalStationRecord = {
  id: string;
  legalName: string;
  displayName: string;
  cnpj: string;
  neighborhood: string | null;
  address: string | null;
  brand: string | null;
  aliases: string[];
  status: "cadastro_ativo";
  sourceNote: string;
  anp?: { authorization?: string | null; anpCode?: string | null; lastAnpUpdate?: string | null; products?: string[]; distributor?: string | null; tankCapacityLiters?: number | null; nozzleCount?: number | null; interdicted?: boolean | null; latitude?: number | null; longitude?: number | null };
  mapData?: { phone?: string | null; rating?: number | null; reviewCount?: number | null; hours?: string | null; observedBrand?: string | null; operationalStatus?: "open" | "closed" | "unknown"; observedAt?: string | null; source?: "maps" };
  priceData?: { referenceDate?: string | null; gasoline?: number | null; ethanol?: number | null; dieselS10?: number | null; dieselS500?: number | null; glpP13?: number | null; gnv?: number | null; source?: "ANP" };
  dataQuality?: "anp-confirmed" | "cross-checked" | "catalog-only";
  dataOrigin?: "ANP" | "cross-check" | "local-catalog";
  verifiedAt?: string | null;
  verificationFlags?: { address?: boolean; coordinates?: boolean; authorization?: boolean; brand?: boolean };
};

export const AGUAS_LINDAS_STATIONS_UPDATED_AT = "2026-09-30";
export const AGUAS_LINDAS_STATIONS_COUNT = 41;
export const AGUAS_LINDAS_SOURCE_REGISTRY = {
  anp: {
    status: "official",
    updatedAt: "2026-09-28",
    scope: "revendedores varejistas de combustíveis automotivos em operação",
    fields: ["autorização", "razão social", "CNPJ", "endereço", "bairro", "CEP", "UF", "município", "bandeira"],
  },
  anpApi: {
    status: "official",
    scope: "consulta por CNPJ/UF/município",
    fields: ["produtos", "distribuidor", "tancagem", "bicos", "situação Sigaf", "coordenadas", "histórico de bandeira"],
  },
  prices: {
    status: "official",
    period: "20/09/2026 a 26/09/2026",
    note: "somente postos com coleta aparecem na amostra; ausência não significa fechamento.",
  },
  maps: {
    status: "supplementary",
    note: "nome comercial, telefone, horário, avaliações e localização; não comprova autorização ANP.",
  },
} as const;

export const AGUAS_LINDAS_DATA_AUDIT = {
  checkedAt: "2026-09-30",
  officialAnpBaseUpdatedAt: "2026-09-28",
  officialSource: "ANP - Dados Cadastrais dos Revendedores Varejistas de Combustíveis Automotivos",
  officialApiAvailable: true,
  officialFields: ["CNPJ", "endereço", "produtos", "distribuidor", "tancagem", "bicos", "situação Sigaf", "coordenadas"],
  priceWeek: "20/09/2026 a 26/09/2026",
  priceSource: "ANP - Levantamento de Preços de Combustíveis",
  rule: "Não tratar resultado de mapa como autorização ANP; não tratar ausência de preço como ausência de posto; conciliar duplicidades por CNPJ, endereço e coordenadas.",
} as const;

export const AGUAS_LINDAS_ACTIVE_CNAE_REFERENCE = {
  count: 31,
  cnae: "4731-8/00",
  checkedAt: "2026-09-30",
  source: "Torêva / consulta empresarial",
  note: "Referência externa de 31 empresas ativas no CNAE; não substitui a base oficial de revendedores autorizados da ANP.",
} as const;
export const AGUAS_LINDAS_ANP_VERIFIED_COUNT = null;

export const AGUAS_LINDAS_ANP_CATALOG_REFERENCE = {
  count: 33,
  checkedAt: "2026-09-30",
  source: "Base oficial ANP disponível para exportação/API",
  note: "Snapshot municipal oficial materializado em 30/09/2026 com 33 CNPJs distintos retornados pela base usada no sincronismo.",
} as const;

export const AGUAS_LINDAS_PRICE_REFERENCE = {
  period: "20/09/2026 a 26/09/2026",
  gasolineCommon: { average: 6.78, sampledStations: 8 },
  ethanol: { average: 4.59, sampledStations: 8 },
  dieselS10: { average: 7.27, sampledStations: 7 },
  dieselS500: { average: 6.94, sampledStations: 6 },
  glpP13: { average: 107.53, sampledStations: 13 },
  gnv: { average: 3.89, sampledStations: 1 },
  source: "ANP",
  note: "Médias municipais da amostra semanal; não representam preço atual individual de cada posto.",
} as const;

export const AGUAS_LINDAS_STATIONS_LAST_SYNC = "2026-09-30";
export const AGUAS_LINDAS_ANP_API_SCOPE = "GO / Águas Lindas de Goiás";
export const AGUAS_LINDAS_DATA_POLICY = "ANP é a fonte primária para status cadastral; fontes secundárias apenas complementam nomes/endereço quando necessário.";

export const AGUAS_LINDAS_MAP_ONLY_DISCOVERIES = [
  { displayName: "Posto Ponteio", address: "Av. Brasília, 3379, Parque da Barragem, Águas Lindas de Goiás - GO", phone: "(61) 99881-2916", rating: 3.9, reviews: 835, hours: "24h", note: "Mapa; conciliação cadastral pendente." },
  { displayName: "Posto gasolina Petrobrás", address: "Quadra 76, Cidade Jardim, Águas Lindas de Goiás - GO", phone: "(77) 98120-7995", rating: 3.8, reviews: 19, hours: "06:00–23:00", note: "Mapa; conciliação cadastral pendente." },
  { displayName: "Posto Petrobras", address: "Gleba 2B, Fazenda Cachoeira e Saltador, Águas Lindas de Goiás - GO", phone: "(61) 98494-4864", rating: 4.2, reviews: 240, hours: "24h em parte da semana", note: "Mapa; possível correspondência com Mizuno Kay & Cia." },
  { displayName: "Posto BR", address: "Rua Doze, Jardim Querência, Águas Lindas de Goiás - GO", phone: "0800 281 5000", rating: 4.2, reviews: 113, hours: null, note: "Mapa; possível correspondência com Auto Posto Pérola ou outro cadastro deve ser validada por CNPJ." },
  { displayName: "Posto Ipiranga", address: "Q. 08, lotes 16, 17 e 18, Jardim Querência, Águas Lindas de Goiás - GO", phone: "0800 725 7333", rating: 4.0, reviews: 396, hours: null, note: "Mapa; endereço coincide com Auto Posto DF 180." },
  { displayName: "Posto Shell - Aguas Lindas", address: "BR-070, 285, Mansões Centroeste, Águas Lindas de Goiás - GO", phone: null, rating: 3.7, reviews: 466, hours: "06:00–23:00", note: "Mapa; conciliação cadastral pendente." },
  { displayName: "Auto Posto J J Junior", address: "Av. Comercial, 12, Cidade do Entorno, Águas Lindas de Goiás - GO", phone: "(61) 3616-1226", rating: 4.0, reviews: 279, hours: "24h", note: "Mapa; possível correspondência com Auto Posto JJR/J.J., endereço requer validação." },
  { displayName: "Posto Premium", address: "Av. Brasília, 17, Jardim da Barragem II, Águas Lindas de Goiás - GO", phone: null, rating: 3.9, reviews: 8, hours: "24h", note: "Mapa; conciliação cadastral pendente." },
  { displayName: "ZM Combustíveis", address: "Recreio das Águas Lindas, Águas Lindas de Goiás - GO", phone: "(61) 99620-0099", rating: 4.8, reviews: 163, hours: "04:00–00:00", note: "Mapa; corresponde ao cadastro ZM Combustíveis, CNPJ 55.846.090/0001-28." },
  { displayName: "Posto Formula 1", address: "BR-070, Parque da Barragem, Águas Lindas de Goiás - GO", phone: "(61) 3060-0591", rating: 4.0, reviews: 272, hours: "05:00–22:00", note: "Mapa; há múltiplos Fórmula 1 na cidade, conciliar por endereço/CNPJ." },
  { displayName: "Auto Posto Pérola", address: "R. 17, 1291-1397, Parque da Barragem, Águas Lindas de Goiás - GO", phone: null, rating: 4.0, reviews: 191, hours: "05:00–23:00", note: "Mapa; corresponde ao cadastro Auto Posto Pérola Águas Lindas, CNPJ 12.768.583/0001-84." },
  { displayName: "Posto De Gasolina - Formula 1", address: "R. 32, 162, Cidade Jardim, Águas Lindas de Goiás - GO", phone: null, rating: 4.0, reviews: 97, hours: "05:00–22:00", note: "Mapa; conciliação cadastral pendente." },
  { displayName: "Posto Recreio", address: "R. 7, 158-206, Jardim Querência, Águas Lindas de Goiás - GO", phone: null, rating: 3.9, reviews: 92, hours: null, note: "Mapa; não incorporado à contagem cadastral sem CNPJ." },
  { displayName: "Posto Ipiranga", address: "BR-070, Q. 28, lote 16/17, Jardim Guaíra II, Águas Lindas de Goiás - GO", phone: null, rating: 4.0, reviews: 219, hours: "05:00–23:00", note: "Mapa; corresponde ao cadastro Posto Guaíra, CNPJ 12.560.575/0001-48." },
  { displayName: "ALE", address: "Av. Águas Lindas, 2042-2360, Parque da Barragem, Águas Lindas de Goiás - GO", phone: "0800 281 5000", rating: 4.0, reviews: 104, hours: null, note: "Mapa; conciliação cadastral pendente." },
  { displayName: "Posto Shell", address: "Jardim América IV, Águas Lindas de Goiás - GO", phone: null, rating: 4.3, reviews: 137, hours: "05:30–23:00", note: "Mapa; conciliação cadastral pendente." },
  { displayName: "Posto Fórmula 1", address: "Q. 34, conjunto A, lote 40B, Setor 8, Águas Lindas de Goiás - GO", phone: "(61) 3060-0591", rating: 4.2, reviews: 111, hours: "05:00–22:00", note: "Mapa; corresponde ao cadastro Posto Formula 01, CNPJ 31.405.435/0001-40." },
  { displayName: "Meu Posto", address: "Lote Área B, Q. 01, Mansões, Águas Lindas de Goiás - GO", phone: null, rating: 4.4, reviews: 55, hours: "05:00–22:00", note: "Mapa; corresponde ao cadastro Meu Posto, CNPJ 42.783.063/0001-01." },
  { displayName: "Auto Posto Rainha Da Paz", address: "Q. 4, lotes 4/5, Jardim da Barragem V, Águas Lindas de Goiás - GO", phone: null, rating: 3.8, reviews: 217, hours: "05:00–23:00", note: "Mapa; corresponde ao cadastro Auto Posto Rainha da Paz, CNPJ 23.679.372/0001-91." },
  { displayName: "Posto de gasolina", address: "Parque da Barragem, Águas Lindas de Goiás - GO", phone: null, rating: 5.0, reviews: 1, hours: null, note: "Mapa com apenas 1 avaliação; não incorporado à contagem cadastral sem identificação confiável." },
  { displayName: "Posto Milenium Águas Lindas de Goiás", address: "Condomínio Bela Vista, Águas Lindas de Goiás - GO", phone: null, rating: null, reviews: null, hours: null, note: "Mapa; CNPJ não localizado nesta coleta. Não incorporado à contagem cadastral." },
  { displayName: "Posto Ipiranga", address: "Qd 1, R. 1, 24, Lote N, Jardim da Barragem I, Águas Lindas de Goiás - GO, 72920-001", phone: "0800 725 7333", rating: 4.3, reviews: 18, hours: "05:00–23:00", note: "Mapa; mesmo endereço do Rham Auto Posto (CNPJ 43.774.756/0001-09). Tratar como possível mudança de bandeira/nome, não como novo posto, até confirmação por CNPJ/ANP." },
] as const;
export const AGUAS_LINDAS_STATIONS_SOURCE =
  "41 registros cadastrais identificados para o diretório local, cruzados com uma referência externa de 31 empresas ativas no CNAE 4731-8/00 e com referências de mapas. Cadastro setorial não equivale, por si só, a comprovação de que cada unidade está aberta neste momento.";

export const AGUAS_LINDAS_STATIONS_SOURCES = {
  anp: "Dados cadastrais dos revendedores varejistas de combustíveis automotivos, ANP, atualização de 29/09/2026.",
  cirtrox: "Consulta de empresas por CNAE e município, atualização indicada em setembro de 2026.",
  directory: "Diretório público de postos em Águas Lindas de Goiás, usado para consolidar nomes comerciais e endereços quando disponíveis.",
};

type StationSeed = [
  string,
  string,
  string,
  string,
  string | null,
  string | null,
  string | null,
  string[],
  string
];

const records: StationSeed[] = [
  ["aguas-lindas-combustiveis","Aguas Lindas Combustiveis LTDA","Aguas Lindas Combustiveis","13.902.675/0001-78","CAMPING CLUBE","Quadra 07, s/n, lote 33 A, Camping Clube","Branca",["Águas Lindas Combustíveis"],"Cadastro setorial ativo."],
  ["zm","Zm Combustiveis","ZM Combustíveis","55.846.090/0001-28","RECREIO DAS ÁGUAS LINDAS I","Recreio das Águas Lindas I",null,["ZM Combustíveis"],"Cadastro setorial ativo."],
  ["forquilha","Forquilha","Auto Posto Forquilha II","54.438.110/0001-69","COLONIAL PARQUE I PADRE LUCIO",null,null,["Forquilha","Auto Posto Forquilha II"],"Cadastro setorial ativo; endereço completo não consolidado nesta coleta."],
  ["posto-combustivel-aguas-lindas","Posto De Combustivel Aguas Lindas LTDA","Posto de Combustível Águas Lindas","34.742.673/0001-39","CHACARAS COIMBRA","Rodovia BR-070, Quadra 0002B, s/n, lote 0002, Chácara Coimbra",null,["Posto de Combustível Águas Lindas"],"Cadastro setorial ativo."],
  ["pitstop","Posto Pitstop","Posto Pitstop 2","60.979.745/0001-76","JARDIM QUERÊNCIA","Jardim Querência",null,["Posto Pitstop","Posto Pitstop 2"],"Cadastro setorial ativo."],
  ["sao-jose","Posto Sao Jose","Posto São José","52.505.400/0001-52","JARDIM BRASÍLIA II","Quadra 97, lote 83/83A, Jardim Brasília II",null,["Posto São José"],"Cadastro setorial ativo."],
  ["nossa-senhora-santana","Posto Nossa Senhora De Santana","Posto Nossa Senhora de Santana","40.833.628/0001-92","MANSOES CENTRO OESTE","Alameda Goiás, km 28 / BR-070, Mansões Centro-Oeste",null,["Posto Nossa Senhora de Santana","Nossa Senhora Sant'ana"],"Cadastro setorial ativo; referências públicas também indicam endereço na BR-070."],
  ["coimbra","Auto Posto Coimbra","Auto Posto Coimbra","66.684.330/0001-51","CHÁCARAS COIMBRA","Chácaras Coimbra",null,["Auto Posto Coimbra"],"Cadastro setorial ativo, abertura recente no conjunto cadastral consultado."],
  ["brasil","Posto Brasil","Posto Brasil","50.437.240/0001-26","PARQUE DA BARRAGEM SETOR 04","Quadra 16, Conjunto A, lote 01, Parque da Barragem Setor 04",null,["Posto Brasil"],"Cadastro setorial ativo."],
  ["village","Auto Posto Village","Auto Posto Village","46.693.752/0001-86","MANSÕES VILLAGE","Quadra 01, lote 01, Mansões Village",null,["Auto Posto Village"],"Cadastro setorial ativo."],
  ["premium-quedas","Posto Premium","Posto Premium","46.355.254/0001-23","CHÁCARAS QUEDAS DO DESCOBERTO","Quadra 52, lote 1344, Chácaras Quedas do Descoberto",null,["Posto Premium","Premium Quedas do Descoberto"],"Cadastro setorial ativo."],
  ["premium-camping","Posto Premium","Posto Premium","46.080.060/0001-62","CAMPING CLUBE","Quadra 5, lotes 02-05, Camping Clube",null,["Posto Premium","Premium Camping Clube"],"Cadastro setorial ativo."],
  ["lar","Lar Auto Posto","Lar Auto Posto","42.019.207/0001-58","JARDIM QUERÊNCIA","Quadra 5, lotes 18-21, Jardim Querência",null,["Lar Auto Posto"],"Cadastro setorial ativo."],
  ["aguas-bonitas-2","Auto Posto Aguas Bonitas","Auto Posto Águas Bonitas","31.599.286/0001-05","PARQUE DAS AGUAS BONITAS I","Quadra 25, s/n, lote 12/13, Parque Águas Bonitas I",null,["Auto Posto Águas Bonitas"],"Cadastro setorial ativo."],
  ["formula-01","Posto Formula 01","Posto Fórmula 1","31.405.435/0001-40","PARQUE DA BARRAGEM SETOR 08","Quadra 34, Conjunto A, lote 40 B, Parque da Barragem Setor 08",null,["Posto Fórmula 01","Fórmula 1"],"Cadastro setorial ativo."],
  ["formula-querencia","Posto Formula 1","Posto Fórmula 1","29.753.244/0001-27","JARDIM QUERÊNCIA","Quadra 9, lote 01/04, Jardim Querência",null,["Posto Fórmula 1"],"Cadastro setorial ativo."],
  ["rainha-da-paz","Auto Posto Rainha Da Paz","Auto Posto Rainha da Paz","23.679.372/0001-91","JARDIM DA BARRAGEM V","Quadra 4, lotes 04/05, Jardim da Barragem V",null,["Auto Posto Rainha da Paz"],"Cadastro setorial ativo."],
  ["formula-jardim-aguas-lindas","Posto Formula 1","Posto Fórmula 1","23.444.140/0001-54","JARDIM AGUAS LINDAS II","Quadra 7, lote 01-O, Jardim Águas Lindas II",null,["Posto Fórmula 1"],"Cadastro setorial ativo."],
  ["premium-barragem-v","Posto Premium","Posto Premium","21.570.661/0001-22","JARDIM DA BARRAGEM V","Quadra 2, lote 01, Jardim da Barragem V",null,["Posto Premium","Posto Barragem V"],"Cadastro setorial ativo."],
  ["formula-jardim-brasilia","Posto Formula 1","Posto Fórmula 1","20.244.886/0001-26","JARDIM BRASILIA","Quadra 50, lote 10, Jardim Brasília",null,["Posto Fórmula 1"],"Cadastro setorial ativo."],
  ["hospital","Auto Posto Do Hospital","Auto Posto do Hospital","19.090.135/0001-13","PARQUE DA BARRAGEM SETOR 08","Quadra 29, Conjunto A, lote 05A, Parque da Barragem Setor 08",null,["Auto Posto do Hospital"],"Cadastro setorial ativo."],
  ["gb","Auto Posto Gb","Auto Posto GB","18.689.286/0001-20","LOTEAMENTO DENOMINADO PARQUE DA BARRAGEM","Avenida 1, s/n, Parque da Barragem",null,["Auto Posto GB"],"Cadastro setorial ativo."],
  ["aguas-bonitas-1","Auto Posto Aguas Bonitas","Auto Posto Águas Bonitas","17.571.211/0001-87","PARQUE AGUAS BONITAS I","Parque Águas Bonitas I",null,["Auto Posto Águas Bonitas"],"Cadastro setorial ativo."],
  ["formula-setor-02","Posto Formula-1","Posto Fórmula 1","17.102.165/0001-77","SETOR 02","Quadra 44, conjunto B, lote 02-A, Setor 02",null,["Posto Fórmula-1"],"Cadastro setorial ativo."],
  ["camping-clube","Posto Camping Clube","Posto Camping Clube","13.244.310/0001-01","CAMPING CLUBE","Quadra 08, lotes 25-27, Camping Clube",null,["Posto Camping Clube"],"Cadastro setorial ativo."],
  ["guaira","Posto Guaira","Posto Guaíra","12.560.575/0001-48","JARDIM GUAIRA II","Rodovia BR-070, Quadra 28, lote 16/17, Jardim Guaíra II","Ipiranga",["Posto Guaíra","Guaíra"],"Cadastro setorial ativo; referência de preço pública recente."],
  ["jardim-brasilia","Auto Posto Jardim Brasilia LTDA","Auto Posto Jardim Brasília","02.316.635/0001-28","JARDIM BRASILIA","Avenida JK, s/n, Quadra 06, lotes 18/22, Jardim Brasília",null,["Auto Posto Jardim Brasília"],"Cadastro setorial ativo; uma listagem pública indica situação operacional divergente."],
  ["ponteio-setor-06","Posto Ponteio","Posto Ponteio","08.938.794/0001-40","SETOR 06","Quadra 04, s/n, conjunto B, lotes 37/39, Setor 06",null,["Posto Ponteio"],"Cadastro setorial ativo."],
  ["ponteio-setor-10","Posto Ponteio","Posto Ponteio","14.700.372/0001-35","SETOR 10","Avenida Brasília, Quadra 111-B, lotes 24/26/28/30, Setor 10",null,["Posto Ponteio","Auto Posto RP"],"Cadastro setorial ativo; nome comercial pode variar por fonte."],
  ["perola","Auto Posto Perola Aguas Lindas","Auto Posto Pérola Águas Lindas","12.768.583/0001-84","SETOR 01","Rua 17, Quadra 49, Conjunto B, lote 02, Setor 01",null,["Auto Posto Pérola Águas Lindas","Pérola"],"Cadastro setorial ativo."],
  ["ponteio-vivendas","Auto Posto Ponteio","Auto Posto Ponteio","11.030.816/0001-84","VIVENDAS PARAISO","Quadra 02, lote 01, Vivendas Paraíso",null,["Auto Posto Ponteio","Posto Ponteio"],"Cadastro setorial ativo."],
  ["meu-posto","Meu Posto","Meu Posto","42.783.063/0001-01","MANSOES AGUAS LINDAS","Quadra 01, área B, Mansões Águas Lindas","Shell",["Meu Posto","Meu Posto de Combustíveis"],"Cadastro setorial ativo; referência Shell encontrada para o estabelecimento."],
  ["jj","Auto Posto J.j","Auto Posto J.J","10.515.562/0001-21","SETOR JARDIM BRASILIA","Avenida JK, Quadra 45, lotes 06-09, Jardim Brasília",null,["Auto Posto J.J","Auto Posto J J Junior"],"Cadastro setorial ativo."],
  ["jjr","Auto Posto Jjr","Auto Posto JJR","09.373.967/0001-93","SETOR JARDIM QUERENCIA","Quadra 06, lotes 14-16, Jardim Querência",null,["Auto Posto JJR","Auto Posto Juraci Junior"],"Cadastro setorial ativo."],
  ["df-180","Auto Posto Df 180","Auto Posto DF 180","07.347.238/0002-18","JARDIM QUERENCIA","Quadra 08, lotes 16-18, Jardim Querência","Ipiranga",["Auto Posto DF 180","Posto DF 180"],"Cadastro setorial ativo."],
  ["furacao","Furacao Auto Posto","Furacão Auto Posto","26.631.982/0001-03","PARQUE DAS AGUAS BONITAS I","Quadra 55, lotes 34-36, Parque Águas Bonitas I",null,["Furacão Auto Posto"],"Cadastro setorial ativo."],
  ["rham","Rham Auto Posto","Rham Auto Posto","43.774.756/0001-09","JARDIM DA BARRAGEM I","Quadra 1, Rua 1, lote 24, Jardim da Barragem I",null,["Rham Auto Posto","Posto Rham"],"Cadastro setorial ativo."],
  ["aj","A J Comercio De Combustiveis E Derivados LTDA","A J Comércio de Combustíveis","05.159.610/0001-56","AGUAS LINDAS DE GOIA","Rua 05 esquina com Rua 06, Quadra 07, lote 02, Jardim Querência",null,["A J Comércio de Combustíveis","AJ Combustíveis"],"Cadastro setorial ativo."],
  ["real","Real Auto Posto","Real Auto Posto","02.907.378/0001-07","JARDIM QUERENCIA","Quadra 05, lotes 18-21, Jardim Querência",null,["Real Auto Posto"],"Cadastro setorial ativo."],
  ["posto-aguas-lindas","Posto Aguas Lindas","Posto Águas Lindas","01.268.557/0001-70","AGUAS LINDAS","Rodovia BR-070, km 28, s/n",null,["Posto Águas Lindas"],"Cadastro setorial ativo."],
  ["mizuno","Mizuno Kay & CIA LTDA","Mizuno Kay & Cia","00.375.386/0002-05","AGUAS LINDAS","Gleba 2-B, Fazenda Cachoeira e Saltos",null,["Mizuno Kay","Mizuno Kay & Cia"],"Cadastro setorial ativo."],
];



const MAP_ENRICHMENTS: Record<string, NonNullable<LocalStationRecord["mapData"]>> = {
  "aguas-lindas-combustiveis": { rating: 4.1, reviewCount: 214, hours: "06:00–23:00", observedBrand: "Shell", operationalStatus: "open", observedAt: "2026-09-30", source: "maps" },
  "zm": { phone: "(61) 99620-0099", rating: 4.8, reviewCount: 163, hours: "04:00–00:00", operationalStatus: "open", observedAt: "2026-09-30", source: "maps" },
  "sao-jose": { phone: "(61) 99292-5283", rating: 4.6, reviewCount: 30, hours: "05:00–00:00", operationalStatus: "open", observedAt: "2026-09-30", source: "maps" },
  "formula-01": { phone: "(61) 3060-0591", rating: 4.0, reviewCount: 272, hours: "05:00–22:00", operationalStatus: "open", observedAt: "2026-09-30", source: "maps" },
  "meu-posto": { rating: 4.4, reviewCount: 55, hours: "05:00–22:00", observedBrand: "Shell", operationalStatus: "open", observedAt: "2026-09-30", source: "maps" },
  "rainha-da-paz": { rating: 3.8, reviewCount: 217, hours: "05:00–23:00", operationalStatus: "open", observedAt: "2026-09-30", source: "maps" },
  "guaira": { rating: 4.0, reviewCount: 219, hours: "05:00–23:00", observedBrand: "Ipiranga", operationalStatus: "open", observedAt: "2026-09-30", source: "maps" },
  "df-180": { rating: 4.0, reviewCount: 219, hours: "05:00–23:00", observedBrand: "Ipiranga", operationalStatus: "open", observedAt: "2026-09-30", source: "maps" },
  "rham": { phone: "0800 725 7333", rating: 4.3, reviewCount: 18, hours: "05:00–23:00", observedBrand: "Ipiranga", operationalStatus: "open", observedAt: "2026-09-30", source: "maps" },
  "jardim-brasilia": { phone: "(61) 3618-3581", rating: 4.0, reviewCount: 459, operationalStatus: "closed", observedAt: "2026-09-30", source: "maps" },
  "ponteio-setor-10": { phone: "(61) 99881-2916", rating: 3.9, reviewCount: 835, hours: "24h", operationalStatus: "open", observedAt: "2026-09-30", source: "maps" },
  "perola": { phone: "(61) 3618-6496", rating: 2.5, reviewCount: 2, hours: "07:00–22:00", observedBrand: "Petrobras", operationalStatus: "open", observedAt: "2026-09-30", source: "maps" },
  "village": { rating: 5.0, reviewCount: 58, hours: "08:00–21:10", operationalStatus: "open", observedAt: "2026-09-30", source: "maps" },
  "premium-barragem-v": { rating: 3.9, reviewCount: 8, hours: "24h", operationalStatus: "open", observedAt: "2026-09-30", source: "maps" },
  "mizuno": { phone: "(61) 98494-4864", rating: 4.2, reviewCount: 240, hours: "24h (seg–sex); 05:00–22:00 (sáb–dom)", operationalStatus: "open", observedBrand: "Petrobras", observedAt: "2026-09-30", source: "maps" },
  "posto-aguas-lindas": { operationalStatus: "unknown", observedAt: "2026-09-30", source: "maps" },
  "jj": { phone: "(61) 3616-1226", rating: 4.0, reviewCount: 279, hours: "24h", operationalStatus: "open", observedAt: "2026-09-30", source: "maps" },
  "pitstop": { operationalStatus: "unknown", observedAt: "2026-09-30", source: "maps" },
  "coimbra": { rating: 1.0, reviewCount: 1, operationalStatus: "unknown", observedAt: "2026-09-30", source: "maps" },
};

function tupleToRecord(row: StationSeed): LocalStationRecord {
  const [id, legalName, displayName, cnpj, neighborhood, address, brand, aliases, sourceNote] = row;
  return {
    id,
    legalName,
    displayName,
    cnpj,
    neighborhood,
    address,
    brand,
    aliases,
    status: "cadastro_ativo",
    sourceNote,
    mapData: MAP_ENRICHMENTS[id],
    dataQuality: MAP_ENRICHMENTS[id] ? "cross-checked" : "catalog-only",
    dataOrigin: MAP_ENRICHMENTS[id] ? "cross-check" : "local-catalog",
    verifiedAt: null,
    verificationFlags: { address: false, coordinates: false, authorization: false, brand: false },
  };
}

export const AGUAS_LINDAS_STATIONS: LocalStationRecord[] =
  records.map(tupleToRecord);



export const AGUAS_LINDAS_STATION_STATS = (() => {
  const total = AGUAS_LINDAS_STATIONS.length;
  const withAddress = AGUAS_LINDAS_STATIONS.filter(station => Boolean(station.address)).length;
  const withBrand = AGUAS_LINDAS_STATIONS.filter(station => Boolean(station.brand)).length;
  const mapEnriched = AGUAS_LINDAS_STATIONS.filter(station => Boolean(station.mapData)).length;
  const neighborhoods = new Set(
    AGUAS_LINDAS_STATIONS.map(station => station.neighborhood).filter((value): value is string => Boolean(value)),
  );
  const brands = new Set(
    AGUAS_LINDAS_STATIONS.map(station => station.brand).filter((value): value is string => Boolean(value)),
  );
  return {
    total,
    withAddress,
    withoutAddress: total - withAddress,
    withBrand,
    withoutBrand: total - withBrand,
    mapEnriched,
    neighborhoods: neighborhoods.size,
    brands: brands.size,
  } as const;
})();

export function searchAguasLindasStations(query: string) {
  const normalized = query.trim().toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const normalizedCompact = normalized.replace(/[^a-z0-9]+/g, " ").trim();
  const isAguasLindasQuery =
    normalizedCompact === "aguas lindas" ||
    normalizedCompact.startsWith("aguas lindas de goias") ||
    normalizedCompact.startsWith("postos em aguas lindas") ||
    normalizedCompact.startsWith("postos de aguas lindas") ||
    (normalizedCompact.includes("postos") && normalizedCompact.includes("aguas lindas"));

  if (
    !normalizedCompact ||
    normalizedCompact === "postos" ||
    normalizedCompact === "combustiveis" ||
    normalizedCompact === "postos de combustiveis" ||
    isAguasLindasQuery
  ) {
    return AGUAS_LINDAS_STATIONS;
  }
  return AGUAS_LINDAS_STATIONS.filter(station =>
    getStationSearchText(station).includes(normalized),
  );
}

export function stationMapsSearchUrl(station: LocalStationRecord) {
  const query = [station.displayName, station.address, station.neighborhood, "Águas Lindas de Goiás", "GO"].filter(Boolean).join(", ");
  return "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(query);
}


export function getStationDataQualityLabel(station: LocalStationRecord) {
  if (station.dataQuality === "anp-confirmed") return "ANP confirmado";
  if (station.dataQuality === "cross-checked") return "Dados cruzados";
  return "Cadastro local";
}

export function getStationSearchText(station: LocalStationRecord) {
  return [station.displayName, station.legalName, station.cnpj, station.neighborhood ?? "", station.address ?? "", station.brand ?? "", ...station.aliases]
    .join(" ")
    .toLocaleLowerCase("pt-BR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}


export function getStationVerificationSummary(station: LocalStationRecord) {
  const flags = station.verificationFlags ?? {};
  const confirmed = [flags.address, flags.coordinates, flags.authorization, flags.brand].filter(Boolean).length;
  return { confirmed, total: 4, label: confirmed === 4 ? "Cadastro completo" : confirmed >= 2 ? "Parcialmente confirmado" : "Cadastro básico" };
}

export function getStationSourceLabel(station: LocalStationRecord) {
  if (station.dataOrigin === "ANP") return "Fonte ANP";
  if (station.dataOrigin === "cross-check") return "Dados cruzados";
  return "Catálogo local";
}
