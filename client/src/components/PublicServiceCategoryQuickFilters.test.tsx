// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import PublicServiceCategoryQuickFilters from "./PublicServiceCategoryQuickFilters";

afterEach(cleanup);

describe("quick Premium service categories", () => {
  it("keeps six existing shortcuts with readable, touchable and accessible selection", () => {
    const onChange = vi.fn();
    render(<PublicServiceCategoryQuickFilters category="saude" onChange={onChange} />);
    const group = screen.getByRole("group", { name: "Categorias mais usadas" });
    const buttons = within(group).getAllByRole("button");
    expect(buttons).toHaveLength(6);
    expect(buttons.map(button => button.getAttribute("aria-label"))).toEqual([
      "Filtrar por Tudo", "Filtrar por Saúde", "Filtrar por Assistência",
      "Filtrar por Trabalho", "Filtrar por Água e energia", "Filtrar por Documentos",
    ]);
    expect(within(group).getByRole("button", { name: "Filtrar por Saúde" }).getAttribute("aria-pressed"))
      .toBe("true");
    expect(buttons.every(button => button.className.includes("min-h-12"))).toBe(true);
    fireEvent.click(within(group).getByRole("button", { name: "Filtrar por Documentos" }));
    expect(onChange).toHaveBeenCalledWith("documentos");
    expect(screen.queryByText(/Categoria ativa:/)).toBeNull();
  });

  it("exposes an advanced selected category and clears only the category", () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <PublicServiceCategoryQuickFilters category="telecom" onChange={onChange} />,
    );
    expect(screen.getByText("Categoria ativa: Internet e telefone")).toBeTruthy();
    const clear = screen.getByRole("button", { name: "Remover filtro da categoria Internet e telefone" });
    expect(clear.className).toContain("min-h-11");
    fireEvent.click(clear);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith("todos");
    rerender(<PublicServiceCategoryQuickFilters category="todos" onChange={onChange} />);
    expect(screen.queryByText(/Categoria ativa:/)).toBeNull();
    expect(screen.getByRole("button", { name: "Filtrar por Tudo" }).getAttribute("aria-pressed"))
      .toBe("true");
  });
});
