import { describe, expect, it } from "vitest";

import { buildWhatsAppUrl } from "./whatsapp";

describe("buildWhatsAppUrl", () => {
  it("builds a WhatsApp URL with an encoded message", () => {
    const url = buildWhatsAppUrl({
      phone: "5511973531120",
      message: "Olá! Quero um orçamento.",
    });

    expect(url).toBe("https://wa.me/5511973531120?text=Ol%C3%A1!%20Quero%20um%20or%C3%A7amento.");
  });

  it("removes non-digit characters from the phone number", () => {
    const url = buildWhatsAppUrl({
      phone: "+55 (11) 97353-1120",
      message: "Contato",
    });

    expect(url).toBe("https://wa.me/5511973531120?text=Contato");
  });

  it("throws when phone has no digits", () => {
    expect(() =>
      buildWhatsAppUrl({
        phone: "sem telefone",
        message: "Contato",
      }),
    ).toThrow("WhatsApp phone must contain at least one digit.");
  });
});
