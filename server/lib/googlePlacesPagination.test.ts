import { describe, expect, it, vi } from "vitest";
import { requestGoogleNextPage, tokenRetryDelaysMs } from "./googlePlacesPagination";

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

  it("encerra imediatamente quando a API retorna um resultado final sem token inválido", async () => {
    const request = vi.fn().mockResolvedValue({ status: "ZERO_RESULTS" });
    const wait = vi.fn();

    await expect(requestGoogleNextPage(request, wait)).resolves.toMatchObject({ status: "ZERO_RESULTS" });
    expect(request).toHaveBeenCalledTimes(1);
    expect(wait).not.toHaveBeenCalled();
  });
});
