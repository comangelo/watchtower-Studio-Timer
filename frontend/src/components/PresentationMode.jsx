import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { t } from "@/i18n";
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
  LayoutTemplate,
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
const FINAL_STRETCH_SECONDS = 300; // últimos 5 minutos: sin prórroga

// Diseños del modo presentación (el usuario elige; se guarda en el dispositivo)
export const LAYOUTS = [
  { id: "panel", name: "Panel ordenado", description: "Oscuro, con un recuadro de color grande" },
  { id: "semaforo", name: "Semáforo", description: "Toda la pantalla cambia de color" },
  { id: "classic", name: "Clásico", description: "El diseño de siempre" },
];
export const DEFAULT_LAYOUT = "panel";

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
  onOpenReport,
  layout: layoutProp = DEFAULT_LAYOUT,
  onLayoutChange,
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

  // Hora a la que debe terminar: la fijada al empezar (o la elegida a mano);
  // antes de empezar, la hora actual + la duración del estudio.
  const shownEndTime = endTime || new Date(currentTime.getTime() + (totalDurationSeconds || 0) * 1000);

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
      return { isOvertime: false, prefix: t("pmWarnPrefix"), number: `${m}:${String(s).padStart(2, "0")}`, suffix: t("pmWarnSuffix") };
    }
    if (remainingTime <= 0 && elapsedTime > 0) {
      const over = elapsedTime - totalDurationSeconds;
      if (over <= 0) return null;
      const m = Math.floor(over / 60);
      const s = over % 60;
      return { isOvertime: true, prefix: null, number: `${m}:${String(s).padStart(2, "0")}`, suffix: t("pmMinutesOver") };
    }
    return null;
  }, [remainingTime, elapsedTime, totalDurationSeconds, fiveMinuteWarningEnabled, studyStarted, phase]);

  // Título del tramo actual
  const phaseInfo = useMemo(() => {
    switch (phase) {
      case PHASES.INTRO:
        return { title: t("introduction"), icon: Mic, subtitle: t("pmIntroSub") };
      case PHASES.PARAGRAPHS: {
        if (!currentParagraphGroup) return { title: t("paragraphsTitle"), icon: BookOpen, subtitle: "" };
        const nums = currentParagraphGroup.paragraphs.map((p) => p.number);
        return {
          title: nums.length > 1 ? t("paragraphsN", { n: nums.join(", ") }) : t("paragraphN", { n: nums[0] }),
          icon: BookOpen,
          subtitle: t("pmOfParagraphs", { n: analysisResult?.total_paragraphs || totalParagraphs }) + (analysisResult?.circuit_visit ? ` · ${t("pmNoReading")}` : ""),
        };
      }
      case PHASES.REVIEW:
        return { title: t("reviewQuestionN", { n: currentReviewQuestion + 1 }), icon: HelpCircle, subtitle: t("pmOfQuestions", { n: finals.length }) };
      case PHASES.CONCLUSION:
        return { title: t("conclusion"), icon: Sparkles, subtitle: t("pmConclusionSub") };
      case PHASES.FINISHED:
        return { title: t("studyFinished"), icon: CheckCircle2, subtitle: t("pmWellDone") };
      default:
        return { title: t("pmWaiting"), icon: Play, subtitle: t("pmPressStart") };
    }
  }, [phase, currentParagraphGroup, currentReviewQuestion, analysisResult, totalParagraphs, finals.length]);

  // Color del recuadro según el tiempo del tramo
  const { colorClass, indicatorText } = useMemo(() => {
    if (phase === PHASES.FINISHED) return { colorClass: "bg-emerald-700 text-white", indicatorText: t("pmFinished") };
    if (!studyStarted) return { colorClass: "bg-zinc-600 text-white", indicatorText: t("pmReady") };
    if (!isTimerRunning) return { colorClass: "bg-zinc-600 text-white", indicatorText: t("pmPaused") };
    // La conclusión tiene siempre su prórroga, aunque sea en el tramo final
    if (phase === PHASES.CONCLUSION && estimatedTime) {
      const r = phaseElapsedTime / estimatedTime;
      if (r <= 1) return { colorClass: "bg-green-600 text-white", indicatorText: t("pmOnTime") };
      if (r <= GRACE_RATIO) return { colorClass: "bg-yellow-400 text-zinc-900", indicatorText: t("pmGrace") };
      return { colorClass: "bg-red-600 text-white", indicatorText: t("pmOver") };
    }
    // Pasada la hora de fin del estudio: siempre rojo
    if (remainingTime <= 0 && elapsedTime > 0) return { colorClass: "bg-red-600 text-white", indicatorText: t("pmOver") };
    // Últimos 5 minutos: misma regla que en los párrafos pero SIN prórroga
    // (verde mientras el tramo va en su tiempo; al pasarse, rojo directamente)
    const finalStretch = remainingTime <= FINAL_STRETCH_SECONDS;
    if (!estimatedTime) return { colorClass: "bg-green-600 text-white", indicatorText: t("pmOnTime") };
    const ratio = phaseElapsedTime / estimatedTime;
    if (ratio <= 1) return { colorClass: "bg-green-600 text-white", indicatorText: t("pmOnTime") };
    if (!finalStretch && ratio <= GRACE_RATIO) return { colorClass: "bg-yellow-400 text-zinc-900", indicatorText: t("pmGrace") };
    return { colorClass: "bg-red-600 text-white", indicatorText: t("pmOver") };
  }, [phase, studyStarted, isTimerRunning, estimatedTime, phaseElapsedTime, remainingTime, elapsedTime]);

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
      case PHASES.FINISHED: onOpenReport?.(); break;
      default: break;
    }
  };

  // Qué viene después: lo más visible del botón para avanzar
  const groupLabel = (g) => (g && g.paragraphs.length > 1
    ? t("paragraphsN", { n: g.paragraphs.map((p) => p.number).join(", ") })
    : t("paragraphN", { n: g?.firstParagraph?.number || 1 }));

  const nextInfo = (() => {
    switch (phase) {
      case PHASES.INITIAL: return { kicker: null, main: t("startStudy") };
      case PHASES.INTRO: return { kicker: t("next"), main: groupLabel(groupedParagraphs[0]) };
      case PHASES.PARAGRAPHS: {
        if (isLastGroup) return finals.length > 0 ? { kicker: t("next"), main: t("reviewN", { n: 1 }) } : { kicker: t("next"), main: t("conclusion") };
        const next = groupedParagraphs.find((g) => g.indices.includes(lastIndexOfGroup + 1));
        return { kicker: t("next"), main: next ? groupLabel(next) : t("paragraph") };
      }
      case PHASES.REVIEW:
        return currentReviewQuestion >= finals.length - 1
          ? { kicker: t("next"), main: t("conclusion") }
          : { kicker: t("next"), main: t("reviewN", { n: currentReviewQuestion + 2 }) };
      case PHASES.CONCLUSION: return { kicker: null, main: t("finishStudy") };
      case PHASES.FINISHED: return onOpenReport ? { kicker: null, main: t("viewReport") } : null;
      default: return null;
    }
  })();

  const canComment = phase === PHASES.PARAGRAPHS || phase === PHASES.REVIEW;
  const PhaseIcon = phaseInfo.icon;
  const layout = LAYOUTS.some((l) => l.id === layoutProp) ? layoutProp : DEFAULT_LAYOUT;
  const isSemaforo = layout === "semaforo";
  // "Pulsa Esc" solo tiene sentido con teclado (ordenador)
  const hasKeyboard = typeof window !== "undefined" && window.matchMedia?.("(pointer: fine)")?.matches;
  const [showLayoutMenu, setShowLayoutMenu] = useState(false);
  // Horizontal (móvil girado, tablet u ordenador): dos columnas en «Panel» y «Semáforo»
  const [isLandscape, setIsLandscape] = useState(
    () => typeof window !== "undefined" && !!window.matchMedia?.("(orientation: landscape)")?.matches
  );
  useEffect(() => {
    const mq = window.matchMedia?.("(orientation: landscape)");
    if (!mq) return undefined;
    const onChange = () => setIsLandscape(mq.matches);
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);

  /* ---------------- Piezas comunes ---------------- */

  const iconBtn = isSemaforo
    ? "text-white bg-black/25 hover:bg-black/40"
    : "text-zinc-400 hover:text-white hover:bg-zinc-700";

  const topBar = (
    <div className="relative flex justify-between items-center gap-2 shrink-0">
      <div className="flex items-center">
        {studyStarted && phase !== PHASES.FINISHED ? (
          <Button onClick={onToggleTimer} variant="ghost" className={`${iconBtn} [&_svg]:size-7`}
            aria-label={isTimerRunning ? t("pause") : t("resume")} data-testid="presentation-toggle-timer">
            {isTimerRunning ? <Pause /> : <Play />}
          </Button>
        ) : <span className="w-10" />}
      </div>
      <div className="flex-1 min-w-0 text-center">
        {analysisResult?.circuit_visit ? (
          <span className="inline-block px-3 py-1 rounded-full bg-indigo-600 text-white text-[11px] md:text-sm font-bold tracking-wide leading-tight shadow"
            data-testid="presentation-circuit-visit">
            {t("pmCircuitBadge", { n: Math.round((totalDurationSeconds || 1800) / 60) })}
          </span>
        ) : null}
      </div>
      <div className="flex items-center">
        <Button onClick={() => setShowLayoutMenu((v) => !v)} variant="ghost" className={`${iconBtn} [&_svg]:size-6`}
          aria-label={t("changeLayout")} title={t("changeLayout")} data-testid="presentation-layout-button">
          <LayoutTemplate />
        </Button>
        <Button onClick={onExit} variant="ghost" className={`${iconBtn} [&_svg]:size-8`} aria-label={t("exit")} data-testid="presentation-exit">
          <X />
        </Button>
      </div>
      {showLayoutMenu && (
        <div className="absolute right-0 top-12 z-30 bg-zinc-900 border border-zinc-700 rounded-2xl p-2 shadow-2xl w-60" data-testid="presentation-layout-menu">
          <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider px-2 pt-1 pb-2">{t("layout")}</p>
          {LAYOUTS.map((l) => (
            <button key={l.id} onClick={() => { onLayoutChange?.(l.id); setShowLayoutMenu(false); }}
              className={`w-full text-left px-3 py-2.5 rounded-xl mb-1 ${layout === l.id ? "bg-orange-500 text-white" : "text-zinc-200 hover:bg-zinc-800"}`}
              data-testid={`presentation-layout-${l.id}`}>
              <span className="block text-sm font-bold">{t(`layout_${l.id}`)}</span>
              <span className={`block text-xs ${layout === l.id ? "text-orange-100" : "text-zinc-400"}`}>{t(`layout_${l.id}_desc`)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );

  const timesRow = (compact = false) => {
    const lbl = `font-semibold ${compact ? "text-[11px]" : "text-sm md:text-base landscape:text-xs"} ${isSemaforo ? "text-white/80" : "text-zinc-400"}`;
    const val = `${compact ? "text-2xl md:text-3xl" : "text-3xl md:text-5xl landscape:text-3xl"} tabular-nums`;
    return (
      <div className={`grid grid-cols-3 gap-x-3 sm:gap-x-8 text-center w-full max-w-md mx-auto ${isSemaforo ? "bg-black/40 rounded-2xl py-2 text-white" : ""}`}>
        <div>
          <p className={lbl}>{t("currentTime")}</p>
          <p className={`${val} font-bold text-white`}>{formatClockTime(currentTime)}</p>
        </div>
        <div>
          <p className={lbl}>{t("ends")}</p>
          <p className={`${val} font-bold ${isSemaforo ? "text-yellow-200" : "text-yellow-400"}`} data-testid="presentation-end-time">{formatClockTime(shownEndTime)}</p>
        </div>
        <div>
          <p className={lbl}>{t("remaining")}</p>
          <p className={`${val} ${isSemaforo ? "font-bold text-white" : "font-light text-orange-400"}`} data-testid="presentation-remaining">{formatTime(Math.max(0, remainingTime))}</p>
        </div>
      </div>
    );
  };

  const progressBar = (thin = false) => (
    <div className={`w-full ${thin ? "max-w-md" : "max-w-[17rem]"} mx-auto`}>
      <div className={`relative w-full ${isSemaforo ? "bg-black/25" : "bg-zinc-700/50"} rounded-full ${thin ? "h-2" : "h-5"} overflow-hidden`}>
        <div className={`${isSemaforo ? "bg-white" : "bg-yellow-500"} h-full rounded-full transition-all duration-1000 ease-linear`} style={{ width: `${progressPercentage}%` }} />
        {!thin && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-bold text-white text-xs drop-shadow-[0_1px_1px_rgba(0,0,0,0.7)]">{Math.round(progressPercentage)}%</span>
          </div>
        )}
      </div>
    </div>
  );

  const badgeRow = phase === PHASES.PARAGRAPHS && (badges.image || badges.scripture || badges.note || badges.highlights?.length) ? (
    <div className="flex flex-wrap items-center justify-center gap-2 mt-3">
      {badges.scripture && (
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold bg-blue-950/80 text-blue-100 border border-blue-500">
          <BookOpen className="w-4 h-4 shrink-0" /> {badges.scriptureRefs?.length ? t("readRefs", { refs: badges.scriptureRefs.join(" · ") }) : t("scriptureToRead")}
        </span>
      )}
      {badges.image && (
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold bg-purple-950/80 text-purple-100 border border-purple-500">
          <Image className="w-4 h-4" /> {t("image")}
        </span>
      )}
      {badges.note && (
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold bg-amber-950/80 text-amber-100 border border-amber-500">
          <MessageCircleQuestion className="w-4 h-4" /> {t("studyNote")}
        </span>
      )}
      {(badges.highlights || []).map((h, i) => (
        <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold bg-cyan-950/80 text-cyan-100 border border-cyan-500 max-w-[18rem]">
          <Star className="w-4 h-4 shrink-0" /> <span className="truncate">{h}</span>
        </span>
      ))}
    </div>
  ) : null;

  const warningBlock = warning ? (
    <div className="mt-3 pt-3 border-t border-white/25 w-full text-center" data-testid="presentation-five-minute-warning">
      <div className={`flex items-center justify-center gap-2 animate-pulse ${warning.isOvertime ? "text-red-100" : "text-yellow-100"}`}>
        <AlertCircle className="w-5 h-5 shrink-0" />
        <div className="font-bold text-sm uppercase tracking-wider">
          {warning.prefix && <span>{warning.prefix} </span>}
          <span className="text-2xl text-white font-black mx-1 tabular-nums">{warning.number}</span>
          <span> {warning.suffix}</span>
        </div>
      </div>
    </div>
  ) : null;

  // Botón para avanzar: grande, con lo que viene a continuación bien visible
  const nextButton = (variant) => nextInfo && (
    <button
      onClick={handleSmartButton}
      className="w-full rounded-3xl flex items-center justify-between gap-3 px-6 min-h-[96px] landscape:min-h-[84px] text-left transition-transform active:scale-95 shadow-xl bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/40 ring-2 ring-white/20"
      data-testid="presentation-smart-button"
    >
      <span className="min-w-0">
        {nextInfo.kicker && (
          <span className="block text-xs md:text-sm font-bold uppercase tracking-[0.2em] mb-1 text-blue-100">{nextInfo.kicker}</span>
        )}
        <span className={`block ${nextInfo.main.length > 14 ? "text-2xl md:text-3xl" : "text-4xl md:text-5xl"} landscape:text-3xl font-black uppercase leading-none`} data-testid="presentation-next-label">{nextInfo.main}</span>
      </span>
      <ArrowRight className="w-10 h-10 shrink-0" strokeWidth={3} />
    </button>
  );

  // Botón de comentarios: ancho, naranja, con el total a la vista
  const commentButton = (variant) => canComment && (
    <button
      onClick={onAddComment}
      className="w-full rounded-3xl min-h-[72px] landscape:min-h-[64px] px-6 flex items-center justify-between gap-3 shadow-xl transition-transform active:scale-95 bg-orange-500 hover:bg-orange-400 text-white shadow-orange-900/40 ring-2 ring-white/20"
      aria-label={t("markComment")} title={t("markComment")}
      data-testid="presentation-add-comment"
    >
      <span className="flex items-center gap-3">
        <Hand className="w-9 h-9 shrink-0" strokeWidth={2.2} />
        <span className="text-xl md:text-2xl font-black uppercase tracking-wide">{t("comment")}</span>
      </span>
      <span className="text-right leading-none">
        <span className="block text-3xl font-black tabular-nums" data-testid="presentation-comment-count">{totalComments}</span>
        <span className="block text-[11px] font-semibold opacity-85 mt-0.5">{t("inTotal")}</span>
      </span>
    </button>
  );

  const actionBar = (variant) => (
    <div className="flex flex-col gap-3 w-full max-w-xl mx-auto">
      {commentButton(variant)}
      {nextButton(variant)}
    </div>
  );

  const escHint = (
    <div className="shrink-0 h-5 flex items-center justify-center">
      {studyStarted && hasKeyboard && <span className={`${isSemaforo ? "opacity-60" : "text-zinc-500"} text-xs`}>{t("pmEscHint")}</span>}
    </div>
  );

  // Bloque central del estado: título del tramo + tiempo del tramo
  const statusCore = (big) => (
    <>
      <p className="text-xs md:text-sm font-bold tracking-[0.25em] opacity-90">{indicatorText}</p>
      <p className={`${big ? "text-3xl md:text-4xl" : "text-2xl md:text-3xl"} landscape:text-2xl font-black uppercase tracking-wide mt-1 flex items-center justify-center gap-2`} data-testid="presentation-phase-title">
        {phaseInfo.title}
      </p>
      {phaseInfo.subtitle && <p className="text-base md:text-lg opacity-80">{phaseInfo.subtitle}</p>}
      <p className={`${big ? "text-7xl md:text-8xl" : "text-6xl md:text-7xl"} landscape:text-6xl font-extralight tabular-nums leading-none mt-2`}>{formatTime(phaseElapsedTime)}</p>
      {estimatedTime > 0 && (
        <p className="text-xl md:text-2xl landscape:text-lg font-light opacity-80 tabular-nums mt-1">{t("ofTime", { time: formatTime(Math.round(estimatedTime)) })}</p>
      )}
      {badgeRow}
      {warningBlock}
    </>
  );

  /* ---------------- Diseño «Semáforo» ---------------- */
  if (layout === "semaforo") {
    return (
      <div className={`fixed inset-0 z-[9999] ${colorClass} transition-colors duration-500 flex flex-col p-3 md:p-6 gap-2`} data-testid="presentation-mode" data-layout="semaforo">
        {topBar}
        {isLandscape ? (
          <div className="flex-1 min-h-0 flex flex-row gap-5">
            <div className="flex-1 flex flex-col items-center justify-center text-center px-2 min-h-0 overflow-y-auto">
              {statusCore(true)}
            </div>
            <div className="w-[42%] flex flex-col justify-center gap-4">
              {timesRow(true)}{progressBar(true)}{actionBar("dark")}
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-2 shrink-0">{timesRow()}{progressBar(true)}</div>
            <div className="flex-1 flex flex-col items-center justify-center text-center px-2 min-h-0 overflow-y-auto">
              {statusCore(true)}
            </div>
            <div className="shrink-0 pt-1">{actionBar("dark")}</div>
          </>
        )}
        {escHint}
      </div>
    );
  }

  /* ---------------- Diseño «Panel ordenado» ---------------- */
  if (layout === "panel") {
    return (
      <div className="fixed inset-0 z-[9999] bg-zinc-800 text-white flex flex-col p-3 md:p-6 gap-2" data-testid="presentation-mode" data-layout="panel">
        {topBar}
        {isLandscape ? (
          <div className="flex-1 min-h-0 flex flex-row gap-5">
            <div className={`flex-1 min-h-0 overflow-y-auto rounded-[2rem] ${colorClass} transition-colors duration-500 flex flex-col items-center justify-center text-center px-4 py-3 shadow-2xl`} data-testid="presentation-status-box">
              {statusCore(false)}
            </div>
            <div className="w-[42%] flex flex-col justify-center gap-4">
              {timesRow(true)}{progressBar(true)}{actionBar("dark")}
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-2 shrink-0">{timesRow()}{progressBar(true)}</div>
            <div className={`flex-1 min-h-0 overflow-y-auto rounded-[2rem] ${colorClass} transition-colors duration-500 flex flex-col items-center justify-center text-center px-4 py-5 shadow-2xl`} data-testid="presentation-status-box">
              {statusCore(true)}
            </div>
            <div className="shrink-0 pt-1">{actionBar("dark")}</div>
          </>
        )}
        {escHint}
      </div>
    );
  }

  /* ---------------- Diseño «Clásico» (el de siempre, con el botón de avanzar mejorado) ---------------- */
  return (
    <div className="fixed inset-0 z-[9999] bg-zinc-800 text-white flex flex-col p-4 md:p-6 landscape:py-2 landscape:px-4" data-testid="presentation-mode" data-layout="classic">
      {topBar}

      <div className="flex-1 flex flex-col items-center overflow-y-auto py-2 [&>*:first-child]:mt-auto [&>*:last-child]:mb-auto">
        <div className="mb-4 landscape:mb-2 w-full landscape:sticky landscape:top-0 landscape:z-10 landscape:bg-zinc-800 landscape:py-1">{timesRow()}</div>

        <div className="w-full mb-4">{progressBar(false)}</div>

        {studyStarted && (
          <div className="text-center bg-gradient-to-br from-zinc-700 to-zinc-800 border border-zinc-600 rounded-2xl px-5 py-3 landscape:p-2 mb-4 shadow-lg" data-testid="presentation-comments">
            <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">{t("participations")}</p>
            <p className="text-4xl md:text-5xl landscape:text-3xl font-black text-orange-500 tabular-nums">{totalComments}</p>
            {canComment && (
              <p className="text-[11px] text-zinc-400 mt-0.5 flex items-center justify-center gap-1">
                <MessagesSquare className="w-3 h-3" /> {phase === PHASES.REVIEW ? t("pmInThisReview", { n: phaseComments }) : t("pmInThisParagraph", { n: phaseComments })}
              </p>
            )}
          </div>
        )}

        <div className={`w-full max-w-[17rem] rounded-2xl flex flex-col items-center justify-center transition-colors duration-500 py-8 px-6 landscape:py-3 landscape:px-2 shadow-2xl ${colorClass}`} data-testid="presentation-status-box">
          <p className="text-lg md:text-2xl landscape:text-base font-bold tracking-widest text-center">{indicatorText}</p>
          <p className="text-4xl md:text-6xl landscape:text-4xl font-light tabular-nums">{formatTime(phaseElapsedTime)}</p>
          {estimatedTime > 0 && (
            <p className="opacity-70 text-lg md:text-2xl landscape:text-base font-light tabular-nums">/ {formatTime(Math.round(estimatedTime))}</p>
          )}
          {warningBlock}
        </div>

        <div className="text-center mt-4 landscape:mt-2">
          <p className="text-2xl md:text-3xl landscape:text-xl font-black uppercase tracking-wider flex items-center justify-center gap-2" data-testid="presentation-phase-title">
            <PhaseIcon className="w-6 h-6 text-zinc-400" />
            {phaseInfo.title}
          </p>
          {phaseInfo.subtitle && <p className="text-lg md:text-xl landscape:text-base text-zinc-400 mt-1">{phaseInfo.subtitle}</p>}
          {badgeRow}
        </div>

        <div className="flex flex-col items-center gap-3 mt-6 landscape:mt-3 w-full max-w-sm">
          {commentButton("dark")}
          {nextButton("dark")}
        </div>
      </div>

      {escHint}
    </div>
  );
}
