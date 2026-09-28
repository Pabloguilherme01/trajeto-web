import React from "react";
import { CarFront, ExternalLink, FileCheck2, ShieldCheck, Wrench } from "lucide-react";

const links = [
  {
    title: "CNH do Brasil",
    detail: "Acesse sua CNH digital pelo serviço oficial.",
    href: "https://www.gov.br/pt-br/servicos/obter-carteira-digital-de-transito",
    icon: FileCheck2,
  },
  {
    title: "CRLV digital",
    detail: "Documento do veículo disponível no celular.",
    href: "https://www.gov.br/pt-br/servicos/emitir-o-certificado-de-registro-e-licenciamento-de-veiculo-digital-crlv-e",
    icon: CarFront,
  },
  {
    title: "Infrações",
    detail: "Consulte multas, infrações e serviços relacionados.",
    href: "https://www.gov.br/pt-br/temas/servicos-de-transito",
    icon: ShieldCheck,
  },
  {
    title: "Recall",
    detail: "Consulte campanhas oficiais de recall do veículo.",
    href: "https://www.gov.br/pt-br/temas/servicos-de-transito",
    icon: Wrench,
  },
] as const;

export default function VehicleServiceHub() {
  return (
    <section className="container py-4 sm:py-6" aria-labelledby="vehicle-services-title">
      <div className="rounded-[1.5rem] border border-white/10 bg-[#111A21] p-4 sm:p-6">
        <div>
          <p className="text-[0.58rem] font-black uppercase tracking-[.15em] text-[#C7FF3C]">Central do veículo</p>
          <h2 id="vehicle-services-title" className="mt-1 font-display text-2xl font-semibold tracking-[-.05em] text-white">Documentos e serviços</h2>
          <p className="mt-2 max-w-2xl text-xs leading-relaxed text-[#8FA3AC]">Atalhos para serviços oficiais. O Trajeto não pede senha gov.br e não guarda seus documentos.</p>
        </div>
        <div className="mt-4 grid gap-2 grid-cols-2 lg:grid-cols-4">
          {links.map(({ title, detail, href, icon: Icon }) => (
            <a key={title} href={href} target="_blank" rel="noopener noreferrer" className="min-h-32 rounded-2xl border border-white/8 bg-white/[.025] p-3 transition hover:border-[#3DE3FF]/40 hover:bg-[#3DE3FF]/[.04] focus-visible:border-[#C7FF3C]">
              <Icon className="size-4 text-[#3DE3FF]" aria-hidden="true" />
              <strong className="mt-4 block text-xs font-extrabold text-white">{title}</strong>
              <span className="mt-1 block text-[.6rem] leading-relaxed text-[#7F919A]">{detail}</span>
              <span className="mt-3 inline-flex items-center gap-1 text-[.55rem] font-bold text-[#C7FF3C]">Abrir <ExternalLink className="size-3" aria-hidden="true" /></span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
