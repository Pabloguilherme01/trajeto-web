import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import MapPlaceActions from "./MapPlaceActions";
import * as mobileTools from "@/lib/mobileTools";
const place = { id: "public-upa", name: "UPA", address: "Rua Pública", lat: -15.75, lng: -48.28 };
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
it("measures two selected public places locally as straight-line distance", () => {
  const { rerender } = render(<MapPlaceActions place={place} />);
  fireEvent.click(screen.getByRole("button", { name: "Medir a partir daqui" }));
  expect(screen.getByRole("status").textContent).toContain("escolha outro lugar");
  rerender(<MapPlaceActions place={{ ...place, id: "second", name: "Praça", lat: -15.751 }} />);
  expect(screen.getByRole("status").textContent).toContain("111 m em linha reta");
  fireEvent.click(screen.getByRole("button", { name: "Encerrar medição" }));
  expect(screen.queryByRole("status")).toBeNull();
});
it("shares a named destination without copying map or GPS coordinates into the URL", async () => {
  const share = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "share", { configurable: true, value: share });
  render(<MapPlaceActions place={place} />);
  fireEvent.click(screen.getByRole("button", { name: "Compartilhar" }));
  await waitFor(() => expect(share).toHaveBeenCalledOnce());
  const data = share.mock.calls[0][0];
  expect(new URL(data.url).searchParams.get("destino")).toContain("UPA");
  expect(data.url).not.toContain("-15.75");
  expect(new URL(data.url).searchParams.has("origem")).toBe(false);
});
it("does not expose sharing for the user's current position or origin", () => {
  const { rerender } = render(<MapPlaceActions place={{ ...place, id: "device-location" }} />);
  expect(screen.queryByRole("button")).toBeNull();
  rerender(<MapPlaceActions place={{ ...place, id: "origin" }} />);
  expect(screen.queryByRole("button")).toBeNull();
});
it("reports clipboard failure without claiming success", async () => {
  Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: vi.fn().mockRejectedValue(new Error("denied")) } });
  render(<MapPlaceActions place={place} />);
  fireEvent.click(screen.getByRole("button", { name: "Copiar endereço" }));
  await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("Não foi possível copiar"));
  expect(screen.queryByText("Endereço copiado.")).toBeNull();
});

it("uses the selected mode when opening a public place in Organic Maps", () => {
  const build = vi.spyOn(mobileTools, "buildOrganicMapsNavigationUrl").mockReturnValue(null);
  render(<MapPlaceActions place={place} />);
  fireEvent.change(screen.getByRole("combobox", { name: "Modo de navegação no Organic Maps" }), { target: { value: "bike" } });
  fireEvent.click(screen.getByRole("button", { name: "Organic Maps" }));
  expect(build).toHaveBeenCalledWith({ lat: place.lat, lng: place.lng }, place.name, "bike");
});

it("offers a named Organic Maps search for a place without confirmed coordinates", () => {
  const search = vi.spyOn(mobileTools, "buildOrganicMapsSearchUrl").mockReturnValue("");
  const navigate = vi.spyOn(mobileTools, "buildOrganicMapsNavigationUrl");
  render(<MapPlaceActions place={{ ...place, lat: undefined, lng: undefined }} />);
  fireEvent.click(screen.getByRole("button", { name: "Buscar no Organic Maps" }));
  expect(search).toHaveBeenCalledWith("UPA · Rua Pública");
  expect(navigate).not.toHaveBeenCalled();
  expect(screen.queryByRole("combobox")).toBeNull();
  expect(screen.queryByRole("button", { name: "Medir a partir daqui" })).toBeNull();
});
