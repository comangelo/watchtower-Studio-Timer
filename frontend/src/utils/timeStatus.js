/**
 * Color del tramo en curso (igual que en el modo presentación):
 *  - "ok"    verde: dentro de su tiempo
 *  - "grace" amarillo: prórroga, hasta un 30 % más
 *  - "over"  rojo: pasada la prórroga
 * En los últimos 5 minutos del estudio no hay prórroga (verde → rojo).
 */
export const GRACE_RATIO = 1.3;

export function timeStatus(elapsed, estimated, finalStretch = false) {
  if (!(elapsed > estimated)) return "ok";
  if (!finalStretch && estimated > 0 && elapsed <= estimated * GRACE_RATIO) return "grace";
  return "over";
}
