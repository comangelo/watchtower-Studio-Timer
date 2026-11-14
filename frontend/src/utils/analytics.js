/**
 * Estadísticas de visitas anónimas (Vercel Web Analytics).
 *
 * - Sin cookies y sin datos que identifiquen a la persona: Vercel solo cuenta
 *   páginas vistas, país, tipo de dispositivo, navegador y web de procedencia.
 * - Solo en la web publicada en Vercel. Dentro de la app de Google Play no se carga
 *   (sus instalaciones y usuarios ya se ven en Play Console, y así la ficha de
 *   Google Play sigue sin declarar recogida de datos).
 * - El script lo sirve Vercel en /_vercel/insights/script.js y sigue solo los
 *   cambios de página de la aplicación.
 */
import { isPlayStoreApp } from "@/utils/donation";

export function startAnalytics() {
  try {
    if (!/\.vercel\.app$/.test(window.location.hostname)) return;
    if (isPlayStoreApp()) return;
    window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };
    const s = document.createElement("script");
    s.defer = true;
    s.src = "/_vercel/insights/script.js";
    document.head.appendChild(s);
  } catch {
    /* sin estadísticas */
  }
}
