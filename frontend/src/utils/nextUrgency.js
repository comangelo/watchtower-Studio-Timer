import { timeStatus } from "./timeStatus";
import { countQuestions } from "./timePlan";

/** Últimos minutos del estudio (sin prórroga): mismo valor que el modo presentación */
export const FINAL_STRETCH_SECONDS = 300;
/** Por debajo de estos segundos por pregunta pendiente ya no hay de dónde recuperar tiempo */
export const MIN_SECONDS_PER_QUESTION = 30; // lo mínimo que se puede elegir por respuesta

/**
 * Cómo debe verse el botón «Siguiente»:
 *  - "none":     el tramo va bien (azul normal).
 *  - "over":     el tramo está en rojo, pero aún se puede recuperar (botón rojo).
 *  - "critical": en rojo y ya no queda de dónde sacar tiempo (rojo que parpadea + «Pasa ya»).
 */
export function nextButtonUrgency({
  phase,               // 'intro' | 'paragraphs' | 'review' | 'conclusion' | otros
  running,             // el cronómetro está en marcha
  segmentElapsed,      // segundos del tramo actual
  segmentEstimate,     // segundos previstos del tramo actual
  remainingTime,       // segundos hasta la hora de fin
  analysis,            // resultado del análisis (párrafos y preguntas de repaso)
  currentGroupLast = -1,
  currentReviewQuestion = 0,
  conclusionSeconds = 60,
}) {
  if (!running || !analysis) return "none";
  if (!["intro", "paragraphs", "review", "conclusion"].includes(phase)) return "none";

  // La conclusión conserva siempre su prórroga
  const finalStretch = phase !== "conclusion" && remainingTime <= FINAL_STRETCH_SECONDS;
  const status = remainingTime <= 0 && phase !== "conclusion"
    ? "over"
    : timeStatus(segmentElapsed, segmentEstimate, finalStretch);
  if (status !== "over") return "none";

  // Conclusión pasada de su tiempo: ya no hay nada después de lo que sacar tiempo
  if (phase === "conclusion") return "critical";
  if (finalStretch) return "critical";

  // Lo que queda por delante si se pasara ahora a lo siguiente
  const paragraphs = analysis.paragraphs || [];
  const finals = analysis.final_questions?.length || 0;
  let pendingReading = 0;
  let pendingQuestions = 0;
  if (phase === "review") {
    pendingQuestions = Math.max(0, finals - currentReviewQuestion - 1);
  } else {
    const from = phase === "intro" ? 0 : currentGroupLast + 1;
    for (let i = from; i < paragraphs.length; i++) {
      pendingReading += paragraphs[i]?.reading_time_seconds || 0;
      pendingQuestions += countQuestions(paragraphs[i]);
    }
    pendingQuestions += finals;
  }
  const available = remainingTime - conclusionSeconds - pendingReading;
  if (pendingQuestions === 0) return available <= 0 ? "critical" : "over";
  return available / pendingQuestions < MIN_SECONDS_PER_QUESTION ? "critical" : "over";
}
