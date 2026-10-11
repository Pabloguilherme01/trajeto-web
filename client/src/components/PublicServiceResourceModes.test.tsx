// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import PublicServiceResourceModes from "./PublicServiceResourceModes";

afterEach(cleanup);

describe("premium modes in the public services directory", () => {
  it("shows all four resources visibly with accessible pressed states at phone widths", () => {
    const onChange = vi.fn();
    const { rerender } = render(<PublicServiceResourceModes resource="todos" onChange={onChange} />);
    const group = screen.getByRole("group", { name: "Recursos disponíveis" });
    const modes = within(group).getAllByRole("button");
    expect(modes).toHaveLength(4);
    expect(modes[0].getAttribute("aria-pressed")).toBe("true");
    expect(modes.slice(1).every(button => button.getAttribute("aria-pressed") === "false")).toBe(true);
    const contact = within(group).getByRole("button", { name: /Ligar ou WhatsApp/ });
    fireEvent.click(contact);
    expect(onChange).toHaveBeenCalledWith("contato");
    rerender(<PublicServiceResourceModes resource="contato" onChange={onChange} />);
    expect(within(group).getByRole("button", { name: /Ligar ou WhatsApp/ }).getAttribute("aria-pressed")).toBe("true");
    expect(within(group).getByRole("button", { name: /Ver tudo/ }).getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(within(group).getByRole("button", { name: /Ir até o local/ }));
    fireEvent.click(within(group).getByRole("button", { name: /Resolver online/ }));
    expect(onChange.mock.calls.map(call => call[0])).toEqual(["contato", "rota", "online"]);
  });

  it("keeps actions at least 44px high and fits in two columns on narrow mobiles", () => {
    render(<PublicServiceResourceModes resource="rota" onChange={() => undefined} />);
    const group = screen.getByRole("group", { name: "Recursos disponíveis" });
    expect(group.className).toContain("grid-cols-2");
    expect(within(group).getAllByRole("button").every(button => button.className.includes("min-h-[4.5rem]")))
      .toBe(true);
    expect(within(group).getByRole("button", { name: /Ir até o local/ }).getAttribute("aria-pressed"))
      .toBe("true");
  });
});
