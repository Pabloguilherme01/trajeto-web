/** @vitest-environment jsdom */
import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/ui/button", () => ({ Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button {...props}>{children}</button> }));
vi.mock("@/components/ui/drawer", () => ({
  Drawer: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  DrawerContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  DrawerDescription: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  DrawerFooter: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  DrawerHeader: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  DrawerTitle: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock("@/components/ui/alert-dialog", () => ({
  AlertDialog: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  AlertDialogAction: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button {...props}>{children}</button>,
  AlertDialogCancel: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button {...props}>{children}</button>,
  AlertDialogContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  AlertDialogDescription: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  AlertDialogFooter: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  AlertDialogHeader: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  AlertDialogTitle: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import { StationSheet } from "./StationSheet";

const stop = { placeId: "place-1", name: "Posto Rota", address: "BR-070, Águas Lindas", lat: -15.74, lng: -48.28, rating: 4.4, userRatingsTotal: 32, priceReference: null, anpMatch: { status: "unresolved" as const, confidence: 0.2, legalName: null, brand: null, authorization: null } };

describe("StationSheet", () => {
  it("expõe o estado sem preço e pede confirmação antes de abrir a navegação", () => {
    const confirmed = vi.fn();
    const open = vi.spyOn(window, "open").mockImplementation(() => null);
    const { unmount } = render(<StationSheet open onOpenChange={vi.fn()} stop={stop} recommendation={null} favorite={false} onFavorite={vi.fn()} onNavigationConfirmed={confirmed} />);

    expect(screen.getByText("Preço oficial ainda não vinculado.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Como chegar" }));
    fireEvent.click(screen.getByRole("button", { name: "Abrir navegação" }));

    expect(confirmed).toHaveBeenCalledWith("google");
    expect(open).toHaveBeenCalledWith(expect.stringContaining("google.com/maps/dir"), "_blank", "noopener,noreferrer");
    open.mockRestore();
    unmount();
  });

  it("aciona o favorito no rodapé da ficha", () => {
    const favorite = vi.fn();
    render(<StationSheet open onOpenChange={vi.fn()} stop={stop} recommendation={null} favorite={false} onFavorite={favorite} />);

    fireEvent.click(screen.getByRole("button", { name: "Favoritar" }));
    expect(favorite).toHaveBeenCalledTimes(1);
  });
});
