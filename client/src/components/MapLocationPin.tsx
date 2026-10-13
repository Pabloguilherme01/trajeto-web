import React, { type ReactNode } from "react";

/** The bottom tip is the geographic anchor; the 44×52 box stays touch-sized. */
export default function MapLocationPin({ children, tone = "reference" }: {
  children: ReactNode;
  tone?: "origin" | "destination" | "reference" | "street";
}) {
  const colors = tone === "origin" ? "fill-primary text-primary-foreground"
    : tone === "destination" ? "fill-foreground text-background"
    : tone === "street" ? "fill-warning text-foreground"
    : "fill-accent text-accent-foreground";
  return <span className={"relative block h-[52px] w-11 drop-shadow-md " + colors}>
    <svg viewBox="0 0 44 52" className="absolute inset-0 size-full stroke-background" aria-hidden="true">
      <path d="M22 51C18 43 3 32 3 21a19 19 0 0 1 38 0c0 11-15 22-19 30Z" strokeWidth="2" strokeLinejoin="round" />
    </svg>
    <span className="absolute inset-x-0 top-[3px] grid h-9 place-items-center text-sm font-extrabold">{children}</span>
  </span>;
}
