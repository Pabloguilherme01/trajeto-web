import React from "react";
import {
  ArrowRight,
  Search,
  Scale,
  Accessibility,
  ReceiptText,
  Leaf,
  Smartphone,
  ShoppingBag,
  SlidersHorizontal,
  ChevronRight,
  CheckCircle2,
  BadgeCheck,
  BookOpen,
  Building2,
  BriefcaseBusiness,
  Wrench,
  Clock3,
  Globe2,
  ExternalLink,
  Heart,
  HeartPulse,
  Landmark,
  MapPinned,
  MessageCircle,
  Route,
  Sparkles,
  Phone,
  Share2,
  ShieldAlert,
  Siren,
  TrafficCone,
  Store,
  Trophy,
  Zap,
  WifiOff,
  Navigation,
  PawPrint,
  UsersRound,
  X,
  type LucideIcon,
} from "lucide-react";
import { publicServiceContacts } from "@/lib/contactActions";
import {
  PUBLIC_SERVICE_CATEGORIES,
  type PublicService,
} from "@/lib/publicServices";
import {
  categoryIcons,
  servicePreparationHint,
} from "@/lib/publicServicesPresentation";
import { appUrl } from "@/lib/appUrl";
import OrganicMapsModeSelect from "./OrganicMapsModeSelect";
type Props = {
  service: PublicService;
  expandedActions: boolean;
  favorite: boolean;
  resource: "todos" | "contato" | "rota" | "online";
  navigationMode: "drive" | "walk" | "bike";
  setNavigationMode: (mode: "drive" | "walk" | "bike") => void;
  navigationModeLabel: string;
  openMaps: (service: PublicService) => void;
  openOrganicMaps: (service: PublicService) => void;
  toggleSaved: (service: PublicService) => void;
  shareService: (service: PublicService) => Promise<void>;
};
export default function PublicServiceCard({
  service,
  expandedActions,
  favorite,
  resource,
  navigationMode,
  setNavigationMode,
  navigationModeLabel,
  openMaps,
  openOrganicMaps,
  toggleSaved,
  shareService,
}: Props) {
  const Icon = categoryIcons[service.category];
  const contacts = publicServiceContacts(service);
  const primaryContact = contacts[0];
  const secondaryContacts = contacts.slice(1);
  const emergencyDirect = contacts.some(contact =>
    ["tel:190", "tel:192", "tel:193"].includes(contact.href)
  );
  const showSecondaryContacts =
    secondaryContacts.length > 0 && (expandedActions || emergencyDirect);
  const showOfficialAction =
    Boolean(service.actionUrl) &&
    (expandedActions ||
      resource === "online" ||
      !primaryContact);
  const officialActionIsPrimary =
    showOfficialAction &&
    Boolean(service.actionUrl) &&
    (resource === "online" || !primaryContact);
  const showEmail = Boolean(service.email) && expandedActions;
  const hasMoreOptions =
    !expandedActions &&
    (Boolean(service.mapQuery) ||
      Boolean(service.actionUrl && !showOfficialAction) ||
      Boolean(service.email && !showEmail) ||
      (secondaryContacts.length > 0 && !showSecondaryContacts) ||
      Boolean(primaryContact) ||
      Boolean(officialActionIsPrimary));
  const saved = favorite;
  return (
    <article
      key={service.id}
      id={"service-" + service.id}
      tabIndex={-1}
      aria-current={expandedActions ? "true" : undefined}
      className="premium-card service-directory-card route-card group min-w-0 scroll-mt-20 overflow-hidden rounded-[1.4rem] border border-border/8 bg-card p-3.5 outline-none sm:p-4"
    >
      <div className="flex items-start gap-3">
        <div className="grid size-11 shrink-0 place-items-center rounded-2xl border border-accent/15 bg-accent/[.06] text-accent">
          <Icon className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-black uppercase tracking-[.12em] text-accent">
            {
              PUBLIC_SERVICE_CATEGORIES.find(
                item => item.id === service.category
              )?.shortLabel
            }
          </p>
          <h2
            aria-level={expandedActions ? 1 : 2}
            className="mt-1 break-words text-base font-bold leading-snug"
          >
            {service.name}
          </h2>
        </div>
        <button
          type="button"
          onClick={() => toggleSaved(service)}
          aria-pressed={saved}
          aria-label={
            (saved ? "Remover dos salvos: " : "Salvar serviço: ") + service.name
          }
          className="grid size-11 shrink-0 place-items-center rounded-xl border border-border/15 text-primary"
        >
          <Heart className="size-4" fill={saved ? "currentColor" : "none"} />
        </button>
      </div>
      {(service.hours || expandedActions) && (
        <p className="mt-3 flex items-start gap-2 text-sm font-bold text-foreground/75">
          <Clock3 className="mt-0.5 size-4 shrink-0 text-primary" />
          <span>
            {service.hours ||
              "Horário não informado · confirme no canal oficial"}
          </span>
        </p>
      )}
      <p className={"mt-3 text-sm leading-relaxed text-foreground/75 " + (expandedActions ? "" : "line-clamp-2")}>
        {service.description}
      </p>
      <div
        role="group"
        aria-label="Ações principais do serviço"
        className="mt-3 grid grid-cols-2 gap-2"
      >
        {officialActionIsPrimary && service.actionUrl && (
          <a
            href={service.actionUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="order-first flex min-h-11 min-w-0 break-words items-center justify-center gap-2 rounded-xl border border-accent/30 bg-accent/[.06] px-3 text-center text-sm font-bold text-accent"
          >
            <ExternalLink className="size-4 shrink-0" />
            {service.actionLabel} · online
          </a>
        )}
        {service.mapQuery && (
          <button
            type="button"
            onClick={() => openMaps(service)}
            className="min-h-11 min-w-0 break-words rounded-xl bg-primary px-2 text-sm font-bold text-primary-foreground"
          >
            <MapPinned className="mr-1.5 inline size-3.5" />
            Planejar rota
          </button>
        )}
        {primaryContact ? (
          <a
            href={primaryContact.href}
            target={
              primaryContact.channel === "whatsapp" ? "_blank" : undefined
            }
            rel={
              primaryContact.channel === "whatsapp"
                ? "noopener noreferrer"
                : undefined
            }
            aria-label={
              (primaryContact.channel === "whatsapp"
                ? "WhatsApp de "
                : "Ligar para ") +
              service.name +
              (primaryContact.label ? " · " + primaryContact.label : "") +
              ": " +
              primaryContact.number
            }
            className={
              "inline-flex min-h-11 min-w-0 items-center justify-center gap-1.5 rounded-xl border border-accent/25 bg-accent/[.06] px-2 text-center text-sm font-bold text-accent " +
              (resource === "contato" ? "order-first " : "") +
              (!service.mapQuery && !officialActionIsPrimary
                ? "col-span-2"
                : "")
            }
          >
            {primaryContact.channel === "whatsapp" ? (
              <MessageCircle className="size-3.5 shrink-0" />
            ) : (
              <Phone className="size-3.5 shrink-0" />
            )}
            <span className="min-w-0 break-words">
              {primaryContact.label ||
                (primaryContact.channel === "whatsapp"
                  ? "WhatsApp"
                  : "Ligar")}{" "}
              · {primaryContact.number}
            </span>
          </a>
        ) : !officialActionIsPrimary ? (
          <button
            type="button"
            onClick={() => void shareService(service)}
            aria-label={"Compartilhar serviço: " + service.name}
            className={
              "inline-flex min-h-11 min-w-0 items-center justify-center gap-1.5 rounded-xl border border-border/15 px-3 text-sm font-bold text-foreground/80 " +
              (!service.mapQuery && !officialActionIsPrimary
                ? "col-span-2"
                : "")
            }
          >
            <Share2 className="size-3.5" />
            Compartilhar
          </button>
        ) : null}
      </div>
      <div
        className="mt-3 flex flex-wrap gap-1.5 text-xs font-bold text-muted-foreground"
        aria-label="Recursos deste serviço"
      >
        {contacts.length > 0 && (
          <span className="rounded-lg bg-muted px-2 py-1">
            {contacts.length} {contacts.length === 1 ? "contato" : "contatos"}
          </span>
        )}
        {service.mapQuery && (
          <span className="inline-flex items-center gap-1 rounded-lg bg-muted px-2 py-1">
            <Navigation className="size-3.5" /> rota + navegadores
          </span>
        )}
        <span className="inline-flex items-center gap-1 rounded-lg bg-primary/[.06] px-2 py-1 text-primary">
          <WifiOff className="size-3.5" /> ficha disponível offline
        </span>
        {service.actionUrl && (
          <span className="inline-flex items-center gap-1 rounded-lg bg-muted px-2 py-1">
            <Globe2 className="size-3.5" /> canal externo exige internet
          </span>
        )}
        {service.verifiedAt && (
          <span className="inline-flex items-center gap-1 rounded-lg bg-accent/[.06] px-2 py-1 text-accent">
            <BadgeCheck className="size-3.5" /> conferido {service.verifiedAt}
          </span>
        )}
      </div>
      {service.verificationNote && (
        <p className="mt-2 break-words text-xs leading-relaxed text-warning">{service.verificationNote}</p>
      )}
      {service.address && (
        <p className="mt-3 flex items-start gap-2 text-sm leading-relaxed text-foreground/70">
          <MapPinned className="mt-0.5 size-4 shrink-0 text-accent" />
          <span>{service.address}</span>
        </p>
      )}
      {!service.mapQuery && (
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
          {service.actionUrl
            ? "Canal digital · acesse o serviço no site oficial."
            : "Sem destino confirmado para rota neste catálogo."}
        </p>
      )}
      {expandedActions && service.mapQuery && (
        <details className="mobile-disclosure mt-3">
          <summary>Modo de navegação no Organic Maps</summary>
          <OrganicMapsModeSelect
            value={navigationMode}
            onChange={setNavigationMode}
          />
        </details>
      )}
      <details className="mobile-disclosure mt-3" open={undefined}>
        <summary className="min-h-11">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="size-4 text-accent" />
            {!service.mapQuery && service.actionUrl
              ? "Antes de acessar"
              : "Antes de sair"}
          </span>
          <ChevronRight className="size-4" />
        </summary>
        <div className="space-y-3 text-sm leading-relaxed text-foreground">
          <p>{servicePreparationHint(service)}</p>
          {service.documents?.length ? (
            <div>
              <p className="font-bold">
                Documentos informados para este serviço
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {service.documents.map(document => (
                  <li key={document}>{document}</li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Esta ficha não presume documentos. Confira os requisitos no canal
              oficial antes do atendimento.
            </p>
          )}
        </div>
      </details>
      {showSecondaryContacts && (
        <div className="mt-2 grid grid-cols-2 gap-2">
          {secondaryContacts.map(contact => (
            <a
              key={contact.href}
              href={contact.href}
              target={contact.channel === "whatsapp" ? "_blank" : undefined}
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
              className="inline-flex min-h-11 min-w-0 items-center justify-center gap-2 rounded-xl border border-accent/20 bg-accent/[.05] px-3 text-center text-sm font-bold text-accent"
            >
              {contact.channel === "whatsapp" ? (
                <MessageCircle className="size-3.5 shrink-0" />
              ) : (
                <Phone className="size-3.5 shrink-0" />
              )}
              <span className="min-w-0 break-words">
                {contact.label ||
                  (contact.channel === "whatsapp" ? "WhatsApp" : "Ligar")}{" "}
                · {contact.number}
              </span>
            </a>
          ))}
        </div>
      )}
      {showOfficialAction && service.actionUrl && !officialActionIsPrimary && (
        <a
          href={service.actionUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 flex min-h-11 items-center justify-center gap-2 rounded-xl border border-accent/30 px-3 text-center text-sm font-bold text-accent"
        >
          <ExternalLink className="size-4 shrink-0" />
          {service.actionLabel} · online
        </a>
      )}
      {showEmail && service.email && (
        <a
          href={"mailto:" + service.email}
          className="mt-2 flex min-h-11 items-center justify-center break-all rounded-xl border border-border/10 px-3 text-center text-sm text-foreground/75"
        >
          {service.email}
        </a>
      )}
      {expandedActions && (primaryContact || service.mapQuery || officialActionIsPrimary) && (
        <div
          role="group"
          aria-label="Outras ações do serviço"
          className="mt-2 grid grid-cols-2 gap-2"
        >
          {expandedActions && (primaryContact || officialActionIsPrimary) && (
            <button
              type="button"
              onClick={() => void shareService(service)}
              aria-label={"Compartilhar serviço: " + service.name}
              className="inline-flex min-h-11 min-w-0 items-center justify-center gap-1.5 rounded-xl border border-border/15 px-2 py-2 text-xs font-bold text-foreground/80"
            >
              <Share2 className="size-3.5" />
              Compartilhar
            </button>
          )}
          {expandedActions && service.mapQuery && (
            <button
              type="button"
              onClick={() => openOrganicMaps(service)}
              aria-label={"Abrir " + service.name + " no Organic Maps"}
              className="inline-flex min-h-11 min-w-0 items-center justify-center gap-1.5 rounded-xl border border-primary/20 bg-primary/[.05] px-2 py-2 text-xs font-bold text-primary"
            >
              <Navigation className="size-4 shrink-0" />
              Organic Maps · {navigationModeLabel}
            </button>
          )}
        </div>
      )}
      {hasMoreOptions && (
        <details className="mobile-disclosure mt-2">
          <summary>
            {service.mapQuery
              ? "Mais opções · navegar e compartilhar"
              : service.actionUrl && !showOfficialAction
                ? "Mais opções · canal online"
                : secondaryContacts.length > 0 && !showSecondaryContacts
                  ? "Mais opções · contatos"
                  : service.email && !showEmail
                    ? "Mais opções · e-mail"
                    : "Compartilhar serviço"}
            <ArrowRight className="size-4 shrink-0" />
          </summary>
          <div
            role="group"
            aria-label="Mais ações do serviço"
            className="grid grid-cols-2 gap-2"
          >
            {service.mapQuery && (
              <button
                type="button"
                onClick={() => openOrganicMaps(service)}
                aria-label={"Abrir " + service.name + " no Organic Maps"}
                className="inline-flex min-h-11 min-w-0 items-center justify-center gap-2 rounded-xl border border-primary/20 bg-primary/[.05] px-2 py-2 text-xs font-bold text-primary"
              >
                <Navigation className="size-4 shrink-0" />
                Organic Maps · {navigationModeLabel}
              </button>
            )}
            {service.actionUrl && !showOfficialAction && (
              <a
                href={service.actionUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-h-11 min-w-0 items-center justify-center gap-2 rounded-xl border border-accent/30 px-2 py-2 text-xs font-bold text-accent"
              >
                <ExternalLink className="size-4" />
                {service.actionLabel} · online
              </a>
            )}
            {service.email && !showEmail && (
              <a
                href={"mailto:" + service.email}
                className="flex min-h-11 min-w-0 items-center justify-center break-all rounded-xl border border-border/10 px-2 py-2 text-xs text-foreground/75"
              >
                {service.email}
              </a>
            )}
            {!showSecondaryContacts &&
              secondaryContacts.map(contact => (
                <a
                  key={contact.href}
                  href={contact.href}
                  target={contact.channel === "whatsapp" ? "_blank" : undefined}
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
                  className="inline-flex min-h-11 min-w-0 items-center justify-center gap-2 rounded-xl border border-accent/20 bg-accent/[.05] px-2 py-2 text-xs font-bold text-accent"
                >
                  {contact.channel === "whatsapp" ? (
                    <MessageCircle className="size-3.5 shrink-0" />
                  ) : (
                    <Phone className="size-3.5 shrink-0" />
                  )}
                  <span className="min-w-0 break-words">
                    {contact.label || "Contato alternativo"} · {contact.number}
                    {contact.channel === "whatsapp" ? " · WhatsApp" : ""}
                  </span>
                </a>
              ))}
            {(primaryContact || officialActionIsPrimary) && (
              <button
                type="button"
                onClick={() => void shareService(service)}
                aria-label={"Compartilhar serviço: " + service.name}
                className="inline-flex min-h-11 min-w-0 items-center justify-center gap-1.5 rounded-xl border border-border/15 px-2 py-2 text-xs font-bold text-foreground/80"
              >
                <Share2 className="size-3.5" />
                Compartilhar
              </button>
            )}
          </div>
        </details>
      )}
      <a
        href={service.sourceUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 flex min-h-10 items-center justify-center text-center text-xs font-bold text-foreground/65 hover:text-foreground"
      >
        {service.verifiedAt
          ? <BadgeCheck className="mr-1.5 inline size-3.5 text-accent" />
          : <ExternalLink className="mr-1.5 inline size-3.5 text-muted-foreground" />}
        Fonte: {service.sourceLabel}
        {service.verifiedAt
          ? " · conferido em " + service.verifiedAt
          : service.sourceCheckedAt
            ? " · fonte consultada em " + service.sourceCheckedAt
            : " · data de conferência não informada"}
      </a>
    </article>
  );
}
