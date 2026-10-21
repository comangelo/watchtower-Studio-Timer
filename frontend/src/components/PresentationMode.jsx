import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Play,
  Pause,
  X,
  Mic,
  BookOpen,
  HelpCircle,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  Hand,
  Image,
  MessageCircleQuestion,
  AlertCircle,
  MessagesSquare,
  Star,
} from "lucide-react";
import { formatTime, formatClockTime } from "@/utils/timeFormatters";
import { isRealQuestion } from "@/utils/timePlan";

/**
 * Modo presentación (diseño recuperado de app-wt-time-controler, marzo 2026),
 * conectado al cálculo de tiempos actual.
 *
 * - Recuadro de color según el tiempo del tramo actual (párrafo, pregunta de repaso…):
 *     verde  = dentro del tiempo previsto
 *     naranja = prórroga (hasta un 30 % más)
 *     rojo   = tiempo excedido
 * - Aviso cuando faltan 5 minutos para la hora de fin y cuenta del tiempo excedido.
 * - Botón inteligente para pasar al siguiente párrafo / repaso / conclusión / fin.
 * - Botón para marcar cada comentario (participaciones).
 *
 * Todo el control del estudio vive en HomePage; este componente solo lo muestra.
 */

export const PHASES = {
  INITIAL: "initial",
  INTRO: "intro",
  PARAGRAPHS: "paragraphs",
  REVIEW: "review",
  CONCLUSION: "conclusion",
  FINISHED: "finished",
};

const GRACE_RATIO = 1.3; // 30 % de prórroga

export default function PresentationMode({
  analysisResult,
  elapsedTime,
  remainingTime,
  isTimerRunning,
  onToggleTimer,
  onExit,
  phase = PHASES.INITIAL,
  currentParagraphGroup,
  groupedParagraphs = [],
  currentReviewQuestion = 0,
  phaseElapsedTime = 0,
  estimatedTime = 0,
  endTime,
  totalDurationSeconds = 3600,
  totalComments = 0,
  phaseComments = 0,
  onAddComment,
  fiveMinuteWarningEnabled = true,
  onStartStudy,
  onGoToFirstParagraph,
  onGoToNextGroup,
  onStartReview,
  onNextReviewQuestion,
  onStartClosingWords,
  onFinishStudy,
}) {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Salir con Esc (también cuando el navegador no está en pantalla completa)
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onExit?.(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onExit]);

  const finals = analysisResult?.final_questions || [];
  const totalParagraphs = analysisResult?.paragraphs?.length || 0;
  const studyStarted = phase !== PHASES.INITIAL;

  const progressPercentage = totalDurationSeconds > 0
    ? Math.min(100, (elapsedTime / totalDurationSeconds) * 100)
    : 0;

  // Aviso de los últimos 5 minutos y tiempo excedido
  const warning = useMemo(() => {
    if (!fiveMinuteWarningEnabled || !studyStarted || phase === PHASES.FINISHED) return null;
    if (remainingTime <= 300 && remainingTime > 0) {
      const m = Math.floor(remainingTime / 60);
      const s = remainingTime % 60;
      return { isOvertime: false, prefix: "EN", number: `${m}:${String(s).padStart(2, "0")}`, suffix: "DEBE CONCLUIR" };
    }
    if (remainingTime <= 0 && elapsedTime > 0) {
      const over = elapsedTime - totalDurationSeconds;
      if (over <= 0) return null;
      const m = Math.floor(over / 60);
      const s = over % 60;
      return { isOvertime: true, prefix: null, number: `${m}:${String(s).padStart(2, "0")}`, suffix: "MINUTOS EXCEDIDOS" };
    }
    return null;
  }, [remainingTime, elapsedTime, totalDurationSeconds, fiveMinuteWarningEnabled, studyStarted, phase]);

  // Título del tramo actual
  const phaseInfo = useMemo(() => {
    switch (phase) {
      case PHASES.INTRO:
        return { title: "Introducción", icon: Mic, subtitle: "Presentando el tema" };
      case PHASES.PARAGRAPHS: {
        if (!currentParagraphGroup) return { title: "Párrafos", icon: BookOpen, subtitle: "" };
        const nums = currentParagraphGroup.paragraphs.map((p) => p.number);
        return {
          title: nums.length > 1 ? `Párrafos ${nums.join(", ")}` : `Párrafo ${nums[0]}`,
          icon: BookOpen,
          subtitle: `de ${analysisResult?.total_paragraphs || totalParagraphs} párrafos`,
        };
      }
      case PHASES.REVIEW:
        return { title: `Pregunta de repaso ${currentReviewQuestion + 1}`, icon: HelpCircle, subtitle: `de ${finals.length} preguntas` };
      case PHASES.CONCLUSION:
        return { title: "Conclusión", icon: Sparkles, subtitle: "Resumen y aplicación" };
      case PHASES.FINISHED:
        return { title: "¡Estudio finalizado!", icon: CheckCircle2, subtitle: "Buen trabajo" };
      default:
        return { title: "Esperando para iniciar", icon: Play, subtitle: "Pulsa «Iniciar estudio»" };
    }
  }, [phase, currentParagraphGroup, currentReviewQuestion, analysisResult, totalParagraphs, finals.length]);

  // Color del recuadro según el tiempo del tramo
  const { colorClass, indicatorText } = useMemo(() => {
    if (phase === PHASES.FINISHED) return { colorClass: "bg-emerald-700", indicatorText: "FINALIZADO" };
    if (!studyStarted) return { colorClass: "bg-zinc-600", indicatorText: "LISTO" };
    if (!isTimerRunning) return { colorClass: "bg-zinc-600", indicatorText: "EN PAUSA" };
    if (!estimatedTime) return { colorClass: "bg-green-600", indicatorText: "EN TIEMPO" };
    const ratio = phaseElapsedTime / estimatedTime;
    if (ratio <= 1) return { colorClass: "bg-green-600", indicatorText: "EN TIEMPO" };
    if (ratio <= GRACE_RATIO) return { colorClass: "bg-orange-500", indicatorText: "TIEMPO DE PRÓRROGA" };
    return { colorClass: "bg-red-600", indicatorText: "TIEMPO EXCEDIDO" };
  }, [phase, studyStarted, isTimerRunning, estimatedTime, phaseElapsedTime]);

  // Etiquetas del párrafo actual (imagen, texto, nota)
  const badges = useMemo(() => {
    if (phase !== PHASES.PARAGRAPHS || !currentParagraphGroup) return {};
    const qs = currentParagraphGroup.paragraphs.flatMap((p) => p.questions || []);
    return {
      image: qs.some((q) => q.content_type === "image" || q.content_type === "both"),
      scripture: qs.some((q) => q.content_type === "scripture" || q.content_type === "both"),
      note: qs.some((q) => q.content_type === "note"),
      scriptureRefs: [...new Set(currentParagraphGroup.paragraphs.flatMap((p) => p.scripture_refs || []))],
      highlights: [...new Set(qs.flatMap((q) => q.highlight_contents || []))],
      questions: qs.filter(isRealQuestion).length,
    };
  }, [phase, currentParagraphGroup]);

  // Botón inteligente
  const lastIndexOfGroup = currentParagraphGroup
    ? currentParagraphGroup.indices[currentParagraphGroup.indices.length - 1]
    : -1;
  const isLastGroup = lastIndexOfGroup >= totalParagraphs - 1;

  const handleSmartButton = () => {
    switch (phase) {
      case PHASES.INITIAL: onStartStudy?.(); break;
      case PHASES.INTRO: onGoToFirstParagraph?.(); break;
      case PHASES.PARAGRAPHS:
        if (isLastGroup) {
          if (finals.length > 0) onStartReview?.();
          else onStartClosingWords?.();
        } else {
          onGoToNextGroup?.();
        }
        break;
      case PHASES.REVIEW:
        if (currentReviewQuestion >= finals.length - 1) onStartClosingWords?.();
        else onNextReviewQuestion?.();
        break;
      case PHASES.CONCLUSION: onFinishStudy?.(); break;
      default: break;
    }
  };

  const smartButtonText = (() => {
    switch (phase) {
      case PHASES.INITIAL: return "Iniciar estudio";
      case PHASES.INTRO: {
        const g = groupedParagraphs[0];
        if (g && g.paragraphs.length > 1) return `Pasar a los párrafos ${g.paragraphs.map((p) => p.number).join(", ")}`;
        return `Pasar al párrafo ${g?.firstParagraph?.number || 1}`;
      }
      case PHASES.PARAGRAPHS: {
        if (isLastGroup) return finals.length > 0 ? "Pregunta de repaso 1" : "Ir a la conclusión";
        const next = groupedParagraphs.find((g) => g.indices.includes(lastIndexOfGroup + 1));
        if (!next) return "Siguiente párrafo";
        return next.paragraphs.length > 1
          ? `Siguientes párrafos ${next.paragraphs.map((p) => p.number).join(", ")}`
          : `Siguiente párrafo ${next.firstParagraph.number}`;
      }
      case PHASES.REVIEW:
        return currentReviewQuestion >= finals.length - 1 ? "Ir a la conclusión" : `Siguiente pregunta ${currentReviewQuestion + 2}`;
      case PHASES.CONCLUSION: return "Finalizar estudio";
      default: return null;
    }
  })();

  const canComment = phase === PHASES.PARAGRAPHS || phase === PHASES.REVIEW;
  const PhaseIcon = phaseInfo.icon;

  return (
    <div className="fixed inset-0 z-[9999] bg-zinc-800 text-white flex flex-col p-4 md:p-6 landscape:py-2 landscape:px-4" data-testid="presentation-mode">
      {/* Barra superior */}
      <div className="flex justify-between items-start">
        {studyStarted && phase !== PHASES.FINISHED ? (
          <Button
            onClick={onToggleTimer}
            variant="ghost"
            className="text-zinc-400 hover:text-white hover:bg-zinc-700 [&_svg]:size-7"
            aria-label={isTimerRunning ? "Pausar" : "Reanudar"}
            data-testid="presentation-toggle-timer"
          >
            {isTimerRunning ? <Pause /> : <Play />}
          </Button>
        ) : <span />}
        <Button onClick={onExit} variant="ghost" className="text-zinc-400 hover:text-white hover:bg-zinc-700 [&_svg]:size-8" aria-label="Salir" data-testid="presentation-exit">
          <X />
        </Button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center overflow-y-auto py-2">
        {/* Horas y tiempos */}
        <div className="grid grid-cols-2 gap-x-8 gap-y-2 mb-4">
          <div className="text-center">
            <p className="text-sm md:text-base font-semibold text-zinc-400">Hora actual</p>
            <p className="text-3xl md:text-5xl landscape:text-3xl font-bold text-white tabular-nums">{formatClockTime(currentTime)}</p>
          </div>
          <div className="text-center">
            <p className="text-sm md:text-base font-semibold text-cyan-400">Hora de fin</p>
            <p className="text-3xl md:text-5xl landscape:text-3xl font-bold text-cyan-400 tabular-nums">{endTime ? formatClockTime(endTime) : "--:--"}</p>
          </div>
          <div className="text-center">
            <p className="text-sm md:text-base font-semibold text-zinc-400">Transcurrido</p>
            <p className="text-3xl md:text-5xl landscape:text-3xl font-light text-green-400 tabular-nums">{formatTime(elapsedTime)}</p>
          </div>
          <div className="text-center">
            <p className="text-sm md:text-base font-semibold text-zinc-400">Restante</p>
            <p className="text-3xl md:text-5xl landscape:text-3xl font-light text-orange-400 tabular-nums">{formatTime(Math.max(0, remainingTime))}</p>
          </div>
        </div>

        {/* Progreso total */}
        <div className="w-full max-w-[17rem] mb-4">
          <div className="relative w-full bg-zinc-700/50 rounded-full h-5 overflow-hidden">
            <div className="bg-yellow-500 h-5 rounded-full transition-all duration-1000 ease-linear" style={{ width: `${progressPercentage}%` }} />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="font-bold text-white text-xs drop-shadow-[0_1px_1px_rgba(0,0,0,0.7)]">{Math.round(progressPercentage)}%</span>
            </div>
          </div>
        </div>

        {/* Participaciones */}
        {studyStarted && (
          <div className="text-center bg-gradient-to-br from-zinc-700 to-zinc-800 border border-zinc-600 rounded-2xl px-5 py-3 landscape:p-2 mb-4 shadow-lg" data-testid="presentation-comments">
            <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Participaciones</p>
            <p className="text-4xl md:text-5xl landscape:text-3xl font-black text-orange-500 tabular-nums">{totalComments}</p>
            {canComment && (
              <p className="text-[11px] text-zinc-400 mt-0.5 flex items-center justify-center gap-1">
                <MessagesSquare className="w-3 h-3" /> {phaseComments} en este {phase === PHASES.REVIEW ? "repaso" : "párrafo"}
              </p>
            )}
          </div>
        )}

        {/* Recuadro de color */}
        <div className={`w-full max-w-[17rem] rounded-2xl flex flex-col items-center justify-center transition-colors duration-500 py-8 px-6 landscape:py-3 landscape:px-2 shadow-2xl ${colorClass}`} data-testid="presentation-status-box">
          <p className="text-white text-lg md:text-2xl landscape:text-base font-bold tracking-widest text-center">{indicatorText}</p>
          <p className="text-white text-4xl md:text-6xl landscape:text-4xl font-light tabular-nums">{formatTime(phaseElapsedTime)}</p>
          {estimatedTime > 0 && (
            <p className="text-white/70 text-lg md:text-2xl landscape:text-base font-light tabular-nums">/ {formatTime(Math.round(estimatedTime))}</p>
          )}

          {warning && (
            <div className="mt-4 pt-4 border-t border-white/20 w-full text-center" data-testid="presentation-five-minute-warning">
              <div className={`flex items-center justify-center gap-2 animate-pulse ${warning.isOvertime ? "text-red-200" : "text-yellow-200"}`}>
                <AlertCircle className="w-5 h-5 shrink-0" />
                <div className="font-bold text-sm uppercase tracking-wider">
                  {warning.prefix && <span>{warning.prefix} </span>}
                  <span className="text-2xl text-white font-black mx-1 tabular-nums">{warning.number}</span>
                  <span> {warning.suffix}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Tramo actual */}
        <div className="text-center mt-4 landscape:mt-2">
          <p className="text-2xl md:text-3xl landscape:text-xl font-black uppercase tracking-wider flex items-center justify-center gap-2">
            <PhaseIcon className="w-6 h-6 text-zinc-400" />
            {phaseInfo.title}
          </p>
          {phaseInfo.subtitle && <p className="text-lg md:text-xl landscape:text-base text-zinc-400 mt-1">{phaseInfo.subtitle}</p>}

          {phase === PHASES.PARAGRAPHS && (
            <div className="flex flex-wrap items-center justify-center gap-2 mt-4 landscape:mt-2">
              {badges.image && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-900/70 text-purple-200 border border-purple-700">
                  <Image className="w-3.5 h-3.5" /> Contiene imagen
                </span>
              )}
              {badges.scripture && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-900/70 text-blue-200 border border-blue-700">
                  <BookOpen className="w-3.5 h-3.5 shrink-0" /> {badges.scriptureRefs?.length ? `Leer ${badges.scriptureRefs.join(" · ")}` : "Texto para leer"}
                </span>
              )}
              {badges.note && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-900/70 text-amber-200 border border-amber-700">
                  <MessageCircleQuestion className="w-3.5 h-3.5" /> Nota de estudio
                </span>
              )}
              {(badges.highlights || []).map((h, i) => (
                <span key={i} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-cyan-900/70 text-cyan-200 border border-cyan-700 max-w-[18rem]">
                  <Star className="w-3.5 h-3.5 shrink-0" /> <span className="truncate">{h}</span>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Botones */}
        <div className="flex flex-col items-center gap-6 mt-8 landscape:mt-3 landscape:gap-3">
          {canComment && (
            <Button
              onClick={onAddComment}
              className="bg-orange-500 hover:bg-orange-600 text-white rounded-full w-20 h-20 landscape:w-16 landscape:h-16 flex items-center justify-center shadow-lg transition-all active:scale-90 p-0 [&_svg]:size-10 landscape:[&_svg]:size-8"
              aria-label="Marcar un comentario"
              title="Marcar un comentario"
              data-testid="presentation-add-comment"
            >
              <Hand fill="white" />
            </Button>
          )}
          {smartButtonText && (
            <Button
              onClick={handleSmartButton}
              size="lg"
              className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-full px-5 py-3 landscape:py-2 text-sm font-bold tracking-wider uppercase h-auto transition-all active:scale-95 shadow-lg shadow-blue-500/30 flex items-center gap-2"
              data-testid="presentation-smart-button"
            >
              <span>{smartButtonText}</span>
              <ArrowRight className="w-4 h-4" strokeWidth={3} />
            </Button>
          )}
        </div>
      </div>

      <div className="flex-shrink-0 pt-2 h-8 flex items-center justify-center">
        {studyStarted && <span className="text-zinc-500 text-xs">Pulsa «Esc» para salir</span>}
      </div>
    </div>
  );
}
