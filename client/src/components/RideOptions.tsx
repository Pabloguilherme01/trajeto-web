import React from "react";
import { useState } from "react";
import { Car, Check, Copy } from "lucide-react";
import { buildMobilityLinks } from "@/lib/mobileTools";

export default function RideOptions({
  destination,
  online,
}: {
  destination: string;
  online: boolean;
}) {
  const [copied, setCopied] = useState("");
  const [error, setError] = useState(false);
  const links = buildMobilityLinks(destination);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(destination.trim());
      setCopied(destination);
      setError(false);
    } catch {
      setError(true);
    }
  };
  return (
    <section
      aria-labelledby="ride-options-title"
      className="mt-5 rounded-3xl border border-white/10 bg-gradient-to-br from-[#192832] to-[#10191f] p-5"
    >
      <div className="flex items-center gap-3">
        <Car className="size-5 text-[#C7FF3C]" />
        <div>
          <h2 id="ride-options-title" className="font-black">
            Vá de Uber ou 99
          </h2>
          <p className="mt-1 text-sm text-white/65">
            O mesmo destino, mais opções para chegar.
          </p>
        </div>
      </div>
      <p className="mt-3 break-words text-sm text-white/85">{destination}</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {online ? (
          <>
            <a
              href={links.uber}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-12 items-center justify-center rounded-xl bg-white text-sm font-black text-[#10191f]"
            >
              Abrir Uber
            </a>
            <a
              href={links.nineNine}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-12 items-center justify-center rounded-xl bg-[#ffdb45] text-sm font-black text-[#10191f]"
            >
              Abrir 99
            </a>
          </>
        ) : (
          <p className="col-span-2 text-sm text-[#FFD59B]">
            Conecte-se para consultar uma corrida. O destino continua disponível
            para copiar.
          </p>
        )}
        <button
          type="button"
          onClick={() => void copy()}
          className="col-span-2 flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/15 text-sm font-bold"
        >
          {copied === destination ? (
            <Check className="size-4" />
          ) : (
            <Copy className="size-4" />
          )}
          {copied === destination
            ? "Destino copiado"
            : "Copiar destino para a corrida"}
        </button>
      </div>
      {error && (
        <p role="status" className="mt-2 text-sm text-[#FFD59B]">
          Não foi possível copiar. Selecione o endereço acima e copie pelo
          navegador.
        </p>
      )}
      <p className="mt-3 text-xs leading-relaxed text-white/65">
        Confirme endereço, embarque e preço no aplicativo escolhido. Na 99, cole
        o destino. Sua localização não é enviada pelo Trajeto nesses links.
      </p>
    </section>
  );
}
