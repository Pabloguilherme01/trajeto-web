/** @vitest-environment jsdom */
import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const saved = { mappedBrand: "Shell", hoursStatus: "open" as const, sortBy: "hours" as const, anpNeighborhood: "CAMPING CLUBE", anpBrand: "BANDEIRA BRANCA" };
const saveMutation = vi.fn();
let isFetchingNextPage = false;

class MockIntersectionObserver {
  constructor(_callback: IntersectionObserverCallback, _options?: IntersectionObserverInit) {}
  observe() {}
  disconnect() {}
  unobserve() {}
  takeRecords() { return []; }
  readonly root = null;
  readonly rootMargin = "0px";
  readonly thresholds = [];
}

vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);

vi.mock("@/_core/hooks/useAuth", () => ({ useAuth: () => ({ isAuthenticated: true }) }));
vi.mock("@/const", () => ({ startLogin: vi.fn() }));
vi.mock("@/hooks/useProductEvents", () => ({ useProductEvents: () => vi.fn() }));
vi.mock("@/components/StationMap", () => ({ StationMap: () => null }));
vi.mock("@/components/ui/button", () => ({ Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button {...props}>{children}</button> }));
vi.mock("@/components/ui/dialog", () => ({ Dialog: ({ children }: { children: React.ReactNode }) => <>{children}</>, DialogContent: ({ children }: { children: React.ReactNode }) => <>{children}</>, DialogDescription: ({ children }: { children: React.ReactNode }) => <>{children}</>, DialogHeader: ({ children }: { children: React.ReactNode }) => <>{children}</>, DialogTitle: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock("wouter", () => ({ Link: ({ children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => <a {...props}>{children}</a>, useLocation: () => ["/postos", vi.fn()] }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), message: vi.fn() } }));
vi.mock("@/lib/trpc", () => ({
  trpc: {
    stationDirectory: {
      search: { useInfiniteQuery: () => ({ data: { pages: [{ query: "Águas Lindas de Goiás, GO", queriedAt: Date.now(), stations: [{ placeId: "shell-1", name: "Posto Shell", address: "Águas Lindas", lat: -15.74, lng: -48.28, phone: null, website: null, isOpen: true, openingHours: [], distanceMeters: 1200, distanceLabel: "1.2 km" }], nextCursor: "next-token" }] }, isLoading: false, isError: false, hasNextPage: true, isFetchingNextPage, isFetchNextPageError: false, fetchNextPage: vi.fn() }) },
      authorizedSearch: { useQuery: () => ({ data: { stations: [], total: 1, neighborhoods: ["CAMPING CLUBE"], brands: ["BANDEIRA BRANCA"] } }) },
    },
    personal: {
      stationSearchPreferences: { useQuery: () => ({ data: saved }) },
      saveStationSearchPreferences: { useMutation: () => ({ mutate: saveMutation, isPending: false }) },
      favoriteState: { useQuery: () => ({ data: [], refetch: vi.fn() }) },
      addFavorite: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
      removeFavorite: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
    },
    useUtils: () => ({ personal: { overview: { invalidate: vi.fn() } } }),
  },
}));

import Stations from "./Stations";

describe("Stations com preferências autenticadas", () => {
  it("reaplica filtros salvos e envia os mesmos valores ao salvar", async () => {
    window.history.pushState({}, "", "/postos?q=%C3%81guas%20Lindas%20de%20Goi%C3%A1s%2C%20GO");
    render(<Stations />);

    await waitFor(() => {
      expect((screen.getByLabelText("Bandeira") as HTMLSelectElement).value).toBe("Shell");
      expect((screen.getByLabelText("Horário") as HTMLSelectElement).value).toBe("open");
      expect((screen.getByLabelText("Ordenar por") as HTMLSelectElement).value).toBe("hours");
      expect((screen.getByLabelText("Bairro ANP") as HTMLSelectElement).value).toBe("CAMPING CLUBE");
      expect((screen.getByLabelText("Bandeira ANP") as HTMLSelectElement).value).toBe("BANDEIRA BRANCA");
    });

    fireEvent.click(screen.getByRole("button", { name: "Salvar estes filtros" }));
    expect(saveMutation).toHaveBeenCalledWith(saved);
  });

  it("mostra skeletons e mensagem acessível enquanto recebe o próximo lote", () => {
    isFetchingNextPage = true;
    window.history.pushState({}, "", "/postos?q=%C3%81guas%20Lindas%20de%20Goi%C3%A1s%2C%20GO");
    const { unmount } = render(<Stations />);

    const loadingSection = screen.getByLabelText("Carregando próximo lote de paradas");
    expect(loadingSection).toBeTruthy();
    expect(screen.getByText("Carregando o próximo lote de postos…")).toBeTruthy();
    expect(loadingSection.querySelectorAll('[data-slot="skeleton"]')).toHaveLength(21);
    unmount();
    isFetchingNextPage = false;
  });
});
