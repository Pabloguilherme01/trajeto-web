import { Database, MapPinned, RefreshCw, Wifi } from "lucide-react";

type Props = {
  online: boolean;
};

export default function DataHealthStrip({ online }: Props) {
  const items = [
    { label: "Postos", state: "ANP + local", tone: "ok" },
    { label: "Mapa", state: online ? "enriquecimento ao vivo" : "offline", tone: online ? "ok" : "warn" },
    { label: "Território", state: "IBGE não empacotado", tone: "info" },
  ] as const;

  return (
    <section aria-label="Estado das fontes de dados" className="mt-3 rounded-[1.25rem] border border-white/8 bg-[#111A21] px-3 py-2.5">
      <div className="flex items-center gap-2">
        <Database className="size-3.5 shrink-0 text-[#3DE3FF]" aria-hidden="true" />
        <p className="text-[.5rem] font-black uppercase tracking-[.14em] text-white/32">Saúde das fontes</p>
      </div>
      <div className="mt-2 grid grid-cols-3 gap-2">
        {items.map(item => (
          <div key={item.label} className="min-w-0 rounded-xl border border-white/6 bg-white/[.02] px-2 py-2">
            <div className="flex items-center gap-1.5">
              {item.label === "Mapa" ? <Wifi className={`size-3 ${item.tone === "warn" ? "text-[#FFB86B]" : "text-[#C7FF3C]"}`} aria-hidden="true" /> : item.label === "Território" ? <MapPinned className="size-3 text-[#B59CFF]" aria-hidden="true" /> : <RefreshCw className="size-3 text-[#C7FF3C]" aria-hidden="true" />}
              <span className="truncate text-[.5rem] font-black text-white/72">{item.label}</span>
            </div>
            <p className="mt-1 line-clamp-2 text-[.44rem] leading-relaxed text-white/34">{item.state}</p>
          </div>
        ))}
      </div>
      <p className="mt-2 text-[.45rem] leading-relaxed text-white/25">Fonte externa é mostrada como enriquecimento; limite de bairro/setor só deve entrar quando a malha oficial estiver realmente no pacote.</p>
    </section>
  );
}
