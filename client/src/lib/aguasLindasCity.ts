export type CityCategory = "saude" | "transporte" | "via";

export type CityPlace = {
  id: string;
  name: string;
  category: CityCategory;
  address: string;
  detail?: string;
  source: string;
  sourceUrl: string;
  checkedAt: string;
  phone?: string;
};

const municipalHealthSource = "https://aguaslindasdegoias.go.gov.br/unidades-de-saude/";
const planSource = "https://legislacao.aguaslindasdegoias.go.gov.br/leis/394";

export const AGUAS_LINDAS_CITY_CHECKED_AT = "2026-09-30";

export const CITY_PLACES: CityPlace[] = [
  { id: "hospital-bom-jesus", name: "Hospital Municipal Bom Jesus", category: "saude", address: "Quadra 109, Setor 10, Águas Lindas de Goiás, GO", source: "Prefeitura de Águas Lindas", sourceUrl: municipalHealthSource, checkedAt: AGUAS_LINDAS_CITY_CHECKED_AT },
  { id: "esf-aguas-bonitas", name: "ESF Águas Bonitas", category: "saude", address: "Rua 08, Quadra 33, Lote 27, Águas Lindas de Goiás, GO", source: "Prefeitura de Águas Lindas", sourceUrl: municipalHealthSource, checkedAt: AGUAS_LINDAS_CITY_CHECKED_AT },
  { id: "esf-aguas-lindas-ii", name: "ESF Águas Lindas II", category: "saude", address: "Rua J, Setor 06, Águas Lindas de Goiás, GO", detail: "A listagem municipal informa Quadra 0, Lote 00; confirme o endereço antes de ir.", source: "Prefeitura de Águas Lindas", sourceUrl: municipalHealthSource, checkedAt: AGUAS_LINDAS_CITY_CHECKED_AT },
  { id: "esf-america", name: "ESF América", category: "saude", address: "Quadra 17, Lotes 31/32, Águas Lindas de Goiás, GO", source: "Prefeitura de Águas Lindas", sourceUrl: municipalHealthSource, checkedAt: AGUAS_LINDAS_CITY_CHECKED_AT },
  { id: "ubs-barragem-ii", name: "UBS Barragem II", category: "saude", address: "Quadra 58, Lotes 03/05, Barragem II, Águas Lindas de Goiás, GO", source: "Prefeitura de Águas Lindas", sourceUrl: municipalHealthSource, checkedAt: AGUAS_LINDAS_CITY_CHECKED_AT },
  { id: "ubs-barragem-iv", name: "UBS Barragem IV", category: "saude", address: "Barragem IV, Águas Lindas de Goiás, GO", detail: "A página municipal consultada não informa endereço específico.", source: "Prefeitura de Águas Lindas", sourceUrl: municipalHealthSource, checkedAt: AGUAS_LINDAS_CITY_CHECKED_AT },
  { id: "esf-barragem-v", name: "ESF Barragem V", category: "saude", address: "Avenida Goiás, Quadra 06, Lote 20, Águas Lindas de Goiás, GO", source: "Prefeitura de Águas Lindas", sourceUrl: municipalHealthSource, checkedAt: AGUAS_LINDAS_CITY_CHECKED_AT },
  { id: "esf-camping-club", name: "ESF Camping Club", category: "saude", address: "Rua 17, Quadra 19, Lote 20, Águas Lindas de Goiás, GO", source: "Prefeitura de Águas Lindas", sourceUrl: municipalHealthSource, checkedAt: AGUAS_LINDAS_CITY_CHECKED_AT },
  { id: "esf-cidade-entorno", name: "ESF Cidade do Entorno", category: "saude", address: "Quadra 50, Lote 48, Casa 02, Águas Lindas de Goiás, GO", source: "Prefeitura de Águas Lindas", sourceUrl: municipalHealthSource, checkedAt: AGUAS_LINDAS_CITY_CHECKED_AT },
  { id: "esf-coimbra", name: "ESF Coimbra", category: "saude", address: "Quadra P, Lote 01, Chácara 10, Casa 03, Águas Lindas de Goiás, GO", source: "Prefeitura de Águas Lindas", sourceUrl: municipalHealthSource, checkedAt: AGUAS_LINDAS_CITY_CHECKED_AT },
  { id: "esf-guaira", name: "ESF Guaíra", category: "saude", address: "Quadra 5, Área Especial, Águas Lindas de Goiás, GO", source: "Prefeitura de Águas Lindas", sourceUrl: municipalHealthSource, checkedAt: AGUAS_LINDAS_CITY_CHECKED_AT },
  { id: "ubs-jardim-paraiso", name: "UBS Jardim Paraíso", category: "saude", address: "Quadra 13, Área Especial, Águas Lindas de Goiás, GO", source: "Prefeitura de Águas Lindas", sourceUrl: municipalHealthSource, checkedAt: AGUAS_LINDAS_CITY_CHECKED_AT },
  { id: "esf-laranjeiras", name: "ESF Laranjeiras", category: "saude", address: "Quadra B3, Lote 21, Águas Lindas de Goiás, GO", source: "Prefeitura de Águas Lindas", sourceUrl: municipalHealthSource, checkedAt: AGUAS_LINDAS_CITY_CHECKED_AT },
  { id: "esf-padre-lucio", name: "ESF Padre Lúcio", category: "saude", address: "Área Especial P. Militar, Águas Lindas de Goiás, GO", source: "Prefeitura de Águas Lindas", sourceUrl: municipalHealthSource, checkedAt: AGUAS_LINDAS_CITY_CHECKED_AT },
  { id: "esf-perola-ii", name: "ESF Pérola II", category: "saude", address: "Área Especial, Setor Village, Águas Lindas de Goiás, GO", source: "Prefeitura de Águas Lindas", sourceUrl: municipalHealthSource, checkedAt: AGUAS_LINDAS_CITY_CHECKED_AT },
  { id: "esf-pinheiro-i", name: "ESF Pinheiro I", category: "saude", address: "Quadra 07, Lote 13, Águas Lindas de Goiás, GO", source: "Prefeitura de Águas Lindas", sourceUrl: municipalHealthSource, checkedAt: AGUAS_LINDAS_CITY_CHECKED_AT },
  { id: "esf-setor-ii", name: "ESF Setor II", category: "saude", address: "Quadra 33, Conjunto B, Lote 33B, Águas Lindas de Goiás, GO", source: "Prefeitura de Águas Lindas", sourceUrl: municipalHealthSource, checkedAt: AGUAS_LINDAS_CITY_CHECKED_AT },
  { id: "esf-setor-09", name: "ESF Setor 09", category: "saude", address: "Quadra 72, Lote 37, Setor 09, Águas Lindas de Goiás, GO", source: "Prefeitura de Águas Lindas", sourceUrl: municipalHealthSource, checkedAt: AGUAS_LINDAS_CITY_CHECKED_AT },
  { id: "heal", name: "Hospital Estadual de Águas Lindas (HEAL)", category: "saude", address: "Rua 19, nº 792–902, Parque da Barragem 9, Águas Lindas de Goiás, GO, CEP 74910-000", detail: "Hospital estadual. Ligue para confirmar atendimento, especialidade ou orientação antes de sair.", phone: "+55 61 3774-2660", source: "Secretaria de Estado da Saúde de Goiás", sourceUrl: "https://goias.gov.br/saude/heal/", checkedAt: AGUAS_LINDAS_CITY_CHECKED_AT },
  { id: "terminal-nelson-alves", name: "Rodoviária Nelson Alves de Sousa", category: "transporte", address: "Final da Avenida JK, Águas Lindas de Goiás, GO", detail: "Referência divulgada em notícia municipal de 2020; confirme operação e local do embarque no mapa antes da viagem.", source: "Prefeitura de Águas Lindas · notícia de 2020", sourceUrl: "https://aguaslindasdegoias.go.gov.br/primeira-rodoviaria-de-aguas-lindas/", checkedAt: "2020-12-28" },
  { id: "br-070", name: "BR-070 · corredor regional", category: "via", address: "Trecho urbano de Águas Lindas de Goiás, GO", detail: "Via regional e principal eixo de ligação com o Distrito Federal. O plano diretor descreve hierarquia viária, não trânsito em tempo real.", source: "Plano Diretor municipal · Lei 341/2002", sourceUrl: planSource, checkedAt: AGUAS_LINDAS_CITY_CHECKED_AT },
  { id: "go-547", name: "GO-547 · Avenida Águas Lindas", category: "via", address: "Trecho urbano da GO-547, Águas Lindas de Goiás, GO", detail: "O plano diretor identifica o trecho urbano da GO-547 e as avenidas Águas Lindas, Rio Grande do Sul e 1 como vias estruturantes.", source: "Plano Diretor municipal · Lei 341/2002", sourceUrl: planSource, checkedAt: AGUAS_LINDAS_CITY_CHECKED_AT },
  { id: "avenida-brasilia", name: "Avenida Brasília", category: "via", address: "Avenida Brasília, Águas Lindas de Goiás, GO", detail: "Via principal urbana citada no plano diretor; não representa condição ou congestionamento atual.", source: "Plano Diretor municipal · Lei 341/2002", sourceUrl: planSource, checkedAt: AGUAS_LINDAS_CITY_CHECKED_AT },
  { id: "avenida-cuiaba", name: "Avenida Cuiabá", category: "via", address: "Avenida Cuiabá, Águas Lindas de Goiás, GO", detail: "Via principal urbana citada no plano diretor; não representa condição ou congestionamento atual.", source: "Plano Diretor municipal · Lei 341/2002", sourceUrl: planSource, checkedAt: AGUAS_LINDAS_CITY_CHECKED_AT },
  { id: "avenida-brasil", name: "Avenida Brasil · Águas Bonitas", category: "via", address: "Avenida Brasil, Parque das Águas Bonitas / Quinta das Águas Lindas, Águas Lindas de Goiás, GO", source: "Plano Diretor municipal · Lei 341/2002", sourceUrl: planSource, checkedAt: AGUAS_LINDAS_CITY_CHECKED_AT },
  { id: "avenida-1-barragem", name: "Avenida 1 · Parque da Barragem", category: "via", address: "Avenida 1, Parque da Barragem, Águas Lindas de Goiás, GO", source: "Plano Diretor municipal · Lei 341/2002", sourceUrl: planSource, checkedAt: AGUAS_LINDAS_CITY_CHECKED_AT },
  { id: "rua-pau-brasil", name: "Rua Pau Brasil · Jardim Santa Lúcia", category: "via", address: "Rua Pau Brasil, Jardim Santa Lúcia, Águas Lindas de Goiás, GO", source: "Plano Diretor municipal · Lei 341/2002", sourceUrl: planSource, checkedAt: AGUAS_LINDAS_CITY_CHECKED_AT },
];

export const CITY_SERVICES = [
  { id: "transit", name: "Secretaria de Trânsito e Mobilidade Urbana", phone: "+55 61 92003-6663", detail: "Atendimento geral publicado pela Prefeitura.", source: "Prefeitura de Águas Lindas", sourceUrl: municipalHealthSource },
  { id: "traffic-service", name: "Atendimento de trânsito", phone: "+55 61 92003-6668", detail: "Contato de atendimento publicado pela Prefeitura.", source: "Prefeitura de Águas Lindas", sourceUrl: municipalHealthSource },
  { id: "traffic-plantao", name: "Plantão / agentes de trânsito", phone: "+55 61 92003-6674", detail: "Contato publicado pela Prefeitura. Em emergência, use os canais oficiais de emergência.", source: "Prefeitura de Águas Lindas", sourceUrl: municipalHealthSource },
  { id: "animal", name: "Apreensão de animais em via pública", phone: "+55 61 92003-6679", detail: "Contato publicado pela Prefeitura.", source: "Prefeitura de Águas Lindas", sourceUrl: municipalHealthSource },
  { id: "health", name: "Secretaria Municipal de Saúde", phone: "+55 61 3618-4096", detail: "Contato institucional; não substitui atendimento de emergência.", source: "Prefeitura de Águas Lindas", sourceUrl: municipalHealthSource },
];

export function searchCityPlaces(query: string, category: CityCategory | "todos" = "todos") {
  const normalized = query.trim().toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return CITY_PLACES.filter(place => {
    if (category !== "todos" && place.category !== category) return false;
    const text = `${place.name} ${place.address} ${place.detail ?? ""} ${place.category}`.toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return !normalized || text.includes(normalized);
  });
}
