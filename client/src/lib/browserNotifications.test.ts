import { describe, expect, it } from "vitest";
import { notificationStatusMessage } from "./browserNotifications";

describe("browser notification states", () => {
  it("explains unsupported, denied, pending and granted states", () => {
    expect(notificationStatusMessage("unsupported", false, false)?.message).toContain("não oferece notificações");
    expect(notificationStatusMessage("denied", false, false)?.message).toContain("Permissão bloqueada");
    expect(notificationStatusMessage("default", false, true)?.message).toContain("ainda não confirmou");
    expect(notificationStatusMessage("granted", true, true)?.message).toBe("Ativadas neste navegador");
  });
});
