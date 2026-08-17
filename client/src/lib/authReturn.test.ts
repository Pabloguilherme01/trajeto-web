import { describe, expect, it } from "vitest";
import { AUTH_RETURN_KEY, consumeStationReturn, isSafeStationReturnPath } from "./authReturn";

describe("isSafeStationReturnPath", () => {
  it("aceita a consulta interna de postos como retorno pós-login", () => {
    expect(isSafeStationReturnPath("/postos?q=Bras%C3%ADlia%2C%20DF")).toBe(true);
  });

  it("rejeita destinos externos ou fora da jornada de consulta", () => {
    expect(isSafeStationReturnPath("//external.example")).toBe(false);
    expect(isSafeStationReturnPath("https://external.example")).toBe(false);
    expect(isSafeStationReturnPath("/minha-conta")).toBe(false);
    expect(isSafeStationReturnPath(null)).toBe(false);
  });
});

describe("consumeStationReturn", () => {
  it("consome a consulta salva e retorna ao caminho de origem após a autenticação", () => {
    const values = new Map([[AUTH_RETURN_KEY, "/postos?q=Bras%C3%ADlia%2C%20DF"]]);
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      removeItem: (key: string) => values.delete(key),
    };

    expect(consumeStationReturn(storage, "/")).toBe("/postos?q=Bras%C3%ADlia%2C%20DF");
    expect(values.has(AUTH_RETURN_KEY)).toBe(false);
  });

  it("descarta um destino inválido sem navegar", () => {
    const values = new Map([[AUTH_RETURN_KEY, "https://external.example"]]);
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      removeItem: (key: string) => values.delete(key),
    };

    expect(consumeStationReturn(storage, "/")).toBeNull();
    expect(values.has(AUTH_RETURN_KEY)).toBe(false);
  });
});
