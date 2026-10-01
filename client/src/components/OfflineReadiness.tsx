import { useEffect, useState } from "react";
import {
  Bookmark,
  CheckCircle2,
  Database,
  Fuel,
  HardDrive,
  Landmark,
  RefreshCw,
  Route,
  ShieldCheck,
  WifiOff,
} from "lucide-react";
import { Link } from "wouter";
import {
  getOfflineReadiness,
  getOfflineStorageStatus,
  prepareOfflineAccess,
  requestOfflineStoragePersistence,
  type OfflinePreparation,
  type OfflineStorageStatus,
} from "@/lib/pwa";
import { appUrl } from "@/lib/appUrl";
import { isOfflineRouteStale, listOfflineRoutes, offlineRouteEvent } from "@/lib/offlineStore";
import {
  listPublicServiceFavorites,
  publicServiceFavoritesEvent,
} from "@/lib/publicServiceFavorites";
import { listMobileStationFavorites, mobileStationFavoritesEvent } from "@/lib/mobileStationStore";
import {
  getOfflineMapAgeLabel,
  getOfflineMapStations,
  prepareOfflineStationData,
} from "@/lib/stationMapOffline";

const preparationMessages: Record<
  NonNullable<OfflinePreparation["reason"]>,
  string
> = {
  unsupported:
    "Este navegador não permitiu preparar o app. Tente abrir no Chrome ou Safari fora do modo privado.",
  preparing:
    "O conteúdo ainda está sendo preparado. Aguarde a instalação do app e confira novamente.",
  connection:
    "Conecte-se à internet para completar a preparação. O que já foi salvo continua disponível.",
  storage:
    "O aparelho está sem espaço para completar o acesso offline. Libere espaço e tente novamente.",
  update:
    "Há arquivos indisponíveis nesta versão. Atualize o app e confira novamente.",
};

type OfflineSummary = {
  routes: number;
  staleRoutes: number;
  services: number;
  stations: number;
  mapStations: number;
  mapAge: string;
};

const emptySummary: OfflineSummary = {
  routes: 0,
  staleRoutes: 0,
  services: 0,
  stations: 0,
  mapStations: 0,
  mapAge: "sem mapa salvo",
};

function formatStorage(status: OfflineStorageStatus | null) {
  if (!status?.quotaBytes || status.usageBytes == null) return null;
  const usedMb = status.usageBytes / 1024 / 1024;
  const quotaMb = status.quotaBytes / 1024 / 1024;
  return `${usedMb.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} MB usados de ${quotaMb.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} MB disponíveis`;
}

export default function OfflineReadiness() {
  const [ready, setReady] = useState(false);
  const [checking, setChecking] = useState(true);
  const [preparing, setPreparing] = useState(false);
  const [protecting, setProtecting] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [online, setOnline] = useState(
    () => typeof navigator === "undefined" || navigator.onLine
  );
  const [summary, setSummary] = useState<OfflineSummary>(emptySummary);
  const [storage, setStorage] = useState<OfflineStorageStatus | null>(null);

  const refreshLocalSummary = async () => {
    const map = getOfflineMapStations();
    const [routes, storageStatus] = await Promise.all([
      listOfflineRoutes().catch(() => []),
      getOfflineStorageStatus().catch(() => null),
    ]);
    setSummary({
      routes: routes.length,
      staleRoutes: routes.filter(route => isOfflineRouteStale(route.savedAt)).length,
      services: listPublicServiceFavorites().length,
      stations: listMobileStationFavorites().length,
      mapStations: map.stations.length,
      mapAge: map.stations.length
        ? getOfflineMapAgeLabel(map.savedAt)
        : "sem mapa salvo",
    });
    setStorage(storageStatus);
  };

  const check = async () => {
    setChecking(true);
    try {
      const [offlineReady] = await Promise.all([
        getOfflineReadiness(),
        refreshLocalSummary(),
      ]);
      setReady(offlineReady);
    } catch {
      setReady(false);
      setFeedback(preparationMessages.unsupported);
    } finally {
      setChecking(false);
    }
  };

  const prepare = async () => {
    if (!online && !ready) {
      setFeedback(preparationMessages.connection);
      return;
    }
    setPreparing(true);
    setFeedback("");
    try {
      const persistence = requestOfflineStoragePersistence().catch(() => null);
      const result = await prepareOfflineAccess();
      await prepareOfflineStationData().catch(() => undefined);
      setReady(result.ready);
      const storageStatus = await persistence;
      if (storageStatus) setStorage(storageStatus);
      await refreshLocalSummary();
      if (!result.ready)
        setFeedback(preparationMessages[result.reason ?? "connection"]);
    } catch {
      setFeedback(preparationMessages.connection);
    } finally {
      setPreparing(false);
    }
  };

  const protectStorage = async () => {
    setProtecting(true);
    try {
      setStorage(await requestOfflineStoragePersistence());
    } finally {
      setProtecting(false);
    }
  };

  useEffect(() => {
    void check();
    const refresh = () => void check();
    const onlineHandler = () => {
      setOnline(true);
      void check();
    };
    const offlineHandler = () => {
      setOnline(false);
      void refreshLocalSummary();
    };
    navigator.serviceWorker?.addEventListener("controllerchange", refresh);
    window.addEventListener("online", onlineHandler);
    window.addEventListener("offline", offlineHandler);
    window.addEventListener("focus", refreshLocalSummary);
    window.addEventListener(offlineRouteEvent, refreshLocalSummary);
    window.addEventListener(publicServiceFavoritesEvent, refreshLocalSummary);
    window.addEventListener(mobileStationFavoritesEvent, refreshLocalSummary);
    return () => {
      navigator.serviceWorker?.removeEventListener("controllerchange", refresh);
      window.removeEventListener("online", onlineHandler);
      window.removeEventListener("offline", offlineHandler);
      window.removeEventListener("focus", refreshLocalSummary);
      window.removeEventListener(offlineRouteEvent, refreshLocalSummary);
      window.removeEventListener(
        publicServiceFavoritesEvent,
        refreshLocalSummary
      );
      window.removeEventListener(
        mobileStationFavoritesEvent,
        refreshLocalSummary
      );
    };
  }, []);

  const storageLabel = formatStorage(storage);
  const totalSaved =
    summary.routes + summary.services + summary.stations + summary.mapStations;

  return (
    <section
      className="mt-4 rounded-3xl border border-white/10 bg-[#141E23] p-4 sm:p-5"
      aria-labelledby="offline-readiness-title"
    >
      <div className="flex items-start gap-3">
        <span
          className={
            "grid size-11 shrink-0 place-items-center rounded-xl " +
            (ready
              ? "bg-[#B7D86B]/10 text-[#B7D86B]"
              : "bg-[#D8B47A]/10 text-[#D8B47A]")
          }
        >
          {ready ? (
            <CheckCircle2 className="size-5" />
          ) : (
            <WifiOff className="size-5" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="soft-kicker text-xs text-[#79C6D0]">
            Acesso offline
          </p>
          <h2 id="offline-readiness-title" className="mt-1 text-lg font-bold">
            {ready ? "Essencial pronto neste aparelho" : "Prepare antes de sair"}
          </h2>
          <p
            role="status"
            aria-live="polite"
            className="mt-1 text-sm leading-relaxed text-white/75"
          >
            {preparing
              ? "Salvando os arquivos necessários para abrir o Trajeto sem internet…"
              : checking
                ? "Conferindo o que já está disponível neste aparelho…"
                : ready
                  ? online
                    ? "Busca, serviços e a estrutura do app já podem abrir sem internet."
                    : "Você está offline e o pacote essencial está disponível."
                  : feedback ||
                    "Faça esta preparação uma vez com internet. Depois, use os itens salvos quando a conexão falhar."}
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          {
            label: "Rotas",
            value: summary.routes,
            suffix: summary.routes === 1 ? "salva" : "salvas",
            icon: Route,
            href: appUrl("/salvos"),
          },
          {
            label: "Serviços",
            value: summary.services,
            suffix: summary.services === 1 ? "salvo" : "salvos",
            icon: Landmark,
            href: appUrl("/servicos") + "?salvos=1",
          },
          {
            label: "Postos",
            value: summary.stations,
            suffix: summary.stations === 1 ? "salvo" : "salvos",
            icon: Fuel,
            href: appUrl("/postos") + "?salvos=1",
          },
          {
            label: "Pontos do mapa",
            value: summary.mapStations,
            suffix: summary.mapStations === 1 ? "salvo" : "salvos",
            icon: Database,
            href: appUrl("/mapa"),
          },
        ].map(item => (
          <Link
            key={item.label}
            href={item.href}
            className="rounded-2xl border border-white/8 bg-[#0D1418] p-3 transition hover:border-white/15"
          >
            <item.icon className="size-4 text-[#79C6D0]" />
            <p className="mt-2 text-xl font-semibold">{item.value}</p>
            <p className="mt-0.5 text-xs font-bold text-white/65">
              {item.label} {item.suffix}
            </p>
          </Link>
        ))}
      </div>

      <div className="mt-3 rounded-2xl border border-white/8 bg-white/[.025] p-3">
        <div className="flex items-start gap-2.5">
          <HardDrive className="mt-0.5 size-4 shrink-0 text-[#B7D86B]" />
          <div className="min-w-0">
            <p className="text-sm font-bold">
              {storage?.persisted
                ? "Dados protegidos pelo navegador"
                : "Proteção de armazenamento"}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-white/65">
              {storage?.persisted
                ? "O navegador marcou os dados do Trajeto como persistentes, reduzindo a chance de limpeza automática."
                : storage?.supported
                  ? "Você pode pedir ao navegador para preservar melhor rotas, favoritos e dados locais."
                  : "Seu navegador gerencia o espaço automaticamente. Evite limpar os dados do site se quiser manter os salvos."}
            </p>
            {storageLabel && (
              <p className="mt-1 text-xs text-white/50">{storageLabel}</p>
            )}
          </div>
        </div>
        {!storage?.persisted && storage?.supported && (
          <button
            type="button"
            onClick={() => void protectStorage()}
            disabled={protecting}
            className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/15 px-3 text-sm font-bold text-white/80 disabled:opacity-60"
          >
            <ShieldCheck className="size-4" />
            {protecting ? "Protegendo…" : "Proteger dados salvos"}
          </button>
        )}
      </div>

      <div className="mt-3 rounded-2xl border border-white/8 bg-white/[.02] p-3 text-xs leading-relaxed text-white/65">
        {summary.staleRoutes > 0 && (
          <p className="mb-2 rounded-xl border border-[#D8B47A]/18 bg-[#D8B47A]/[.04] px-2.5 py-2 text-[#E6CAA0]">
            <span className="font-bold">{summary.staleRoutes} rota{summary.staleRoutes === 1 ? "" : "s"} salva{summary.staleRoutes === 1 ? "" : "s"} há mais de 72h.</span>{" "}
            Revise quando estiver online antes de depender dela{summary.staleRoutes === 1 ? "" : "s"}.
          </p>
        )}
        <p>
          <span className="font-bold text-white/80">Mapa de postos:</span>{" "}
          {summary.mapAge}.
        </p>
        <p className="mt-1">
          Mapas de ruas, trânsito ao vivo, novos agendamentos e sites externos
          ainda podem precisar de internet. Ligações precisam de rede
          telefônica.
        </p>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          disabled={checking || preparing || (!online && !ready)}
          onClick={() => {
            if (ready) void check();
            else void prepare();
          }}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#B7D86B] px-4 text-sm font-bold text-[#0D1418] disabled:opacity-50"
        >
          <RefreshCw
            className={
              "size-4 shrink-0 " +
              (preparing ? "animate-spin motion-reduce:animate-none" : "")
            }
          />
          {preparing
            ? "Preparando…"
            : ready
              ? "Conferir offline"
              : online
                ? "Preparar para ficar offline"
                : "Conecte-se para preparar"}
        </button>
        <Link
          href={appUrl("/buscar")}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/15 px-4 text-sm font-bold text-white/80"
        >
          <Bookmark className="size-4" />
          {totalSaved ? "Usar busca offline" : "Escolher o que salvar"}
        </Link>
      </div>

      {ready && (
        <p className="mt-3 text-xs leading-relaxed text-white/60">
          Teste prático: ative o modo avião, abra a Busca, Serviços e uma rota
          salva. Assim você confirma o aparelho antes de realmente precisar.
        </p>
      )}
    </section>
  );
}
