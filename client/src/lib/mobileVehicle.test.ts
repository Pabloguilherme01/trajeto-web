// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { getMobileVehicle, removeMobileVehicle, saveMobileVehicle } from "./mobileVehicle";

beforeEach(() => localStorage.clear());

describe("mobileVehicle", () => {
  it("normaliza e calcula corretamente o perfil local salvo", () => {
    saveMobileVehicle({
      name: "Meu carro",
      fuel: "gasolina",
      consumption: 11.2,
      tank: 45,
    });

    expect(getMobileVehicle()).toEqual({
      name: "Meu carro",
      fuel: "gasolina",
      consumption: 11.2,
      tank: 45,
    });
  });

  it("rejeita valores inválidos", () => {
    expect(saveMobileVehicle({ name: "Carro", fuel: "gasolina", consumption: NaN, tank: 45 })).toBe(false);
    expect(getMobileVehicle()).toBeNull();
  });

  it("remove o perfil local", () => {
    saveMobileVehicle({
      name: "Carro",
      fuel: "etanol",
      consumption: 8,
      tank: 40,
    });
    removeMobileVehicle();

    expect(getMobileVehicle()).toBeNull();
  });
});
