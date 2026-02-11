import { Play, Pause, RotateCcw, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatTime, formatClockTime } from "../utils/timeFormatters";
import { useMemo } from "react";

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
}) {
  const isLowTime = remainingTime <= 300;
  const isOvertime = remainingTime <= 0;

  // Calculate projected times based on current time and configured duration
  // This updates every render to show real-time preview
  const { displayStartTime, displayEndTime } = useMemo(() => {
    if (startTime && endTime) {
      // Timer is running - use actual times
      return { displayStartTime: startTime, displayEndTime: endTime };
    }
    // Timer not started - calculate preview based on NOW + duration
    const now = new Date();
    const projected = new Date(now.getTime() + totalDuration * 60 * 1000);
    return { displayStartTime: now, displayEndTime: projected };
  }, [startTime, endTime, totalDuration]);

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
          
          {/* Separator with Duration */}
          <div className="flex flex-col items-center shrink-0">
            <div className="w-4 sm:w-8 md:w-12 h-px bg-slate-600 opacity-60"></div>
            <span className="text-[10px] sm:text-xs md:text-sm font-bold text-orange-400 my-0.5 sm:my-1">{totalDuration}m</span>
            <div className="w-4 sm:w-8 md:w-12 h-px bg-slate-600 opacity-60"></div>
          </div>
          
          {/* End Time - Amber/Gold Color */}
          <div className="text-center min-w-0">
            <span className={`text-[8px] sm:text-[10px] md:text-xs font-bold uppercase tracking-wider ${isOvertime ? 'text-rose-400' : isLowTime ? 'text-rose-400' : 'text-amber-400'}`}>Fin</span>
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
          </div>
        </div>
        {!startTime && (
          <p className="text-center text-slate-500 text-[10px] sm:text-xs mt-1 sm:mt-3">
            Hora actual + {totalDuration} min = Hora de fin
          </p>
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
