import { Heart } from "lucide-react";
import { DONATION_URL, donationAvailable, isPlayStoreApp, playStoreUrl } from "@/utils/donation";
import { t } from "@/i18n";
import { manualUrl } from "@/utils/manual";

/**
 * Parte final de la pantalla de inicio.
 * - Selector de archivos oculto: lo abre el paso 2 de «Artículo de esta semana».
 *   (El recuadro grande para arrastrar se quitó; en el ordenador el PDF se puede
 *   soltar en cualquier parte de la pantalla, ver HomePage.)
 * - Donación (solo web) y pie con aviso legal, privacidad y manual.
 */
export function UploadZone({ onFileSelect, fileInputRef, darkMode = false }) {
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) onFileSelect(file);
    // Permite volver a elegir el mismo archivo (p. ej. la revista para otra semana)
    e.target.value = '';
  };

  return (
    <div className="max-w-2xl mx-auto">
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,application/pdf"
        onChange={handleFileChange}
        className="hidden"
        data-testid="file-input"
      />

      {/* Donación voluntaria (solo web; nunca dentro de la app de Google Play) */}
      {donationAvailable() && (
        <div className="mt-8 text-center">
          <a
            href={DONATION_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full border text-sm font-semibold transition-colors ${
              darkMode
                ? 'border-zinc-600 text-zinc-200 hover:border-brand-400 hover:text-brand-300'
                : 'border-slate-300 text-slate-700 hover:border-brand-400 hover:text-brand-600'
            }`}
            data-testid="donation-button"
          >
            <Heart className="w-4 h-4 text-brand-500" />
            {t('donate')}
          </a>
          <p className={`mt-2 text-xs ${darkMode ? 'text-zinc-500' : 'text-slate-500'}`}>{t('donateHint')}</p>
        </div>
      )}

      {/* Aviso legal y privacidad */}
      <p className={`mt-8 text-center text-xs leading-relaxed ${darkMode ? 'text-zinc-500' : 'text-slate-500'}`} data-testid="legal-footer">
        {t('unofficialNotice')} ·{' '}
        <a href="/privacidad" className="underline hover:text-brand-600" data-testid="privacy-link">{t('privacyPolicy')}</a>
        {' '}·{' '}
        <a href={manualUrl()} target="_blank" rel="noopener" className="underline hover:text-brand-600" data-testid="manual-link">{t('userManual')}</a>
        {' '}·{' '}
        <a href="/informe" target="_blank" rel="noopener" className="underline hover:text-brand-600" data-testid="history-link">{t('studyHistory')}</a>
        {!isPlayStoreApp() && !/iPhone|iPad|iPod/i.test(navigator.userAgent) && (
          <>
            {' '}·{' '}
            <a href={playStoreUrl('footer')} target="_blank" rel="noopener" className="underline hover:text-brand-600" data-testid="play-link">{t('playLink')}</a>
          </>
        )}
        {' '}· © safeSingleMark S.L.
      </p>
    </div>
  );
}
