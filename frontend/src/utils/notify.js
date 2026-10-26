/**
 * Avisos emergentes de la app.
 *
 * Durante el estudio no se muestran ventanas emergentes: tapaban botones de la
 * parte inferior de la pantalla. Los avisos de tiempo ya se dan con sonido,
 * vibración y en el Cronómetro General / modo presentación.
 *
 * Solo se muestran los mensajes que necesitan respuesta o explican un fallo:
 * errores (PDF no válido, error al exportar) y "Generando imagen/PDF…".
 * El aviso de nueva versión usa sonner directamente (tiene botón "Actualizar").
 */
import { toast as sonner } from "sonner";

const silent = () => undefined;

export const toast = Object.assign(silent, {
  success: silent,
  info: silent,
  warning: silent,
  message: silent,
  alert: silent, // avisos de tiempo durante el estudio
  error: (...args) => sonner.error(...args),
  loading: (...args) => sonner.loading(...args),
  dismiss: (...args) => sonner.dismiss(...args),
});
