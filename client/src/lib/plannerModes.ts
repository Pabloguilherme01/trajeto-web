export type PlannerExperienceMode =
  | "smart"
  | "offline"
  | "economy"
  | "driving"
  | "private";

export const PLANNER_EXPERIENCE_OPTIONS: Array<{
  id: PlannerExperienceMode;
  label: string;
  detail: string;
}> = [
  {
    id: "smart",
    label: "Inteligente",
    detail: "Escolhe a melhor camada disponível e salva a rota quando for seguro.",
  },
  {
    id: "offline",
    label: "Offline",
    detail: "Evita provedores externos e prioriza rotas salvas e cálculo local.",
  },
  {
    id: "economy",
    label: "Economia",
    detail: "Mantém o planejamento de carro junto da calculadora de custo e autonomia.",
  },
  {
    id: "driving",
    label: "Condução",
    detail: "Foco em dirigir, mapa da viagem e atalhos de navegação.",
  },
  {
    id: "private",
    label: "Privado",
    detail: "Mantém a localização atual somente nesta sessão, sem salvar a origem GPS ou compartilhá-la entre usuários.",
  },
];

export function resolvePlannerExperience(
  params: URLSearchParams
): PlannerExperienceMode {
  const explicit = params.get("experiencia");
  if (
    explicit === "smart" ||
    explicit === "offline" ||
    explicit === "economy" ||
    explicit === "driving" ||
    explicit === "private"
  )
    return explicit;

  // Preserve old links while the UI moves to one explicit planner-mode model.
  if (params.get("economia") === "1") return "economy";
  if (params.get("conducao") === "1") return "driving";
  if (params.get("offline") === "1") return "offline";
  return "smart";
}

export function plannerExperienceDetail(mode: PlannerExperienceMode) {
  return (
    PLANNER_EXPERIENCE_OPTIONS.find(option => option.id === mode)?.detail ??
    PLANNER_EXPERIENCE_OPTIONS[0].detail
  );
}
