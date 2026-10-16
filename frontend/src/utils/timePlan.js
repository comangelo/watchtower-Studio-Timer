/**
 * Modelo de tiempos del estudio de La Atalaya.
 *
 * Criterios:
 *  - La LECTURA de cada párrafo es fija: palabras ÷ velocidad + 40 s por cada
 *    elemento de apoyo (imagen, texto bíblico, nota). Nunca se estira ni se encoge.
 *  - La INTRODUCCIÓN y la CONCLUSIÓN duran lo que se configure y siempre se reservan.
 *  - Todo el tiempo restante es para COMENTARIOS y se reparte a partes iguales entre
 *    las preguntas reales (las de los párrafos y las de repaso). Las referencias
 *    "lea …" sin pregunta no cuentan como pregunta.
 *  - En vivo, el presupuesto se mide desde el inicio del párrafo actual: mientras el
 *    conductor está en un párrafo su plan no cambia; al pasar al siguiente se
 *    recalcula con el tiempo que realmente queda.
 */

export const isRealQuestion = (q) => !!(q && typeof q.text === 'string' && q.text.trim().length > 0);

export const countQuestions = (paragraph) =>
  (paragraph?.questions || []).filter(isRealQuestion).length;

export const countAllQuestions = (analysis) => {
  if (!analysis) return 0;
  const inParagraphs = analysis.paragraphs.reduce((sum, p) => sum + countQuestions(p), 0);
  return inParagraphs + (analysis.final_questions?.length || 0);
};

const readingOf = (p) => p?.reading_time_seconds || 0;

/** Plan estático: cómo se reparte la duración total antes de empezar. */
export function buildStaticPlan({ analysis, totalSeconds, introSeconds, conclusionSeconds, answerTime }) {
  if (!analysis) return null;

  const paragraphs = analysis.paragraphs || [];
  const finals = analysis.final_questions?.length || 0;
  const totalReading = paragraphs.reduce((sum, p) => sum + readingOf(p), 0);
  const paragraphQuestions = paragraphs.reduce((sum, p) => sum + countQuestions(p), 0);
  const totalQuestions = paragraphQuestions + finals;

  // Tiempo "natural": lectura + respuestas al tiempo configurado + intro + conclusión
  const naturalTotal = totalReading + totalQuestions * answerTime + introSeconds + conclusionSeconds;

  // Tiempo disponible para comentarios dentro de la duración elegida
  const commentBudget = Math.max(0, totalSeconds - introSeconds - conclusionSeconds - totalReading);
  const perQuestion = totalQuestions > 0 ? commentBudget / totalQuestions : answerTime;

  const paragraphDuration = (p) => readingOf(p) + countQuestions(p) * perQuestion;

  // Segundos desde el inicio hasta que empieza cada párrafo y el repaso
  const paragraphOffsets = [];
  let t = introSeconds;
  for (const p of paragraphs) {
    paragraphOffsets.push(t);
    t += paragraphDuration(p);
  }
  const reviewOffset = t;

  return {
    totalReading,
    totalQuestions,
    paragraphQuestions,
    finals,
    naturalTotal,
    commentBudget,
    perQuestion,
    questionFactor: answerTime > 0 ? perQuestion / answerTime : 1,
    readingFitsInTime: totalSeconds - introSeconds - conclusionSeconds - totalReading >= 0,
    paragraphDuration,
    paragraphOffsets,
    reviewOffset,
  };
}

/**
 * Plan en vivo. Devuelve el tiempo por pregunta y la hora prevista de cada tramo,
 * según la fase en la que está el estudio.
 *
 * phase: 'idle' | 'intro' | 'paragraphs' | 'review' | 'conclusion'
 * remainingTime: segundos que quedan hasta la hora de fin
 * phaseSpent: segundos transcurridos en el tramo actual (párrafo, pregunta de repaso o introducción)
 */
export function buildLivePlan({
  analysis,
  phase,
  remainingTime,
  currentParagraph,
  currentReviewQuestion = 0,
  phaseSpent = 0,
  introSeconds,
  conclusionSeconds,
  now = new Date(),
}) {
  if (!analysis) return null;
  const paragraphs = analysis.paragraphs || [];
  const finals = analysis.final_questions?.length || 0;

  if (phase === 'conclusion') {
    return { perQuestion: 0, anchor: now, paragraphStart: () => null, reviewStart: null, reviewEnd: null };
  }

  const reserveConclusion = conclusionSeconds;
  let anchor;            // momento desde el que se cuenta el presupuesto
  let budget;            // segundos disponibles desde "anchor" hasta antes de la conclusión
  let fromIndex;         // primer párrafo pendiente
  let pendingFinals;     // preguntas de repaso pendientes

  if (phase === 'review') {
    fromIndex = paragraphs.length;
    pendingFinals = Math.max(0, finals - currentReviewQuestion);
    anchor = new Date(now.getTime() - phaseSpent * 1000);
    budget = remainingTime + phaseSpent - reserveConclusion;
  } else if (phase === 'intro') {
    fromIndex = 0;
    pendingFinals = finals;
    const introLeft = Math.max(0, introSeconds - phaseSpent);
    anchor = new Date(now.getTime() + introLeft * 1000);
    budget = remainingTime - introLeft - reserveConclusion;
  } else {
    // 'paragraphs' (o 'idle' tras "empezar desde aquí")
    fromIndex = Math.max(0, currentParagraph);
    pendingFinals = finals;
    anchor = new Date(now.getTime() - phaseSpent * 1000);
    budget = remainingTime + phaseSpent - reserveConclusion;
  }

  const pending = paragraphs.slice(fromIndex);
  const pendingReading = pending.reduce((sum, p) => sum + readingOf(p), 0);
  const pendingQuestions = pending.reduce((sum, p) => sum + countQuestions(p), 0) + pendingFinals;

  const commentTime = Math.max(0, budget - pendingReading);
  const perQuestion = pendingQuestions > 0 ? commentTime / pendingQuestions : 0;

  // Desplazamientos (en segundos desde anchor) de cada párrafo pendiente
  const offsets = {};
  let t = 0;
  for (let i = fromIndex; i < paragraphs.length; i++) {
    offsets[i] = t;
    t += readingOf(paragraphs[i]) + countQuestions(paragraphs[i]) * perQuestion;
  }
  const reviewStart = new Date(anchor.getTime() + t * 1000);
  const reviewEnd = new Date(reviewStart.getTime() + pendingFinals * perQuestion * 1000);

  return {
    perQuestion,
    anchor,
    fromIndex,
    pendingReading,
    pendingQuestions,
    readingFitsInTime: budget - pendingReading >= 0,
    paragraphStart: (i) => (offsets[i] === undefined ? null : new Date(anchor.getTime() + offsets[i] * 1000)),
    paragraphDuration: (p) => readingOf(p) + countQuestions(p) * perQuestion,
    reviewStart,
    reviewEnd,
    secondsUntilReview: (reviewStart.getTime() - now.getTime()) / 1000,
  };
}
