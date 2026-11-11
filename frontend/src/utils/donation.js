/**
 * Donaciones voluntarias (Stripe, enlace de pago con importe libre).
 *
 * El botón solo se muestra en la web y en la versión instalada desde el navegador.
 * Dentro de la app de Google Play NO se muestra: las normas de Google Play exigen
 * su propio sistema de pagos para los pagos hechos dentro de la app.
 *
 * Mientras DONATION_URL esté vacío, el botón no aparece.
 */
export const DONATION_URL = 'https://buy.stripe.com/00w3co8x958ngB2beb00000';

const PLAY_PACKAGE = 'com.comangelo.temporizadorestudio';
const PLAY_FLAG = 'pdfTimer_playStoreApp';

/** true si la app se abrió desde la app de Google Play (Trusted Web Activity). */
export function isPlayStoreApp() {
  try {
    if (typeof document !== 'undefined' && document.referrer.startsWith(`android-app://${PLAY_PACKAGE}`)) {
      sessionStorage.setItem(PLAY_FLAG, '1');
      return true;
    }
    return sessionStorage.getItem(PLAY_FLAG) === '1';
  } catch {
    return false;
  }
}

export function donationAvailable() {
  return !!DONATION_URL && !isPlayStoreApp();
}

/** Enlace a la ficha de Google Play (con origen «web» para verlo en las estadísticas de Play Console). */
export function playStoreUrl(medium = 'banner') {
  const ref = encodeURIComponent(`utm_source=web&utm_medium=${medium}`);
  return `https://play.google.com/store/apps/details?id=${PLAY_PACKAGE}&referrer=${ref}`;
}

/** true en un móvil o tableta Android que usa la web (no la app de Google Play). */
export function suggestPlayStoreApp() {
  try {
    return /Android/i.test(navigator.userAgent) && !isPlayStoreApp();
  } catch {
    return false;
  }
}
