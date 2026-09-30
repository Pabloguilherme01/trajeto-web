import { ArrowLeft, ExternalLink, MapPinned, Navigation, Share2, Siren } from "lucide-react";
import { useEffect } from "react";
import { useLocation } from "wouter";
import NotFound from "@/pages/NotFound";
import { appUrl } from "@/lib/appUrl";
import { OFFLINE_DESTINATIONS, type OfflineDestination } from "@/lib/offlineDestinations";
import {
  buildAppleMapsDirectionsUrl,
  buildGoogleMapsDirectionsUrl,
  buildOfflineDestinationShareText,
  buildOfflineDestinationShareUrl,
  buildWazeNavigationUrl,
  buildWhatsAppShareUrl,
  getPreferredNavigationProvider,
  shareText,
  vibration,
} from "@/lib/mobileTools";

function findDestination(pathname: string): OfflineDestination | null {
  const match = pathname.match(/^\/local\/([^/?#]+)/);
  if (!match) return null;
  return OFFLINE_DESTINATIONS.find(item => item.id === decodeURIComponent(match[1])) ?? null;
}

export default function LocalPlace() {
  const [location, setLocation] = useLocation();
  const destination = typeof window !== "undefined" ? findDestination(location) : null;

  useEffect(() => {
    if (!destination) setLocation(appUrl("/mapa"));
  }, [destination, setLocation]);

  if (!destination) return <NotFound />;

  const navigate = () => {
    const provider = getPreferredNavigationProvider();
    const url = provider === "waze"
      ? buildWazeNavigationUrl(destination.address)
      : provider === "apple"
        ? buildAppleMapsDirectionsUrl(destination.address)
        : buildGoogleMapsDirectionsUrl("", destination.address, "driving", true);
    window.open(url, "_blank", "noopener,noreferrer");
    vibration(8);
  };

  const share = async () => {
    try {
      await shareText(buildOfflineDestinationShareText(destination), buildOfflineDestinationShareUrl(destination.id), "Trajeto · " + destination.shortName);
    } catch {}
  };

  return (
    <main className="min-h-[100dvh] bg-[#0B1014] pb-28 text-white">
      <div className="container max-w-2xl pt-4 sm:pt-8">
        <button type="button" onClick={() => window.history.length > 1 ? window.history.back() : setLocation(appUrl("/mapa"))} className="mobile-action mobile-action-secondary min-h-10 border-0 bg-transparent px-2 text-[0.58rem]"><ArrowLeft className="size-4" /> Voltar</button>
        <article className="mt-3 rounded-[1.7rem] border border-white/10 bg-[#121B22] p-4 shadow-[0_24px_60px_rgba(0,0,0,.26)] sm:p-6">
          <div className="flex items-start gap-3">
            <div className={"grid size-12 shrink-0 place-items-center rounded-2xl " + (destination.emergency ? "bg-[#FF7D6A]/10 text-[#FFB7A9]" : "bg-[#3DE3FF]/[.08] text-[#3DE3FF]")}>
              {destination.emergency ? <Siren className="size-6" /> : <MapPinned className="size-6" />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[0.5rem] font-black uppercase tracking-[.16em] text-[#3DE3FF]">{destination.category}</p>
              <h1 className="mt-1 font-display text-2xl font-semibold tracking-[-.05em]">{destination.name}</h1>
              <p className="mt-2 text-sm leading-relaxed text-white/50">{destination.address}</p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <button type="button" onClick={navigate} className="mobile-action mobile-action-primary min-h-12 rounded-2xl px-4"><Navigation className="size-4" /> Como chegar</button>
            <button type="button" onClick={() => void share()} className="mobile-action mobile-action-secondary min-h-12 rounded-2xl px-4"><Share2 className="size-4" /> Compartilhar</button>
          </div>
          <a
            href={buildWhatsAppShareUrl(buildOfflineDestinationShareText(destination), buildOfflineDestinationShareUrl(destination.id))}
            target="_blank"
            rel="noreferrer"
            className="mobile-action mobile-action-secondary mt-2 min-h-11 w-full rounded-2xl border-[#25D366]/20 bg-[#25D366]/[.05] text-[#B8F6C8]"
          >
            Compartilhar no WhatsApp
          </a>
          <a
            href={appUrl("/planejar") + "?offline=1&destino=" + encodeURIComponent(destination.address)}
            className="mobile-action mobile-action-secondary mt-2 min-h-11 w-full rounded-2xl"
          >
            Planejar no Trajeto
          </a>

          <div className="mt-3 rounded-2xl border border-white/8 bg-white/[.02] p-3.5">
            <p className="text-[0.48rem] font-black uppercase tracking-[.14em] text-white/25">Resumo</p>
            <p className="mt-1 text-sm leading-relaxed text-white/60">{destination.description}</p>
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/8 bg-white/[.02] p-3">
              <p className="text-[0.48rem] font-black uppercase tracking-[.12em] text-white/25">Fonte</p>
              <p className="mt-1 text-sm font-black">{destination.sourceLabel}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-white/[.02] p-3">
              <p className="text-[0.48rem] font-black uppercase tracking-[.12em] text-white/25">Disponibilidade</p>
              <p className="mt-1 text-sm font-black text-[#C7FF3C]">Catálogo local offline</p>
            </div>
          </div>

          <a href={destination.sourceUrl} target="_blank" rel="noreferrer" className="mt-3 flex min-h-11 items-center justify-between rounded-2xl border border-white/8 bg-white/[.02] px-3 text-xs font-black text-white/65">
            Abrir fonte
            <ExternalLink className="size-4 text-white/35" />
          </a>
        </article>
      </div>
    </main>
  );
}
