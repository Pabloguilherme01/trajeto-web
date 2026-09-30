import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import OfflineRouteHub from "./OfflineRouteHub";

describe("OfflineRouteHub", () => {
  it("mostra destinos essenciais e devolve um destino selecionado ao planejador", () => {
    const onSelectDestination = vi.fn();
    render(<OfflineRouteHub compact onSelectDestination={onSelectDestination} />);

    expect(screen.getByRole("heading", { name: /rotas rápidas para pontos essenciais/i })).toBeTruthy();
    expect(screen.getByText("Hospital Bom Jesus")).toBeTruthy();
    expect(screen.getByText(/Fonte: Prefeitura \/ CNES/i)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /usar hospital municipal bom jesus como destino/i }));

    expect(onSelectDestination).toHaveBeenCalledTimes(1);
    expect(onSelectDestination.mock.calls[0][0].id).toBe("hospital-bom-jesus");
  });

  it("filtra por categoria e usa busca textual local", () => {
    render(<OfflineRouteHub compact onSelectDestination={vi.fn()} />);
    fireEvent.click(screen.getAllByRole("button", { name: "Saúde" })[0]);
    expect(screen.getByText("Hospital Bom Jesus")).toBeTruthy();
    expect(screen.queryByText("Rodoviária")).toBeNull();

    fireEvent.change(screen.getByLabelText("Pesquisar ponto pronto offline"), {
      target: { value: "vapt vupt" },
    });
    expect(screen.getByText("Vapt Vupt")).toBeTruthy();
  });
});
