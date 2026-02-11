import { Play, Pause, RotateCcw, Clock, Pencil, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatTime, formatClockTime } from "../utils/timeFormatters";
import { useMemo, useState } from "react";

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
}) {
  const isLowTime = remainingTime <= 300;
  const isOvertime = remainingTime <= 0;
  const [isEditingEndTime, setIsEditingEndTime] = useState(false);
  const [editHours, setEditHours] = useState('');
  const [editMinutes, setEditMinutes] = useState('');

  // Calculate projected times based on current time and configured duration
  const { displayStartTime, displayEndTime, calculatedDuration } = useMemo(() => {
    if (startTime && endTime) {
      const diffMinutes = Math.round((endTime.getTime() - startTime.getTime()) / 60000);
      return { displayStartTime: startTime, displayEndTime: endTime, calculatedDuration: diffMinutes };
    }
    const now = new Date();
    // Use manual end time if set, otherwise calculate from duration
    if (manualEndTime) {
      const diffMinutes = Math.round((manualEndTime.getTime() - now.getTime()) / 60000);
      return { displayStartTime: now, displayEndTime: manualEndTime, calculatedDuration: diffMinutes };
    }
    const projected = new Date(now.getTime() + totalDuration * 60 * 1000);
    return { displayStartTime: now, displayEndTime: projected, calculatedDuration: totalDuration };
  }, [startTime, endTime, totalDuration, manualEndTime]);

  // Display duration - use calculated if manual, otherwise use configured
  const displayDuration = manualEndTime && !startTime ? calculatedDuration : totalDuration;

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

  return (
    <div className="space-y-2 sm:space-y-4">
      {/* Start/End Time Display - Always Visible, Responsive */}
      <div className="bg-slate-900 rounded-xl sm:rounded-2xl p-2 sm:p-4 md:p-6 shadow-xl" data-testid="time-schedule-card">
        <div className="flex items-center justify-center gap-2 sm:gap-6 md:gap-10">
          {/* Start Time - Emerald/Teal Color */}
          <div className="text-center min-w-0">
            <span className="text-[8px] sm:text-[10px] md:text-xs font-bold text-emerald-400 uppercase tracking-wider">Inicio</span>
            <p 
              className={`text-lg sm:text-2xl md:text-4xl font-bold mt-0.5 sm:mt-1 ${startTime ? 'text-emerald-400' : 'text-emerald-400/60'}`}
              style={{ fontFamily: 'system-ui, -apple-system, sans-serif', letterSpacing: '-0.02em' }}
              data-testid="start-time-display"
            >
              {formatClockTime(displayStartTime)}
            </p>
          </div>
          
          {/* Separator with Duration - Shows calculated duration when manual */}
          <div className="flex flex-col items-center shrink-0">
            <div className="w-4 sm:w-8 md:w-12 h-px bg-slate-600 opacity-60"></div>
            <span className={`text-[10px] sm:text-xs md:text-sm font-bold my-0.5 sm:my-1 ${manualEndTime && !startTime ? 'text-cyan-400' : 'text-orange-400'}`}>
              {displayDuration}m
            </span>
            <div className="w-4 sm:w-8 md:w-12 h-px bg-slate-600 opacity-60"></div>
          </div>
          
          {/* End Time - Amber/Gold Color - Editable */}
          <div className="text-center min-w-0">
            <div className="flex items-center justify-center gap-1">
              <span className={`text-[8px] sm:text-[10px] md:text-xs font-bold uppercase tracking-wider ${isOvertime ? 'text-rose-400' : isLowTime ? 'text-rose-400' : 'text-amber-400'}`}>
                Fin {manualEndTime && !startTime && <span className="text-[8px] opacity-60">(manual)</span>}
              </span>
              {!startTime && !isEditingEndTime && (
                <button
                  onClick={startEditingEndTime}
                  className="p-0.5 rounded hover:bg-slate-700 transition-colors"
                  title="Editar hora de fin"
                  data-testid="edit-end-time-btn"
                >
                  <Pencil className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-slate-400 hover:text-amber-400" />
                </button>
              )}
            </div>
            
            {isEditingEndTime ? (
              <div className="flex items-center justify-center gap-1 mt-0.5 sm:mt-1">
                <input
                  type="text"
                  value={editHours}
                  onChange={(e) => setEditHours(e.target.value.replace(/\D/g, '').slice(0, 2))}
                  className="w-8 sm:w-12 text-center bg-slate-800 border border-slate-600 rounded text-amber-400 text-lg sm:text-2xl font-bold"
                  placeholder="HH"
                  maxLength={2}
                  data-testid="edit-hours-input"
                />
                <span className="text-amber-400 text-lg sm:text-2xl font-bold">:</span>
                <input
                  type="text"
                  value={editMinutes}
                  onChange={(e) => setEditMinutes(e.target.value.replace(/\D/g, '').slice(0, 2))}
                  className="w-8 sm:w-12 text-center bg-slate-800 border border-slate-600 rounded text-amber-400 text-lg sm:text-2xl font-bold"
                  placeholder="MM"
                  maxLength={2}
                  data-testid="edit-minutes-input"
                />
                <button
                  onClick={saveEndTime}
                  className="p-1 rounded bg-emerald-600 hover:bg-emerald-500 transition-colors ml-1"
                  title="Guardar"
                  data-testid="save-end-time-btn"
                >
                  <Check className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                </button>
                <button
                  onClick={cancelEditEndTime}
                  className="p-1 rounded bg-slate-600 hover:bg-slate-500 transition-colors"
                  title="Cancelar"
                  data-testid="cancel-end-time-btn"
                >
                  <X className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                </button>
              </div>
            ) : (
              <p 
                className={`text-lg sm:text-2xl md:text-4xl font-bold mt-0.5 sm:mt-1 ${
                  !startTime ? 'text-amber-400/60' :
                  isOvertime ? 'text-rose-400 animate-pulse' : 
                  isLowTime ? 'text-rose-400' : 'text-amber-400'
                }`}
                style={{ fontFamily: 'system-ui, -apple-system, sans-serif', letterSpacing: '-0.02em' }}
                data-testid="end-time-display"
              >
                {formatClockTime(displayEndTime)}
              </p>
            )}
          </div>
        </div>
        
        {!startTime && (
          <div className="text-center mt-1 sm:mt-3">
            {manualEndTime ? (
              <button
                onClick={clearManualEndTime}
                className="text-[10px] sm:text-xs text-slate-500 hover:text-slate-300 underline"
                data-testid="clear-manual-time-btn"
              >
                Restaurar hora automática
              </button>
            ) : (
              <p className="text-slate-500 text-[10px] sm:text-xs">
                Hora actual + {totalDuration} min = Hora de fin
              </p>
            )}
          </div>
        )}
      </div>

      {/* Main Timer Card */}
      <Card className="border border-slate-200 shadow-sm rounded-xl sm:rounded-2xl overflow-hidden" data-testid="main-timer-card">
        <CardHeader className="bg-slate-800 pb-2 sm:pb-3 pt-2 sm:pt-4">
          <CardTitle className="text-xs sm:text-sm text-slate-300 text-center font-medium">
            Cronómetro de Lectura
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-6 text-center bg-white">
          {/* Main Timer */}
          <div className="py-2 sm:py-4">
            <p 
              className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-light text-slate-800 tracking-tight" 
              style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
              data-testid="elapsed-time"
            >
              {formatTime(elapsedTime)}
            </p>
            <p className="text-slate-400 mt-1 sm:mt-3 text-xs sm:text-sm">Transcurrido</p>
          </div>
          
          {/* Progress Bar */}
          <div className="mt-2 sm:mt-4 mb-3 sm:mb-6">
            <Progress value={progressPercentage} className="h-1.5 sm:h-2 rounded-full" />
            <p className="text-[10px] sm:text-xs text-slate-400 mt-1 sm:mt-2">{Math.round(progressPercentage)}%</p>
          </div>

          {/* Timer Controls */}
          <div className="flex items-center justify-center gap-3 sm:gap-4">
            <Button 
              onClick={onToggle}
              className={`rounded-full shadow-lg transition-all active:scale-95 ${
                isTimerRunning 
                  ? 'bg-slate-700 hover:bg-slate-800' 
                  : 'bg-orange-500 hover:bg-orange-600'
              }`}
              style={{ width: '56px', height: '56px' }}
              data-testid="timer-toggle-btn"
            >
              {isTimerRunning ? (
                <Pause className="w-5 h-5 sm:w-7 sm:h-7" />
              ) : (
                <Play className="w-5 h-5 sm:w-7 sm:h-7 ml-0.5" />
              )}
            </Button>
            <Button 
              variant="outline"
              onClick={onReset}
              className="rounded-full border border-slate-200 hover:border-slate-300 hover:bg-slate-50"
              style={{ width: '44px', height: '44px' }}
              data-testid="timer-reset-btn"
            >
              <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5 text-slate-500" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
