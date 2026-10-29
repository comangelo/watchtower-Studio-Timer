/**
 * Analiza un archivo PDF en el propio navegador (sin servidor).
 * pdf.js se carga solo cuando hace falta, para que la app arranque rápido.
 */
import { analyzePdf } from './pdfAnalyzer';

let pdfjsPromise = null;

function loadPdfjs() {
  if (!pdfjsPromise) {
    pdfjsPromise = import('pdfjs-dist/legacy/build/pdf').then((pdfjsLib) => {
      // El "worker" de pdf.js se copia a /public al compilar (ver package.json → prebuild)
      pdfjsLib.GlobalWorkerOptions.workerSrc = `${process.env.PUBLIC_URL || ''}/pdf.worker.min.js`;
      return pdfjsLib;
    });
  }
  return pdfjsPromise;
}

/**
 * options.targetDate: si el PDF es la revista completa, se analiza el artículo
 * de la semana que contiene esa fecha (por defecto, hoy).
 */
export async function analyzeFile(file, wpm, answerTime, options = {}) {
  const [pdfjsLib, buffer] = await Promise.all([loadPdfjs(), file.arrayBuffer()]);
  return analyzePdf(pdfjsLib, new Uint8Array(buffer), file.name, wpm, answerTime, options);
}
