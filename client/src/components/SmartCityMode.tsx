import React, { useState } from "react";
import { ArrowUpRight, Crosshair, LocateFixed, MapPin, Navigation, ShieldCheck, Sparkles } from "lucide-react";
import { buildGoogleMapsSearchUrl, buildRouteProviderUrl, type NavigationProvider } from "@/lib/mobileTools";
import { CITY_PLACES } from "@/lib/aguasLindasCity";

const providers: { id: NavigationProvider; label: string }[] = [
  { id: "google", label: "Google Maps" },
  { id: "waze", label: "Waze" },
  { id: "apple", label: "Apple Maps" },
  { id: "openstreetmap", label: "OpenStreetMap" },
];

const routeDestinations = ["hospital-bom-jesus", "heal", "terminal-nelson-alves", "br-070"];
const nearbySearches = [
  { label: "Saúde", query: "hospital unidade de saúde" },
  { label: "Farmácias", query: "farmácia" },
  { label: "Alimentação", query: "restaurante" },
  { label: "Postos", query: "posto de combustível" },
];

export default function SmartCityMode() {
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const syncLocation = () => {
    if (!navigator.geolocation) {
      setMessage("Este navegador não oferece localização. Você ainda pode pesquisar no guia da cidade.");
      return;
    }
    setLoading(true);
    setMessage("");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setPosition({ lat: coords.latitude, lng: coords.longitude });
        setLoading(false);
        setMessage("Localização pronta. Escolha um destino ou encontre serviços próximos.");
      },
      error => {
        setLoading(false);
        setMessage(error.code === error.PERMISSION_DENIED
          ? "A permissão foi recusada. Ative a localização nas configurações do navegador e tente novamente."
          : error.code === error.TIMEOUT
            ? "A localização demorou para responder. Tente novamente ou pesquise um local manualmente."
            : "Não foi possível obter a localização. Confira o GPS e tente novamente.");
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
    );
  };

  const locations = CITY_PLACES.filter(place => routeDestinations.includes(place.id));

  return (
    <section className="mt-5 overflow-hidden rounded-[1.6rem] border border-[#C7FF3C]/20 bg-[radial-gradient(circle_at_100%_0%,rgba(199,255,60,.09),transparent_38%),#111A20] p-4 shadow-[0_18px_48px_rgba(0,0,0,.2)] sm:p-5" aria-labelledby="smart-city-title">
      <div className="flex items-start gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[#C7FF3C] text-[#0B1014]"><Sparkles className="size-5" /></span>
        <div className="min-w-0 flex-1">
          <p className="text-[.54rem] font-black uppercase tracking-[.16em] text-[#C7FF3C]">Atalho de mobilidade</p>
          <h2 id="smart-city-title" className="mt-1 text-lg font-black tracking-[-.04em]">Modo inteligente</h2>
          <p className="mt-1 text-xs leading-relaxed text-white/50">Sincronize sua posição para montar rotas até pontos importantes e abrir buscas próximas.</p>
        </div>
      </div>

      {!position ? (
        <button type="button" onClick={syncLocation} disabled={loading} className="mt-4 flex min-h-12 w-full items-center justify-between rounded-2xl bg-[#C7FF3C] px-4 text-sm font-black text-[#0B1014] disabled:opacity-60">
          <span className="flex items-center gap-2"><LocateFixed className="size-4" />{loading ? "Localizando…" : "Sincronizar minha localização"}</span>
          <Crosshair className="size-4" />
        </button>
      ) : (
        <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-[#C7FF3C]/20 bg-[#C7FF3C]/[.05] p-3">
          <div className="flex min-w-0 items-center gap-2.5"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#C7FF3C]/10 text-[#C7FF3C]"><MapPin className="size-4" /></span><span className="min-w-0"><span className="block text-xs font-black">Localização sincronizada</span><span className="block truncate text-[.58rem] text-white/45">{position.lat.toFixed(5)}, {position.lng.toFixed(5)}</span></span></div>
          <button type="button" onClick={syncLocation} disabled={loading} className="min-h-10 shrink-0 rounded-xl border border-white/10 px-3 text-[.62rem] font-bold text-white/75 disabled:opacity-50">{loading ? "Atualizando…" : "Atualizar"}</button>
        </div>
      )}

      {message && <p role="status" aria-live="polite" className="mt-3 rounded-xl border border-white/8 bg-black/15 p-3 text-[.65rem] leading-relaxed text-white/65">{message}</p>}

      {position && <>
        <div className="mt-4">
          <p className="text-[.54rem] font-black uppercase tracking-[.14em] text-white/40">Rotas prontas</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {locations.map(place => <details key={place.id} className="group rounded-xl border border-white/8 bg-[#0B1014]/75">
              <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-2 px-3 text-left text-xs font-bold"><span className="flex min-w-0 items-center gap-2"><Navigation className="size-3.5 shrink-0 text-[#C7FF3C]" /><span className="truncate">{place.name}</span></span><ArrowUpRight className="size-3.5 shrink-0 text-white/40" /></summary>
              <div className="grid grid-cols-2 gap-1 border-t border-white/6 p-2">
                {providers.map(provider => <a key={provider.id} href={buildRouteProviderUrl(provider.id, position, place.address)} target="_blank" rel="noopener noreferrer" className="flex min-h-10 items-center justify-between rounded-lg bg-white/[.035] px-2 text-[.58rem] font-bold text-white/70"><span>{provider.label}</span><ArrowUpRight className="size-3 text-white/35" /></a>)}
              </div>
            </details>)}
          </div>
        </div>

        <div className="mt-4">
          <p className="text-[.54rem] font-black uppercase tracking-[.14em] text-white/40">Buscar perto da minha posição</p>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {nearbySearches.map(item => <a key={item.label} href={buildGoogleMapsSearchUrl(`${item.query} @${position.lat},${position.lng}`)} target="_blank" rel="noopener noreferrer" className="flex min-h-11 items-center justify-between gap-1 rounded-xl border border-white/8 bg-white/[.035] px-3 text-[.62rem] font-bold text-white/75"><span>{item.label}</span><ArrowUpRight className="size-3 shrink-0 text-[#3DE3FF]" /></a>)}
          </div>
        </div>
      </>}

      <p className="mt-4 flex items-start gap-2 border-t border-white/8 pt-3 text-[.56rem] leading-relaxed text-white/40"><ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-[#3DE3FF]" />A posição só é solicitada quando você toca no botão, fica apenas nesta tela e não é salva. A navegação é aberta no aplicativo escolhido; confira a rota antes de sair.</p>
    </section>
  );
}
