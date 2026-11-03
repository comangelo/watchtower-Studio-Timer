import { Play, Pause, RotateCcw, Pencil, Check, X, AlertCircle, MessagesSquare, Briefcase, Clock } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { formatTime, formatClockTime } from "../utils/timeFormatters";
import { useMemo, useState, useEffect } from "react";

export function TimerDisplay({
  elapsedTime,
  isTimerRunning,
  startTime,
  endTime,
  progressPercentage,
  onToggle,
  onReset,
  remainingTime,
  totalDuration = 60,
  manualEndTime,
  onManualEndTimeChange,
  fiveMinuteWarningEnabled = true,
  perQuestion,            // segundos de comentario por pregunta según el plan en vivo
  plannedPerQuestion,     // segundos por pregunta según el plan inicial
  circuitVisitMode = false,
  onCircuitVisitChange,
  circuitVisitMinutes = 30,
}) {
  // Segundos de pasado la hora de fin (remainingTime se queda en 0)
  const studySeconds = startTime && endTime ? Math.round((endTime.getTime() - startTime.getTime()) / 1000) : totalDuration * 60;
  const overtimeSeconds = startTime ? Math.max(0, elapsedTime - studySeconds) : 0;
  const isLowTime = !!startTime && remainingTime <= 300;
  const isOvertime = !!startTime && remainingTime <= 0 && overtimeSeconds > 0;
  const showFiveMinuteWarning = fiveMinuteWarningEnabled && !!startTime && remainingTime > 0 && remainingTime <= 300;
  const [isEditingEndTime, setIsEditingEndTime] = useState(false);
  const [editHours, setEditHours] = useState('');
  const [editMinutes, setEditMinutes] = useState('');
  
  // Real-time clock state
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Calculate projected times based on current time and configured duration
  const { displayEndTime, calculatedDuration } = useMemo(() => {
    if (startTime && endTime) {
      const diffMinutes = Math.round((endTime.getTime() - startTime.getTime()) / 60000);
      return { displayEndTime: endTime, calculatedDuration: diffMinutes };
    }
    const now = new Date();
    // Use manual end time if set, otherwise calculate from duration
    if (manualEndTime) {
      const diffMinutes = Math.round((manualEndTime.getTime() - now.getTime()) / 60000);
      return { displayEndTime: manualEndTime, calculatedDuration: diffMinutes };
    }
    const projected = new Date(now.getTime() + totalDuration * 60 * 1000);
    return { displayEndTime: projected, calculatedDuration: totalDuration };
  }, [startTime, endTime, totalDuration, manualEndTime]);

  // Display duration - use calculated duration when we have start and end times, or manual end time
  const displayDuration = (startTime && endTime) || manualEndTime ? calculatedDuration : totalDuration;

  const startEditingEndTime = () => {
    const timeToEdit = manualEndTime || displayEndTime;
    setEditHours(timeToEdit.getHours().toString().padStart(2, '0'));
    setEditMinutes(timeToEdit.getMinutes().toString().padStart(2, '0'));
    setIsEditingEndTime(true);
  };

  const saveEndTime = () => {
    const hours = parseInt(editHours) || 0;
    const minutes = parseInt(editMinutes) || 0;
    if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
      const newEndTime = new Date();
      newEndTime.setHours(hours, minutes, 0, 0);
      onManualEndTimeChange(newEndTime);
      setIsEditingEndTime(false);
    }
  };

  const cancelEditEndTime = () => {
    setIsEditingEndTime(false);
  };

  const clearManualEndTime = () => {
    onManualEndTimeChange(null);
  };

  const started = !!startTime;
  const remainingColor = isOvertime ? "text-rose-400" : isLowTime ? "text-rose-300" : "text-orange-400";

  return (
    <div
      className="rounded-2xl bg-gradient-to-br from-zinc-900 to-zinc-800 text-white shadow-xl border border-zinc-700 p-4 sm:p-5"
      data-testid="main-timer-card"
    >
      <div data-testid="time-schedule-card">
        {/* Cabecera */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <p className="text-[11px] sm:text-xs font-bold tracking-[0.15em] text-zinc-400 uppercase">
            {!started && <>Plan de hoy · {displayDuration} min</>}
            {started && (
              <>
                {isTimerRunning ? "En curso" : "En pausa"} · empezó{" "}
                <span className="text-emerald-400" data-testid="start-time-display">{formatClockTime(startTime)}</span>
              </>
            )}
          </p>
          {started && (
            <div className="flex items-center gap-1.5">
              <button
                onClick={onToggle}
                className="w-9 h-9 rounded-xl bg-zinc-700 hover:bg-zinc-600 flex items-center justify-center"
                aria-label={isTimerRunning ? "Pausar" : "Reanudar"}
                data-testid="timer-toggle-btn"
              >
                {isTimerRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </button>
              <button
                onClick={onReset}
                className="w-9 h-9 rounded-xl bg-zinc-700 hover:bg-zinc-600 flex items-center justify-center"
                aria-label="Reiniciar"
                title="Reiniciar"
                data-testid="timer-reset-btn"
              >
                <RotateCcw className="w-4 h-4 text-zinc-300" />
              </button>
            </div>
          )}
        </div>

        {/* Ahora · Termina · Duración/Restante */}
        <div className="grid grid-cols-3 gap-2 text-center items-start">
          <div>
            <p className="text-[10px] sm:text-[11px] font-bold tracking-wider text-zinc-400 uppercase">Ahora</p>
            <p className="text-2xl sm:text-3xl font-black tabular-nums" data-testid="current-time-display">{formatClockTime(currentTime)}</p>
          </div>
          <div>
            <p className="text-[10px] sm:text-[11px] font-bold tracking-wider text-zinc-400 uppercase">
              Termina{manualEndTime && !started ? " (a mano)" : ""}
            </p>
            {isEditingEndTime ? (
              <div className="flex items-center justify-center gap-1 mt-0.5">
                <input
                  type="text" inputMode="numeric" value={editHours}
                  onChange={(e) => setEditHours(e.target.value.replace(/\D/g, '').slice(0, 2))}
                  className="w-11 h-10 text-center bg-zinc-700 border-2 border-yellow-500/60 rounded-lg text-yellow-300 text-xl font-black focus:outline-none"
                  placeholder="HH" maxLength={2} autoFocus data-testid="edit-hours-input"
                />
                <span className="text-yellow-400 text-xl font-black">:</span>
                <input
                  type="text" inputMode="numeric" value={editMinutes}
                  onChange={(e) => setEditMinutes(e.target.value.replace(/\D/g, '').slice(0, 2))}
                  className="w-11 h-10 text-center bg-zinc-700 border-2 border-yellow-500/60 rounded-lg text-yellow-300 text-xl font-black focus:outline-none"
                  placeholder="MM" maxLength={2} data-testid="edit-minutes-input"
                />
              </div>
            ) : (
              <p
                className={`text-2xl sm:text-3xl font-black tabular-nums ${isOvertime || isLowTime ? "text-rose-400" : "text-yellow-400"} ${!started ? "cursor-pointer" : ""}`}
                onClick={!started ? startEditingEndTime : undefined}
                title={!started ? "Toca para cambiar la hora de fin" : undefined}
                data-testid="end-time-display"
              >
                {formatClockTime(displayEndTime)}
              </p>
            )}
          </div>
          <div>
            <p className="text-[10px] sm:text-[11px] font-bold tracking-wider text-zinc-400 uppercase">
              {started ? (isOvertime ? "Excedido" : "Restante") : "Duración"}
            </p>
            {started ? (
              <p className={`text-2xl sm:text-3xl font-black tabular-nums ${remainingColor} ${isOvertime ? "animate-pulse" : ""}`} data-testid="remaining-time">
                {isOvertime ? `-${formatTime(overtimeSeconds)}` : formatTime(Math.max(0, remainingTime))}
              </p>
            ) : (
              <p className={`text-2xl sm:text-3xl font-black tabular-nums ${manualEndTime ? "text-cyan-400" : "text-orange-400"}`}>
                {displayDuration}<span className="text-sm ml-0.5">min</span>
              </p>
            )}
          </div>
        </div>

        {/* Guardar / cancelar la hora de fin */}
        {isEditingEndTime && (
          <div className="flex items-center justify-center gap-2 mt-3">
            <button onClick={saveEndTime} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 font-bold text-sm" data-testid="save-end-time-btn">
              <Check className="w-4 h-4" /> Guardar
            </button>
            <button onClick={cancelEditEndTime} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-zinc-600 hover:bg-zinc-500 font-bold text-sm" data-testid="cancel-end-time-btn">
              <X className="w-4 h-4" /> Cancelar
            </button>
          </div>
        )}

        {/* Antes de empezar: cambiar la hora de fin y visita del superintendente */}
        {!started && !isEditingEndTime && (
          <div className="grid grid-cols-2 gap-2 mt-4">
            {manualEndTime ? (
              <button onClick={clearManualEndTime} className="rounded-xl bg-zinc-700/80 hover:bg-zinc-700 px-2 py-2.5 text-xs sm:text-sm font-bold text-cyan-300 flex items-center justify-center gap-1.5" data-testid="clear-manual-time-btn">
                <RotateCcw className="w-4 h-4 shrink-0" /> Hora automática
              </button>
            ) : (
              <button onClick={startEditingEndTime} className="rounded-xl bg-zinc-700/80 hover:bg-zinc-700 px-2 py-2.5 text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5" data-testid="edit-end-time-btn">
                <Pencil className="w-4 h-4 shrink-0 text-yellow-300" /> Cambiar hora de fin
              </button>
            )}
            {onCircuitVisitChange ? (
              <label
                className={`rounded-xl px-2 py-2 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 cursor-pointer ${circuitVisitMode ? "bg-indigo-600" : "bg-zinc-700/80 hover:bg-zinc-700"}`}
                data-testid="plan-circuit-visit"
              >
                <Briefcase className="w-4 h-4 shrink-0" />
                <span className="leading-tight text-left whitespace-nowrap">Visita S. C.</span>
                <Switch
                  checked={!!circuitVisitMode}
                  onCheckedChange={(v) => onCircuitVisitChange(!!v)}
                  className="data-[state=checked]:bg-indigo-300 scale-90"
                  data-testid="plan-circuit-visit-switch"
                />
              </label>
            ) : <span />}
          </div>
        )}
        {!started && circuitVisitMode && (
          <p className="text-[11px] text-indigo-200 text-center mt-2">Visita del superintendente: {circuitVisitMinutes} minutos, sin leer los párrafos.</p>
        )}

        {/* Durante el estudio: progreso, aviso de 5 minutos y tiempo por pregunta */}
        {started && (
          <div className="mt-4 space-y-2">
            <div className="h-2 rounded-full bg-zinc-700 overflow-hidden">
              <div className="h-full bg-orange-500 rounded-full transition-all duration-1000" style={{ width: `${Math.min(100, progressPercentage)}%` }} />
            </div>
            <p className="flex items-center justify-center gap-1.5 text-xs text-zinc-400">
              <Clock className="w-3.5 h-3.5" /> Transcurrido{" "}
              <b className="text-zinc-200 tabular-nums" data-testid="elapsed-time">{formatTime(elapsedTime)}</b> · {Math.round(progressPercentage)}%
            </p>
            {(showFiveMinuteWarning || (fiveMinuteWarningEnabled && isOvertime)) && (
              <div className={`rounded-xl px-3 py-2 flex items-center justify-center gap-2 animate-pulse ${isOvertime ? "bg-red-600/90" : "bg-yellow-400 text-zinc-900"}`} data-testid="five-minute-warning">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <span className="font-bold text-sm uppercase tracking-wider">
                  {isOvertime ? (
                    <><span className="text-xl font-black tabular-nums">{formatTime(overtimeSeconds)}</span> minutos excedidos</>
                  ) : (
                    <>En <span className="text-xl font-black tabular-nums">{formatTime(remainingTime)}</span> debe concluir</>
                  )}
                </span>
              </div>
            )}
          </div>
        )}

        {perQuestion !== undefined && perQuestion !== null && (
          <div className={`mt-3 rounded-xl px-3 py-1.5 flex items-center justify-center gap-2 text-xs sm:text-sm ${
            isTimerRunning && perQuestion < 20 ? "bg-orange-500/20 text-orange-200" : "bg-zinc-700/50 text-zinc-300"
          }`} data-testid="per-question-info">
            <MessagesSquare className="w-4 h-4 shrink-0" />
            <span>Comentarios: <b className="tabular-nums">{Math.round(perQuestion)} s</b> por pregunta</span>
            {isTimerRunning && plannedPerQuestion && Math.abs(perQuestion - plannedPerQuestion) >= 1 && (
              <span className={`text-xs font-semibold ${perQuestion >= plannedPerQuestion ? "text-green-400" : "text-orange-300"}`}>
                ({perQuestion >= plannedPerQuestion ? "+" : "−"}{Math.round(Math.abs(perQuestion - plannedPerQuestion))} s)
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
