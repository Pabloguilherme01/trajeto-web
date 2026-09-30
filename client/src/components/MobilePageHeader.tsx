import type { LucideIcon } from "lucide-react";
import { ArrowRight } from "lucide-react";
import { Link } from "wouter";

type Props = {
  eyebrow: string;
  title: string;
  description: string;
  icon: LucideIcon;
  actionLabel: string;
  actionHref: string;
  accent?: "lime" | "cyan" | "violet";
};

const accentMap = {
  lime: {
    border: "border-[#C7FF3C]/20",
    icon: "text-[#C7FF3C]",
    badge: "bg-[#C7FF3C]/10 text-[#DFFF9A]",
  },
  cyan: {
    border: "border-[#3DE3FF]/20",
    icon: "text-[#3DE3FF]",
    badge: "bg-[#3DE3FF]/10 text-[#BFF6FF]",
  },
  violet: {
    border: "border-[#BDA5FF]/20",
    icon: "text-[#BDA5FF]",
    badge: "bg-[#BDA5FF]/10 text-[#E5DAFF]",
  },
} as const;

export default function MobilePageHeader({
  eyebrow,
  title,
  description,
  icon: Icon,
  actionLabel,
  actionHref,
  accent = "lime",
}: Props) {
  const tone = accentMap[accent];
  return (
    <section className={`mb-4 overflow-hidden rounded-[1.35rem] border ${tone.border} bg-[#0D151B] shadow-[0_18px_50px_rgba(0,0,0,.2)] md:hidden`} aria-labelledby="mobile-page-title">
      <div className="relative p-4">
        <div className="absolute right-[-2.5rem] top-[-3rem] size-28 rounded-full bg-white/[0.03] blur-2xl" aria-hidden="true" />
        <div className="flex items-start gap-3">
          <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${tone.badge}`}>
            <Icon className={`size-4 ${tone.icon}`} aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className={`text-[0.52rem] font-black uppercase tracking-[0.15em] ${tone.icon}`}>{eyebrow}</p>
            <h1 id="mobile-page-title" className="mobile-title mt-1.5 text-[1.35rem] font-black leading-tight text-white">{title}</h1>
            <p className="mt-1.5 text-[0.66rem] leading-relaxed text-[#91A4AD]">{description}</p>
          </div>
        </div>
        <Link href={actionHref} className="mobile-pressable mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#C7FF3C] px-4 text-[0.66rem] font-black text-[#0B1014]">
          {actionLabel}
          <ArrowRight className="size-3.5" aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
