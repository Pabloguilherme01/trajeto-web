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
};

export const AGUAS_LINDAS_STATIONS_UPDATED_AT = "2026-09-30";
export const AGUAS_LINDAS_STATIONS_COUNT = 41;

export const AGUAS_LINDAS_STATIONS_SOURCE =
  "41 empresas ativas no CNAE 4731-8/00 em Águas Lindas de Goiás, cruzadas com a relação pública de postos e referências de mapas. Cadastro setorial não equivale, por si só, a comprovação de que cada unidade está aberta neste momento.";

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

function tupleToRecord(row: StationSeed): LocalStationRecord {
  const [id, legalName, displayName, cnpj, neighborhood, address, brand, aliases, sourceNote] = row;
  return { id, legalName, displayName, cnpj, neighborhood, address, brand, aliases, status: "cadastro_ativo", sourceNote };
}

export const AGUAS_LINDAS_STATIONS: LocalStationRecord[] =
  records.map(tupleToRecord);

export function searchAguasLindasStations(query: string) {
  const normalized = query.trim().toLocaleLowerCase("pt-BR");
  if (!normalized || normalized === "postos" || normalized === "combustíveis" || normalized === "combustiveis" || normalized === "postos de combustíveis" || normalized === "postos de combustivel") {
    return AGUAS_LINDAS_STATIONS;
  }
  return AGUAS_LINDAS_STATIONS.filter(station =>
    [station.displayName, station.legalName, station.cnpj, station.neighborhood ?? "", station.address ?? "", station.brand ?? "", ...station.aliases]
      .join(" ")
      .toLocaleLowerCase("pt-BR")
      .includes(normalized),
  );
}

export function stationMapsSearchUrl(station: LocalStationRecord) {
  const query = [station.displayName, station.address, station.neighborhood, "Águas Lindas de Goiás", "GO"].filter(Boolean).join(", ");
  return "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(query);
}
