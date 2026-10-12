import React from "react";
import PremiumFilterModeOption from "@/components/PremiumFilterModeOption";
import { Globe2, Phone, Route, SlidersHorizontal } from "lucide-react";
import type { PublicServiceResourceFilter } from "@/lib/publicServiceListFilters";
import type { PublicServiceResourceCounts } from "@/lib/publicServiceListResults";

const modes = [
  { value: "todos", label: "Ver tudo", detail: "Todos os canais", icon: SlidersHorizontal },
  { value: "contato", label: "Ligar ou WhatsApp", detail: "Contato direto", icon: Phone },
  { value: "rota", label: "Ir até o local", detail: "Como chegar", icon: Route },
  { value: "online", label: "Resolver online", detail: "Serviços digitais", icon: Globe2 },
] as const;

export default function PublicServiceResourceModes({
  resource,
  onChange,
  modeCounts,
  updating = false,
}: {
  resource: PublicServiceResourceFilter;
  onChange: (next: PublicServiceResourceFilter) => void;
  modeCounts?: PublicServiceResourceCounts;
  updating?: boolean;
}) {
  return (
    <div className="mb-3 min-w-0 rounded-[1.4rem] border border-primary/15 bg-primary/[.035] p-3 sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[.14em] text-primary">Modo de atendimento</p>
          <h2 className="mt-1 text-sm font-black text-foreground">Como você quer resolver?</h2>
        </div>
        {resource !== "todos" && (
          <span className="rounded-full border border-accent/20 bg-accent/[.08] px-2.5 py-1 text-xs font-bold text-accent">
            1 modo ativo
          </span>
        )}
      </div>
      <div role="group" aria-label="Recursos disponíveis" className="mt-3 grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-4">
        {modes.map(({ value, label, detail, icon }) => (
          <PremiumFilterModeOption
            key={value}
            layout="grid"
            ariaLabel={label}
            label={label}
            detail={detail}
            availability={modeCounts
              ? updating ? "Atualizando"
                : `${modeCounts[value]} ${modeCounts[value] === 1 ? "serviço" : "serviços"}`
              : undefined}
            icon={icon}
            selected={resource === value}
            onSelect={() => onChange(value)}
          />
        ))}
      </div>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
        Combine o modo com a categoria e a busca. A seleção mostra apenas os serviços com esse recurso disponível no cadastro.
        {modeCounts && " As quantidades consideram sua busca, categoria e filtro de salvos."}
      </p>
    </div>
  );
}
