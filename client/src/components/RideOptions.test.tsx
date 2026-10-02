import React from "react";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import RideOptions from "./RideOptions";
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
it("passes only the destination to Uber and handles copying for 99", async () => {
  const copy = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText: copy },
  });
  render(<RideOptions destination="UPA Mansões Odisseia" online />);
  const url = new URL(
    screen.getByRole("link", { name: "Abrir Uber" }).getAttribute("href")!
  );
  expect(url.searchParams.get("pickup")).toBe("my_location");
  expect(JSON.parse(url.searchParams.get("drop[0]")!)).toEqual({
    nickname: "UPA Mansões Odisseia",
    formatted_address: "UPA Mansões Odisseia",
  });
  fireEvent.click(
    screen.getByRole("button", { name: "Copiar destino para a corrida" })
  );
  await waitFor(() =>
    expect(copy).toHaveBeenCalledWith("UPA Mansões Odisseia")
  );
});
it("does not offer online booking offline and reports clipboard failure", async () => {
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText: vi.fn().mockRejectedValue(new Error()) },
  });
  render(<RideOptions destination="HEAL" online={false} />);
  expect(screen.queryByRole("link")).toBeNull();
  fireEvent.click(screen.getByRole("button"));
  await waitFor(() =>
    expect(screen.getByRole("status").textContent).toContain(
      "Não foi possível copiar"
    )
  );
});
