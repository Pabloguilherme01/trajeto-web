export const whatsappFirstContactMessage = "Olá! Encontrei a Trajeto e quero tirar uma dúvida sobre rota e postos no Entorno.";

export function withWhatsAppFirstContactMessage(platform: string, value: string | null) {
  if (platform !== "whatsapp" || !value) return value;

  const url = new URL(value);
  if (!url.searchParams.has("text")) url.searchParams.set("text", whatsappFirstContactMessage);
  return url.toString();
}
