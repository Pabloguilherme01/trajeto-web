import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import DestinationReferenceInfo from "./DestinationReferenceInfo";

afterEach(cleanup);

it("distinguishes approximate street points from verified record dates", () => {
  render(<DestinationReferenceInfo name="Rua 1" category="referencia" lat={-15.7372345} lng={-48.2804074}
    coordinateKind="street-midpoint" sourceLabel="OpenStreetMap" sourceUrl="https://www.openstreetmap.org/copyright"
    verifiedAt="2026-10-02" coordinateVerifiedAt="2026-09-30" />);
  expect(screen.getByText("Centro aproximado da via", { exact: true })).toBeTruthy();
  expect(screen.getByRole("link", { name: "Fonte de Rua 1: OpenStreetMap" })).toBeTruthy();
  expect(screen.getByText(/Centro aproximado da via: -15.73723, -48.28041/)).toBeTruthy();
  expect(screen.getByText("2026-10-02").getAttribute("datetime")).toBe("2026-10-02");
  expect(screen.getByText("2026-09-30").getAttribute("datetime")).toBe("2026-09-30");
  expect(screen.queryByText("Posição cadastrada", { exact: true })).toBeNull();
});

it.each([[0, 0], [NaN, -48.2], [-23.55, -46.63]])("does not present invalid or outside-city positions as map coordinates", (lat, lng) => {
  render(<DestinationReferenceInfo name="Serviço" category="saude" lat={lat} lng={lng} coordinateVerifiedAt="2026-10-02" />);
  expect(screen.getByText("Endereço sem coordenadas", { exact: true })).toBeTruthy();
  expect(screen.queryByText(/Coordenadas cadastradas:/)).toBeNull();
  expect(screen.queryByText(/Posição verificada em:/)).toBeNull();
});

it("keeps municipal area references separate from positioned destinations", () => {
  render(<DestinationReferenceInfo name="Jardim Brasília" category="referencia" coordinateKind="area-reference" />);
  expect(screen.getByText("Bairro ou setor · referência por nome", { exact: true })).toBeTruthy();
  expect(screen.queryByText("Posição cadastrada", { exact: true })).toBeNull();
  expect(screen.queryByText(/verificado em:/)).toBeNull();
});
