import React, { useState } from "react";
import { Link } from "wouter";

export default function BusinessRegistryActions({ cnpj, mapUrl }: { cnpj: string; mapUrl?: string }) {
  const [status, setStatus] = useState<"idle" | "copied" | "manual">("idle");
  const copy = async () => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error("clipboard unavailable");
      await navigator.clipboard.writeText(cnpj);
      setStatus("copied");
    } catch { setStatus("manual"); }
  };
  return <div className="grid min-w-0 grid-cols-2 gap-2">
    <button type="button" aria-label={"Copiar CNPJ " + cnpj} onClick={copy}
      className="min-h-11 min-w-0 rounded-xl border border-primary/25 px-2 text-xs font-bold text-primary focus-visible:outline-2 focus-visible:outline-ring">Copiar CNPJ</button>
    {mapUrl && <Link href={mapUrl} className="flex min-h-11 min-w-0 items-center justify-center rounded-xl bg-primary px-2 text-center text-xs font-bold text-primary-foreground">Ver empresa no mapa</Link>}
    {!mapUrl && <p className="col-span-full text-xs leading-relaxed text-muted-foreground">Nome não informado. Confirme a identificação e o endereço antes de planejar uma viagem.</p>}
    {status !== "idle" && <p role="status" className="col-span-full break-words text-xs leading-relaxed">{status === "copied" ? "CNPJ copiado." : "Selecione e copie o CNPJ manualmente: " + cnpj}</p>}
  </div>;
}
