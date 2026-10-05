import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import MapDestinationPicker from "./MapDestinationPicker";
afterEach(() => cleanup());
const items = [
  { id: "a", name: "Avenida Brasília", address: "Setor Norte" },
  { id: "b", name: "Avenida Brasília", address: "Setor Sul" },
  { id: "c", name: "UPA", address: "Mansões Odisseia", category: "saude" },
];
it("filters by category and clears an empty combined search", () => {
  render(<MapDestinationPicker items={items} value="a" label="Escolher lugar" onSelect={vi.fn()} />);
  fireEvent.click(screen.getByRole("button", { name: "Escolher lugar" }));
  fireEvent.click(screen.getByRole("button", { name: "Saúde" }));
  expect(screen.getAllByRole("option")).toHaveLength(1);
  expect(screen.getByRole("option").textContent).toContain("UPA");
  fireEvent.change(screen.getByRole("combobox"), { target: { value: "brasilia" } });
  expect(screen.queryByRole("option")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Limpar busca e filtros" }));
  expect(screen.getAllByRole("option")).toHaveLength(3);
});
it("offers ready keyboard filters for common destinations", () => {
  render(<MapDestinationPicker items={items} value="a" label="Escolher lugar" onSelect={vi.fn()} />);
  fireEvent.click(screen.getByRole("button", { name: "Escolher lugar" }));
  fireEvent.click(screen.getByRole("button", { name: "UPA" }));
  expect(screen.getAllByRole("option")).toHaveLength(1);
  expect(screen.getByRole("option").textContent).toContain("UPA");
});
it("clears a typed map search with one touch", () => {
  render(<MapDestinationPicker items={items} value="a" label="Escolher lugar" onSelect={vi.fn()} />);
  fireEvent.click(screen.getByRole("button", { name: "Escolher lugar" }));
  const input = screen.getByRole("combobox", { name: "Pesquisar lugares no mapa" }) as HTMLInputElement;
  fireEvent.change(input, { target: { value: "odisseia" } });
  expect(input.value).toBe("odisseia");
  fireEvent.click(screen.getByRole("button", { name: "Limpar busca de lugares" }));
  expect(input.value).toBe("");
  expect(screen.getAllByRole("option")).toHaveLength(3);
});

it("searches without accents and distinguishes duplicate street names by address", () => {
  const choose = vi.fn();
  render(<MapDestinationPicker items={items} value="c" label="Escolher lugar" onSelect={choose} />);
  fireEvent.click(screen.getByRole("button", { name: "Escolher lugar" }));
  const input = screen.getByRole("combobox", { name: "Pesquisar lugares no mapa" });
  fireEvent.change(input, { target: { value: "brasilia sul" } });
  expect(screen.getAllByRole("option")).toHaveLength(1);
  fireEvent.click(screen.getByRole("option", { name: "Avenida Brasília · Setor Sul" }));
  expect(choose).toHaveBeenCalledWith("b");
  expect(screen.queryByRole("listbox")).toBeNull();
});
it("selects through keyboard and recovers from an empty search", () => {
  const choose = vi.fn();
  render(<MapDestinationPicker items={items} value="a" label="Escolher lugar" onSelect={choose} />);
  fireEvent.click(screen.getByRole("button", { name: "Escolher lugar" }));
  const input = screen.getByRole("combobox", { name: "Pesquisar lugares no mapa" });
  fireEvent.change(input, { target: { value: "inexistente" } });
  expect(screen.queryAllByRole("option")).toHaveLength(0);
  expect(screen.getByRole("status").textContent).toContain("Nenhum lugar");
  fireEvent.change(input, { target: { value: "brasilia" } });
  fireEvent.keyDown(input, { key: "ArrowDown" });
  expect(input.getAttribute("aria-activedescendant")).toBe(screen.getAllByRole("option")[1].id);
  fireEvent.keyDown(input, { key: "Enter" });
  expect(choose).toHaveBeenCalledWith("b");
});
