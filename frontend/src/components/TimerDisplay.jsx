import { Play, Pause, RotateCcw, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatTime, formatClockTime } from "../utils/timeFormatters";

export function TimerDisplay({
  elapsedTime,
  isTimerRunning,
  startTime,
  endTime,
  progressPercentage,
  onToggle,
  onReset,
  remainingTime,
}) {
  const isLowTime = remainingTime <= 300;
  const isOvertime = remainingTime <= 0;

  return (
    <div className="space-y-4">
      {/* Start/End Time Display - Very Visible */}
      {startTime && (
        <Card className="border-2 border-orange-200 shadow-md rounded-2xl overflow-hidden bg-gradient-to-r from-orange-50 to-amber-50" data-testid="time-schedule-card">
          <CardContent className="p-5">
            <div className="flex items-center justify-center gap-8">
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <div className="w-3 h-3 rounded-full bg-cyan-500"></div>
                  <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Inicio</span>
                </div>
                <span 
                  className="text-4xl md:text-5xl font-bold text-cyan-600" 
                  style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
                  data-testid="start-time-display"
                >
                  {formatClockTime(startTime)}
                </span>
              </div>
              
              <div className="flex flex-col items-center">
                <div className="w-12 h-0.5 bg-slate-300 mb-1"></div>
                <Clock className="w-6 h-6 text-orange-500" />
                <span className="text-xs text-slate-500 mt-1">60 min</span>
                <div className="w-12 h-0.5 bg-slate-300 mt-1"></div>
              </div>
              
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <div className={`w-3 h-3 rounded-full ${isLowTime ? 'bg-rose-500 animate-pulse' : 'bg-amber-500'}`}></div>
                  <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Fin</span>
                </div>
                <span 
                  className={`text-4xl md:text-5xl font-bold ${isOvertime ? 'text-rose-600 animate-pulse' : isLowTime ? 'text-rose-600' : 'text-amber-600'}`}
                  style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
                  data-testid="end-time-display"
                >
                  {formatClockTime(endTime)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Timer Card */}
      <Card className="border border-slate-200 shadow-sm rounded-2xl overflow-hidden" data-testid="main-timer-card">
        <CardHeader className="bg-slate-800 pb-3 pt-4">
          <CardTitle className="text-sm text-slate-300 text-center font-medium">
            Cronómetro de Lectura
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 text-center bg-white">
          {/* Main Timer */}
          <div className="py-4">
            <p 
              className="text-6xl lg:text-7xl font-light text-slate-800 tracking-tight" 
              style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
              data-testid="elapsed-time"
            >
              {formatTime(elapsedTime)}
            </p>
            <p className="text-slate-400 mt-3 text-sm">Transcurrido</p>
          </div>
          
          {/* Progress Bar */}
          <div className="mt-4 mb-6">
            <Progress value={progressPercentage} className="h-2 rounded-full" />
            <p className="text-xs text-slate-400 mt-2">{Math.round(progressPercentage)}%</p>
          </div>

          {/* Timer Controls */}
          <div className="flex items-center justify-center gap-4">
            <Button 
              onClick={onToggle}
              className={`rounded-full shadow-lg transition-all active:scale-95 ${
                isTimerRunning 
                  ? 'bg-slate-700 hover:bg-slate-800' 
                  : 'bg-orange-500 hover:bg-orange-600'
              }`}
              style={{ width: '72px', height: '72px' }}
              data-testid="timer-toggle-btn"
            >
              {isTimerRunning ? (
                <Pause className="w-7 h-7" />
              ) : (
                <Play className="w-7 h-7 ml-0.5" />
              )}
            </Button>
            <Button 
              variant="outline"
              onClick={onReset}
              className="rounded-full border border-slate-200 hover:border-slate-300 hover:bg-slate-50"
              style={{ width: '52px', height: '52px' }}
              data-testid="timer-reset-btn"
            >
              <RotateCcw className="w-5 h-5 text-slate-500" />
            </Button>
          </div>
          
          {!startTime && (
            <p className="text-sm text-slate-400 mt-5">
              Presiona ▶ para iniciar
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
