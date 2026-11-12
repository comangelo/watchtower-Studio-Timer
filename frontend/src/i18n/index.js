/**
 * Idiomas de la app.
 *
 * - Cada idioma tiene su diccionario con las mismas claves (es.js es el de referencia).
 * - Si falta una clave en un idioma, se usa el español.
 * - t("clave", { n: 3 }) sustituye {n} en el texto.
 * - tn("clave", n) elige "clave_one" o "clave_other" según el número.
 * - useLanguage() hace que la app se vuelva a pintar al cambiar de idioma.
 */
import { useSyncExternalStore } from "react";
import es from "./es";
import en from "./en";
import de from "./de";
import it from "./it";
import fr from "./fr";
import pt from "./pt";
import pl from "./pl";
import nl from "./nl";
import ro from "./ro";
import gl from "./gl";
import ca from "./ca";
import eu from "./eu";
// Japonés y coreano: traducidos (ja.js, ko.js), pendientes de que el analizador lea sus PDF

export const LANGUAGES = [
  { code: "es", name: "Español", short: "ES", locale: "es-ES" },
  { code: "ca", name: "Català", short: "CA", locale: "ca-ES" },
  { code: "eu", name: "Euskara", short: "EU", locale: "eu-ES" },
  { code: "gl", name: "Galego", short: "GL", locale: "gl-ES" },
  { code: "en", name: "English", short: "EN", locale: "en-GB" },
  { code: "de", name: "Deutsch", short: "DE", locale: "de-DE" },
  { code: "it", name: "Italiano", short: "IT", locale: "it-IT" },
  { code: "fr", name: "Français", short: "FR", locale: "fr-FR" },
  { code: "pt", name: "Português", short: "PT", locale: "pt-BR" },
  { code: "pl", name: "Polski", short: "PL", locale: "pl-PL" },
  { code: "nl", name: "Nederlands", short: "NL", locale: "nl-NL" },
  { code: "ro", name: "Română", short: "RO", locale: "ro-RO" },
];

const dictionaries = { es, en, de, it, fr, pt, pl, nl, ro, gl, ca, eu };
const STORAGE_KEY = "pdfTimer_language";
const PT_KEY = "pdfTimer_ptVariant";

/** Código de idioma de jw.org (w_S_202609.pdf, w_E_…). Portugués: T (Brasil) o TPO (Portugal). */
const JW_CODES = { es: "S", en: "E", de: "X", it: "I", fr: "F", pl: "P", nl: "O", ro: "M", gl: "GLC", ca: "AN", eu: "BQ", ja: "J", ko: "KO" };

function detectLanguage() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && dictionaries[saved]) return saved;
    // Quien ya usaba la app (en español) sigue en español hasta que elija otro idioma
    for (let i = 0; i < localStorage.length; i++) {
      if (localStorage.key(i)?.startsWith("pdfTimer_")) return "es";
    }
  } catch { /* sin almacenamiento */ }
  try {
    const langs = navigator.languages?.length ? navigator.languages : [navigator.language];
    for (const l of langs) {
      const code = (l || "").slice(0, 2).toLowerCase();
      if (dictionaries[code]) return code;
    }
  } catch { /* sin navegador */ }
  return "es";
}

let current = detectLanguage();
let ptVariant = (() => {
  try { const v = localStorage.getItem(PT_KEY); return v === "PT" || v === "BR" ? v : null; } catch { return null; }
})();
let snapshot = current + (ptVariant || "");
const listeners = new Set();
const notify = () => { snapshot = current + (ptVariant || ""); listeners.forEach((fn) => fn()); };

function applyToDocument() {
  try { document.documentElement.lang = current; } catch { /* sin documento */ }
}
applyToDocument();

export function currentLanguage() {
  return current;
}

export function currentLocale() {
  if (current === "pt") return ptVariant === "PT" ? "pt-PT" : "pt-BR";
  return LANGUAGES.find((l) => l.code === current)?.locale || "es-ES";
}

/** Portugués de Portugal ("PT") o de Brasil ("BR"); null si aún no se ha elegido. */
export function currentPtVariant() {
  return ptVariant;
}

export function setPtVariant(v) {
  if (v !== "PT" && v !== "BR") return;
  ptVariant = v;
  try { localStorage.setItem(PT_KEY, v); } catch { /* sin almacenamiento */ }
  notify();
}

/** Código de jw.org para el idioma de la app ("S", "E", "X", "I", "F", "T", "TPO", "GLC", "AN", "BQ"…). */
export function jwLanguageCode() {
  if (current === "pt") return ptVariant === "PT" ? "TPO" : "T";
  return JW_CODES[current] || "S";
}

export function setLanguage(code) {
  if (!dictionaries[code] || code === current) return;
  current = code;
  try { localStorage.setItem(STORAGE_KEY, code); } catch { /* sin almacenamiento */ }
  applyToDocument();
  notify();
}

function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Idioma actual; el componente que lo usa se vuelve a pintar al cambiarlo. */
export function useLanguage() {
  useSyncExternalStore(subscribe, () => snapshot, () => snapshot);
  return current;
}

export function t(key, vars) {
  let text = dictionaries[current]?.[key] ?? es[key] ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) text = text.split(`{${k}}`).join(String(v));
  }
  return text;
}

/** Singular o plural: tn("paragraphs", 3) → t("paragraphs_other", { n: 3 }) */
export function tn(key, n, vars) {
  // Polaco y otros: "one", "few", "many"… según las reglas del idioma; si falta, "_other"
  let cat = n === 1 ? "one" : "other";
  try { cat = new Intl.PluralRules(currentLocale()).select(n); } catch { /* sin Intl */ }
  const dict = dictionaries[current] || {};
  const k = `${key}_${cat}`;
  return t(k in dict ? k : `${key}_${n === 1 ? "one" : "other"}`, { n, ...vars });
}

/** Como t(), pero los valores pueden ser elementos de React: tx("k", { time: <b>3:00</b> }) */
export function tx(key, vars = {}) {
  const text = dictionaries[current]?.[key] ?? es[key] ?? key;
  const parts = text.split(/(\{[a-zA-Z]+\})/g);
  return parts.map((part) => {
    const m = /^\{([a-zA-Z]+)\}$/.exec(part);
    return m && m[1] in vars ? vars[m[1]] : part;
  });
}
