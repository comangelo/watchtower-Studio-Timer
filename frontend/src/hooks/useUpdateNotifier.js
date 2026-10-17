import { useEffect } from 'react';
import { toast } from 'sonner';

/**
 * Avisa cuando hay una versión nueva de la app publicada.
 * (Idea recuperada de app-wt-time-controler, marzo 2026.)
 *
 * - El service worker nuevo queda en espera; se muestra un aviso con "Actualizar".
 * - Solo al pulsarlo se activa y se recarga la página, para no interrumpir un estudio.
 * - Comprueba si hay actualizaciones al volver a abrir la app y cada 30 minutos.
 */
export function useUpdateNotifier() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return undefined;

    let userAccepted = false;
    let shown = false;
    let interval;

    const offerUpdate = (worker) => {
      if (!worker || shown) return;
      shown = true;
      toast.info('Hay una nueva versión de la app disponible.', {
        description: 'Se aplicará al pulsar «Actualizar» (si estás en un estudio, puedes hacerlo al terminar).',
        duration: Infinity,
        action: {
          label: 'Actualizar',
          onClick: () => {
            userAccepted = true;
            worker.postMessage({ type: 'SKIP_WAITING' });
          },
        },
      });
    };

    const onControllerChange = () => {
      if (userAccepted) window.location.reload();
    };
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);

    const watch = (registration) => {
      if (!registration) return;
      if (registration.waiting && navigator.serviceWorker.controller) offerUpdate(registration.waiting);
      registration.addEventListener('updatefound', () => {
        const installing = registration.installing;
        if (!installing) return;
        installing.addEventListener('statechange', () => {
          if (installing.state === 'installed' && navigator.serviceWorker.controller) {
            offerUpdate(registration.waiting || installing);
          }
        });
      });
      const check = () => registration.update().catch(() => {});
      const onVisible = () => { if (document.visibilityState === 'visible') check(); };
      document.addEventListener('visibilitychange', onVisible);
      interval = setInterval(check, 30 * 60 * 1000);
      watch.cleanup = () => document.removeEventListener('visibilitychange', onVisible);
    };

    navigator.serviceWorker.getRegistration().then((reg) => {
      if (reg) watch(reg);
      else navigator.serviceWorker.ready.then(watch).catch(() => {});
    }).catch(() => {});

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
      if (interval) clearInterval(interval);
      if (watch.cleanup) watch.cleanup();
    };
  }, []);
}
