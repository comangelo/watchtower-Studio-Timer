/**
 * Semana de la visita del superintendente de circuito.
 *
 * El estudio de La Atalaya se conduce en 30 minutos y NO se leen los párrafos.
 * Todo lo demás sigue igual: preguntas, textos bíblicos que se leen, imágenes,
 * notas, ideas importantes, comentarios extra, repaso, introducción y conclusión.
 *
 * En lugar de tocar cada cálculo, se crea una copia del análisis en la que la
 * "lectura" de cada párrafo solo incluye los 40 s de sus elementos extra
 * (imagen, texto, nota, idea importante). Así el plan, las tarjetas, el resumen
 * y el modo presentación funcionan igual que siempre.
 */
export const CIRCUIT_VISIT_MINUTES = 30;
const EXTRA_CONTENT_TIME = 40;

/** Segundos de elementos extra del párrafo (misma regla que el análisis del PDF). */
export function extraContentSeconds(paragraph) {
  let items = 0;
  for (const q of paragraph?.questions || []) {
    if (q.content_type === 'both') items += 2;
    else if (q.content_type === 'image' || q.content_type === 'scripture' || q.content_type === 'note') items += 1;
    items += (q.highlight_contents || []).length;
  }
  return items * EXTRA_CONTENT_TIME;
}

/** Copia del análisis sin la lectura de los párrafos. */
export function withoutParagraphReading(analysis) {
  if (!analysis) return analysis;
  let cumulative = 0;
  let totalReading = 0;
  const paragraphs = analysis.paragraphs.map((p) => {
    const reading = extraContentSeconds(p);
    const questionTime = Math.max(0, (p.total_time_seconds || 0) - (p.reading_time_seconds || 0));
    totalReading += reading;
    cumulative += reading + questionTime;
    return {
      ...p,
      reading_time_seconds: reading,
      total_time_seconds: reading + questionTime,
      cumulative_time_seconds: cumulative,
      skip_reading: true,
    };
  });
  return {
    ...analysis,
    paragraphs,
    total_reading_time_seconds: totalReading,
    total_time_seconds: CIRCUIT_VISIT_MINUTES * 60,
    final_questions_start_time: cumulative,
    circuit_visit: true,
  };
}
