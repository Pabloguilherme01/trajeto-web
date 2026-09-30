export type AguasLindasStationRecord = {
  id: string;
  name: string;
  legalName?: string;
  cnpj: string;
  neighborhood: string;
  address?: string;
  cep?: string;
  source: "cirtrox-2026";
  verification: "empresa-ativa-cnae-4731-8-00";
  anpConfirmed?: boolean;
  phone?: string;
};

export const aguasLindasStations: AguasLindasStationRecord[] = [
  { id: "13902675000178", name: "Águas Lindas Combustíveis", cnpj: "13.902.675/0001-78", neighborhood: "Camping Clube", source: "cirtrox-2026", verification: "empresa-ativa-cnae-4731-8-00", anpConfirmed: true },
  { id: "55846090000128", name: "ZM Combustíveis", cnpj: "55.846.090/0001-28", neighborhood: "Recreio das Águas Lindas I", address: "Quadra 1B, 12", cep: "72927-740", source: "cirtrox-2026", verification: "empresa-ativa-cnae-4731-8-00" },
  { id: "54438110000169", name: "Forquilha", legalName: "Auto Posto Forquilha II Ltda", cnpj: "54.438.110/0001-69", neighborhood: "Colonial Parque I / Padre Lúcio", address: "Quadra 09, Rua 02, Lote 10", cep: "72910-990", source: "cirtrox-2026", verification: "empresa-ativa-cnae-4731-8-00" },
  { id: "34742673000139", name: "Posto de Combustível Águas Lindas", legalName: "Posto de Combustível Águas Lindas Ltda", cnpj: "34.742.673/0001-39", neighborhood: "Chácaras Coimbra", address: "Rodovia BR-070, Quadra 00002B, Lote 0002, Unidade 1", cep: "72911-512", source: "cirtrox-2026", verification: "empresa-ativa-cnae-4731-8-00" },
  { id: "60979745000176", name: "Posto Pitstop", cnpj: "60.979.745/0001-76", neighborhood: "Jardim Querência", source: "cirtrox-2026", verification: "empresa-ativa-cnae-4731-8-00" },
  { id: "5250540000152", name: "Posto São José", cnpj: "52.505.400/0001-52", neighborhood: "Jardim Brasília II", source: "cirtrox-2026", verification: "empresa-ativa-cnae-4731-8-00" },
  { id: "40833628000192", name: "Posto Nossa Senhora de Santana", legalName: "Posto Nossa Senhora de Sant'Ana Ltda", cnpj: "40.833.628/0001-92", neighborhood: "Mansões Centro Oeste", address: "Alameda Goiás, KM 28", cep: "72915-715", source: "cirtrox-2026", verification: "empresa-ativa-cnae-4731-8-00" },
  { id: "66684330000151", name: "Auto Posto Coimbra", legalName: "Auto Posto Coimbra Ltda", cnpj: "66.684.330/0001-51", neighborhood: "Chácaras Coimbra", address: "Quadra B, Chácaras 10/14, Módulo F, Lotes 1 a 7", cep: "72911-473", source: "cirtrox-2026", verification: "empresa-ativa-cnae-4731-8-00" },
  { id: "5043724000126", name: "Posto Brasil", cnpj: "50.437.240/0001-26", neighborhood: "Parque da Barragem Setor 04", address: "Quadra 16, Conjunto A, Lote 01", cep: "72910-648", source: "cirtrox-2026", verification: "empresa-ativa-cnae-4731-8-00" },
  { id: "46693752000186", name: "Auto Posto Village", cnpj: "46.693.752/0001-86", neighborhood: "Mansões Village", address: "Quadra 01, Lote 01", cep: "72916-212", source: "cirtrox-2026", verification: "empresa-ativa-cnae-4731-8-00", anpConfirmed: true },
  { id: "46355254000123", name: "Posto Premium", cnpj: "46.355.254/0001-23", neighborhood: "Chácaras Quedas do Descoberto", address: "Quadra 52, Lote 1344", cep: "72914-275", source: "cirtrox-2026", verification: "empresa-ativa-cnae-4731-8-00" },
  { id: "46080060000162", name: "Posto Premium", cnpj: "46.080.060/0001-62", neighborhood: "Camping Clube", address: "Quadra 05, Lotes 02, 03, 04 e 05", cep: "72914-126", source: "cirtrox-2026", verification: "empresa-ativa-cnae-4731-8-00" },
  { id: "42019207000158", name: "Lar Auto Posto", cnpj: "42.019.207/0001-58", neighborhood: "Jardim Querência", address: "Quadra 05, Lotes 18 a 21", cep: "72910-747", source: "cirtrox-2026", verification: "empresa-ativa-cnae-4731-8-00" },
  { id: "31599286000105", name: "Auto Posto Águas Bonitas", cnpj: "31.599.286/0001-05", neighborhood: "Parque Águas Bonitas I", source: "cirtrox-2026", verification: "empresa-ativa-cnae-4731-8-00" },
  { id: "31405435000140", name: "Posto Formula 01", cnpj: "31.405.435/0001-40", neighborhood: "Parque da Barragem Setor 08", address: "Quadra 34, Conjunto A, Lote 40-B", cep: "72910-037", source: "cirtrox-2026", verification: "empresa-ativa-cnae-4731-8-00" },
  { id: "29753244000127", name: "Posto Formula 1", cnpj: "29.753.244/0001-27", neighborhood: "Jardim Querência", address: "Quadra 09, Lotes 01/04", cep: "72910-702", source: "cirtrox-2026", verification: "empresa-ativa-cnae-4731-8-00" },
  { id: "23679372000191", name: "Auto Posto Rainha da Paz", cnpj: "23.679.372/0001-91", neighborhood: "Jardim da Barragem V", address: "Quadra 04, Lotes 04 e 05", cep: "72920-713", source: "cirtrox-2026", verification: "empresa-ativa-cnae-4731-8-00" },
  { id: "23444140000154", name: "Posto Formula 1", cnpj: "23.444.140/0001-54", neighborhood: "Jardim Águas Lindas II", address: "Quadra 07, Lote 01-O", cep: "72927-635", source: "cirtrox-2026", verification: "empresa-ativa-cnae-4731-8-00" },
  { id: "21570661000122", name: "Posto Premium", cnpj: "21.570.661/0001-22", neighborhood: "Jardim da Barragem V", address: "Quadra 02, Lote 01", cep: "72920-815", source: "cirtrox-2026", verification: "empresa-ativa-cnae-4731-8-00" },
  { id: "20244886000126", name: "Posto Formula 1", legalName: "Posto F1 Ltda ME", cnpj: "20.244.886/0001-26", neighborhood: "Jardim Brasília", address: "Quadra 50, Lote 10", cep: "72915-081", source: "cirtrox-2026", verification: "empresa-ativa-cnae-4731-8-00", anpConfirmed: true },
  { id: "19090135000113", name: "Auto Posto do Hospital", cnpj: "19.090.135/0001-13", neighborhood: "Parque da Barragem Setor 08", address: "Quadra 29, Conjunto A, Lote 05A", cep: "72910-022", source: "cirtrox-2026", verification: "empresa-ativa-cnae-4731-8-00" },
  { id: "18689286000120", name: "Auto Posto GB", cnpj: "18.689.286/0001-20", neighborhood: "Parque da Barragem", address: "Avenida 1, S/N", cep: "72925-771", source: "cirtrox-2026", verification: "empresa-ativa-cnae-4731-8-00" },
  { id: "17571211000187", name: "Auto Posto Águas Bonitas", legalName: "Auto Posto Morais Ltda", cnpj: "17.571.211/0001-87", neighborhood: "Parque Águas Bonitas I", address: "Quadra 25, S/N, Lote 12/13", cep: "72926-048", source: "cirtrox-2026", verification: "empresa-ativa-cnae-4731-8-00", anpConfirmed: true },
  { id: "17102165000177", name: "Posto Formula-1", cnpj: "17.102.165/0001-77", neighborhood: "Setor 02", address: "Quadra 44, Conjunto B, Lote 02-A", cep: "72910-100", source: "cirtrox-2026", verification: "empresa-ativa-cnae-4731-8-00" },
  { id: "13244310000101", name: "Posto Camping Clube", cnpj: "13.244.310/0001-01", neighborhood: "Camping Clube", address: "Quadra 08, Lotes 25, 26 e 27", source: "cirtrox-2026", verification: "empresa-ativa-cnae-4731-8-00" },
  { id: "12560575000148", name: "Posto Guaira", legalName: "Auto Posto Guaira Ltda", cnpj: "12.560.575/0001-48", neighborhood: "Jardim Guaira II", address: "Rodovia BR-070, Quadra 28, Lote 16/17", cep: "72910-001", source: "cirtrox-2026", verification: "empresa-ativa-cnae-4731-8-00", anpConfirmed: true },
  { id: "2316635000128", name: "Auto Posto Jardim Brasília", cnpj: "02.316.635/0001-28", neighborhood: "Jardim Brasília", address: "Avenida JK, Quadra 06, Lotes 18/22", cep: "72910-001", source: "cirtrox-2026", verification: "empresa-ativa-cnae-4731-8-00", anpConfirmed: true },
  { id: "8938794000140", name: "Posto Ponteio", cnpj: "08.938.794/0001-40", neighborhood: "Setor 06", address: "Quadra 04, Conjunto B, Lotes 37/39", source: "cirtrox-2026", verification: "empresa-ativa-cnae-4731-8-00" },
  { id: "14700372000135", name: "Posto Ponteio", cnpj: "14.700.372/0001-35", neighborhood: "Setor 10", address: "Avenida Brasília, Quadra 111 B", source: "cirtrox-2026", verification: "empresa-ativa-cnae-4731-8-00" },
  { id: "12768583000184", name: "Auto Posto Pérola Águas Lindas", cnpj: "12.768.583/0001-84", neighborhood: "Setor 01", address: "Rua 17, Quadra 49", cep: "72910-001", source: "cirtrox-2026", verification: "empresa-ativa-cnae-4731-8-00", anpConfirmed: true },
  { id: "11030816000184", name: "Auto Posto Ponteio", cnpj: "11.030.816/0001-84", neighborhood: "Vivendas Paraíso", address: "Quadra 02, S/N, Lote 01", cep: "72925-109", source: "cirtrox-2026", verification: "empresa-ativa-cnae-4731-8-00", anpConfirmed: true },
  { id: "42783063000101", name: "Meu Posto", cnpj: "42.783.063/0001-01", neighborhood: "Mansões Águas Lindas", address: "Quadra 01, Primeira Avenida, Lotes 01/02", cep: "72915-180", source: "cirtrox-2026", verification: "empresa-ativa-cnae-4731-8-00" },
  { id: "10515562000121", name: "Auto Posto J.J", cnpj: "10.515.562/0001-21", neighborhood: "Jardim Brasília", address: "Avenida JK, Quadra 45, Lotes 06, 07, 08 e 09", cep: "72910-000", source: "cirtrox-2026", verification: "empresa-ativa-cnae-4731-8-00" },
  { id: "9373967000193", name: "Auto Posto JJR", legalName: "Auto Posto Juraci Junior Ltda", cnpj: "09.373.967/0001-93", neighborhood: "Jardim Querência", address: "Quadra 06, S/N, Lotes 14, 15 e 16", cep: "72910-001", source: "cirtrox-2026", verification: "empresa-ativa-cnae-4731-8-00", anpConfirmed: true },
  { id: "7347238000218", name: "Auto Posto DF 180", cnpj: "07.347.238/0002-18", neighborhood: "Jardim Querência", address: "Quadra 08, S/N, Lotes 16, 17 e 18", cep: "72910-001", source: "cirtrox-2026", verification: "empresa-ativa-cnae-4731-8-00", anpConfirmed: true },
  { id: "26631982000103", name: "Furacão Auto Posto", cnpj: "26.631.982/0001-03", neighborhood: "Parque Águas Bonitas I", address: "Quadra 55, Lotes 34, 35 e 36", cep: "72926-106", source: "cirtrox-2026", verification: "empresa-ativa-cnae-4731-8-00" },
  { id: "43774756000109", name: "Rham Auto Posto", cnpj: "43.774.756/0001-09", neighborhood: "Jardim da Barragem I", address: "Quadra 01, Rua 01, Lote 24", cep: "72920-001", source: "cirtrox-2026", verification: "empresa-ativa-cnae-4731-8-00" },
  { id: "5159610000156", name: "A J Comércio de Combustíveis e Derivados", cnpj: "05.159.610/0001-56", neighborhood: "Jardim Querência", address: "Rua 05, esquina com Rua 06, Quadra 07, Lote 02", cep: "72910-001", source: "cirtrox-2026", verification: "empresa-ativa-cnae-4731-8-00" },
  { id: "2907378000107", name: "Real Auto Posto", legalName: "Real Auto Posto e Serviços Ltda", cnpj: "02.907.378/0001-07", neighborhood: "Jardim Querência", address: "Quadra 05, Lotes 18 a 21", cep: "72910-001", source: "cirtrox-2026", verification: "empresa-ativa-cnae-4731-8-00" },
  { id: "1268557000170", name: "Posto Águas Lindas", cnpj: "01.268.557/0001-70", neighborhood: "Águas Lindas", address: "Rodovia BR-070, Km 28", cep: "72910-001", source: "cirtrox-2026", verification: "empresa-ativa-cnae-4731-8-00" },
  { id: "375386000205", name: "Mizuno Kay & Cia", cnpj: "00.375.386/0002-05", neighborhood: "Águas Lindas", address: "Gleba 2-B, Fazenda Cachoeira e Saltador", cep: "72910-001", source: "cirtrox-2026", verification: "empresa-ativa-cnae-4731-8-00" },
];
