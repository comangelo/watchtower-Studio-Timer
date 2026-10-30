/**
 * Textos de la app por idioma.
 *
 * Primer paso de la traducción: el nombre y los textos generales ya salen de aquí.
 * Para añadir un idioma se crea su diccionario (en, de, fr, pt, it…) con las mismas
 * claves; si falta una clave, se usa el español.
 */
const es = {
  appName: 'Temporizador de Estudio',
  appNameUpper: 'TEMPORIZADOR DE ESTUDIO',
  appTagline: 'Para conducir el estudio a tiempo',
  uploadSubtitle: 'Reparte el tiempo del estudio entre párrafos y preguntas',
  weeklySource: 'Artículo de estudio · jw.org',
  unofficialNotice: 'Aplicación no oficial, sin relación con jw.org',
  privacyPolicy: 'Política de privacidad',
  donate: 'Apoya este proyecto',
  donateHint: 'La app es gratuita. Si te resulta útil, puedes hacer una donación voluntaria.',
};

const dictionaries = { es };

export function currentLanguage() {
  try {
    const saved = localStorage.getItem('pdfTimer_language');
    if (saved && dictionaries[saved]) return saved;
  } catch { /* sin almacenamiento */ }
  return 'es';
}

export function t(key) {
  const lang = currentLanguage();
  return dictionaries[lang]?.[key] ?? es[key] ?? key;
}
