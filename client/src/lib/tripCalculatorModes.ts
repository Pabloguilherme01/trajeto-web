export type TripCalculatorModeId = "automatico" | "agora" | "trabalho" | "rotina" | "todo-dia";

export type TripCalculatorMode = {
  id: TripCalculatorModeId;
  label: string;
  detail: string;
  roundTrip?: boolean;
  tripsPerWeek?: number;
};

export const TRIP_CALCULATOR_MODES: TripCalculatorMode[] = [
  {
    id: "automatico",
    label: "Automático",
    detail: "Aproveita rota, veículo e preço já salvos sem apagar seus ajustes.",
  },
  {
    id: "agora",
    label: "Só esta viagem",
    detail: "Uma saída, sem retorno automático.",
    roundTrip: false,
    tripsPerWeek: 1,
  },
  {
    id: "trabalho",
    label: "Trabalho / estudo",
    detail: "Ida e volta, 5 vezes por semana.",
    roundTrip: true,
    tripsPerWeek: 5,
  },
  {
    id: "rotina",
    label: "2x por semana",
    detail: "Ida e volta, duas vezes na semana.",
    roundTrip: true,
    tripsPerWeek: 2,
  },
  {
    id: "todo-dia",
    label: "Todo dia",
    detail: "Ida e volta, 7 vezes por semana.",
    roundTrip: true,
    tripsPerWeek: 7,
  },
];

export function getTripCalculatorMode(id: TripCalculatorModeId) {
  return TRIP_CALCULATOR_MODES.find(mode => mode.id === id) ?? TRIP_CALCULATOR_MODES[0];
}
