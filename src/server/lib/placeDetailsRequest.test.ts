import { describe, expect, it, vi } from "vitest";
import { dedupePlaceDetailsRequest } from "./placeDetailsRequest";

describe("dedupePlaceDetailsRequest", () => {
  it("compartilha a chamada em voo para o mesmo placeId e não guarda a resposta", async () => {
    const load = vi.fn().mockResolvedValue({ name: "Posto real" });
    const first = dedupePlaceDetailsRequest("place-1", load);
    const second = dedupePlaceDetailsRequest("place-1", load);

    await expect(Promise.all([first, second])).resolves.toEqual([{ name: "Posto real" }, { name: "Posto real" }]);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("permite uma nova chamada depois que a solicitação anterior foi concluída", async () => {
    const load = vi.fn().mockResolvedValue({ name: "Posto real" });
    await dedupePlaceDetailsRequest("place-2", load);
    await dedupePlaceDetailsRequest("place-2", load);

    expect(load).toHaveBeenCalledTimes(2);
  });
});
