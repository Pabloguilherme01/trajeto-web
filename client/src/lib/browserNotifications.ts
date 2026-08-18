export type BrowserNotificationStatus = "unsupported" | "default" | "granted" | "denied";

export function notificationStatusMessage(status: BrowserNotificationStatus, enabled: boolean, attempted: boolean) {
  if (status === "unsupported") return { tone: "neutral" as const, message: "Este navegador não oferece notificações. Os alertas continuarão visíveis nesta tela." };
  if (status === "denied") return { tone: "warning" as const, message: "Permissão bloqueada. Ative as notificações nas configurações do navegador para receber avisos." };
  if (status === "granted" && enabled) return { tone: "active" as const, message: "Ativadas neste navegador" };
  if (attempted) return { tone: "neutral" as const, message: "O navegador ainda não confirmou a permissão. Use o controle de permissões da página para liberá-la." };
  return null;
}
