import React, { useId } from "react";
import type { LucideIcon } from "lucide-react";

type Props = {
  label: string;
  detail: string;
  icon: LucideIcon;
  selected: boolean;
  onSelect: () => void;
  ariaLabel?: string;
  availability?: string;
  layout: "rail" | "grid";
};

/** One consistent focus, press and selection treatment for both directories. */
export default function PremiumFilterModeOption({
  label,
  detail,
  icon: Icon,
  selected,
  onSelect,
  ariaLabel,
  availability,
  layout,
}: Props) {
  const inRail = layout === "rail";
  const availabilityId = useId();
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      aria-describedby={ariaLabel && availability !== undefined ? availabilityId : undefined}
      aria-pressed={selected}
      onClick={onSelect}
      className={
        "flex items-center rounded-2xl border text-left outline-offset-2 transition-colors focus-visible:outline-2 focus-visible:outline-ring " +
        (inRail
          ? "min-h-[4.25rem] min-w-[9.5rem] flex-1 shrink-0 gap-2.5 px-3 py-2 sm:min-w-0 "
          : "min-w-0 min-h-[4.5rem] gap-2 px-2.5 py-2 sm:px-3 ") +
        (selected
          ? "border-primary/45 bg-primary/15 text-foreground shadow-sm"
          : "border-border/15 bg-background/80 text-foreground hover:border-primary/30")
      }
    >
      <span aria-hidden="true" className={
        "grid shrink-0 place-items-center rounded-xl " +
        (inRail ? "size-9 " : "size-8 ") +
        (selected ? "bg-primary/15 text-primary" : "bg-muted/40 text-muted-foreground")
      }>
        <Icon className={inRail ? "size-[1.1rem]" : "size-4"} />
      </span>
      <span className="min-w-0">
        <span className={
          "block break-words font-black leading-tight " +
          (inRail ? "text-sm" : "text-xs sm:text-sm")
        }>{label}</span>
        <span className="mt-1 block break-words text-[11px] leading-tight text-muted-foreground">
          {detail}
        </span>
        {availability !== undefined && (
          <span id={availabilityId} className="mt-1.5 inline-flex rounded-full bg-muted/50 px-2 py-0.5 text-[11px] font-bold leading-tight tabular-nums text-foreground">
            {availability}
          </span>
        )}
      </span>
    </button>
  );
}
