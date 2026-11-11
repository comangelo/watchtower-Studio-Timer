import { useState, useEffect, useRef } from "react";
import { isRealQuestion } from "../utils/timePlan";
import { Play, Clock, ArrowRight, ChevronDown, ChevronUp, MessageCircleQuestion, Check, Timer, Eye, EyeOff, Image, BookOpen, Star, Hand, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { t, tn } from "@/i18n";
import {
  Collapsible,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import { formatTimeText, formatClockTime, formatTimeCompact } from "../utils/timeFormatters";

export function ParagraphCard({ 
  paragraph, 
  groupedParagraphs = [], // Array of paragraphs that are grouped together
  index, 
  startTime, 
  paragraphTimes, 
  onStartFromHere, 
  isTimerRunning, 
  isCurrentParagraph, 
  isCompletedParagraph, 
  elapsedTime, 
  onGoToNext, 
  isLastParagraph,
  adjustedQuestionTime,
  plannedQuestionTime = 35, // Tiempo por pregunta según el plan inicial
  overtimeAlertEnabled,
  soundEnabled,
  vibrationEnabled,
  playNotificationSound,
  triggerVibration,
  onStartReview,
  hasReviewQuestions,
  darkMode = false,
  showContentGlobal = true,
  onAddComment,
  commentCount = 0,
  finalStretch = false, // últimos 5 minutos del estudio: sin prórroga
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [showContent, setShowContent] = useState(true); // Individual content visibility
  const [paragraphElapsed, setParagraphElapsed] = useState(0);
  const [overtimeAlertTriggered, setOvertimeAlertTriggered] = useState(false);
  const cardRef = useRef(null);
  const paragraphTimerRef = useRef(null);
  
  // Sync with global show/hide state
  useEffect(() => {
    setShowContent(showContentGlobal);
  }, [showContentGlobal]);
  
  // If grouped, use all paragraphs; otherwise just this one
  const allParagraphs = groupedParagraphs.length > 0 ? groupedParagraphs : [paragraph];
  const isGrouped = groupedParagraphs.length > 1;
  
  // Calculate totals for grouped paragraphs
  const totalWordCount = allParagraphs.reduce((sum, p) => sum + p.word_count, 0);
  const totalReadingTime = allParagraphs.reduce((sum, p) => sum + p.reading_time_seconds, 0);
  const allQuestions = allParagraphs.flatMap(p => p.questions);
  // Solo las preguntas reales (las referencias "lea …" sin pregunta no cuentan)
  const realQuestionCount = allQuestions.filter(isRealQuestion).length;
  const hasQuestions = allQuestions.length > 0;
  const hasFinalQuestions = allQuestions.some(q => q.is_final_question);

  // Check for extra content in questions (image, scripture, or note references)
  // "both" means the question has both image AND scripture in the same parenthesis
  const hasImageContent = allQuestions.some(q => q.content_type === 'image' || q.content_type === 'both');
  const hasScriptureContent = allQuestions.some(q => q.content_type === 'scripture' || q.content_type === 'both');
  const hasNoteContent = allQuestions.some(q => q.content_type === 'note');
  // Citas concretas que hay que leer ("lee Efesios 4:25-27", "léelo", …)
  const scriptureRefs = [...new Set(allParagraphs.flatMap(p => p.scripture_refs || []))];
  // "Ideas importantes": textos entre comillas en el paréntesis de la pregunta
  const highlightTexts = [...new Set(allQuestions.flatMap(q => q.highlight_contents || []))];

  // Tiempo previsto del párrafo o grupo (lectura fija + preguntas al tiempo planificado)
  const estimatedTime = paragraphTimes.adjustedDuration
    || allParagraphs.reduce((sum, p) => sum + (p.total_time_seconds || 0), 0);
  const isOverTime = paragraphElapsed > estimatedTime;
  // Igual que en el modo presentación: verde en tiempo, amarillo en la prórroga (hasta un 30 % más),
  // rojo después. En los últimos 5 minutos del estudio no hay prórroga.
  const GRACE_RATIO = 1.3;
  const isGrace = isOverTime && !finalStretch && estimatedTime > 0 && paragraphElapsed <= estimatedTime * GRACE_RATIO;
  const isRed = isOverTime && !isGrace;

  // Auto-scroll to current paragraph
  useEffect(() => {
    if (isCurrentParagraph && cardRef.current) {
      cardRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [isCurrentParagraph]);

  // Overtime alert - trigger once when time is exceeded
  useEffect(() => {
    if (isOverTime && !overtimeAlertTriggered && overtimeAlertEnabled && isCurrentParagraph) {
      setOvertimeAlertTriggered(true);
      
      // Play sound if enabled
      if (soundEnabled && playNotificationSound) {
        playNotificationSound('urgent');
      }
      
      // Trigger vibration if enabled
      if (vibrationEnabled && triggerVibration) {
        triggerVibration([200, 100, 200, 100, 200]);
      }
    }
  }, [isOverTime, overtimeAlertTriggered, overtimeAlertEnabled, isCurrentParagraph, soundEnabled, vibrationEnabled, playNotificationSound, triggerVibration]);

  // Reset overtime alert when paragraph changes
  useEffect(() => {
    if (!isCurrentParagraph) {
      setOvertimeAlertTriggered(false);
    }
  }, [isCurrentParagraph]);

  // Paragraph timer - starts when this becomes the current paragraph
  useEffect(() => {
    if (isCurrentParagraph && isTimerRunning) {
      // Reset timer when this paragraph becomes active
      setParagraphElapsed(0);
      setOvertimeAlertTriggered(false);
      
      // Start counting
      paragraphTimerRef.current = setInterval(() => {
        setParagraphElapsed(prev => prev + 1);
      }, 1000);
    } else {
      // Stop timer when not current or not running
      if (paragraphTimerRef.current) {
        clearInterval(paragraphTimerRef.current);
        paragraphTimerRef.current = null;
      }
      // Reset when no longer current
      if (!isCurrentParagraph) {
        setParagraphElapsed(0);
      }
    }

    return () => {
      if (paragraphTimerRef.current) {
        clearInterval(paragraphTimerRef.current);
      }
    };
  }, [isCurrentParagraph, isTimerRunning]);

  // Format paragraph elapsed time as MM:SS
  const formatParagraphTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Lista compacta: una línea por párrafo; al tocarla se despliegan los detalles.
  // El párrafo actual se abre solo; los terminados quedan atenuados.
  const [expanded, setExpanded] = useState(false);
  const isExpanded = expanded || isCurrentParagraph;
  const title = isGrouped ? t('paragraphsN', { n: allParagraphs.map(p => p.number).join(', ') }) : t('paragraphN', { n: paragraph.number });
  const muted = darkMode ? 'text-zinc-400' : 'text-slate-500';
  const chip = 'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap';

  const rowTone = isCurrentParagraph
    ? (isRed
        ? (darkMode ? 'border-red-500 bg-red-950/60' : 'border-red-400 bg-red-50')
        : isGrace
          ? (darkMode ? 'border-yellow-400 bg-yellow-900/40' : 'border-yellow-400 bg-yellow-50')
          : (darkMode ? 'border-green-500 bg-green-950/50' : 'border-green-400 bg-green-50'))
    : isCompletedParagraph
      ? (darkMode ? 'border-zinc-700 bg-zinc-800/40 opacity-60' : 'border-slate-200 bg-slate-50 opacity-60')
      : (darkMode ? 'border-zinc-700 bg-zinc-800 hover:border-orange-500' : 'border-slate-200 bg-white hover:border-orange-300');

  const numTone = isCurrentParagraph
    ? (isRed ? 'bg-red-500 text-white' : isGrace ? 'bg-yellow-400 text-zinc-900' : 'bg-green-500 text-white')
    : isCompletedParagraph
      ? (darkMode ? 'bg-zinc-700 text-green-400' : 'bg-green-100 text-green-700')
      : (darkMode ? 'bg-orange-900/60 text-orange-300' : 'bg-orange-50 text-orange-600');

  return (
    <div
      ref={cardRef}
      className={`rounded-2xl border-2 transition-all duration-300 ${rowTone} ${isCurrentParagraph ? 'shadow-lg' : ''}`}
      data-testid={`paragraph-card-${paragraph.number}`}
    >
      {/* Fila compacta (se toca para abrir o cerrar) */}
      <button
        type="button"
        onClick={() => !isCurrentParagraph && setExpanded(v => !v)}
        className="w-full flex items-center gap-3 px-3 py-2.5 text-left"
        aria-expanded={isExpanded}
        data-testid={`paragraph-row-${paragraph.number}`}
      >
        <span className={`shrink-0 min-w-[2.25rem] h-9 px-1.5 rounded-xl flex items-center justify-center text-sm font-black ${numTone}`}>
          {isCompletedParagraph ? <Check className="w-4 h-4" /> : (isGrouped ? allParagraphs.map(p => p.number).join('·') : paragraph.number)}
        </span>
        <span className="min-w-0 flex-1">
          <span className={`block text-sm font-bold ${darkMode ? 'text-zinc-100' : 'text-slate-800'}`}>
            {title}
            {isCurrentParagraph && (
              <span className={`ml-2 text-[11px] font-black tracking-wide ${isRed ? (darkMode ? 'text-red-300' : 'text-red-600') : isGrace ? (darkMode ? 'text-yellow-300' : 'text-yellow-700') : (darkMode ? 'text-green-300' : 'text-green-700')}`}>
                {isRed ? t('overLabel') : isGrace ? t('graceLabel') : t('nowLabel')}
              </span>
            )}
          </span>
          <span className="flex flex-wrap gap-1 mt-0.5">
            {hasScriptureContent && (
              <span className={`${chip} ${darkMode ? 'bg-blue-900/70 text-blue-200' : 'bg-blue-100 text-blue-700'}`} data-testid={`scripture-badge-${paragraph.number}`}>
                <BookOpen className="w-3 h-3 shrink-0" />
                {scriptureRefs.length ? scriptureRefs.join(' · ') : t('scripture')}
              </span>
            )}
            {hasImageContent && (
              <span className={`${chip} ${darkMode ? 'bg-purple-900/70 text-purple-200' : 'bg-purple-100 text-purple-700'}`} data-testid={`image-badge-${paragraph.number}`}>
                <Image className="w-3 h-3" /> {t('image')}
              </span>
            )}
            {hasNoteContent && (
              <span className={`${chip} ${darkMode ? 'bg-amber-900/70 text-amber-200' : 'bg-amber-100 text-amber-700'}`} data-testid={`note-badge-${paragraph.number}`}>
                <MessageCircleQuestion className="w-3 h-3" /> {t('note')}
              </span>
            )}
          </span>
        </span>
        <span className="shrink-0 text-right">
          {isCurrentParagraph && isTimerRunning ? (
            <span className={`block text-base font-black tabular-nums ${isRed ? (darkMode ? 'text-red-400' : 'text-red-600') : isGrace ? (darkMode ? 'text-yellow-300' : 'text-yellow-700') : (darkMode ? 'text-green-400' : 'text-green-700')}`}>
              {formatParagraphTime(paragraphElapsed)}<span className={`font-medium ${muted}`}> / {formatParagraphTime(Math.round(estimatedTime))}</span>
            </span>
          ) : (
            <span className={`block text-base font-black tabular-nums ${darkMode ? 'text-zinc-100' : 'text-slate-800'}`} data-testid={`paragraph-time-${paragraph.number}`}>
              {formatParagraphTime(Math.round(estimatedTime))}
            </span>
          )}
          {startTime && paragraphTimes.start && !isCompletedParagraph && (
            <span className={`block text-[11px] ${muted}`}>{formatClockTime(paragraphTimes.start)}</span>
          )}
        </span>
        {!isCurrentParagraph && (
          <ChevronDown className={`w-5 h-5 shrink-0 transition-transform ${muted} ${isExpanded ? 'rotate-180' : ''}`} />
        )}
      </button>

      {/* Detalles */}
      {isExpanded && (
        <div className={`px-4 pb-4 pt-1 border-t ${darkMode ? 'border-zinc-700' : 'border-slate-100'}`} data-testid={`paragraph-details-${paragraph.number}`}>
          {isCurrentParagraph && isOverTime && (
            <p className={`mt-2 inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-bold rounded-full animate-pulse ${isGrace ? 'bg-yellow-400 text-zinc-900' : 'bg-red-600 text-white'}`}>
              {t('overBy', { time: formatParagraphTime(paragraphElapsed - Math.round(estimatedTime)) })}
            </p>
          )}

          {/* Datos del párrafo: cada dato con su color */}
          <div className="flex flex-wrap items-center gap-1.5 mt-2 text-xs font-medium">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${darkMode ? 'bg-zinc-700 text-zinc-200' : 'bg-slate-100 text-slate-700'}`} data-testid={`data-words-${paragraph.number}`}>
              <FileText className="w-3 h-3" /> {t('words', { n: totalWordCount })}
            </span>
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${darkMode ? 'bg-sky-900/60 text-sky-200' : 'bg-sky-50 text-sky-800'}`}>
              <BookOpen className="w-3 h-3" /> {paragraph.skip_reading
                ? (totalReadingTime > 0 ? t('noReadingWithExtras', { time: formatTimeText(totalReadingTime) }) : t('noReading'))
                : t('readingTime', { time: formatTimeText(totalReadingTime) })}
            </span>
            {hasQuestions && (
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${darkMode ? 'bg-orange-950/60 text-orange-200' : 'bg-orange-50 text-orange-800'}`}>
                <MessageCircleQuestion className="w-3 h-3" /> {tn('questions', realQuestionCount)}
              </span>
            )}
            {startTime && paragraphTimes.start && !isCompletedParagraph && (
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${darkMode ? 'bg-violet-900/60 text-violet-200' : 'bg-violet-50 text-violet-800'}`}>
                <Clock className="w-3 h-3" /> {formatClockTime(paragraphTimes.start)} – {formatClockTime(paragraphTimes.end)}
                {!paragraphTimes.isCompleted && adjustedQuestionTime && Math.abs(adjustedQuestionTime - plannedQuestionTime) >= 1 && <b className="text-orange-500 ml-1">{t('adjusted')}</b>}
              </span>
            )}
          </div>

          {/* Reparto del tiempo previsto: lectura + comentarios (+ extra si el párrafo es largo) */}
          {estimatedTime > 0 && (() => {
            const reading = Math.max(0, Math.round(totalReadingTime));
            const extra = Math.max(0, Math.round(paragraphTimes.extraCommentSeconds || 0));
            const comments = Math.max(0, Math.round(estimatedTime) - reading - (extra >= 5 ? extra : 0));
            const perQ = Math.round(isTimerRunning && adjustedQuestionTime ? adjustedQuestionTime : plannedQuestionTime);
            const total = Math.max(1, reading + comments + (extra >= 5 ? extra : 0));
            const pct = (v) => `${Math.max(0, (v / total) * 100)}%`;
            return (
              <div className={`mt-2.5 rounded-xl p-2.5 ${darkMode ? 'bg-zinc-900/60' : 'bg-slate-50 border border-slate-200'}`} data-testid={`time-breakdown-${paragraph.number}`}>
                <div className="flex items-baseline justify-between gap-2">
                  <span className={`text-[11px] font-bold uppercase tracking-wide ${muted}`}>{t('tbTitle')}</span>
                  <span className={`text-sm font-black tabular-nums ${darkMode ? 'text-zinc-100' : 'text-slate-800'}`}>{formatTimeText(Math.round(estimatedTime))}</span>
                </div>
                <div className="flex h-2 rounded-full overflow-hidden mt-1.5 bg-slate-200">
                  <span className="bg-sky-400" style={{ width: pct(reading) }} />
                  <span className="bg-orange-400" style={{ width: pct(comments) }} />
                  {extra >= 5 && <span className="bg-emerald-400" style={{ width: pct(extra) }} />}
                </div>
                <div className={`mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs ${darkMode ? 'text-zinc-300' : 'text-slate-600'}`}>
                  <span><span className="inline-block w-2 h-2 rounded-full bg-sky-400 mr-1" />{t('tbReading')}: <b>{formatTimeText(reading)}</b></span>
                  {hasQuestions && (
                    <span><span className="inline-block w-2 h-2 rounded-full bg-orange-400 mr-1" />{t('tbComments')}: <b>{formatTimeText(comments)}</b>
                      {realQuestionCount > 1 && perQ > 0 && <span className={muted}> {t('tbPerQuestion', { time: formatTimeText(perQ) })}</span>}
                    </span>
                  )}
                  {extra >= 5 && (
                    <span title={t('longParagraphHint')} data-testid={`extra-comments-${paragraph.number}`}>
                      <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 mr-1" />{t('tbExtra')}: <b>+{formatTimeText(extra)}</b>
                    </span>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Ideas importantes */}
          {highlightTexts.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {highlightTexts.map((h, i) => (
                <span key={i} className={`${chip} max-w-full ${darkMode ? 'bg-cyan-900/70 text-cyan-200' : 'bg-cyan-50 text-cyan-800 border border-cyan-200'}`} title={t('highlight')} data-testid={`highlight-badge-${paragraph.number}-${i}`}>
                  <Star className="w-3 h-3 shrink-0" /> <span className="truncate">{h}</span>
                </span>
              ))}
            </div>
          )}

          {/* Preguntas */}
          {hasQuestions && (
            <div className="mt-3 space-y-1.5" data-testid={`questions-${paragraph.number}`}>
              {allQuestions.map((q, qIndex) => {
                const isQuestion = isRealQuestion(q);
                const hasExtraContent = q.parenthesis_content && q.parenthesis_content.length > 0;
                return (
                  <div key={qIndex}
                    className={`rounded-xl py-2 px-3 text-sm flex items-start gap-2 ${
                      darkMode ? 'bg-orange-950/40 text-orange-100' : 'bg-orange-50 text-orange-900'
                    }`}
                    data-testid={`question-${paragraph.number}-${qIndex}`}>
                    <MessageCircleQuestion className="w-4 h-4 mt-0.5 shrink-0 text-orange-500" />
                    <span className="flex-1">
                      {q.text}
                      {hasExtraContent && <span className={`ml-1 ${muted}`}>({q.parenthesis_content})</span>}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Texto del párrafo */}
          <div className="mt-3">
            <button
              type="button"
              onClick={() => setShowContent(!showContent)}
              className={`inline-flex items-center gap-1.5 text-xs font-semibold ${darkMode ? 'text-zinc-300' : 'text-slate-600'}`}
              data-testid={`toggle-content-${paragraph.number}`}
            >
              {showContent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              {showContent ? t('hideText') : t('showParagraphText')}
            </button>
            {showContent && (
              <div className={`mt-2 text-sm leading-relaxed space-y-3 ${darkMode ? 'text-zinc-200' : 'text-slate-700'}`}>
                {allParagraphs.map((p) => (
                  <p key={p.number}>{isGrouped && <b className={muted}>{p.number}. </b>}{p.text}</p>
                ))}
              </div>
            )}
          </div>

          {/* Acciones */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {!isCurrentParagraph && !isCompletedParagraph && (
              <Button
                variant="outline"
                onClick={(e) => { e.stopPropagation(); onStartFromHere(); }}
                className={`rounded-full px-4 py-2 text-sm font-semibold border-2 ${
                  darkMode ? 'border-zinc-500 text-zinc-100 hover:border-orange-500' : 'border-slate-300 text-slate-700 hover:border-orange-400'
                }`}
                data-testid={`start-from-paragraph-${paragraph.number}`}
              >
                <Play className="w-4 h-4 mr-2" /> {t('startFromHere')}
              </Button>
            )}
            {/* En el ordenador (sin barra inferior) los botones del párrafo actual van aquí */}
            {isCurrentParagraph && isTimerRunning && onAddComment && (
              <Button
                onClick={(e) => { e.stopPropagation(); onAddComment(); }}
                className="hidden lg:inline-flex rounded-full px-5 py-5 text-sm font-bold bg-orange-500 hover:bg-orange-600 text-white [&_svg]:size-5"
                data-testid={`add-comment-paragraph-${paragraph.number}`}
              >
                <Hand className="mr-1" /> {t('comment')}
                <span className="ml-2 min-w-[1.75rem] rounded-full bg-white/25 px-2 py-0.5 text-center tabular-nums" data-testid={`comment-count-paragraph-${paragraph.number}`}>{commentCount}</span>
              </Button>
            )}
            {isCurrentParagraph && !isLastParagraph && (
              <Button
                onClick={(e) => { e.stopPropagation(); onGoToNext(); }}
                className="hidden lg:inline-flex rounded-full px-5 py-5 text-sm font-bold bg-blue-600 hover:bg-blue-500 text-white"
                data-testid={`next-from-paragraph-${paragraph.number}`}
              >
                {t('nextParagraph')} <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            )}
            {isCurrentParagraph && isLastParagraph && hasReviewQuestions && (
              <Button
                onClick={(e) => { e.stopPropagation(); onStartReview?.(); }}
                className="hidden lg:inline-flex rounded-full px-5 py-5 text-sm font-bold bg-blue-600 hover:bg-blue-500 text-white"
                data-testid="start-review-questions"
              >
                {t('reviewQuestions')} <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
