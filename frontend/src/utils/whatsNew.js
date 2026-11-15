/**
 * «Novedades» de cada versión publicada.
 *
 * Al publicar una versión con cambios visibles, añade una entrada AL PRINCIPIO de
 * RELEASES (id = fecha de publicación, AAAA-MM-DD) con 2–4 frases cortas por idioma.
 * La app la enseña una sola vez, al abrirla después de actualizar. A quien la abre
 * por primera vez no se le enseña (no hay nada «nuevo» para él).
 */
export const RELEASES = [
  {
    id: "2026-11-15",
    items: {
      es: ["Hora de inicio de la reunión pública (Ajustes → Tiempo): el estudio termina a su hora aunque el discurso se alargue.", "El historial de estudios ahora está en una tarjeta verde de la pantalla de inicio.", "Barras de tiempo más claras, con un bloque para cada parte."],
      ca: ["Hora d’inici de la reunió pública (Configuració → Temps): l’estudi acaba a l’hora encara que el discurs s’allargui.", "L’historial d’estudis ara és en una targeta verda de la pantalla d’inici.", "Barres de temps més clares, amb un bloc per a cada part."],
      eu: ["Bilera publikoaren hasiera-ordua (Ezarpenak → Denbora): azterketa bere orduan amaitzen da hitzaldia luzatu arren.", "Azterketen historia hasierako pantailako txartel berde batean dago orain.", "Denbora-barra argiagoak, zati bakoitzerako bloke batekin."],
      gl: ["Hora de inicio da reunión pública (Axustes → Tempo): o estudo remata á súa hora aínda que o discurso se alongue.", "O historial de estudos agora está nunha tarxeta verde da pantalla de inicio.", "Barras de tempo máis claras, cun bloque para cada parte."],
      en: ["Public meeting start time (Settings → Time): the study ends on time even if the talk runs over.", "Study history is now a green card on the home screen.", "Clearer time bars, with one block for each part."],
      de: ["Beginn der öffentlichen Zusammenkunft (Einstellungen → Zeit): Das Studium endet pünktlich, auch wenn der Vortrag überzieht.", "Der Verlauf der Studien ist jetzt eine grüne Karte auf dem Startbildschirm.", "Übersichtlichere Zeitbalken mit einem Block für jeden Teil."],
      it: ["Ora di inizio dell’adunanza pubblica (Impostazioni → Tempo): lo studio finisce in orario anche se il discorso si allunga.", "La cronologia degli studi ora è una scheda verde nella schermata iniziale.", "Barre del tempo più chiare, con un blocco per ogni parte."],
      fr: ["Heure de début de la réunion publique (Réglages → Temps) : l’étude se termine à l’heure même si le discours déborde.", "L’historique des études est maintenant une carte verte sur l’écran d’accueil.", "Barres de temps plus claires, avec un bloc pour chaque partie."],
      pt: ["Horário de início da reunião pública (Configurações → Tempo): o estudo termina no horário mesmo que o discurso passe do tempo.", "O histórico de estudos agora é um cartão verde na tela inicial.", "Barras de tempo mais claras, com um bloco para cada parte."],
      pl: ["Godzina rozpoczęcia zebrania publicznego (Ustawienia → Czas): studium kończy się o czasie, nawet jeśli wykład się przedłuży.", "Historia studiów jest teraz zieloną kartą na ekranie startowym.", "Czytelniejsze paski czasu, z osobnym blokiem dla każdej części."],
      nl: ["Begintijd van de openbare vergadering (Instellingen → Tijd): de studie eindigt op tijd, ook als de lezing uitloopt.", "De geschiedenis van studies is nu een groene kaart op het startscherm.", "Duidelijkere tijdbalken, met een blok voor elk onderdeel."],
      ro: ["Ora de începere a întrunirii publice (Setări → Timp): studiul se încheie la timp chiar dacă discursul se prelungește.", "Istoricul studiilor este acum un card verde pe ecranul de start.", "Bare de timp mai clare, cu un bloc pentru fiecare parte."],
    },
  },
];

const SEEN_KEY = "pdfTimer_whatsNewSeen";

export const latestRelease = () => RELEASES[0];

export function releaseItems(release, lang) {
  return release.items[lang] || release.items.en || release.items.es;
}

/** true si hay que enseñar las novedades al abrir la app (llamar antes de que la app guarde nada). */
export function shouldShowWhatsNew() {
  try {
    const latest = latestRelease();
    if (!latest) return false;
    const seen = localStorage.getItem(SEEN_KEY);
    if (seen === latest.id) return false;
    if (seen === null) {
      // ¿Primera vez que se usa la app en este dispositivo? Entonces no hay nada «nuevo».
      const used = Object.keys(localStorage).some((k) => k.startsWith("pdfTimer_") && k !== "pdfTimer_language" && k !== SEEN_KEY);
      if (!used) { localStorage.setItem(SEEN_KEY, latest.id); return false; }
    }
    return true;
  } catch {
    return false;
  }
}

export function markWhatsNewSeen() {
  try { localStorage.setItem(SEEN_KEY, latestRelease().id); } catch { /* sin almacenamiento */ }
}
