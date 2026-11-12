/**
 * Fechas en el idioma de la app.
 *
 * Algunos navegadores no traen los datos de gallego y euskera y escriben "2026 M10 19–25"
 * (o "2026(e)ko urria 19–25"). Para esos dos idiomas las fechas se escriben aquí, como en
 * la revista; el resto usa Intl.
 */
import { currentLanguage, currentLocale } from "./index";

const GL_MONTHS = ["xaneiro", "febreiro", "marzo", "abril", "maio", "xuño", "xullo", "agosto", "setembro", "outubro", "novembro", "decembro"];
const GL_MONTHS_SHORT = ["xan.", "feb.", "mar.", "abr.", "maio", "xuño", "xul.", "ago.", "set.", "out.", "nov.", "dec."];
const GL_DAYS = ["domingo", "luns", "martes", "mércores", "xoves", "venres", "sábado"];
// Euskera: nominativo ("urria 2026") y genitivo para el día ("urriaren 19")
const EU_MONTHS = ["urtarrila", "otsaila", "martxoa", "apirila", "maiatza", "ekaina", "uztaila", "abuztua", "iraila", "urria", "azaroa", "abendua"];
const EU_MONTHS_GEN = ["urtarrilaren", "otsailaren", "martxoaren", "apirilaren", "maiatzaren", "ekainaren", "uztailaren", "abuztuaren", "irailaren", "urriaren", "azaroaren", "abenduaren"];
const EU_MONTHS_SHORT = ["urt.", "ots.", "mar.", "api.", "mai.", "eka.", "uzt.", "abu.", "ira.", "urr.", "aza.", "abe."];
const EU_DAYS = ["igandea", "astelehena", "asteartea", "asteazkena", "osteguna", "ostirala", "larunbata"];

const fmt = (date, opts) => new Date(date).toLocaleDateString(currentLocale(), opts);

/** "agosto de 2026" */
export function monthYear(date) {
  const d = new Date(date);
  const l = currentLanguage();
  if (l === "gl") return `${GL_MONTHS[d.getMonth()]} de ${d.getFullYear()}`;
  if (l === "eu") return `${d.getFullYear()}ko ${EU_MONTHS[d.getMonth()]}`;
  return fmt(d, { month: "long", year: "numeric" });
}

/** "19 de outubro" (withYear: "19 de outubro de 2026") */
export function dayMonth(date, withYear = false) {
  const d = new Date(date);
  const l = currentLanguage();
  if (l === "gl") return `${d.getDate()} de ${GL_MONTHS[d.getMonth()]}${withYear ? ` de ${d.getFullYear()}` : ""}`;
  if (l === "eu") return `${withYear ? `${d.getFullYear()}ko ` : ""}${EU_MONTHS_GEN[d.getMonth()]} ${d.getDate()}a`;
  return fmt(d, withYear ? { day: "numeric", month: "long", year: "numeric" } : { day: "numeric", month: "long" });
}

/** Semana: "19–25 de outubro de 2026", "2026ko urriaren 19–25" */
export function weekRange(a, b) {
  a = new Date(a); b = new Date(b);
  const l = currentLanguage();
  const sameMonth = a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();
  if (l === "gl") {
    if (sameMonth) return `${a.getDate()}–${b.getDate()} de ${GL_MONTHS[b.getMonth()]} de ${b.getFullYear()}`;
    const ya = a.getFullYear() === b.getFullYear() ? "" : ` de ${a.getFullYear()}`;
    return `${a.getDate()} de ${GL_MONTHS[a.getMonth()]}${ya} – ${b.getDate()} de ${GL_MONTHS[b.getMonth()]} de ${b.getFullYear()}`;
  }
  if (l === "eu") {
    const head = `${a.getFullYear()}ko ${EU_MONTHS_GEN[a.getMonth()]} ${a.getDate()}`;
    if (sameMonth) return `${head}–${b.getDate()}`;
    const yb = a.getFullYear() === b.getFullYear() ? "" : `${b.getFullYear()}ko `;
    return `${head} – ${yb}${EU_MONTHS_GEN[b.getMonth()]} ${b.getDate()}`;
  }
  const f = new Intl.DateTimeFormat(currentLocale(), { day: "numeric", month: "long", year: "numeric" });
  if (typeof f.formatRange === "function") return f.formatRange(a, b);
  return `${f.format(a)} – ${f.format(b)}`;
}

/** "xoves, 12 de novembro de 2026" */
export function longDate(date) {
  const d = new Date(date);
  const l = currentLanguage();
  if (l === "gl") return `${GL_DAYS[d.getDay()]}, ${dayMonth(d, true)}`;
  if (l === "eu") return `${dayMonth(d, true)}, ${EU_DAYS[d.getDay()]}`;
  return fmt(d, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

/** "12 nov. 2026" */
export function shortDate(date) {
  const d = new Date(date);
  const l = currentLanguage();
  if (l === "gl") return `${d.getDate()} ${GL_MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
  if (l === "eu") return `${d.getFullYear()} ${EU_MONTHS_SHORT[d.getMonth()]} ${d.getDate()}`;
  return fmt(d, { day: "numeric", month: "short", year: "numeric" });
}
