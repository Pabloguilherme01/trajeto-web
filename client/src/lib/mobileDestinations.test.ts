// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import {
  getDestinationUsage,
  getFavoriteDestination,
  getMobileDestinations,
  rememberDestinationUsage,
  removeMobileDestination,
  saveMobileDestination,
} from "./mobileDestinations";

beforeEach(() => localStorage.clear());

describe("mobileDestinations", () => {
  it("salva, valida e encontra o destino mais usado", () => {
    saveMobileDestination("casa", "Águas Lindas de Goiás");
    saveMobileDestination("trabalho", "Brasília, DF");

    const destinations = getMobileDestinations();
    expect(destinations).toHaveLength(2);

    const casa = destinations.find(item => item.id === "casa");
    expect(casa).toBeTruthy();
    if (!casa) return;

    rememberDestinationUsage(casa);
    rememberDestinationUsage(casa);

    expect(getFavoriteDestination()).toMatchObject({ id: "casa", label: "Casa" });
    expect(getDestinationUsage().casa?.count).toBe(2);
  });

  it("remove o destino e seu histórico local", () => {
    saveMobileDestination("casa", "Brasília, DF");
    const casa = getMobileDestinations()[0];
    rememberDestinationUsage(casa);
    removeMobileDestination("casa");

    expect(getMobileDestinations()).toEqual([]);
    expect(getDestinationUsage().casa).toBeUndefined();
  });
});
