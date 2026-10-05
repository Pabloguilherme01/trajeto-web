export type TripCalculatorModeId = "automatico" | "agora" | "bate-volta" | "rotina" | "tres-vezes" | "trabalho" | "trabalho-6x" | "todo-dia";
export type TripCalculatorModeSelection = TripCalculatorModeId | "personalizado";

export type TripCalculatorMode = {
  id: TripCalculatorModeId;
  label: string;
  detail: string;
  roundTrip?: boolean;
  tripsPerWeek?: number;
  recurring?: boolean;
};

export const TRIP_CALCULATOR_MODES: TripCalculatorMode[] = [
  {
    id: "automatico",
    label: "Automático",
    detail: "Reaproveita rota, veículo e preço sem presumir uma rotina.",
    recurring: false,
  },
  {
    id: "agora",
    label: "Só ida agora",
    detail: "Uma saída pontual, sem projeção mensal.",
    roundTrip: false,
    tripsPerWeek: 1,
    recurring: false,
  },
  {
    id: "bate-volta",
    label: "Ida e volta hoje",
    detail: "Sai e volta uma vez, sem projeção mensal.",
    roundTrip: true,
    tripsPerWeek: 1,
    recurring: false,
  },
  {
    id: "tres-vezes",
    label: "3x por semana",
    detail: "Ida e volta, três vezes na semana.",
    roundTrip: true,
    tripsPerWeek: 3,
    recurring: true,
  },
  {
    id: "trabalho",
    label: "Trabalho / estudo",
    detail: "Ida e volta, 5 vezes por semana.",
    roundTrip: true,
    tripsPerWeek: 5,
    recurring: true,
  },
  {
    id: "trabalho-6x",
    label: "Trabalho 6x",
    detail: "Ida e volta, seis vezes por semana.",
    roundTrip: true,
    tripsPerWeek: 6,
    recurring: true,
  },
  {
    id: "rotina",
    label: "2x por semana",
    detail: "Ida e volta, duas vezes na semana.",
    roundTrip: true,
    tripsPerWeek: 2,
    recurring: true,
  },
  {
    id: "todo-dia",
    label: "Todo dia",
    detail: "Ida e volta, 7 vezes por semana.",
    roundTrip: true,
    tripsPerWeek: 7,
    recurring: true,
  },
];

export function getTripCalculatorMode(id: TripCalculatorModeId) {
  return TRIP_CALCULATOR_MODES.find(mode => mode.id === id) ?? TRIP_CALCULATOR_MODES[0];
}

export function isTripCalculatorModeSelection(value: unknown): value is TripCalculatorModeSelection {
  return value === "personalizado" || TRIP_CALCULATOR_MODES.some(mode => mode.id === value);
}

export function isRecurringTripMode(mode: TripCalculatorModeSelection) {
  if (mode === "personalizado") return true;
  return Boolean(getTripCalculatorMode(mode).recurring);
}
