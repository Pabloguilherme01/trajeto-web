import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import RoutePublicServiceCard from "./RoutePublicServiceCard";

afterEach(cleanup);

it("keeps service contact and closure guidance available offline without an online source action", () => {
  render(<RoutePublicServiceCard destination="Hospital Municipal Bom Jesus, Águas Lindas de Goiás, GO" online={false} />);
  expect(screen.getByRole("link", { name: /Ligar/ }).getAttribute("href")).toBe("tel:6135487604");
  expect(screen.getByText(/desativada temporariamente por reforma, enquanto/)).toBeTruthy();
  expect(screen.queryByRole("link", { name: /Consultar fonte/ })).toBeNull();
});

it("exposes the source online and omits the card for unrelated destinations", () => {
  const view = render(<RoutePublicServiceCard destination="HEAL" online />);
  expect(screen.getByRole("link", { name: /Consultar fonte/ }).getAttribute("href")).toBe("https://goias.gov.br/saude/heal/");
  view.rerender(<RoutePublicServiceCard destination="Avenida JK" online />);
  expect(screen.queryByRole("region", { name: "Informações do serviço no destino" })).toBeNull();
});
