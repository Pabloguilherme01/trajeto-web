import {
  ArrowRight,
  BookOpen,
  Building2,
  ExternalLink,
  Heart,
  HeartPulse,
  Landmark,
  MapPinned,
  MessageCircle,
  Phone,
  Share2,
  ShieldAlert,
  Siren,
  TrafficCone,
  WifiOff,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { publicServiceContacts, phoneHref } from "@/lib/contactActions";
import { shareText } from "@/lib/mobileTools";
import {
  listPublicServiceFavorites,
  publicServiceFavoritesEvent,
  togglePublicServiceFavorite,
} from "@/lib/publicServiceFavorites";
import { toast } from "sonner";
import { localDataEvent } from "@/lib/localData";
import { appUrl } from "@/lib/appUrl";
import {
  PUBLIC_SERVICE_CATEGORIES,
  PUBLIC_SERVICE_SHORTCUTS,
  PUBLIC_SERVICES,
  searchPublicServices,
  type PublicServiceCategory,
} from "@/lib/publicServices";

const categoryIcons = {
  saude: HeartPulse,
  seguranca: ShieldAlert,
  assistencia: Siren,
  transito: TrafficCone,
  educacao: BookOpen,
  cidadania: Landmark,
} as const;

export default function PublicServices() {
  const [, setLocation] = useLocation();
  const rawSearch = useSearch();
  const params = useMemo(() => new URLSearchParams(rawSearch), [rawSearch]);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState(() => params.get("q") ?? "");
  const [category, setCategory] = useState<PublicServiceCategory | "todos">(
    () => {
      const value = params.get("categoria");
      return PUBLIC_SERVICE_CATEGORIES.some(item => item.id === value)
        ? (value as PublicServiceCategory | "todos")
        : "todos";
    }
  );
  const [online, setOnline] = useState(
    () => typeof navigator === "undefined" || navigator.onLine
  );
  const [favorites, setFavorites] = useState(listPublicServiceFavorites);
  const savedOnly = params.get("salvos") === "1";
  const selectedService = PUBLIC_SERVICES.find(
    service => service.id === params.get("servico")
  );
  const favoriteCount = PUBLIC_SERVICES.filter(service =>
    favorites.includes(service.id)
  ).length;

  useEffect(() => {
    const refresh = () => setFavorites(listPublicServiceFavorites());
    window.addEventListener("storage", refresh);
    window.addEventListener(publicServiceFavoritesEvent, refresh);
    window.addEventListener(localDataEvent, refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener(publicServiceFavoritesEvent, refresh);
      window.removeEventListener(localDataEvent, refresh);
    };
  }, []);

  useEffect(() => {
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  useEffect(() => {
    const nextQuery = params.get("q") ?? "";
    const nextCategory = params.get("categoria");
    setQuery(nextQuery);
    setCategory(
      PUBLIC_SERVICE_CATEGORIES.some(item => item.id === nextCategory)
        ? (nextCategory as PublicServiceCategory | "todos")
        : "todos"
    );
  }, [params]);

  useEffect(() => {
    const onKey = (event: globalThis.KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        inputRef.current?.focus();
      }
      if (
        event.key === "Escape" &&
        document.activeElement === inputRef.current
      ) {
        setQuery("");
        applyFilters("", category, true);
        inputRef.current?.blur();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [category, savedOnly, setLocation]);

  const results = useMemo(
    () =>
      selectedService
        ? [selectedService]
        : searchPublicServices(query, category).filter(
            service => !savedOnly || favorites.includes(service.id)
          ),
    [query, category, selectedService, savedOnly, favorites]
  );

  useEffect(() => {
    const targetId = selectedService
      ? "service-" + selectedService.id
      : params.get("emergencia") === "1"
        ? "emergency-strip"
        : "";
    if (!targetId) return;

    const frame = window.requestAnimationFrame(() => {
      const target = document.getElementById(targetId);
      if (!target) return;
      const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      target.scrollIntoView({
        behavior: reduceMotion ? "auto" : "smooth",
        block: "center",
      });
      target.focus({ preventScroll: true });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [params, selectedService]);

  const applyFilters = (
    value: string,
    next: PublicServiceCategory | "todos",
    replace = false,
    onlySaved = savedOnly
  ) => {
    const search = new URLSearchParams();
    if (value.trim()) search.set("q", value.trim());
    if (next !== "todos") search.set("categoria", next);
    if (onlySaved) search.set("salvos", "1");
    setLocation(
      appUrl("/servicos") + (search.size ? "?" + search.toString() : ""),
      { replace }
    );
  };
  const applyCategory = (next: PublicServiceCategory | "todos") => {
    setCategory(next);
    applyFilters(query, next);
  };

  const openMaps = (service: (typeof PUBLIC_SERVICES)[number]) => {
    if (!service.mapQuery) return;
    setLocation(
      appUrl("/planejar") + "?destino=" + encodeURIComponent(service.mapQuery)
    );
  };
  const toggleSaved = (service: (typeof PUBLIC_SERVICES)[number]) => {
    const result = togglePublicServiceFavorite(service.id);
    setFavorites(result.ids);
    toast.message(
      result.ok
        ? result.saved
          ? "Serviço salvo neste aparelho."
          : "Serviço removido dos salvos."
        : "Não foi possível guardar o serviço. Confira o espaço e as permissões do navegador."
    );
  };
  const shareService = async (service: (typeof PUBLIC_SERVICES)[number]) => {
    const text = [
      service.name,
      service.description,
      service.address,
      service.phone && "Telefone: " + service.phone,
      service.extraPhone && "Outros contatos: " + service.extraPhone,
      service.hours,
      service.guidance,
      service.whatsappOnly?.length &&
        "Somente WhatsApp: " + service.whatsappOnly.join(" / "),
      "Fonte: " + service.sourceUrl,
    ]
      .filter(Boolean)
      .join("\n");
    try {
      await shareText(
        text,
        window.location.origin +
          appUrl("/servicos") +
          "?servico=" +
          encodeURIComponent(service.id),
        "Trajeto · " + service.name
      );
      toast.message("Contato pronto para compartilhar.");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      toast.message(
        "Não foi possível compartilhar. Você pode selecionar e copiar o contato da ficha."
      );
    }
  };

  return (
    <main className="premium-surface min-h-[100dvh] bg-[#0B1014] pb-28 text-white md:pb-12">
      <div className="container max-w-5xl pt-5 sm:pt-8">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[.17em] text-[#C7FF3C]">
              Central de serviços
            </p>
            <h1 className="mt-2 font-display text-4xl font-semibold tracking-[-.065em] sm:text-5xl">
              Águas Lindas em um só lugar.
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-white/70">
              Serviços e locais públicos essenciais já ficam incorporados ao
              app. O catálogo básico funciona sem depender de consulta online.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="rounded-full border border-white/8 bg-white/[.025] px-2.5 py-1 text-xs font-bold text-white/70">
                {PUBLIC_SERVICES.length} registros públicos
              </span>
              <span className="rounded-full border border-white/8 bg-white/[.025] px-2.5 py-1 text-xs font-bold text-white/70">
                6 categorias
              </span>
              <span className="rounded-full border border-white/8 bg-white/[.025] px-2.5 py-1 text-xs font-bold text-white/70">
                offline por padrão
              </span>
              <span className="rounded-full border border-white/8 bg-white/[.025] px-2.5 py-1 text-xs font-bold text-white/65">
                Confira contatos e horários na fonte oficial
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setLocation(appUrl("/"))}
            className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl border border-white/10 px-3 text-xs font-black text-white/70"
          >
            Início
          </button>
        </header>

        <section
          id="emergency-strip"
          tabIndex={-1}
          className="mt-5 scroll-mt-20 rounded-[1.5rem] border border-[#FFB86B]/20 bg-[#FFB86B]/[.045] p-3 outline-none"
          aria-labelledby="emergency-strip-title"
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[.14em] text-[#FFB86B]">
                Utilidade imediata
              </p>
              <h2
                id="emergency-strip-title"
                className="mt-1 text-sm font-black"
              >
                Canais de emergência
              </h2>
            </div>
            <span className="text-xs font-bold text-white/65">
              precisa de rede telefônica
            </span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              { label: "Polícia", number: "190" },
              { label: "SAMU", number: "192" },
              { label: "Bombeiros", number: "193" },
              { label: "Polícia Civil", number: "(61) 3618-2716" },
            ].map(item => (
              <a
                key={item.label}
                href={phoneHref(item.number) ?? "#"}
                className="inline-flex min-h-16 min-w-0 flex-col items-center justify-center gap-1 rounded-xl border border-white/10 bg-[#0B1014] px-2 py-2 text-center text-sm font-bold text-white/80 transition hover:border-[#FFB86B]/30 hover:text-white"
              >
                <span className="inline-flex items-center gap-1.5">
                  <Phone className="size-3.5 shrink-0 text-[#FFB86B]" />
                  {item.label}
                </span>
                <span className="text-xs text-white/70">{item.number}</span>
              </a>
            ))}
          </div>
        </section>

        <section className="mt-5 rounded-[1.6rem] border border-white/10 bg-[#121B22] p-3 sm:p-4">
          <form
            onSubmit={event => {
              event.preventDefault();
              applyFilters(query, category);
              inputRef.current?.blur();
            }}
            className="flex items-center gap-2 rounded-2xl border border-[#C7FF3C]/18 bg-[#0B1014] px-3"
          >
            <MapPinned className="size-4 shrink-0 text-[#C7FF3C]" />
            <input
              ref={inputRef}
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder="Buscar saúde, escola, polícia, prefeitura..."
              className="min-h-12 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-white/65"
              autoComplete="off"
              enterKeyHint="search"
              aria-label="Buscar serviços públicos"
              aria-keyshortcuts="Control+K Meta+K"
            />
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  applyFilters("", category, true);
                }}
                className="grid size-11 place-items-center rounded-xl text-white/70"
                aria-label="Limpar busca"
              >
                <X className="size-4" />
              </button>
            )}
            <button
              type="submit"
              aria-label="Pesquisar serviços"
              className="grid size-11 shrink-0 place-items-center rounded-xl text-[#C7FF3C]"
            >
              <ArrowRight className="size-5" />
            </button>
            <kbd className="hidden rounded-lg border border-white/8 bg-white/[.03] px-2 py-1 text-xs font-black text-white/70 sm:inline">
              Ctrl K
            </kbd>
          </form>

          <div
            className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7"
            aria-label="Categorias de serviços"
          >
            {PUBLIC_SERVICE_CATEGORIES.map(item => (
              <button
                key={item.id}
                type="button"
                aria-pressed={category === item.id}
                onClick={() => applyCategory(item.id)}
                className={
                  "min-h-11 rounded-xl border px-2 text-sm font-black transition " +
                  (category === item.id
                    ? "border-[#C7FF3C]/35 bg-[#C7FF3C]/10 text-[#DFFF9A] shadow-[0_8px_24px_rgba(199,255,60,.08)]"
                    : "border-white/8 bg-white/[.025] text-white/75 hover:border-white/15 hover:text-white")
                }
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              aria-pressed={savedOnly}
              onClick={() => applyFilters(query, category, false, !savedOnly)}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/15 px-3 text-sm font-bold text-white/80"
            >
              <Heart
                className="size-4"
                fill={savedOnly ? "currentColor" : "none"}
              />
              Serviços salvos ({favoriteCount})
            </button>
            <p className="text-xs text-white/65">
              Toque no coração para criar seus atalhos offline.
            </p>
          </div>
        </section>

        {!selectedService &&
          !savedOnly &&
          !query.trim() &&
          category === "todos" && (
            <section className="mt-4" aria-labelledby="citizen-shortcuts-title">
              <h2 id="citizen-shortcuts-title" className="text-base font-bold">
                O que você precisa resolver?
              </h2>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {PUBLIC_SERVICE_SHORTCUTS.map(shortcut => (
                  <button
                    key={shortcut.query}
                    type="button"
                    onClick={() => {
                      setQuery(shortcut.query);
                      applyFilters(shortcut.query, "todos");
                    }}
                    className="min-h-20 min-w-0 rounded-2xl border border-[#3DE3FF]/20 bg-[#3DE3FF]/5 p-3 text-left"
                  >
                    <span className="block text-sm font-bold text-white">
                      {shortcut.label}
                    </span>
                    <span className="mt-1 block text-xs leading-relaxed text-white/70">
                      {shortcut.hint}
                    </span>
                  </button>
                ))}
              </div>
            </section>
          )}

        {selectedService && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setCategory("todos");
              applyFilters("", "todos", false, false);
            }}
            className="mt-4 min-h-11 rounded-xl border border-white/15 px-3 text-sm font-bold"
          >
            Ver todos os serviços
          </button>
        )}
        {params.get("servico") && !selectedService && (
          <p role="status" className="mt-4 text-sm text-white/75">
            Este serviço não está no catálogo atual. Consulte os serviços
            disponíveis abaixo.
          </p>
        )}
        <p
          role="status"
          aria-live="polite"
          className="mt-4 text-sm text-white/70"
        >
          {results.length} serviços encontrados
        </p>
        <section
          className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
          aria-label="Serviços públicos"
        >
          {results.map(service => {
            const Icon = categoryIcons[service.category];
            const contacts = publicServiceContacts(service);
            const saved = favorites.includes(service.id);
            return (
              <article
                key={service.id}
                id={"service-" + service.id}
                tabIndex={-1}
                aria-current={selectedService?.id === service.id ? "true" : undefined}
                className="route-card scroll-mt-20 rounded-[1.4rem] border border-white/8 bg-[#121B22] p-4 outline-none"
              >
                <div className="flex items-start gap-3">
                  <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/[.04] text-[#3DE3FF]">
                    <Icon className="size-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-black uppercase tracking-[.12em] text-[#3DE3FF]">
                      {
                        PUBLIC_SERVICE_CATEGORIES.find(
                          item => item.id === service.category
                        )?.shortLabel
                      }
                    </p>
                    <h2 className="mt-1 text-sm font-black leading-snug">
                      {service.name}
                    </h2>
                    <p className="mt-1.5 text-sm leading-relaxed text-white/70">
                      {service.description}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleSaved(service)}
                    aria-pressed={saved}
                    aria-label={
                      (saved ? "Remover dos salvos: " : "Salvar serviço: ") +
                      service.name
                    }
                    className="grid size-11 shrink-0 place-items-center rounded-xl border border-white/15 text-[#FFB7A9]"
                  >
                    <Heart
                      className="size-4"
                      fill={saved ? "currentColor" : "none"}
                    />
                  </button>
                </div>
                {service.address && (
                  <p className="mt-3 text-sm leading-relaxed text-white/65">
                    <span className="font-black text-white/70">Endereço:</span>{" "}
                    {service.address}
                  </p>
                )}
                {service.hours && (
                  <p className="mt-3 text-sm font-bold text-white/75">{service.hours}</p>
                )}
                {service.guidance && (
                  <p className="mt-3 rounded-xl bg-white/5 p-3 text-sm leading-relaxed text-white/75">
                    {service.guidance}
                  </p>
                )}
                {service.actionUrl && (
                  <a
                    href={service.actionUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#3DE3FF]/30 px-3 text-sm font-bold text-[#C9F7FF]"
                  >
                    <ExternalLink className="size-4" />
                    {service.actionLabel} · online
                  </a>
                )}
                {service.email && (
                  <a
                    href={"mailto:" + service.email}
                    className="mt-2 flex min-h-11 items-center justify-center break-all rounded-xl border border-white/10 px-3 text-sm text-white/75"
                  >
                    {service.email}
                  </a>
                )}
                <div className="mt-4 grid grid-cols-2 gap-2">
                  {service.mapQuery && (
                    <button
                      type="button"
                      onClick={() => openMaps(service)}
                      className="min-h-11 rounded-xl bg-[#C7FF3C] px-3 text-sm font-bold text-[#0B1014]"
                    >
                      <MapPinned className="mr-1.5 inline size-3.5" />
                      Rota
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => void shareService(service)}
                    aria-label={"Compartilhar serviço: " + service.name}
                    className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-white/15 px-3 text-sm font-bold text-white/80"
                  >
                    <Share2 className="size-3.5" />
                    Compartilhar
                  </button>
                </div>
                {contacts.length > 0 && (
                  <div className="mt-2 grid gap-2">
                    {contacts.map((contact, index) => (
                      <a
                        key={contact.href}
                        href={contact.href}
                        target={
                          contact.channel === "whatsapp" ? "_blank" : undefined
                        }
                        rel={
                          contact.channel === "whatsapp"
                            ? "noopener noreferrer"
                            : undefined
                        }
                        aria-label={
                          (contact.channel === "whatsapp"
                            ? "WhatsApp de "
                            : "Ligar para ") +
                          service.name +
                          (contact.label ? " · " + contact.label : "") +
                          ": " +
                          contact.number
                        }
                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#3DE3FF]/20 bg-[#3DE3FF]/[.05] px-3 text-sm font-bold text-[#C9F7FF]"
                      >
                        {contact.channel === "whatsapp" ? (
                          <MessageCircle className="size-3.5 shrink-0" />
                        ) : (
                          <Phone className="size-3.5 shrink-0" />
                        )}
                        <span className="break-words">
                          {contact.label ||
                            (index === 0 ? "Ligar" : "Alternativo")}{" "}
                          · {contact.number}
                          {contact.channel === "whatsapp" ? " · WhatsApp" : ""}
                        </span>
                      </a>
                    ))}
                  </div>
                )}
                <a
                  href={service.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 flex min-h-11 items-center justify-center text-center text-sm font-bold text-white/75 hover:text-white"
                >
                  Fonte: {service.sourceLabel}
                  {service.verifiedAt
                    ? " · conferido em " + service.verifiedAt
                    : ""}
                </a>
              </article>
            );
          })}
        </section>

        {!results.length && (
          <section className="mt-5 rounded-3xl border border-white/8 bg-[#121B22] p-6 text-center">
            <p className="text-sm font-black">
              {savedOnly && !favoriteCount
                ? "Nenhum serviço salvo ainda."
                : "Nenhum serviço corresponde ao filtro."}
            </p>
            <p className="mt-1 text-sm text-white/65">
              {savedOnly && !favoriteCount
                ? "Veja o catálogo e toque no coração dos serviços que você mais usa."
                : "Experimente outro termo ou veja todas as categorias."}
            </p>
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setCategory("todos");
                applyFilters("", "todos", false, false);
              }}
              className="mt-3 min-h-11 rounded-xl bg-[#C7FF3C] px-4 text-sm font-bold text-[#0B1014]"
            >
              Limpar filtros
            </button>
          </section>
        )}

        <section className="mt-5 rounded-[1.4rem] border border-white/8 bg-white/[.025] p-4">
          <div className="flex items-start gap-3">
            {online ? (
              <Building2 className="mt-0.5 size-4 text-[#C7FF3C]" />
            ) : (
              <WifiOff className="mt-0.5 size-4 text-[#FFB86B]" />
            )}
            <div>
              <p className="text-xs font-black">
                {online ? "Catálogo local disponível" : "Modo offline ativo"}
              </p>
              <p className="mt-1 text-sm leading-relaxed text-white/70">
                {online
                  ? "Endereços, contatos e fontes são apresentados como cadastro local; a navegação abre o mapa escolhido."
                  : "Este catálogo continua visível sem internet. Rotas, mapa externo e atualizações em tempo real podem exigir conexão."}
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
