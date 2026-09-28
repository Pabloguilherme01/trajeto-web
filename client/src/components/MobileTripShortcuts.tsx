import { BriefcaseBusiness, Home, MapPin, Plus, Trash2, Navigation, ArrowRight, LocateFixed, Share2, Pencil } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { appUrl } from "@/lib/appUrl";
import { shareText } from "@/lib/mobileTools";
import { findOfflineRouteByDestination, listOfflineRoutes } from "@/lib/offlineStore";
import {
  getDestinationUsage,
  getFavoriteDestination,
  getMobileDestinations,
  mobileDestinationEvent,
  rememberDestinationUsage,
  removeMobileDestination,
  saveMobileDestination,
  type DestinationId,
  type MobileDestination,
} from "@/lib/mobileDestinations";

export default function MobileTripShortcuts() {
  const [, setLocation] = useLocation();
  const [places, setPlaces] = useState<MobileDestination[]>(getMobileDestinations);
  const [editing, setEditing] = useState<DestinationId | null>(null);
  const [value, setValue] = useState("");
  const [locating, setLocating] = useState<DestinationId | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [usage, setUsage] = useState(getDestinationUsage);

  useEffect(() => {
    const refresh = () => {
      setPlaces(getMobileDestinations());
      setUsage(getDestinationUsage());
    };
    window.addEventListener(mobileDestinationEvent, refresh);
    return () => window.removeEventListener(mobileDestinationEvent, refresh);
  }, []);

  useEffect(() => {
    if (!feedback) return;
    const timer = window.setTimeout(() => setFeedback(null), 4000);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  const save = () => {
    const trimmed = value.trim();
    if (trimmed.length < 3 || !editing) return;
    if (!saveMobileDestination(editing, trimmed)) {
      setFeedback("Não foi possível salvar este destino neste aparelho.");
      return;
    }
    setPlaces(getMobileDestinations());
    setUsage(getDestinationUsage());
    setValue("");
    setEditing(null);
    setFeedback("Destino salvo.");
  };

  const rememberUsage = (place: MobileDestination) => {
    setUsage(rememberDestinationUsage(place));
  };

  const open = (place: MobileDestination) => {
    rememberUsage(place);
    if (!navigator.onLine) {
      void listOfflineRoutes().then(routes => {
        const saved = findOfflineRouteByDestination(routes, place.value);
        if (saved) {
          setLocation(appUrl("/planejar") + "?rota=" + encodeURIComponent(saved.id) + "&origem=" + encodeURIComponent(saved.origin) + "&destino=" + encodeURIComponent(saved.destination));
          return;
        }
        setFeedback("Sem internet: este destino só pode ser aberto se houver uma rota salva correspondente.");
      }).catch(() => setFeedback("Não foi possível consultar suas rotas salvas."));
      return;
    }
    setLocation(appUrl("/planejar") + "?destino=" + encodeURIComponent(place.value));
  };

  const navigateTo = (place: MobileDestination) => {
    rememberUsage(place);
    if (!navigator.onLine) {
      setFeedback("Sem internet: abra uma rota salva para continuar a viagem.");
      return;
    }
    const google = "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(place.value);
    window.open(google, "_blank", "noopener,noreferrer");
    setFeedback("Abrindo a navegação para " + place.label + ".");
  };

  const sharePlace = async (place: MobileDestination) => {
    try {
      await shareText(
        place.label + ": " + place.value,
        window.location.origin + appUrl("/planejar") + "?destino=" + encodeURIComponent(place.value),
        "Destino no Trajeto",
      );
      setFeedback("Destino preparado para compartilhar.");
    } catch {
      setFeedback("Não foi possível compartilhar agora.");
    }
  };

  const openFromHere = (place: MobileDestination) => {
    if (locating) return;
    rememberUsage(place);
    setFeedback(null);

    if (!navigator.onLine) {
      void listOfflineRoutes().then(routes => {
        const saved = findOfflineRouteByDestination(routes, place.value);
        if (saved) {
          setLocation(appUrl("/planejar") + "?rota=" + encodeURIComponent(saved.id) + "&origem=" + encodeURIComponent(saved.origin) + "&destino=" + encodeURIComponent(saved.destination));
          return;
        }
        setFeedback("Esse destino não tem uma rota salva. Sem internet, salve a rota antes de sair.");
      }).catch(() => setFeedback("Não foi possível consultar suas rotas salvas."));
      return;
    }

    setLocating(place.id);

    if (!navigator.geolocation) {
      setLocating(null);
      setLocation(appUrl("/planejar") + "?destino=" + encodeURIComponent(place.value));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      position => {
        setLocating(null);
        setLocation(
          appUrl("/planejar") +
          "?origem=" + encodeURIComponent(position.coords.latitude + ", " + position.coords.longitude) +
          "&destino=" + encodeURIComponent(place.value),
        );
      },
      () => {
        setLocating(null);
        setFeedback("GPS indisponível. Abrindo o destino sem sua localização.");
        setLocation(appUrl("/planejar") + "?destino=" + encodeURIComponent(place.value));
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 120000 },
    );
  };

  const favoritePlace = getFavoriteDestination(places, usage);

  return (
    <section className="mobile-card rounded-3xl border border-white/10 bg-[#111A21] p-4 text-[#EAF0F2] shadow-[0_18px_50px_rgba(0,0,0,.2)] sm:p-6">
      <div>
        <p className="text-[0.62rem] font-bold uppercase tracking-[0.14em] text-[#3DE3FF]">Atalhos pessoais</p>
        <h2 className="mt-1 font-display text-2xl font-semibold tracking-[-0.045em]">Destinos que você repete.</h2>
        <p className="mt-2 text-xs leading-relaxed text-[#8FA3AC]">Ficam somente neste aparelho. Não precisam de conta. Quando houver uma rota salva para o destino, o atalho também funciona sem internet.</p>
        <div className="mt-3 flex items-center gap-2 rounded-xl bg-white/[0.04] px-3 py-2 text-[0.62rem] font-bold text-[#B7C5CA]">
          <LocateFixed className="size-3.5 text-[#326575]" />
          Use “Daqui” para transformar o destino em uma rota com sua posição atual.
        </div>
      </div>

      {favoritePlace && (
        <div className="mt-4 flex items-center gap-3 rounded-2xl border border-[#C7FF3C]/45 bg-[linear-gradient(135deg,#163840,#1E4B50)] p-3 text-white shadow-[0_12px_28px_rgba(22,56,64,.16)]">
          <div className="min-w-0 flex-1">
            <p className="text-[0.58rem] font-extrabold uppercase tracking-[0.14em] text-[#C7FF3C]">Atalho inteligente</p>
            <p className="mt-1 truncate text-sm font-extrabold">{favoritePlace.label} · {favoritePlace.value}</p>
            <p className="mt-1 text-[0.62rem] text-white/65">
              {(usage[favoritePlace.id]?.count ?? 0) > 1 ? "Destino recorrente neste aparelho." : "Último destino pronto para reutilizar."}
            </p>
          </div>
          <button
            type="button"
            onClick={() => openFromHere(favoritePlace)}
            disabled={Boolean(locating)}
            className="min-h-11 shrink-0 rounded-xl bg-[#C7FF3C] px-4 text-xs font-black text-[#0B1014] active:scale-[.98]"
          >
            {locating === favoritePlace.id ? "GPS…" : "Ir agora"}
          </button>
        </div>
      )}

      {feedback && (
        <p role="status" aria-live="polite" className="mt-3 rounded-xl border border-[#326575]/20 bg-[#F2F5F6] px-3 py-2 text-[0.62rem] font-bold text-[#52636C]">
          {feedback}
        </p>
      )}

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        {(["casa", "trabalho", "outro"] as const).map(id => {
          const place = places.find(item => item.id === id);
          const Icon = id === "casa" ? Home : id === "trabalho" ? BriefcaseBusiness : MapPin;
          const isFavorite = favoritePlace?.id === id;
          const usageCount = usage[id]?.count ?? 0;

          return (
            <div key={id} className="rounded-2xl border border-white/10 bg-white/[0.025] p-3 shadow-none">
              {place ? (
                <>
                  <button
                    type="button"
                    onClick={() => open(place)}
                    aria-label={"Planejar rota para " + place.label + (usageCount ? ", usado " + usageCount + " vezes" : "")}
                    className="group flex min-h-12 w-full items-center gap-2 rounded-xl text-left active:scale-[.99]"
                  >
                    <Icon className="size-4 text-[#326575]" />
                    <span className="min-w-0 flex-1">
                      <strong className="flex items-center gap-1.5 text-xs">
                        {place.label}
                        {isFavorite && <span className="rounded-full bg-[#C7FF3C]/15 px-1.5 py-0.5 text-[0.48rem] font-extrabold uppercase tracking-[0.08em] text-[#DFFF9A]">Mais usado</span>}
                      </strong>
                      <span className="block truncate text-[0.65rem] text-[#7F919A]">{place.value}</span>
                    </span>
                    <ArrowRight className="size-3.5 shrink-0 text-[#326575] opacity-70 transition group-hover:opacity-100" />
                  </button>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                    <button type="button" onClick={() => openFromHere(place)} className="inline-flex min-h-10 items-center gap-1 rounded-lg bg-[#F2F5F6] px-2.5 text-[0.62rem] font-bold text-[#D7E0E4] active:scale-[.98]"><LocateFixed className="size-3" /> Daqui</button>
                    <button type="button" onClick={() => navigateTo(place)} disabled={!navigator.onLine} className="inline-flex min-h-9 items-center gap-1 text-[0.62rem] font-bold text-[#326575] disabled:cursor-not-allowed disabled:opacity-40"><Navigation className="size-3" /> Navegar</button>
                    <button type="button" onClick={() => void sharePlace(place)} className="inline-flex min-h-9 items-center gap-1 text-[0.62rem] font-bold text-[#326575]"><Share2 className="size-3" /> Enviar</button>
                    <button type="button" onClick={() => { setEditing(id); setValue(place.value); }} className="inline-flex min-h-9 items-center gap-1 text-[0.62rem] font-bold text-[#326575]"><Pencil className="size-3" /> Editar</button>
                    <button type="button" onClick={() => removeMobileDestination(id)} className="inline-flex min-h-9 items-center gap-1 text-[0.62rem] font-bold text-[#FF9D8E]"><Trash2 className="size-3" /> Remover</button>
                  </div>
                </>
              ) : (
                <button type="button" onClick={() => { setEditing(id); setValue(""); }} className="flex min-h-16 w-full items-center justify-center gap-2 rounded-xl text-xs font-bold text-[#52636C]">
                  <Plus className="size-4" /> Adicionar {id === "casa" ? "casa" : id === "trabalho" ? "trabalho" : "destino"}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {editing && (
        <div className="mt-3 rounded-2xl border border-[#326575]/25 bg-[#F2F5F6] p-3">
          <label className="text-xs font-bold" htmlFor="mobile-destination">Endereço ou local</label>
          <div className="mt-2 flex gap-2">
            <input
              id="mobile-destination"
              value={value}
              onChange={event => setValue(event.target.value)}
              onKeyDown={event => { if (event.key === "Enter") save(); }}
              placeholder="Ex.: Brasília, DF"
              className="min-w-0 flex-1 rounded-xl border border-white/10 bg-[#0B1014] px-3 py-3 text-sm outline-none focus:border-[#3DE3FF]"
            />
            <button type="button" onClick={() => { setEditing(null); setValue(""); }} className="min-h-11 rounded-xl border border-[#C7D2D6] bg-white px-3 text-xs font-bold text-[#52636C]">Cancelar</button>
            <button type="button" onClick={save} className="min-h-11 rounded-xl bg-[#163840] px-4 text-xs font-extrabold text-white">Salvar</button>
          </div>
        </div>
      )}
    </section>
  );
}
