import { useState, useEffect, useRef } from "react";
import { Play, Mic, ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { t } from "@/i18n";
import { timeStatus } from "@/utils/timeStatus";

export function IntroductionWordsSection({
  isActive,
  isTimerRunning,
  estimatedTime = 60, // 1 minute default
  onStartIntroduction,
  onGoToFirstParagraph,
  overtimeAlertEnabled,
  soundEnabled,
  vibrationEnabled,
  playNotificationSound,
  triggerVibration,
  hasStarted, // true if timer has been started
  darkMode = false,
  finalStretch = false, // últimos 5 minutos del estudio: sin prórroga
  segmentElapsed, // segundos del tramo en curso (reloj central)
}) {
  const [ownElapsed, setElapsedTime] = useState(0);
  const elapsedTime = isActive && segmentElapsed != null ? segmentElapsed : ownElapsed;
  const [overtimeAlertTriggered, setOvertimeAlertTriggered] = useState(false);
  const timerRef = useRef(null);
  const cardRef = useRef(null);

  const isOverTime = elapsedTime > estimatedTime;
  const status = timeStatus(elapsedTime, estimatedTime, finalStretch);
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

  // Timer
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
  const titleTone = darkMode ? 'text-zinc-100' : 'text-slate-800';

  // Antes de empezar: fila con el tiempo; en el PC, botón para empezar
  if (!hasStarted) {
    return (
      <div
        ref={cardRef}
        className={`rounded-2xl border-2 ${darkMode ? 'border-zinc-700 bg-zinc-800' : 'border-slate-200 bg-white'}`}
        data-testid="introduction-words-section"
      >
        <div className="px-3 py-2.5 flex items-center gap-3">
          <span className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center ${darkMode ? 'bg-blue-900/70 text-blue-200' : 'bg-blue-100 text-blue-700'}`}>
            <Mic className="w-4 h-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className={`block text-sm font-bold ${titleTone}`}>{t('introduction')}</span>
            <span className={`block text-xs ${muted}`}>{t('introHint')}</span>
          </span>
          <Button
            onClick={onStartIntroduction}
            className="hidden lg:inline-flex rounded-full px-5 h-9 text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md"
            data-testid="start-introduction-btn"
          >
            <Play className="w-4 h-4 mr-1.5" fill="white" />
            {t('startStudy')}
          </Button>
          <span className={`shrink-0 text-base font-black tabular-nums ${titleTone}`}>{formatTime(estimatedTime)}</span>
        </div>
      </div>
    );
  }

  // Terminada
  if (!isActive && hasStarted) {
    return (
      <div
        className={`rounded-2xl border-2 px-3 py-2.5 flex items-center gap-3 opacity-60 ${darkMode ? 'border-zinc-700 bg-zinc-800/40' : 'border-slate-200 bg-slate-50'}`}
        data-testid="introduction-words-completed"
      >
        <span className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center ${darkMode ? 'bg-zinc-700 text-zinc-300' : 'bg-slate-200 text-slate-600'}`}>
          <Check className="w-4 h-4" />
        </span>
        <span className={`min-w-0 flex-1 text-sm font-bold ${titleTone}`}>{t('introduction')}</span>
        <span className={`shrink-0 text-base font-black tabular-nums ${titleTone}`}>{formatTime(estimatedTime)}</span>
      </div>
    );
  }

  // En curso
  return (
    <div
      ref={cardRef}
      className={`rounded-2xl border-2 shadow-lg transition-all duration-300 ${
        isRed
          ? darkMode ? 'border-red-500 bg-red-950/60' : 'border-red-400 bg-red-50'
          : isGrace
          ? darkMode ? 'border-yellow-400 bg-yellow-900/40' : 'border-yellow-400 bg-yellow-50'
          : darkMode ? 'border-blue-500 bg-blue-950/50' : 'border-blue-400 bg-blue-50'
      }`}
      data-testid="introduction-words-active"
    >
      <div className="px-3 py-2.5 flex items-center gap-3">
        <span className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center ${isRed ? 'bg-red-500 text-white' : isGrace ? 'bg-yellow-400 text-zinc-900' : 'bg-blue-600 text-white'}`}>
          <Mic className="w-4 h-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className={`block text-sm font-bold ${titleTone}`}>
            {t('introduction')}
            <span className={`ml-2 text-[11px] font-black tracking-wide ${isRed ? (darkMode ? 'text-red-300' : 'text-red-600') : isGrace ? (darkMode ? 'text-yellow-300' : 'text-yellow-700') : (darkMode ? 'text-blue-300' : 'text-blue-700')}`}>
              {isRed ? t('overLabel') : isGrace ? t('graceLabel') : t('nowLabel')}
            </span>
          </span>
          <span className={`block text-xs ${muted}`}>{t('introHint')}</span>
        </span>
        <span className={`shrink-0 text-base font-black tabular-nums ${isRed ? (darkMode ? 'text-red-400' : 'text-red-600') : isGrace ? (darkMode ? 'text-yellow-300' : 'text-yellow-700') : darkMode ? 'text-blue-200' : 'text-blue-700'}`}>
          {formatTime(elapsedTime)}<span className={`font-medium ${muted}`}> / {formatTime(estimatedTime)}</span>
        </span>
      </div>
      <div className="hidden lg:flex justify-end px-3 pb-3">
        <Button
          onClick={onGoToFirstParagraph}
          className="rounded-full px-6 py-2 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-lg"
          data-testid="go-to-first-paragraph-btn"
        >
          {t('nextParagraph1')}
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
