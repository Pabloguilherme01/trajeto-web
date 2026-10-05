import { Bike, Bus, Car, PersonStanding } from "lucide-react";
import { PLANNER_EXPERIENCE_OPTIONS, plannerExperienceDetail, type PlannerExperienceMode } from "@/lib/plannerModes";
import type { PublicTravelMode } from "@/lib/publicRouting";

type Props = {
  mode: PublicTravelMode;
  experienceMode: PlannerExperienceMode;
  onModeChange: (mode: PublicTravelMode) => void;
  onExperienceChange: (mode: PlannerExperienceMode) => void;
};

export default function PlannerTravelPreferences({ mode, experienceMode, onModeChange, onExperienceChange }: Props) {
  return <>
    <fieldset className="mt-4">
      <legend className="mb-2 text-sm font-bold text-foreground">2. Como ir</legend>
      <div className="grid grid-cols-4 gap-1.5">
        {([
          ["driving", "Carro", Car],
          ["walking", "A pé", PersonStanding],
          ["cycling", "Bicicleta", Bike],
          ["transit", "Transporte", Bus],
        ] as const).map(([value, label, Icon]) => (
          <button key={value} type="button" aria-pressed={mode === value} onClick={() => onModeChange(value)}
            className={"planner-choice flex min-h-11 min-w-0 flex-col items-center justify-center gap-1 rounded-xl border px-1 text-xs font-bold " + (mode === value ? "border-primary/30 bg-primary/10 text-primary" : "border-border bg-secondary text-muted-foreground")}>
            <Icon className="size-4" aria-hidden="true" />{label}
          </button>
        ))}
      </div>
    </fieldset>
    <fieldset className="mt-4">
      <legend className="mb-2 text-sm font-bold text-foreground">Preferência de viagem</legend>
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
        {PLANNER_EXPERIENCE_OPTIONS.map(item => (
          <button key={item.id} type="button" aria-pressed={experienceMode === item.id} onClick={() => onExperienceChange(item.id)}
            className={"planner-choice min-h-11 rounded-xl border px-2 text-xs font-bold " + (experienceMode === item.id ? "border-accent/35 bg-accent/10 text-accent" : "border-border bg-secondary text-muted-foreground")}>
            {item.label}
          </button>
        ))}
      </div>
      <p className="mt-2 task-detail">{plannerExperienceDetail(experienceMode)}</p>
    </fieldset>
  </>;
}
