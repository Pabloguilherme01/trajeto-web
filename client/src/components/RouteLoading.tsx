import React, { useEffect, useState } from "react";

export default function RouteLoading() {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setSlow(true), 12000);
    return () => window.clearTimeout(timer);
  }, []);
  return (
    <div role="status" aria-live="polite" className="grid min-h-[70dvh] place-items-center bg-background px-5 text-foreground">
      <div className="w-full max-w-sm rounded-3xl border border-border bg-card p-5">
        <div className="size-2 animate-pulse rounded-full bg-primary" />
        <p className="mt-4 text-sm font-black">Abrindo o Trajeto…</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{slow ? "Esta tela está demorando. Se estiver offline, use uma tela já preparada neste aparelho." : "Carregando somente a tela necessária."}</p>
        {slow && <div className="mt-4 grid grid-cols-2 gap-2">
          <button type="button" className="min-h-11 rounded-xl bg-primary px-3 text-sm font-bold text-primary-foreground" onClick={() => window.location.reload()}>Tentar novamente</button>
          <a href={import.meta.env.BASE_URL} className="flex min-h-11 items-center justify-center rounded-xl border border-border px-3 text-sm font-bold">Ir ao início</a>
        </div>}
      </div>
    </div>
  );
}

