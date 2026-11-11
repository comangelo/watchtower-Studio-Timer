/**
 * Historial de estudios (solo en este dispositivo, en localStorage).
 *
 * Cada informe guarda la hora de inicio y de fin, la duración prevista y la real,
 * y el tiempo previsto/real y los comentarios de cada tramo:
 * introducción, cada párrafo o grupo, cada pregunta de repaso y la conclusión.
 */
const HISTORY_KEY = "pdfTimer_history";
const MAX_REPORTS = 100;

export function loadHistory() {
  try {
    const list = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
    return Array.isArray(list) ? list.sort((a, b) => (b.startedAt || 0) - (a.startedAt || 0)) : [];
  } catch {
    return [];
  }
}

function writeHistory(list) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(list.slice(0, MAX_REPORTS)));
    return true;
  } catch {
    return false;
  }
}

export function saveReport(report) {
  const list = loadHistory().filter((r) => r.id !== report.id);
  list.unshift(report);
  return writeHistory(list);
}

export function getReport(id) {
  const list = loadHistory();
  if (!id) return list[0] || null;
  return list.find((r) => r.id === id) || null;
}

export function deleteReport(id) {
  return writeHistory(loadHistory().filter((r) => r.id !== id));
}

export function reportUrl(id) {
  return id ? `/informe?id=${encodeURIComponent(id)}` : "/informe";
}

/** Abre el informe en una pestaña o ventana aparte. */
export function openReport(id) {
  const w = window.open(reportUrl(id), "_blank");
  if (!w) window.location.href = reportUrl(id);
}
