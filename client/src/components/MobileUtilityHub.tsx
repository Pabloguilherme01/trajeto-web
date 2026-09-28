import React, { useState } from "react";
import { CarFront, ChevronDown, CircleDollarSign, MapPinned, ShieldCheck } from "lucide-react";
import DailyDepartureChecklist from "@/components/DailyDepartureChecklist";
import MobileTripShortcuts from "@/components/MobileTripShortcuts";
import RecentTripsCard from "@/components/RecentTripsCard";
import TripPrepCard from "@/components/TripPrepCard";
import MobileVehicleCard from "@/components/MobileVehicleCard";
import VehicleMaintenanceCard from "@/components/VehicleMaintenanceCard";
import FuelLogCard from "@/components/FuelLogCard";
import MobilityExpenseCard from "@/components/MobilityExpenseCard";
import MobilityDashboardCard from "@/components/MobilityDashboardCard";
import LocalRouteCalculator from "@/components/LocalRouteCalculator";
import VehicleServiceHub from "@/components/VehicleServiceHub";
import OfficialDataRadar from "@/components/OfficialDataRadar";
import OfficialSourcesCard from "@/components/OfficialSourcesCard";

type PanelId = "rotina" | "veiculo" | "custos" | "fontes";

const panels: Array<{id: PanelId; title: string; detail: string; icon: typeof MapPinned}> = [
  { id: "rotina", title: "Minha rotina", detail: "Destinos, viagens e preparação para sair.", icon: MapPinned },
  { id: "veiculo", title: "Meu veículo", detail: "Veículo, manutenção e serviços oficiais.", icon: CarFront },
  { id: "custos", title: "Custos e consumo", detail: "Combustível, despesas e impacto da viagem.", icon: CircleDollarSign },
  { id: "fontes", title: "Dados e fontes", detail: "ANP e serviços oficiais, sem misturar estimativas.", icon: ShieldCheck },
];

export default function MobileUtilityHub() {
  const [open, setOpen] = useState<PanelId | null>("rotina");

  const toggle = (id: PanelId) => setOpen(current => current === id ? null : id);

  return (
    <section className="border-y border-white/8 bg-[#0B1014] py-6 sm:py-10" aria-labelledby="utility-hub-title">
      <div className="container">
        <div className="mb-4 sm:mb-6">
          <p className="text-[0.62rem] font-extrabold uppercase tracking-[0.16em] text-[#3DE3FF]">Tudo no lugar certo</p>
          <h2 id="utility-hub-title" className="mt-2 font-display text-3xl font-semibold tracking-[-0.06em] text-white sm:text-4xl">Ferramentas do dia</h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#82949D]">Abra só o que precisa. O Trajeto mantém os recursos avançados fora do caminho até você precisar deles.</p>
        </div>

        <div className="grid gap-2">
          {panels.map(panel => {
            const Icon = panel.icon;
            const isOpen = open === panel.id;
            return (
              <div key={panel.id} className={isOpen ? "overflow-hidden rounded-2xl border border-[#C7FF3C]/20 bg-[#10181F]" : "overflow-hidden rounded-2xl border border-white/10 bg-white/[0.025]"}>
                <button type="button" aria-expanded={isOpen} aria-controls={`utility-panel-${panel.id}`} onClick={() => toggle(panel.id)} className="flex min-h-[72px] w-full items-center gap-3 px-4 py-3 text-left">
                  <span className={isOpen ? "grid size-10 shrink-0 place-items-center rounded-xl bg-[#C7FF3C] text-[#0B1014]" : "grid size-10 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.03] text-[#C7FF3C]"}>
                    <Icon className="size-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <strong className="block text-sm font-extrabold text-white">{panel.title}</strong>
                    <span className="mt-0.5 block text-xs leading-relaxed text-[#7F919A]">{panel.detail}</span>
                  </span>
                  <ChevronDown className={isOpen ? "size-5 rotate-180 text-[#C7FF3C] transition-transform" : "size-5 text-[#71838C] transition-transform"} />
                </button>

                {isOpen && (
                  <div id={`utility-panel-${panel.id}`} className="border-t border-white/8 px-3 pb-4 pt-3 sm:px-4">
                    {panel.id === "rotina" && (
                      <div className="grid gap-4">
                        <DailyDepartureChecklist />
                        <MobileTripShortcuts />
                        <RecentTripsCard />
                        <TripPrepCard />
                      </div>
                    )}
                    {panel.id === "veiculo" && (
                      <div className="grid gap-4">
                        <MobileVehicleCard />
                        <VehicleMaintenanceCard />
                        <VehicleServiceHub />
                      </div>
                    )}
                    {panel.id === "custos" && (
                      <div className="grid gap-4">
                        <LocalRouteCalculator />
                        <div className="grid gap-4 sm:grid-cols-2">
                          <FuelLogCard />
                          <MobilityExpenseCard />
                        </div>
                        <MobilityDashboardCard />
                      </div>
                    )}
                    {panel.id === "fontes" && (
                      <div className="grid gap-4">
                        <OfficialDataRadar />
                        <OfficialSourcesCard />
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
