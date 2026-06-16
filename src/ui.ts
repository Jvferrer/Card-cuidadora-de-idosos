import type { contactConfig } from "./config";
import { buildWhatsAppUrl } from "./whatsapp";

type ContactConfig = typeof contactConfig;

export function setupWhatsAppLinks(doc: Document, config: ContactConfig): void {
  const links = doc.querySelectorAll<HTMLAnchorElement>(".whatsapp-link");
  const whatsappUrl = buildWhatsAppUrl({
    phone: config.whatsappPhone,
    message: config.whatsappMessage,
  });

  links.forEach((link) => {
    link.href = whatsappUrl;
    link.setAttribute("aria-label", config.whatsappAriaLabel);
  });
}

export function setupCurrentYear(doc: Document): void {
  const currentYear = doc.querySelector<HTMLSpanElement>("#current-year");

  if (!currentYear) {
    return;
  }

  currentYear.textContent = String(new Date().getFullYear());
}

function announceAssistiveShortcut(doc: Document, message: string): void {
  const status = doc.querySelector<HTMLParagraphElement>("#assistive-status");

  if (!status) {
    return;
  }

  status.textContent = message;
}

function focusElement(doc: Document, selector: string, announceMessage: string): void {
  const element = doc.querySelector<HTMLElement>(selector);

  if (!element) {
    return;
  }

  element.focus();
  announceAssistiveShortcut(doc, announceMessage);
}

export function setupAssistiveShortcuts(doc: Document): void {
  doc.addEventListener("keydown", (event) => {
    if (!event.altKey || event.ctrlKey || event.metaKey) {
      return;
    }

    const key = event.key.toLowerCase();

    switch (key) {
      case "w":
        event.preventDefault();
        focusElement(doc, ".nav-cta.whatsapp-link", "Atalho do WhatsApp ativado.");
        break;
      case "s":
        event.preventDefault();
        focusElement(doc, 'a[href="#servicos"]', "Atalho para seção de serviços ativado.");
        break;
      case "c":
        event.preventDefault();
        focusElement(doc, 'a[href="#contato"]', "Atalho para seção de contato ativado.");
        break;
      default:
        break;
    }
  });
}

export function setupRevealAnimations(doc: Document): void {
  const elements = doc.querySelectorAll<HTMLElement>(".reveal");
  const win = doc.defaultView;

  if (!elements.length || !win) {
    return;
  }

  const prefersReducedMotion =
    typeof win.matchMedia === "function" &&
    win.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (prefersReducedMotion || !("IntersectionObserver" in win)) {
    elements.forEach((element) => element.classList.add("is-visible"));
    return;
  }

  const observer = new win.IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return;
        }

        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    },
    {
      rootMargin: "0px 0px -12% 0px",
      threshold: 0.12,
    },
  );

  elements.forEach((element) => observer.observe(element));
}

export function initUi(doc: Document, config: ContactConfig): void {
  setupWhatsAppLinks(doc, config);
  setupCurrentYear(doc);
  setupAssistiveShortcuts(doc);
  setupRevealAnimations(doc);
}
