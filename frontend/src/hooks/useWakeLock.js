import { useEffect } from "react";

/**
 * Mantiene la pantalla encendida mientras `active` sea true (estudio iniciado).
 * - Usa la Screen Wake Lock API (Chrome/Android, Safari 16.4+, la app de Google Play).
 * - El sistema suelta el bloqueo al salir de la app; se vuelve a pedir al regresar.
 * - Si el navegador no lo admite, no hace nada.
 */
export function useWakeLock(active) {
  useEffect(() => {
    if (!active || typeof navigator === "undefined" || !("wakeLock" in navigator)) return undefined;
    let lock = null;
    let cancelled = false;

    const request = async () => {
      if (cancelled || document.visibilityState !== "visible" || (lock && !lock.released)) return;
      try {
        lock = await navigator.wakeLock.request("screen");
        if (cancelled) lock.release().catch(() => {});
      } catch {
        /* sin permiso o batería baja: se intenta de nuevo al volver a la app */
      }
    };

    const onVisible = () => { if (document.visibilityState === "visible") request(); };
    request();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      if (lock && !lock.released) lock.release().catch(() => {});
    };
  }, [active]);
}
