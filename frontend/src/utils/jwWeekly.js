/**
 * Artículo de estudio de la semana en jw.org.
 *
 * - Calcula la semana (lunes a domingo) de una fecha.
 * - Averigua qué número de La Atalaya (edición de estudio) le corresponde: los
 *   artículos de un número se estudian dos meses después (agosto → octubre).
 * - Pide al servicio público de jw.org la dirección del PDF oficial de ese número.
 *
 * La app NO descarga el PDF ni lee páginas de jw.org: solo muestra el enlace oficial
 * para que cada persona lo descargue en su dispositivo (uso personal), y después lo
 * analiza en el propio dispositivo.
 */
import { jwLanguageCode } from '@/i18n';
import { weekRange } from '@/i18n/dates';

export function mondayOf(date) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}

export function addWeeks(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n * 7);
  return d;
}

/** "26 de octubre – 1 de noviembre de 2026" (en el idioma de la app) */
export function weekLabel(monday) {
  const sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 6);
  return weekRange(monday, sunday);
}

/** Número de la revista que corresponde a una semana: "202608" para las semanas de octubre de 2026. */
export function issueForWeek(monday, offsetMonths = 2) {
  const d = new Date(monday.getFullYear(), monday.getMonth() - offsetMonths, 1);
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`;
}

const API = 'https://b.jw-cdn.org/apis/pub-media/GETPUBMEDIALINKS';

/**
 * Dirección oficial del PDF de La Atalaya (edición de estudio) de un número.
 * Devuelve { issue, title, url, largePrintUrl, size } o null si aún no está publicado.
 */
export async function fetchIssuePdf(issue, lang = jwLanguageCode()) {
  const res = await fetch(`${API}?pub=w&issue=${issue}&fileformat=PDF&langwritten=${lang}&output=json`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`jw.org respondió ${res.status}`);
  const data = await res.json();
  const files = data?.files?.[lang]?.PDF || [];
  // Letra grande: "Letra grande", "Large Print", "Großdruck", "Grands caractères"… o "_lp" en el archivo
  const isLarge = (f) => /grande|large|gro(?:ß|ss)|grands?\s|caratteri\s+grandi/i.test(f.title || '') || /_lp\b|lp-/i.test(f.file?.url || '');
  const normal = files.find((f) => !isLarge(f)) || files[0];
  if (!normal) return null;
  const large = files.find((f) => f !== normal && isLarge(f));
  const title = (data.formattedDate || '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
  return {
    issue,
    title: title ? title.charAt(0).toUpperCase() + title.slice(1) : issue,
    url: normal.file?.url,
    largePrintUrl: large?.file?.url || null,
    size: normal.filesize || 0,
  };
}

/** Sistema del dispositivo, para dar las instrucciones adecuadas. */
export function devicePlatform() {
  const ua = (typeof navigator !== 'undefined' && navigator.userAgent) || '';
  if (/iPhone|iPad|iPod/i.test(ua) || (/Macintosh/i.test(ua) && typeof document !== 'undefined' && 'ontouchend' in document)) return 'ios';
  if (/Android/i.test(ua)) return 'android';
  return 'desktop';
}
