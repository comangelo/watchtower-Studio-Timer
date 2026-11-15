/**
 * Hora de inicio de la reunión del fin de semana.
 *
 * Reunión de 1 h 45 min: canción, oración y presentación (5 min), discurso público
 * (30 min), presidente, entrada del conductor y canción (5 min) y luego el estudio de
 * La Atalaya. Por eso el estudio empieza 40 min después del inicio y debe terminar a
 * «inicio + 40 min + duración del estudio» (60 min normal, 30 min en la visita del
 * superintendente de circuito, que después tiene su discurso de 30 min).
 *
 * Si el discurso se alarga, el estudio se acorta solo para acabar a su hora.
 */
export const MEETING_TO_STUDY_MIN = 40;

/** Plan de hoy según la hora de inicio ("HH:MM"), o null si no hay hora o no estamos cerca de la reunión. */
export function meetingPlan(meetingStart, studyMinutes, now = new Date()) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(meetingStart || "");
  if (!m) return null;
  const start = new Date(now);
  start.setHours(+m[1], +m[2], 0, 0);
  const studyStart = new Date(start.getTime() + MEETING_TO_STUDY_MIN * 60000);
  const end = new Date(studyStart.getTime() + studyMinutes * 60000);
  // Solo se aplica desde 1 h antes de la reunión hasta la hora de fin del estudio;
  // fuera de ese rango (p. ej. practicando otro día) el estudio dura lo configurado.
  if (now.getTime() < start.getTime() - 60 * 60000 || now.getTime() >= end.getTime()) return null;
  return { start, studyStart, end };
}
