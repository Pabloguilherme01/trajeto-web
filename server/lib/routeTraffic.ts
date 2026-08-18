export const officialRouteSources = [
  { label: "Detran-DF", detail: "interdições e serviços no Distrito Federal", url: "https://www.detran.df.gov.br/interdicoes-de-transito/" },
  { label: "PRF", detail: "notícias e dados abertos de rodovias federais", url: "https://www.gov.br/prf/pt-br/noticias" },
  { label: "DNIT", detail: "consulta georreferenciada de rodovias federais", url: "https://servicos.dnit.gov.br/vgeo/" },
] as const;

export const anpComVcUrl = "https://anpcomvcpostos.anp.gov.br/";

export function routeTrafficStatus() {
  const liveEnabled = process.env.TOMTOM_TRAFFIC_ENABLED === "true";
  return {
    checkedAt: new Date(),
    state: liveEnabled ? "active" as const : "pending" as const,
    label: liveEnabled ? "Tráfego ao vivo ativo" : "Tráfego ao vivo aguardando ativação",
    detail: liveEnabled
      ? "A situação é atualizada pela fonte de tráfego conectada."
      : "A duração foi calculada no momento da consulta. Ocorrências ao vivo serão exibidas quando a fonte for autorizada.",
    officialSources: officialRouteSources,
    anpComVcUrl,
  };
}
