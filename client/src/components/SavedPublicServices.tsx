import { Bookmark, ChevronRight, WifiOff } from "lucide-react";
import { appUrl } from "@/lib/appUrl";
import { PUBLIC_SERVICES } from "@/lib/publicServices";

export default function SavedPublicServices({ ids }: { ids: string[] }) {
  const services = PUBLIC_SERVICES.filter(service => ids.includes(service.id));
  return <section className="mt-5" aria-labelledby="saved-services-title">
    <h2 id="saved-services-title" className="text-lg font-bold">Serviços salvos</h2>
    <p className="mt-1 text-sm text-muted-foreground">As fichas estão no catálogo offline. Contatos digitais e sites oficiais precisam de conexão.</p>
    {services.length ? <ul className="mt-3 divide-y divide-border rounded-xl border border-border bg-card">
      {services.map(service => <li key={service.id}>
        <a href={appUrl("/servicos") + "?servico=" + encodeURIComponent(service.id)} className="flex min-h-14 items-center gap-3 px-3 py-3 focus-visible:outline-2 focus-visible:outline-ring">
          <Bookmark className="size-5 shrink-0 text-primary" aria-hidden="true" />
          <span className="min-w-0 flex-1"><span className="block text-sm font-bold">{service.name}</span><span className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><WifiOff className="size-3 shrink-0" aria-hidden="true" />Ficha disponível offline</span></span>
          <ChevronRight className="size-4 shrink-0" aria-hidden="true" />
        </a>
      </li>)}
    </ul> : <p className="mt-3 text-sm text-muted-foreground">Nenhum serviço salvo neste aparelho.</p>}
    <a href={appUrl("/servicos") + "?salvos=1"} className="mt-2 inline-flex min-h-11 items-center text-sm font-bold text-primary">Gerenciar serviços salvos</a>
  </section>;
}
