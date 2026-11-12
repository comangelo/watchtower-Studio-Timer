import { currentLanguage } from "@/i18n";

/** Idiomas con manual traducido (el español es /manual.html). */
const MANUAL_LANGS = ["en", "de", "it", "fr", "pt", "pl", "nl", "ro", "gl", "ca", "eu"];

/** Dirección del manual en el idioma actual de la app. */
export function manualUrl() {
  const l = currentLanguage();
  return MANUAL_LANGS.includes(l) ? `/manual-${l}.html` : "/manual.html";
}

/** Abre el manual en otra pestaña, para no perder el estudio en curso. */
export function openManual() {
  window.open(manualUrl(), "_blank", "noopener");
}

/** Guía rápida en el idioma actual de la app. */
export function guideUrl() {
  const l = currentLanguage();
  return MANUAL_LANGS.includes(l) ? `/guia-rapida-${l}.html` : "/guia-rapida.html";
}
