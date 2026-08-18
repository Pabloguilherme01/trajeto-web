import { describe, expect, it } from "vitest";
import { whatsappFirstContactMessage, withWhatsAppFirstContactMessage } from "./socialLinks";

describe("social links", () => {
  it("adiciona uma mensagem de primeiro contato ao WhatsApp quando ela não foi definida", () => {
    const result = withWhatsAppFirstContactMessage("whatsapp", "https://wa.me/5561992903029");
    expect(new URL(result ?? "").searchParams.get("text")).toBe(whatsappFirstContactMessage);
  });

  it("preserva outros canais e uma mensagem de WhatsApp já configurada", () => {
    expect(withWhatsAppFirstContactMessage("instagram", "https://instagram.com/mpjstoryworks")).toBe("https://instagram.com/mpjstoryworks");
    expect(withWhatsAppFirstContactMessage("whatsapp", "https://wa.me/5561992903029?text=Oi")).toBe("https://wa.me/5561992903029?text=Oi");
  });
});
