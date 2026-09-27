import { BriefcaseBusiness, Home, MapPin, Plus, Trash2, Navigation, ArrowRight, LocateFixed, Share2, Pencil } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { appUrl } from "@/lib/appUrl";
import { shareText } from "@/lib/mobileTools";

type Place = { id: "casa" | "trabalho" | "outro"; label: string; value: string };

const KEY = "trajeto-mobile-destinations";

function readPlaces(): Place[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

export default function MobileTripShortcuts() {
  const [, setLocation] = useLocation();
  const [places, setPlaces] = useState<Place[]>(readPlaces);
  const [editing, setEditing] = useState<Place["id"] | null>(null);
  const [value, setValue] = useState("");
  const [locating, setLocating] = useState<Place["id"] | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(places)); } catch {}
  }, [places]);

  const save = () => {
    const trimmed = value.trim();
    if (trimmed.length < 3 || !editing) return;
    setPlaces(current => {
      const without = current.filter(item => item.id !== editing);
      return [...without, { id: editing, label: editing === "casa" ? "Casa" : editing === "trabalho" ? "Trabalho" : "Destino", value: trimmed }];
    });
    setValue("");
    setEditing(null);
  };

  const open = (place: Place) => {
    setLocation(appUrl("/planejar") + "?destino=" + encodeURIComponent(place.value));
  };

  const openFromHere = (place: Place) => {
    if (locating) return;
    setFeedback(null);
    setLocating(place.id);
    if (!navigator.geolocation) {
      open(place);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      position => { setLocating(null); setLocation(appUrl("/planejar") + "?origem=" + encodeURIComponent(`${position.coords.latitude}, ${position.coords.longitude}`) + "&destino=" + encodeURIComponent(place.value)); },
      () => { setLocating(null); setFeedback("GPS indisponível. Abrindo o destino sem sua localização."); open(place); },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 120000 },
    );
  };

  return (
    <section className="mobile-card rounded-3xl border border-[#CFD9DD] bg-white p-4 text-[#0B1014] shadow-[0_12px_35px_rgba(11,16,20,.06)] sm:p-6">
      <div>
        <p className="text-[0.62rem] font-bold uppercase tracking-[0.14em] text-[#326575]">Atalhos pessoais</p>
        <h2 className="mt-1 font-display text-2xl font-semibold tracking-[-0.045em]">Destinos que você repete.</h2>
        <p className="mt-2 text-xs leading-relaxed text-[#617179]">Ficam somente neste aparelho. Não precisam de conta.</p><div className="mt-3 flex items-center gap-2 rounded-xl bg-[#F2F5F6] px-3 py-2 text-[0.62rem] font-bold text-[#52636C]"><LocateFixed className="size-3.5 text-[#326575]" /> Use “Daqui” para transformar o destino em uma rota com sua posição atual.</div>
      </div>
      {feedback && <p role="status" aria-live="polite" className="mt-3 rounded-xl border border-[#326575]/20 bg-[#F2F5F6] px-3 py-2 text-[0.62rem] font-bold text-[#52636C]">{feedback}</p>}
      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        {(["casa", "trabalho", "outro"] as const).map(id => {
          const place = places.find(item => item.id === id);
          const Icon = id === "casa" ? Home : id === "trabalho" ? BriefcaseBusiness : MapPin;
          return (
            <div key={id} className="rounded-2xl border border-[#D8E0E3] bg-[#FCFDFD] p-3 shadow-[0_8px_24px_rgba(11,16,20,.04)]">
              {place ? (
                <>
                  <button type="button" onClick={() => open(place)} className="group flex min-h-12 w-full items-center gap-2 rounded-xl text-left active:scale-[.99]">
                    <Icon className="size-4 text-[#326575]" />
                    <span className="min-w-0 flex-1"><strong className="block text-xs">{place.label}</strong><span className="block truncate text-[0.65rem] text-[#718089]">{place.value}</span></span><ArrowRight className="size-3.5 shrink-0 text-[#326575] opacity-70 transition group-hover:opacity-100" />
                  </button>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1"><button type="button" onClick={() => openFromHere(place)} className="inline-flex min-h-10 items-center gap-1 rounded-lg bg-[#F2F5F6] px-2.5 text-[0.62rem] font-bold text-[#163840] active:scale-[.98]"><LocateFixed className="size-3" /> Daqui</button><button type="button" onClick={() => void shareText(`${place.label}: ${place.value}`, `${window.location.origin}${appUrl("/planejar")}?destino=${encodeURIComponent(place.value)}`, "Destino no Trajeto")} className="inline-flex min-h-9 items-center gap-1 text-[0.62rem] font-bold text-[#326575]"><Share2 className="size-3" /> Enviar</button><button type="button" onClick={() => { setEditing(id); setValue(place.value); }} className="inline-flex min-h-9 items-center gap-1 text-[0.62rem] font-bold text-[#326575]"><Pencil className="size-3" /> Editar</button><button type="button" onClick={() => setPlaces(current => current.filter(item => item.id !== id))} className="inline-flex min-h-9 items-center gap-1 text-[0.62rem] font-bold text-[#9B6258]"><Trash2 className="size-3" /> Remover</button></div>
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
      {editing && <div className="mt-3 rounded-2xl border border-[#326575]/25 bg-[#F2F5F6] p-3">
        <label className="text-xs font-bold" htmlFor="mobile-destination">Endereço ou local</label>
        <div className="mt-2 flex gap-2">
          <input id="mobile-destination" value={value} onChange={event => setValue(event.target.value)} placeholder="Ex.: Brasília, DF" className="min-w-0 flex-1 rounded-xl border border-[#C7D2D6] bg-white px-3 py-3 text-sm outline-none focus:border-[#326575]" />
          <button type="button" onClick={save} className="min-h-11 rounded-xl bg-[#163840] px-4 text-xs font-extrabold text-white">Salvar</button>
        </div>
      </div>}
    </section>
  );
}
