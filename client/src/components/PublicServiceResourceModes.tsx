import { Globe2, Phone, Route, SlidersHorizontal } from "lucide-react";
import type { PublicServiceResourceFilter } from "@/lib/publicServiceListFilters";

const modes = [
  { value: "todos", label: "Ver tudo", detail: "Todos os canais", icon: SlidersHorizontal },
  { value: "contato", label: "Ligar ou WhatsApp", detail: "Contato direto", icon: Phone },
  { value: "rota", label: "Ir até o local", detail: "Como chegar", icon: Route },
  { value: "online", label: "Resolver online", detail: "Serviços digitais", icon: Globe2 },
] as const;

export default function PublicServiceResourceModes({
  resource,
  onChange,
}: {
  resource: PublicServiceResourceFilter;
  onChange: (next: PublicServiceResourceFilter) => void;
}) {
  return (
    <div className="mb-3 min-w-0 rounded-[1.4rem] border border-primary/15 bg-primary/[.035] p-3 sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[.14em] text-primary">Modo de atendimento</p>
          <h3 className="mt-1 text-sm font-black text-foreground">Como você quer resolver?</h3>
        </div>
        {resource !== "todos" && (
          <span className="rounded-full border border-accent/20 bg-accent/[.08] px-2.5 py-1 text-xs font-bold text-accent">
            1 modo ativo
          </span>
        )}
      </div>
      <div role="group" aria-label="Recursos disponíveis" className="mt-3 grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-4">
        {modes.map(({ value, label, detail, icon: Icon }) => {
          const selected = resource === value;
          return (
            <button
              key={value}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(value)}
              className={
                "flex min-h-[4.5rem] min-w-0 items-center gap-2 rounded-2xl border px-2.5 py-2 text-left outline-offset-2 transition-colors focus-visible:outline-2 focus-visible:outline-ring sm:px-3 " +
                (selected
                  ? "border-primary/45 bg-primary/15 text-foreground shadow-sm"
                  : "border-border/15 bg-background/80 text-foreground hover:border-primary/30")
              }
            >
              <span aria-hidden="true" className={"grid size-8 shrink-0 place-items-center rounded-xl " +
                (selected ? "bg-primary/15 text-primary" : "bg-muted/40 text-muted-foreground")}>
                <Icon className="size-4" />
              </span>
              <span className="min-w-0">
                <span className="block break-words text-xs font-black leading-tight sm:text-sm">{label}</span>
                <span className="mt-1 block break-words text-[11px] leading-tight text-muted-foreground">{detail}</span>
              </span>
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
        Combine o modo com a categoria e a busca. A seleção mostra apenas os serviços com esse recurso disponível no cadastro.
      </p>
    </div>
  );
}
