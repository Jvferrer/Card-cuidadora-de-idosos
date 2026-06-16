export type WhatsAppContact = {
  phone: string;
  message: string;
};

export function buildWhatsAppUrl({ phone, message }: WhatsAppContact): string {
  const sanitizedPhone = phone.replace(/\D/g, "");

  if (!sanitizedPhone) {
    throw new Error("WhatsApp phone must contain at least one digit.");
  }

  return `https://wa.me/${sanitizedPhone}?text=${encodeURIComponent(message)}`;
}
