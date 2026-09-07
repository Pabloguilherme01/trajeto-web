import { describe, expect, it, vi } from "vitest";
import { isGooglePageTokenUnavailable, requestGoogleNextPage, tokenRetryDelaysMs } from "./googlePlacesPagination";

describe("requestGoogleNextPage", () => {
  it("usa backoff curto somente enquanto o token ainda não está ativo", async () => {
    const request = vi.fn()
      .mockResolvedValueOnce({ status: "INVALID_REQUEST" })
      .mockResolvedValueOnce({ status: "INVALID_REQUEST" })
      .mockResolvedValueOnce({ status: "OK", results: [] });
    const wait = vi.fn().mockResolvedValue(undefined);

    await expect(requestGoogleNextPage(request, wait)).resolves.toMatchObject({ status: "OK" });
    expect(wait).toHaveBeenCalledTimes(2);
    expect(wait).toHaveBeenNthCalledWith(1, tokenRetryDelaysMs[0]);
    expect(wait).toHaveBeenNthCalledWith(2, tokenRetryDelaysMs[1]);
  });

  it("reconhece somente INVALID_REQUEST como token ainda indisponível", () => {
    expect(isGooglePageTokenUnavailable("INVALID_REQUEST")).toBe(true);
    expect(isGooglePageTokenUnavailable("REQUEST_DENIED")).toBe(false);
  });

  it("usa todos os atrasos limitados antes de devolver INVALID_REQUEST ao fallback do roteador", async () => {
    const request = vi.fn().mockResolvedValue({ status: "INVALID_REQUEST" });
    const wait = vi.fn().mockResolvedValue(undefined);

    await expect(requestGoogleNextPage(request, wait)).resolves.toMatchObject({ status: "INVALID_REQUEST" });
    expect(request).toHaveBeenCalledTimes(tokenRetryDelaysMs.length + 1);
    expect(wait).toHaveBeenNthCalledWith(tokenRetryDelaysMs.length, tokenRetryDelaysMs.at(-1));
  });

  it("encerra imediatamente quando a API retorna um resultado final sem token inválido", async () => {
    const request = vi.fn().mockResolvedValue({ status: "ZERO_RESULTS" });
    const wait = vi.fn();

    await expect(requestGoogleNextPage(request, wait)).resolves.toMatchObject({ status: "ZERO_RESULTS" });
    expect(request).toHaveBeenCalledTimes(1);
    expect(wait).not.toHaveBeenCalled();
  });
});
