import React from "react";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import PublicServiceCard from "./PublicServiceCard";
const plannerPreload = vi.hoisted(() => vi.fn());
vi.mock("@/lib/primaryRoutes", () => ({ preparePrimaryRoute: plannerPreload }));

import type { PublicService } from "@/lib/publicServices";

afterEach(() => cleanup());

const baseService: PublicService = {
  id: "servico-teste",
  name: "Atendimento de teste",
  category: "cidadania",
  description: "Informações de atendimento ao cidadão.",
  sourceLabel: "Governo Digital",
  sourceUrl: "https://www.gov.br/",
  actionUrl: "https://www.gov.br/pt-br/servicos/",
  actionLabel: "Acessar serviço",
  mapQuery: "Atendimento de teste, Águas Lindas",
};

function showService(service: PublicService, expandedActions = false) {
  return render(
    <PublicServiceCard
      service={service}
      expandedActions={expandedActions}
      favorite={false}
      resource="todos"
      navigationMode="drive"
      setNavigationMode={vi.fn()}
      navigationModeLabel="carro"
      openMaps={vi.fn()}
      openOrganicMaps={vi.fn()}
      toggleSaved={vi.fn()}
      shareService={vi.fn().mockResolvedValue(undefined)}
    />
  );
}

it("prioritizes the verified destination action and the official online channel when no phone exists", () => {
  showService(baseService);
  const primary = screen.getByRole("group", { name: "Ações principais do serviço" });

  expect(within(primary).getByRole("button", { name: /Planejar rota/i })).toBeTruthy();
  expect(within(primary).getByRole("link", { name: /Acessar serviço/i }).getAttribute("href"))
    .toBe(baseService.actionUrl);
  expect(within(primary).queryByRole("button", { name: /Compartilhar/i })).toBeNull();
  expect(screen.getByText(/Mais opções · navegar e compartilhar/i)).toBeTruthy();
});

it("keeps sharing as a primary action when the service has neither phone nor online channel", () => {
  showService({ ...baseService, actionUrl: undefined, actionLabel: undefined });
  const primary = screen.getByRole("group", { name: "Ações principais do serviço" });
  expect(within(primary).getByRole("button", { name: /Compartilhar serviço/i })).toBeTruthy();
});

it("keeps sharing available in expanded actions with an online channel and no phone", () => {
  showService(baseService, true);
  const secondary = screen.getByRole("group", { name: "Outras ações do serviço" });
  expect(within(secondary).getByRole("button", { name: /Compartilhar serviço/i })).toBeTruthy();
  expect(screen.getByRole("link", { name: /Acessar serviço/i })).toBeTruthy();
});

it("preloads only the planner when a service route is about to be opened", () => {
  plannerPreload.mockClear();
  showService(baseService);
  expect(plannerPreload).not.toHaveBeenCalled();
  fireEvent.pointerEnter(screen.getByRole("button", { name: /Planejar rota/i }));
  expect(plannerPreload).toHaveBeenCalledWith("/planejar");
});
