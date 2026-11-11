import { ArrowRight, Hand, Maximize, Play } from "lucide-react";
import { t } from "@/i18n";

/**
 * Barra fija abajo en el móvil (pantalla principal).
 * - Antes de empezar: «Iniciar estudio» grande + pantalla completa.
 * - Durante el estudio: botón de comentarios y botón «Siguiente · Párrafo N»,
 *   iguales que en el modo presentación.
 */
export function StudyActionBar({
  nextStep,
  onNext,
  canComment = false,
  onAddComment,
  totalComments = 0,
  onPresentation,
  darkMode = false,
  urgency = "none", // "none" | "over" | "critical"
}) {
  if (!nextStep) return null;
  const isStart = nextStep.action === "start";
  const urgent = !isStart && urgency !== "none";
  const critical = !isStart && urgency === "critical";
  const kicker = critical ? t("nextNow") : nextStep.kicker;

  return (
    <div
      className={`lg:hidden fixed inset-x-0 bottom-0 z-40 border-t px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-8px_30px_rgba(0,0,0,0.12)] ${
        darkMode ? "bg-zinc-900/95 border-zinc-700" : "bg-white/95 border-slate-200"
      } backdrop-blur`}
      data-testid="study-action-bar"
    >
      <div className="max-w-xl mx-auto flex flex-col gap-2">
        {canComment && (
          <button
            onClick={onAddComment}
            className="w-full rounded-2xl min-h-[56px] px-5 flex items-center justify-between gap-3 bg-orange-500 hover:bg-orange-400 text-white shadow-lg active:scale-95 transition-transform"
            aria-label={t("markComment")}
            data-testid="bar-add-comment"
          >
            <span className="flex items-center gap-3">
              <Hand className="w-7 h-7 shrink-0" strokeWidth={2.2} />
              <span className="text-lg font-black uppercase tracking-wide">{t("comment")}</span>
            </span>
            <span className="text-right leading-none">
              <span className="block text-2xl font-black tabular-nums">{totalComments}</span>
              <span className="block text-[10px] font-semibold opacity-85">{t("inTotal")}</span>
            </span>
          </button>
        )}
        <div className="flex gap-2">
          <button
            onClick={onNext}
            className={`flex-1 min-w-0 rounded-2xl min-h-[64px] px-5 flex items-center justify-between gap-3 ${urgent ? "bg-red-600 hover:bg-red-500" : "bg-blue-600 hover:bg-blue-500"} ${critical ? "next-urgent" : ""} text-white shadow-lg active:scale-95 transition-[transform,background-color] duration-500 text-left`}
            data-testid="bar-next"
            data-urgency={urgent ? urgency : "none"}
          >
            <span className="min-w-0 flex items-center gap-3">
              {isStart && <Play className="w-7 h-7 shrink-0" fill="white" />}
              <span className="min-w-0">
                {kicker && (
                  <span className={`block text-[11px] font-bold uppercase tracking-[0.2em] ${urgent ? "text-red-100" : "text-blue-100"}`} data-testid="bar-next-kicker">{kicker}</span>
                )}
                <span className={`block ${nextStep.main.length > 14 ? "text-xl" : "text-2xl"} font-black uppercase leading-tight`} data-testid="bar-next-label">
                  {nextStep.main}
                </span>
              </span>
            </span>
            {!isStart && <ArrowRight className="w-8 h-8 shrink-0" strokeWidth={3} />}
          </button>
          {onPresentation && (
            <button
              onClick={onPresentation}
              className={`shrink-0 w-16 rounded-2xl flex items-center justify-center shadow-lg active:scale-95 transition-transform ${
                darkMode ? "bg-zinc-700 text-white" : "bg-zinc-900 text-white"
              }`}
              aria-label={t("presentationMode")}
              title={t("presentationMode")}
              data-testid="bar-presentation"
            >
              <Maximize className="w-7 h-7" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
