import { ArrowRight, CircleHelp, Fuel, Navigation, UserRound } from "lucide-react";
import { Link } from "wouter";
import { appUrl } from "@/lib/appUrl";

type Props = {
  eyebrow: string;
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
  actionIcon?: "route" | "stations" | "account" | "help";
};

const icons = { route: Navigation, stations: Fuel, account: UserRound, help: CircleHelp };

export default function PageContextBar({ eyebrow, title, description, actionHref, actionLabel, actionIcon = "route" }: Props) {
  const Icon = icons[actionIcon];
  return (
    <section className="border-b border-white/8 bg-[#0F171D]">
      <div className="container py-7 sm:py-9">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-[0.62rem] font-bold uppercase tracking-[0.16em] text-[#3DE3FF]">{eyebrow}</p>
            <h1 className="mt-3 font-display text-[clamp(2.5rem,6vw,4.8rem)] font-semibold leading-[0.9] tracking-[-0.065em] text-white">{title}</h1>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[#A5B5BC] sm:text-base">{description}</p>
          </div>
          {actionHref && actionLabel && (
            <Link href={appUrl(actionHref)} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#C7FF3C] px-4 py-2 text-xs font-extrabold text-[#0B1014] transition hover:bg-white">
              <Icon className="size-4" /> {actionLabel}<ArrowRight className="size-3.5" />
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
