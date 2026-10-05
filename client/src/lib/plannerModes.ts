export type PlannerExperienceMode =
  | "smart"
  | "offline"
  | "economy"
  | "driving";

export const PLANNER_EXPERIENCE_OPTIONS: Array<{
  id: PlannerExperienceMode;
  label: string;
  detail: string;
}> = [
  {
    id: "smart",
    label: "Inteligente",
    detail: "Encontra o caminho disponível e salva a rota neste aparelho.",
  },
  {
    id: "offline",
    label: "Offline",
    detail: "Usa caminhos preparados ou salvos neste aparelho, sem internet.",
  },
  {
    id: "economy",
    label: "Economia",
    detail: "Veja o custo estimado de combustível e a autonomia para viajar de carro.",
  },
  {
    id: "driving",
    label: "Condução",
    detail: "Acompanhe o mapa e as orientações durante a viagem de carro.",
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
    explicit === "driving"
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
