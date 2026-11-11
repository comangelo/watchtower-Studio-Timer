import { useState, useEffect, useRef } from "react";
import { Clock, Timer, MessageCircleQuestion, AlertCircle, ArrowRight, Check, Sparkles, PartyPopper, Hand } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatClockTime, addSecondsToDate, formatTimeCompact } from "../utils/timeFormatters";
import { t } from "@/i18n";
import { timeStatus } from "@/utils/timeStatus";

const mmss = (sec) => {
  const t = Math.max(0, Math.round(sec || 0));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
};

// Closing Words Section Component
function ClosingWordsSection({
  isActive,
  isTimerRunning,
  estimatedTime = 60, // 1 minute default
  onFinishStudy,
  overtimeAlertEnabled,
  soundEnabled,
  vibrationEnabled,
  playNotificationSound,
  triggerVibration,
  darkMode = false,
  finalStretch = false, // la conclusión conserva siempre su prórroga (no se pasa este valor)
  pastEnd = false,      // ya pasó la hora de fin del estudio: siempre en rojo
  segmentElapsed,       // segundos del tramo en curso (reloj central)
}) {
  const [ownElapsed, setElapsedTime] = useState(0);
  const elapsedTime = isActive && segmentElapsed != null ? segmentElapsed : ownElapsed;
  const [overtimeAlertTriggered, setOvertimeAlertTriggered] = useState(false);
  const timerRef = useRef(null);
  const cardRef = useRef(null);

  const isOverTime = elapsedTime > estimatedTime || (pastEnd && isActive && elapsedTime > 0);
  const status = pastEnd && isActive && elapsedTime > 0 ? 'over' : timeStatus(elapsedTime, estimatedTime, finalStretch);
  const isGrace = status === 'grace';
  const isRed = status === 'over';

  // Auto-scroll when active
  useEffect(() => {
    if (isActive && cardRef.current) {
      cardRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [isActive]);

  // Overtime alert
  useEffect(() => {
    if (isOverTime && !overtimeAlertTriggered && overtimeAlertEnabled && isActive) {
      setOvertimeAlertTriggered(true);
      if (soundEnabled && playNotificationSound) {
        playNotificationSound('urgent');
      }
      if (vibrationEnabled && triggerVibration) {
        triggerVibration([200, 100, 200, 100, 200]);
      }
    }
  }, [isOverTime, overtimeAlertTriggered, overtimeAlertEnabled, isActive, soundEnabled, vibrationEnabled, playNotificationSound, triggerVibration]);

  // Timer for closing words
  useEffect(() => {
    if (isActive && isTimerRunning) {
      setElapsedTime(0);
      setOvertimeAlertTriggered(false);
      timerRef.current = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isActive, isTimerRunning]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const muted = darkMode ? 'text-zinc-400' : 'text-slate-500';

  if (!isActive) {
    return (
      <div className={`rounded-2xl border-2 px-3 py-2.5 flex items-center gap-3 ${
        darkMode ? 'border-zinc-700 bg-zinc-800' : 'border-slate-200 bg-white'
      }`} data-testid="closing-words-row">
        <span className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center ${darkMode ? 'bg-purple-900/70 text-purple-200' : 'bg-purple-100 text-purple-700'}`}>
          <Sparkles className="w-4 h-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className={`block text-sm font-bold ${darkMode ? 'text-zinc-100' : 'text-slate-800'}`}>{t('conclusion')}</span>
          <span className={`block text-xs ${muted}`}>{t('afterReview')}</span>
        </span>
        <span className={`shrink-0 text-base font-black tabular-nums ${darkMode ? 'text-zinc-100' : 'text-slate-800'}`}>{formatTime(estimatedTime)}</span>
      </div>
    );
  }

  return (
    <div
      ref={cardRef}
      className={`rounded-2xl border-2 shadow-lg transition-all duration-300 ${
        isRed
          ? darkMode ? 'border-red-500 bg-red-950/60' : 'border-red-400 bg-red-50'
          : isGrace
          ? darkMode ? 'border-yellow-400 bg-yellow-900/40' : 'border-yellow-400 bg-yellow-50'
          : darkMode ? 'border-purple-500 bg-purple-950/50' : 'border-purple-400 bg-purple-50'
      }`}
      data-testid="closing-words-section"
    >
      <div className="px-3 py-2.5 flex items-center gap-3">
        <span className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center ${isRed ? 'bg-red-500 text-white' : isGrace ? 'bg-yellow-400 text-zinc-900' : 'bg-purple-600 text-white'}`}>
          <Sparkles className="w-4 h-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className={`block text-sm font-bold ${darkMode ? 'text-zinc-100' : 'text-slate-800'}`}>
            {t('conclusion')}
            <span className={`ml-2 text-[11px] font-black tracking-wide ${isRed ? (darkMode ? 'text-red-300' : 'text-red-600') : isGrace ? (darkMode ? 'text-yellow-300' : 'text-yellow-700') : (darkMode ? 'text-purple-300' : 'text-purple-700')}`}>
              {isRed ? t('overLabel') : isGrace ? t('graceLabel') : t('nowLabel')}
            </span>
          </span>
          <span className={`block text-xs ${muted}`}>{t('conclusionHint')}</span>
        </span>
        <span className={`shrink-0 text-base font-black tabular-nums ${isRed ? (darkMode ? 'text-red-400' : 'text-red-600') : isGrace ? (darkMode ? 'text-yellow-300' : 'text-yellow-700') : darkMode ? 'text-purple-200' : 'text-purple-700'}`}>
          {formatTime(elapsedTime)}<span className={`font-medium ${muted}`}> / {formatTime(estimatedTime)}</span>
        </span>
      </div>
      <div className="hidden lg:flex justify-end px-3 pb-3">
        <Button
          onClick={onFinishStudy}
          className="rounded-full px-6 py-2 text-sm font-semibold bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg"
          data-testid="finish-study-btn"
        >
          <PartyPopper className="w-4 h-4 mr-2" />
          {t('finishStudy')}
          <Check className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}

function ReviewQuestionCard({
  question,
  index,
  isCurrentQuestion,
  isCompletedQuestion,
  perQuestionTime,
  isLowTime,
  isCriticalTime,
  isAdjusted,
  timeDiff,
  onGoToNext,
  isLastQuestion,
  overtimeAlertEnabled,
  soundEnabled,
  vibrationEnabled,
  playNotificationSound,
  triggerVibration,
  isTimerRunning,
  darkMode = false,
  onAddComment,
  commentCount = 0,
  finalStretch = false,
  segmentElapsed,
}) {
  const [ownElapsed, setQuestionElapsed] = useState(0);
  const questionElapsed = isCurrentQuestion && segmentElapsed != null ? segmentElapsed : ownElapsed;
  const [overtimeAlertTriggered, setOvertimeAlertTriggered] = useState(false);
  const questionTimerRef = useRef(null);
  const cardRef = useRef(null);

  const estimatedTime = perQuestionTime;
  const isOverTime = questionElapsed > estimatedTime;
  const status = timeStatus(questionElapsed, estimatedTime, finalStretch);
  const isGrace = status === 'grace';
  const isRed = status === 'over';

  // Auto-scroll to current question
  useEffect(() => {
    if (isCurrentQuestion && cardRef.current) {
      cardRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [isCurrentQuestion]);

  // Overtime alert
  useEffect(() => {
    if (isOverTime && !overtimeAlertTriggered && overtimeAlertEnabled && isCurrentQuestion) {
      setOvertimeAlertTriggered(true);
      if (soundEnabled && playNotificationSound) {
        playNotificationSound('urgent');
      }
      if (vibrationEnabled && triggerVibration) {
        triggerVibration([200, 100, 200, 100, 200]);
      }
    }
  }, [isOverTime, overtimeAlertTriggered, overtimeAlertEnabled, isCurrentQuestion, soundEnabled, vibrationEnabled, playNotificationSound, triggerVibration]);

  // Reset overtime alert when question changes
  useEffect(() => {
    if (!isCurrentQuestion) {
      setOvertimeAlertTriggered(false);
    }
  }, [isCurrentQuestion]);

  // Question timer
  useEffect(() => {
    if (isCurrentQuestion && isTimerRunning) {
      setQuestionElapsed(0);
      setOvertimeAlertTriggered(false);
      
      questionTimerRef.current = setInterval(() => {
        setQuestionElapsed(prev => prev + 1);
      }, 1000);
    } else {
      if (questionTimerRef.current) {
        clearInterval(questionTimerRef.current);
        questionTimerRef.current = null;
      }
      if (!isCurrentQuestion) {
        setQuestionElapsed(0);
      }
    }

    return () => {
      if (questionTimerRef.current) {
        clearInterval(questionTimerRef.current);
      }
    };
  }, [isCurrentQuestion, isTimerRunning]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const muted = darkMode ? 'text-zinc-400' : 'text-slate-500';
  const rowTone = isCurrentQuestion
    ? (isRed
        ? (darkMode ? 'border-red-500 bg-red-950/60' : 'border-red-400 bg-red-50')
        : isGrace
        ? (darkMode ? 'border-yellow-400 bg-yellow-900/40' : 'border-yellow-400 bg-yellow-50')
        : (darkMode ? 'border-green-500 bg-green-950/50' : 'border-green-400 bg-green-50'))
    : isCompletedQuestion
      ? (darkMode ? 'border-zinc-700 bg-zinc-800/40 opacity-60' : 'border-slate-200 bg-slate-50 opacity-60')
      : (darkMode ? 'border-zinc-700 bg-zinc-800' : 'border-slate-200 bg-white');
  const numTone = isCurrentQuestion
    ? (isRed ? 'bg-red-500 text-white' : isGrace ? 'bg-yellow-400 text-zinc-900' : 'bg-green-600 text-white')
    : isCompletedQuestion
      ? (darkMode ? 'bg-zinc-700 text-zinc-300' : 'bg-slate-200 text-slate-600')
      : (darkMode ? 'bg-rose-900/70 text-rose-200' : 'bg-rose-100 text-rose-700');

  return (
    <div
      ref={cardRef}
      className={`rounded-2xl border-2 transition-all duration-300 ${rowTone} ${isCurrentQuestion ? 'shadow-lg' : ''}`}
      data-testid={`review-question-${index}`}
    >
      <div className="px-3 py-2.5 flex items-start gap-3">
        <span className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black ${numTone}`}>
          {isCompletedQuestion ? <Check className="w-4 h-4" /> : index + 1}
        </span>
        <span className="min-w-0 flex-1 pt-0.5">
          {isCurrentQuestion && (
            <span className={`block text-[11px] font-black tracking-wide ${isRed ? (darkMode ? 'text-red-300' : 'text-red-600') : isGrace ? (darkMode ? 'text-yellow-300' : 'text-yellow-700') : (darkMode ? 'text-green-300' : 'text-green-700')}`}>
              {isRed ? t('overLabel') : isGrace ? t('graceLabel') : t('nowLabel')}
            </span>
          )}
          <span className={`block text-sm ${isCurrentQuestion ? 'font-semibold' : ''} ${darkMode ? 'text-zinc-100' : 'text-slate-800'}`}>
            {question.text}
          </span>
        </span>
        <span className="shrink-0 text-right pt-0.5">
          {isCurrentQuestion && isTimerRunning ? (
            <span className={`block text-base font-black tabular-nums ${isRed ? (darkMode ? 'text-red-400' : 'text-red-600') : isGrace ? (darkMode ? 'text-yellow-300' : 'text-yellow-700') : (darkMode ? 'text-green-400' : 'text-green-700')}`}>
              {formatTime(questionElapsed)}<span className={`font-medium ${muted}`}> / {formatTime(Math.round(estimatedTime))}</span>
            </span>
          ) : (
            <span className={`block text-base font-black tabular-nums ${
              isLowTime && !isCompletedQuestion ? 'text-orange-600' : darkMode ? 'text-zinc-100' : 'text-slate-800'
            }`}>
              {formatTime(Math.round(perQuestionTime))}
            </span>
          )}
        </span>
      </div>

      {isCurrentQuestion && (
        <div className="hidden lg:flex flex-wrap items-center justify-end gap-3 px-3 pb-3">
          {isTimerRunning && onAddComment && (
            <Button
              onClick={onAddComment}
              className="rounded-full px-6 py-2 text-sm font-bold bg-orange-500 hover:bg-orange-600 text-white shadow-lg active:scale-95 [&_svg]:size-5"
              data-testid={`add-comment-review-${index}`}
            >
              <Hand fill="white" className="mr-1" />
              {t('comment')}
              <span className="ml-2 min-w-[1.75rem] rounded-full bg-white/25 px-2 py-0.5 text-center tabular-nums" data-testid={`comment-count-review-${index}`}>{commentCount}</span>
            </Button>
          )}
          <Button
            onClick={onGoToNext}
            className={`rounded-full px-6 py-2 text-sm font-semibold text-white shadow-lg ${
              isLastQuestion ? 'bg-purple-600 hover:bg-purple-700' : 'bg-blue-600 hover:bg-blue-700'
            }`}
            data-testid={`next-review-question-${index}`}
          >
            {isLastQuestion ? t('conclusion') : t('nextQuestion')}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      )}
    </div>
  );
}

export function FinalQuestionsSection({ 
  finalQuestions, 
  finalQuestionsTitle,
  startTime, 
  isTimerRunning, 
  adjustedTimes, 
  getQuestionTime, 
  originalStartTime,
  isInReviewMode,
  currentReviewQuestion,
  onStartReview,
  onNextReviewQuestion,
  onStartClosingWords,
  isInClosingWordsMode,
  closingWordsDuration = 60,
  plannedPerQuestion = 35,
  onFinishStudy,
  overtimeAlertEnabled,
  soundEnabled,
  vibrationEnabled,
  playNotificationSound,
  triggerVibration,
  darkMode = false,
  onAddComment,
  reviewCommentStats = {},
  finalStretch = false,
  pastEnd = false,
  segmentElapsed,
}) {
  if (!finalQuestions || finalQuestions.length === 0) return null;
  
  const totalTime = isTimerRunning && adjustedTimes.totalTime 
    ? adjustedTimes.totalTime 
    : finalQuestions.length * plannedPerQuestion;
  
  const perQuestionTime = isTimerRunning && adjustedTimes.perQuestion
    ? adjustedTimes.perQuestion
    : plannedPerQuestion;
  
  const isAdjusted = isTimerRunning && Math.abs(perQuestionTime - plannedPerQuestion) >= 1;
  const timeDiff = perQuestionTime - plannedPerQuestion;
  const isLowTime = isTimerRunning && perQuestionTime < 20;
  const isCriticalTime = isTimerRunning && perQuestionTime < 10;

  const remainingQuestions = finalQuestions.length - (currentReviewQuestion || 0);

  const muted = darkMode ? 'text-zinc-400' : 'text-slate-500';

  return (
    <Card className={`shadow-sm rounded-2xl ${
      darkMode ? 'border-zinc-700 bg-zinc-800/60' : 'border-slate-200 bg-white'
    }`} data-testid="final-questions-section">
      {isLowTime && !isInReviewMode && (
        <div className={`${isCriticalTime ? 'bg-red-500' : 'bg-orange-500'} text-white px-4 py-2 flex items-center justify-center gap-2 rounded-t-2xl`}>
          <AlertCircle className="w-4 h-4" />
          <span className="text-sm font-medium">
            {isCriticalTime ? t('reviewCritical') : t('reviewLow')}
          </span>
        </div>
      )}

      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className={`text-base flex items-center gap-2 ${darkMode ? 'text-zinc-100' : 'text-slate-800'}`}>
              <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${darkMode ? 'bg-rose-900/70 text-rose-200' : 'bg-rose-100 text-rose-700'}`}>
                <MessageCircleQuestion className="w-4 h-4" />
              </span>
              {t('review')}
              {isInReviewMode && !isInClosingWordsMode && (
                <span className={`text-sm font-semibold ${muted}`}>· {t('questionXofY', { x: (currentReviewQuestion || 0) + 1, y: finalQuestions.length })}</span>
              )}
            </CardTitle>
            {finalQuestionsTitle && (
              <p className={`text-xs mt-1 ${muted}`}>{finalQuestionsTitle}</p>
            )}
          </div>
          <div className="shrink-0 text-right">
            <p className={`text-sm font-bold tabular-nums ${
              isCriticalTime ? 'text-red-600' : isLowTime ? 'text-orange-600' : isAdjusted ? (timeDiff > 0 ? 'text-green-600' : 'text-orange-600') : darkMode ? 'text-zinc-100' : 'text-slate-800'
            }`} data-testid="review-per-question">
              {finalQuestions.length} × {mmss(perQuestionTime)}
            </p>
            {startTime && !isInReviewMode && (
              <p className={`text-xs tabular-nums ${muted}`}>
                {isTimerRunning && adjustedTimes.start
                  ? formatClockTime(adjustedTimes.start)
                  : formatClockTime(addSecondsToDate(startTime, originalStartTime))}
                {' – '}
                {isTimerRunning && adjustedTimes.end
                  ? formatClockTime(adjustedTimes.end)
                  : formatClockTime(addSecondsToDate(startTime, originalStartTime + (finalQuestions.length * plannedPerQuestion)))}
              </p>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-2 pt-0">
        {isInReviewMode ? (
          finalQuestions.map((q, idx) => (
            <ReviewQuestionCard
              finalStretch={finalStretch}
              key={idx}
              question={q}
              index={idx}
              isCurrentQuestion={idx === currentReviewQuestion && !isInClosingWordsMode}
              segmentElapsed={segmentElapsed}
              isCompletedQuestion={idx < currentReviewQuestion || isInClosingWordsMode}
              perQuestionTime={perQuestionTime}
              isLowTime={isLowTime}
              isCriticalTime={isCriticalTime}
              isAdjusted={isAdjusted}
              timeDiff={timeDiff}
              onGoToNext={() => {
                if (idx === finalQuestions.length - 1) {
                  onStartClosingWords?.();
                } else {
                  onNextReviewQuestion?.();
                }
              }}
              isLastQuestion={idx === finalQuestions.length - 1}
              overtimeAlertEnabled={overtimeAlertEnabled}
              soundEnabled={soundEnabled}
              vibrationEnabled={vibrationEnabled}
              playNotificationSound={playNotificationSound}
              triggerVibration={triggerVibration}
              isTimerRunning={isTimerRunning}
              darkMode={darkMode}
              onAddComment={idx === currentReviewQuestion && !isInClosingWordsMode ? onAddComment : undefined}
              commentCount={reviewCommentStats[idx] || 0}
            />
          ))
        ) : (
          finalQuestions.map((q, idx) => (
            <div
              key={idx}
              className={`rounded-2xl border-2 px-3 py-2.5 flex items-start gap-3 ${
                darkMode ? 'border-zinc-700 bg-zinc-800' : 'border-slate-200 bg-white'
              }`}
              data-testid={`final-question-${idx}`}
            >
              <span className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black ${darkMode ? 'bg-rose-900/70 text-rose-200' : 'bg-rose-100 text-rose-700'}`}>
                {idx + 1}
              </span>
              <span className={`min-w-0 flex-1 pt-0.5 text-sm ${darkMode ? 'text-zinc-100' : 'text-slate-800'}`}>{q.text}</span>
              <span className="shrink-0 text-right pt-0.5">
                <span className={`block text-base font-black tabular-nums ${
                  isCriticalTime ? 'text-red-600' : isLowTime ? 'text-orange-600' : darkMode ? 'text-zinc-100' : 'text-slate-800'
                }`}>
                  {mmss(perQuestionTime)}
                </span>
                {startTime && (
                  <span className={`block text-xs tabular-nums ${muted}`}>
                    {isTimerRunning && getQuestionTime
                      ? formatClockTime(getQuestionTime(idx))
                      : formatClockTime(addSecondsToDate(startTime, originalStartTime + (idx * plannedPerQuestion)))}
                  </span>
                )}
              </span>
            </div>
          ))
        )}

        {/* Closing Words Section - Always visible */}
        <ClosingWordsSection 
          isActive={isInClosingWordsMode}
          isTimerRunning={isTimerRunning}
          estimatedTime={closingWordsDuration}
          pastEnd={pastEnd}
          segmentElapsed={segmentElapsed}
          onFinishStudy={onFinishStudy}
          overtimeAlertEnabled={overtimeAlertEnabled}
          soundEnabled={soundEnabled}
          vibrationEnabled={vibrationEnabled}
          playNotificationSound={playNotificationSound}
          triggerVibration={triggerVibration}
          darkMode={darkMode}
        />
      </CardContent>
    </Card>
  );
}
