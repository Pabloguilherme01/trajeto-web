import { CheckCircle2, MapPin, Navigation, X } from "lucide-react";
import { getPreferredNavigationProvider, openNavigation, vibration } from "@/lib/mobileTools";

type ComparableStation = {
  placeId: string;
  name: string;
  address: string;
  distanceLabel: string | null;
  distanceMeters: number | null;
  isOpen: boolean | null;
  lat: number;
  lng: number;
  phone: string | null;
  anpMatch?: {
    status: "probable" | "unresolved";
    confidence: number;
    brand: string | null;
  };
};

type Props = {
  stations: ComparableStation[];
  onClear: () => void;
};

function statusLabel(value: ComparableStation["isOpen"]) {
  if (value === true) return "Aberto";
  if (value === false) return "Fechado";
  return "Não confirmado";
}

function compareDistance(stations: ComparableStation[]) {
  const withDistance = stations
    .map((station, index) => ({ station, index, value: station.distanceMeters }))
    .filter(item => item.value != null && Number.isFinite(item.value));
  if (!withDistance.length) return new Set<number>();
  const min = Math.min(...withDistance.map(item => item.value));
  return new Set(withDistance.filter(item => item.value === min).map(item => item.index));
}

export default function StationComparePanel({ stations, onClear }: Props) {
  const nearest = compareDistance(stations);

  return (
    <section id="station-compare" className="mt-5 overflow-hidden rounded-[1.5rem] border border-[#3DE3FF]/20 bg-[#111A21]" aria-labelledby="station-compare-title">
      <div className="border-b border-white/8 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[0.52rem] font-black uppercase tracking-[.15em] text-[#3DE3FF]">Comparação rápida</p>
            <h3 id="station-compare-title" className="mt-1 text-xl font-black tracking-[-.04em]">{stations.length} postos lado a lado</h3>
            <p className="mt-1 text-[0.58rem] leading-relaxed text-white/35">Compare somente dados presentes na consulta atual. Sem estimar preço, horário ou distância ausentes.</p>
          </div>
          <button type="button" onClick={onClear} className="grid size-9 shrink-0 place-items-center rounded-lg border border-white/8 text-white/40" aria-label="Limpar comparação">
            <X className="size-4" />
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[36rem] border-collapse text-left">
          <thead>
            <tr className="border-b border-white/8 bg-[#0B1014]">
              <th className="w-28 px-3 py-2.5 text-[0.48rem] font-black uppercase tracking-[.12em] text-white/25">Critério</th>
              {stations.map((station, index) => (
                <th key={station.placeId} className="min-w-[10rem] px-3 py-2.5 text-[0.58rem] font-black text-white">
                  <span className="block truncate">{index + 1}. {station.name}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-white/6">
              <th className="px-3 py-3 text-[0.5rem] font-bold text-white/35">Distância</th>
              {stations.map((station, index) => (
                <td key={station.placeId + "-distance"} className={"px-3 py-3 text-xs font-black " + (nearest.has(index) ? "text-[#D9FF91]" : "text-white/75")}>
                  {station.distanceLabel ?? "—"}{nearest.has(index) ? " · mais perto" : ""}
                </td>
              ))}
            </tr>
            <tr className="border-b border-white/6 bg-white/[.012]">
              <th className="px-3 py-3 text-[0.5rem] font-bold text-white/35">Funcionamento</th>
              {stations.map(station => (
                <td key={station.placeId + "-status"} className="px-3 py-3 text-xs font-bold text-white/70">
                  <span className="inline-flex items-center gap-1.5"><CheckCircle2 className={"size-3.5 " + (station.isOpen === true ? "text-[#C7FF3C]" : "text-white/25")} />{statusLabel(station.isOpen)}</span>
                </td>
              ))}
            </tr>
            <tr className="border-b border-white/6">
              <th className="px-3 py-3 text-[0.5rem] font-bold text-white/35">Cadastro</th>
              {stations.map(station => (
                <td key={station.placeId + "-anp"} className="px-3 py-3 text-xs font-bold text-white/70">
                  {station.anpMatch?.status === "probable" ? "ANP provável · " + Math.round(station.anpMatch.confidence * 100) + "%" : "Sem conciliação ANP"}
                </td>
              ))}
            </tr>
            <tr className="border-b border-white/6 bg-white/[.012]">
              <th className="px-3 py-3 text-[0.5rem] font-bold text-white/35">Bandeira</th>
              {stations.map(station => <td key={station.placeId + "-brand"} className="px-3 py-3 text-xs font-bold text-white/70">{station.anpMatch?.brand ?? "Não informada"}</td>)}
            </tr>
            <tr className="border-b border-white/6">
              <th className="px-3 py-3 text-[0.5rem] font-bold text-white/35">Telefone</th>
              {stations.map(station => <td key={station.placeId + "-phone"} className="px-3 py-3 text-xs font-bold text-white/70">{station.phone ?? "Não informado"}</td>)}
            </tr>
            <tr>
              <th className="px-3 py-3 align-top text-[0.5rem] font-bold text-white/35">Endereço</th>
              {stations.map(station => <td key={station.placeId + "-address"} className="px-3 py-3 align-top text-[0.58rem] leading-relaxed text-white/55"><span className="inline-flex gap-1.5"><MapPin className="mt-0.5 size-3 shrink-0 text-[#3DE3FF]" />{station.address || "Não informado"}</span></td>)}
            </tr>
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-2 gap-2 border-t border-white/8 p-3 sm:grid-cols-3">
        {stations.map(station => (
          <button
            key={station.placeId + "-navigate"}
            type="button"
            onClick={() => {
              vibration();
              const urls = openNavigation(station.lat, station.lng, station.name);
              const provider = getPreferredNavigationProvider();
              const url = provider === "waze" ? urls.waze : provider === "apple" ? urls.apple : urls.google;
              window.open(url, "_blank", "noopener,noreferrer");
            }}
            className="min-h-11 rounded-xl bg-[#C7FF3C] px-3 text-[0.55rem] font-black text-[#0B1014] active:scale-[.98]"
          >
            <Navigation className="mr-1 inline size-3.5" /> Navegar para {station.name}
          </button>
        ))}
      </div>
    </section>
  );
}
