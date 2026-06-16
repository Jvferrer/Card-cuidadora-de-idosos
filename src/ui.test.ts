import { beforeEach, describe, expect, it } from "vitest";

import { contactConfig } from "./config";
import { initUi, setupAssistiveShortcuts } from "./ui";

function createDomFixture(): void {
  document.body.innerHTML = `
    <header>
      <a class="nav-cta whatsapp-link" href="#">WhatsApp</a>
      <a href="#servicos">Serviços</a>
      <a href="#contato">Contato</a>
    </header>
    <main>
      <p id="assistive-status" aria-live="polite"></p>
      <span id="current-year"></span>
    </main>
  `;
}

describe("UI behavior", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("configura links de WhatsApp com URL e rótulo acessível", () => {
    createDomFixture();

    initUi(document, contactConfig);

    const link = document.querySelector<HTMLAnchorElement>(".whatsapp-link");

    expect(link).not.toBeNull();
    expect(link?.href).toContain("https://wa.me/");
    expect(link?.href).toContain(encodeURIComponent(contactConfig.whatsappMessage));
    expect(link?.getAttribute("aria-label")).toBe(contactConfig.whatsappAriaLabel);
  });

  it("preenche o ano atual no rodapé", () => {
    createDomFixture();

    initUi(document, contactConfig);

    const year = document.querySelector("#current-year");
    expect(year?.textContent).toBe(String(new Date().getFullYear()));
  });

  it("atalho Alt+W move foco para o CTA e anuncia no leitor de tela", () => {
    createDomFixture();
    setupAssistiveShortcuts(document);

    document.dispatchEvent(new KeyboardEvent("keydown", { key: "w", altKey: true, bubbles: true }));

    const cta = document.querySelector<HTMLElement>(".nav-cta.whatsapp-link");
    const status = document.querySelector("#assistive-status");

    expect(document.activeElement).toBe(cta);
    expect(status?.textContent).toBe("Atalho do WhatsApp ativado.");
  });

  it("atalho Alt+S move foco para o link de serviços", () => {
    createDomFixture();
    setupAssistiveShortcuts(document);

    document.dispatchEvent(new KeyboardEvent("keydown", { key: "s", altKey: true, bubbles: true }));

    const servicesLink = document.querySelector<HTMLElement>('a[href="#servicos"]');
    const status = document.querySelector("#assistive-status");

    expect(document.activeElement).toBe(servicesLink);
    expect(status?.textContent).toBe("Atalho para seção de serviços ativado.");
  });

  it("ignora atalho quando Ctrl também está pressionado", () => {
    createDomFixture();
    setupAssistiveShortcuts(document);

    document.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "w",
        altKey: true,
        ctrlKey: true,
        bubbles: true,
      }),
    );

    const status = document.querySelector("#assistive-status");
    expect(status?.textContent).toBe("");
  });
});
