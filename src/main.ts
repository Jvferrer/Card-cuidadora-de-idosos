import "../style.css";

import { contactConfig } from "./config";
import { buildWhatsAppUrl } from "./whatsapp";

function setupWhatsAppLinks(): void {
  const links = document.querySelectorAll<HTMLAnchorElement>(".whatsapp-link");
  const whatsappUrl = buildWhatsAppUrl({
    phone: contactConfig.whatsappPhone,
    message: contactConfig.whatsappMessage,
  });

  links.forEach((link) => {
    link.href = whatsappUrl;
    link.setAttribute("aria-label", contactConfig.whatsappAriaLabel);
  });
}

function setupCurrentYear(): void {
  const currentYear = document.querySelector<HTMLSpanElement>("#current-year");

  if (!currentYear) {
    return;
  }

  currentYear.textContent = String(new Date().getFullYear());
}

document.addEventListener("DOMContentLoaded", () => {
  setupWhatsAppLinks();
  setupCurrentYear();
});
