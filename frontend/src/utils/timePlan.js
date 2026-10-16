/**
 * Modelo de tiempos del estudio de La Atalaya.
 *
 * Criterios:
 *  - La LECTURA de cada párrafo es fija: palabras ÷ velocidad + 40 s por cada
 *    elemento de apoyo (imagen, texto bíblico, nota). Nunca se estira ni se encoge.
 *  - La INTRODUCCIÓN y la CONCLUSIÓN duran lo que se configure y siempre se reservan.
 *  - Todo el tiempo restante es para COMENTARIOS y se reparte en "turnos de comentario":
 *      · cada pregunta real (de párrafo o de repaso) = 1 turno. Las referencias
 *        "lea …" sin pregunta no cuentan como pregunta;
 *      · los párrafos largos o agrupados reciben turnos EXTRA según sus palabras:
 *        cada pregunta "cubre" las palabras medias por pregunta del artículo y las
 *        palabras que sobran generan comentarios adicionales (máx. 2 turnos extra).
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

const MAX_EXTRA_UNITS = 2;

/**
 * Turnos de comentario de cada párrafo.
 *  - preguntas reales del párrafo
 *  - + extra por longitud, calculado por grupo (párrafos agrupados = un bloque):
 *      base  = palabras totales de los párrafos ÷ preguntas de los párrafos
 *      extra = max(0, palabras del bloque − preguntas del bloque × base) ÷ base
 *    multiplicado por la intensidad elegida (0 = sin extra, 1 = normal, 1.5 = más)
 *    y limitado a MAX_EXTRA_UNITS × intensidad. El extra de un grupo se reparte
 *    entre sus párrafos en proporción a sus palabras.
 */
export function buildCommentUnits(analysis, intensity = 1) {
  const paragraphs = analysis?.paragraphs || [];
  const n = paragraphs.length;
  const questions = paragraphs.map(countQuestions);
  const extra = new Array(n).fill(0);

  const totalWords = paragraphs.reduce((s, p) => s + (p.word_count || 0), 0);
  const totalQ = questions.reduce((s, q) => s + q, 0);
  const base = totalQ > 0 ? totalWords / totalQ : 0;

  if (intensity > 0 && base > 0) {
    const seen = new Set();
    paragraphs.forEach((p, i) => {
      if (seen.has(i)) return;
      const nums = (p.grouped_with && p.grouped_with.length > 1) ? p.grouped_with : [p.number];
      const idx = nums.map(num => paragraphs.findIndex(x => x.number === num)).filter(k => k >= 0);
      if (!idx.includes(i)) idx.push(i);
      idx.forEach(k => seen.add(k));

      const words = idx.reduce((s, k) => s + (paragraphs[k].word_count || 0), 0);
      const q = idx.reduce((s, k) => s + questions[k], 0);
      let units = Math.max(0, words - q * base) / base * intensity;
      units = Math.min(units, MAX_EXTRA_UNITS * intensity);
      idx.forEach(k => {
        extra[k] = words > 0 ? units * (paragraphs[k].word_count || 0) / words : units / idx.length;
      });
    });
  }

  return {
    base,
    questions,
    extra,
    units: questions.map((q, i) => q + extra[i]),
  };
}

/** Plan estático: cómo se reparte la duración total antes de empezar. */
export function buildStaticPlan({ analysis, totalSeconds, introSeconds, conclusionSeconds, answerTime, longParagraphWeight = 1 }) {
  if (!analysis) return null;

  const paragraphs = analysis.paragraphs || [];
  const finals = analysis.final_questions?.length || 0;
  const cu = buildCommentUnits(analysis, longParagraphWeight);
  const totalReading = paragraphs.reduce((sum, p) => sum + readingOf(p), 0);
  const paragraphQuestions = cu.questions.reduce((s, q) => s + q, 0);
  const totalQuestions = paragraphQuestions + finals;
  const totalExtraUnits = cu.extra.reduce((s, e) => s + e, 0);
  const totalUnits = totalQuestions + totalExtraUnits;

  // Tiempo "natural": lectura + respuestas al tiempo configurado + intro + conclusión
  const naturalTotal = totalReading + totalUnits * answerTime + introSeconds + conclusionSeconds;

  // Tiempo disponible para comentarios dentro de la duración elegida
  const commentBudget = Math.max(0, totalSeconds - introSeconds - conclusionSeconds - totalReading);
  // Tiempo de un turno de comentario (= tiempo por pregunta)
  const perQuestion = totalUnits > 0 ? commentBudget / totalUnits : answerTime;

  const unitsOf = (p) => {
    const i = paragraphs.indexOf(p);
    return i >= 0 ? cu.units[i] : countQuestions(p);
  };
  const paragraphDuration = (p) => readingOf(p) + unitsOf(p) * perQuestion;

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
    totalExtraUnits,
    totalUnits,
    commentUnits: cu,
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
  longParagraphWeight = 1,
  now = new Date(),
}) {
  if (!analysis) return null;
  const paragraphs = analysis.paragraphs || [];
  const finals = analysis.final_questions?.length || 0;
  const cu = buildCommentUnits(analysis, longParagraphWeight);

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
  let pendingUnits = pendingFinals;
  for (let i = fromIndex; i < paragraphs.length; i++) pendingUnits += cu.units[i];
  const pendingQuestions = pending.reduce((sum, p) => sum + countQuestions(p), 0) + pendingFinals;

  const commentTime = Math.max(0, budget - pendingReading);
  // Tiempo de un turno de comentario (= tiempo por pregunta)
  const perQuestion = pendingUnits > 0 ? commentTime / pendingUnits : 0;

  // Desplazamientos (en segundos desde anchor) de cada párrafo pendiente
  const offsets = {};
  let t = 0;
  for (let i = fromIndex; i < paragraphs.length; i++) {
    offsets[i] = t;
    t += readingOf(paragraphs[i]) + cu.units[i] * perQuestion;
  }
  const reviewStart = new Date(anchor.getTime() + t * 1000);
  const reviewEnd = new Date(reviewStart.getTime() + pendingFinals * perQuestion * 1000);

  return {
    perQuestion,
    anchor,
    fromIndex,
    pendingReading,
    pendingQuestions,
    pendingUnits,
    readingFitsInTime: budget - pendingReading >= 0,
    paragraphStart: (i) => (offsets[i] === undefined ? null : new Date(anchor.getTime() + offsets[i] * 1000)),
    paragraphDuration: (p) => {
      const i = paragraphs.indexOf(p);
      return readingOf(p) + (i >= 0 ? cu.units[i] : countQuestions(p)) * perQuestion;
    },
    extraCommentSeconds: (i) => (cu.extra[i] || 0) * perQuestion,
    reviewStart,
    reviewEnd,
    secondsUntilReview: (reviewStart.getTime() - now.getTime()) / 1000,
  };
}
