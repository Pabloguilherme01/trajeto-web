// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import ActiveRefinementChips from "./ActiveRefinementChips";

afterEach(cleanup);
it("stays absent without filters and exposes independent touch/keyboard reset actions", () => {
  const onClearAll = vi.fn(), onRemoveArea = vi.fn(), onRemoveQuery = vi.fn();
  const { rerender } = render(<ActiveRefinementChips label="Filtros ativos de teste" items={[]} onClearAll={onClearAll} />);
  expect(screen.queryByRole("group", { name: "Filtros ativos de teste" })).toBeNull();
  rerender(<ActiveRefinementChips label="Filtros ativos de teste"
    items={[{ id: "area", label: "Bairro: Jardim Brasília", onRemove: onRemoveArea },
      { id: "search", label: "Busca: CRAS", onRemove: onRemoveQuery }]}
    onClearAll={onClearAll} />);
  const group = within(screen.getByRole("group", { name: "Filtros ativos de teste" }));
  expect(group.getByText("2 filtros ativos")).toBeTruthy();
  fireEvent.click(group.getByRole("button", { name: "Remover filtro: Bairro: Jardim Brasília" }));
  expect(onRemoveArea).toHaveBeenCalledOnce();
  expect(onRemoveQuery).not.toHaveBeenCalled();
  fireEvent.click(group.getByRole("button", { name: "Limpar todos os refinamentos" }));
  expect(onClearAll).toHaveBeenCalledOnce();
});
it("preserves a one-tap removal without showing duplicate clear-all", () => {
  const onRemove = vi.fn(), onClearAll = vi.fn();
  render(<ActiveRefinementChips label="Refinamentos" items={[{ id: "only", label: "Modo: offline", onRemove }]} onClearAll={onClearAll} />);
  expect(screen.getByText("1 filtro ativo")).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Limpar todos os refinamentos" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Remover filtro: Modo: offline" }));
  expect(onRemove).toHaveBeenCalledOnce();
  expect(onClearAll).not.toHaveBeenCalled();
});
