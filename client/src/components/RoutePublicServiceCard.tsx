import React from "react";
import { Clock3, ExternalLink, MapPin, Phone } from "lucide-react";
import { routePublicService } from "@/lib/routePublicService";

export default function RoutePublicServiceCard({ destination, online }: { destination: string; online: boolean }) {
  const service = routePublicService(destination);
  if (!service) return null;
  return (
    <section aria-label="Informações do serviço no destino" className="premium-card mt-3 rounded-3xl border border-white/10 bg-card p-4 sm:p-5">
      <h3 className="text-lg font-bold text-foreground">Antes de sair</h3>
      <p className="mt-1 text-sm font-semibold text-foreground">{service.name}</p>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{service.description}</p>
      <dl className="mt-3 space-y-2 text-sm text-muted-foreground">
        {service.address && <div className="flex gap-2"><dt><MapPin aria-hidden="true" className="mt-0.5 size-4" /><span className="sr-only">Endereço</span></dt><dd className="min-w-0 break-words">{service.address}</dd></div>}
        {service.hours && <div className="flex gap-2"><dt><Clock3 aria-hidden="true" className="mt-0.5 size-4" /><span className="sr-only">Horário informado</span></dt><dd>{service.hours}</dd></div>}
      </dl>
      {service.guidance && <p className="mt-3 rounded-xl border border-warning/25 bg-warning/10 p-3 text-sm leading-relaxed text-foreground">{service.guidance}</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        {service.phone && <a href={"tel:" + service.phone.replace(/[^\d+]/g, "")} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-3 text-sm font-bold text-primary-foreground"><Phone className="size-4" aria-hidden="true" />Ligar {service.phone}</a>}
        {online && <a href={service.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/15 px-3 text-sm font-semibold text-foreground">Consultar fonte <ExternalLink className="size-4" aria-hidden="true" /></a>}
      </div>
      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">Fonte: {service.sourceLabel}{service.verifiedAt ? " · conferido em " + service.verifiedAt : " · cadastro local"}. Confirme o atendimento antes de sair.{!online && " Informações salvas; a fonte online exige internet."}</p>
    </section>
  );
}
