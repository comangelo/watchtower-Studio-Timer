/**
 * Biblioteca de revistas guardadas DENTRO de la app (en este dispositivo).
 *
 * Cuando se elige la revista completa (p. ej. w_S_202608.pdf), se guarda una copia en
 * el almacenamiento propio de la app (IndexedDB). Las semanas siguientes del mismo
 * número se abren sin volver a elegir el archivo. Funciona igual en Android, iPhone y
 * Windows. Nada sale del dispositivo (uso personal).
 *
 * También guarda la carpeta elegida en Windows (Chrome/Edge) para buscar revistas en ella.
 */
const DB_NAME = 'atalaya-library';
const DB_VERSION = 1;
const ISSUES = 'issues';
const SETTINGS = 'settings';
const DAY = 86400000;
const KEEP_DAYS_AFTER_LAST_WEEK = 90;

const MONTHS_ES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto',
  'septiembre', 'octubre', 'noviembre', 'diciembre'];

function openDb() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') { reject(new Error('Sin almacenamiento')); return; }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(ISSUES)) db.createObjectStore(ISSUES, { keyPath: 'key' });
      if (!db.objectStoreNames.contains(SETTINGS)) db.createObjectStore(SETTINGS);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx(store, mode, fn) {
  const db = await openDb();
  try {
    return await new Promise((resolve, reject) => {
      const t = db.transaction(store, mode);
      const s = t.objectStore(store);
      let result;
      Promise.resolve(fn(s)).then((r) => { result = r; });
      t.oncomplete = () => resolve(result);
      t.onerror = () => reject(t.error);
      t.onabort = () => reject(t.error);
    });
  } finally {
    db.close();
  }
}

const reqP = (req) => new Promise((resolve, reject) => {
  req.onsuccess = () => resolve(req.result);
  req.onerror = () => reject(req.error);
});

/** "Agosto de 2026" a partir del nombre oficial (w_S_202608.pdf) o de las semanas. */
export function issueTitle(fileName, weeks) {
  const m = /w_[A-Z]+_(\d{4})(\d{2})/i.exec(fileName || '');
  if (m) {
    const month = MONTHS_ES[parseInt(m[2], 10) - 1];
    if (month) return `${month.charAt(0).toUpperCase()}${month.slice(1)} de ${m[1]}`;
  }
  if (weeks?.length) {
    const a = new Date(weeks[0].start);
    const b = new Date(new Date(weeks[weeks.length - 1].start).getTime() + 6 * DAY);
    return `Semanas del ${a.getDate()} de ${MONTHS_ES[a.getMonth()]} al ${b.getDate()} de ${MONTHS_ES[b.getMonth()]} de ${b.getFullYear()}`;
  }
  return fileName || 'Revista';
}

/** Guarda la revista completa (solo si trae varias semanas). Sustituye la anterior del mismo número. */
export async function saveIssue(file, weeks) {
  if (!file || !weeks || weeks.length < 2) return null;
  const sorted = [...weeks].sort((a, b) => new Date(a.start) - new Date(b.start));
  const key = sorted[0].start.slice(0, 10);
  const record = {
    key,
    title: issueTitle(file.name, sorted),
    fileName: file.name,
    size: file.size,
    savedAt: new Date().toISOString(),
    weeks: sorted.map((w) => ({ label: w.label, start: w.start })),
    lastWeekEnd: new Date(new Date(sorted[sorted.length - 1].start).getTime() + 6 * DAY).toISOString(),
    blob: file.slice(0, file.size, 'application/pdf'),
  };
  // Pide al navegador que no borre estos datos para liberar espacio
  try { await navigator.storage?.persist?.(); } catch { /* no disponible */ }
  await tx(ISSUES, 'readwrite', (s) => s.put(record));
  await cleanupOldIssues().catch(() => {});
  return record;
}

/** Revistas guardadas (sin el archivo), de la más reciente a la más antigua. */
export async function listIssues() {
  const all = await tx(ISSUES, 'readonly', (s) => reqP(s.getAll()));
  return (all || [])
    .map(({ blob, ...meta }) => meta)
    .sort((a, b) => (a.key < b.key ? 1 : -1));
}

/** Revista guardada que contiene la semana de esa fecha (o null). */
export async function findIssueForDate(date) {
  const day = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const all = await listIssues();
  return all.find((r) => r.weeks.some((w) => {
    const start = new Date(w.start).getTime();
    return day >= start && day < start + 7 * DAY;
  })) || null;
}

/** Archivo PDF de una revista guardada, listo para analizar. */
export async function getIssueFile(key) {
  const rec = await tx(ISSUES, 'readonly', (s) => reqP(s.get(key)));
  if (!rec?.blob) return null;
  return new File([rec.blob], rec.fileName || `${key}.pdf`, { type: 'application/pdf' });
}

export async function deleteIssue(key) {
  await tx(ISSUES, 'readwrite', (s) => s.delete(key));
}

/** Borra las revistas cuyas semanas terminaron hace más de 3 meses. */
export async function cleanupOldIssues(now = new Date()) {
  const limit = now.getTime() - KEEP_DAYS_AFTER_LAST_WEEK * DAY;
  const all = await listIssues();
  for (const r of all) {
    if (new Date(r.lastWeekEnd).getTime() < limit) await deleteIssue(r.key);
  }
}

/* ---------------- Carpeta de revistas (Windows: Chrome / Edge) ---------------- */

export const folderSupported = () =>
  typeof window !== 'undefined' && typeof window.showDirectoryPicker === 'function'
  && !/Android|iPhone|iPad|iPod/i.test(navigator.userAgent || '');

export async function getSavedFolder() {
  try { return (await tx(SETTINGS, 'readonly', (s) => reqP(s.get('folder')))) || null; } catch { return null; }
}

export async function chooseFolder() {
  const handle = await window.showDirectoryPicker({ id: 'atalaya-revistas', mode: 'read', startIn: 'downloads' });
  await tx(SETTINGS, 'readwrite', (s) => s.put(handle, 'folder'));
  return handle;
}

export async function forgetFolder() {
  await tx(SETTINGS, 'readwrite', (s) => s.delete('folder'));
}

/** Pide permiso de lectura (debe llamarse desde un toque/clic si aún no está concedido). */
export async function ensureFolderPermission(handle, ask = false) {
  if (!handle?.queryPermission) return false;
  if ((await handle.queryPermission({ mode: 'read' })) === 'granted') return true;
  if (!ask) return false;
  return (await handle.requestPermission({ mode: 'read' })) === 'granted';
}

/**
 * Busca en la carpeta la revista de un número ("202608" -> w_S_202608.pdf, también
 * con "(1)" u otros añadidos al nombre). Devuelve el File o null.
 */
export async function findIssueInFolder(handle, issue) {
  const re = new RegExp(`^w_S_${issue}\\b.*\\.pdf$`, 'i');
  for await (const entry of handle.values()) {
    if (entry.kind === 'file' && re.test(entry.name)) return entry.getFile();
  }
  return null;
}
