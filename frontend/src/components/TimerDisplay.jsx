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
}) {
  return (
    <Card className="border border-slate-200 shadow-sm rounded-2xl overflow-hidden" data-testid="main-timer-card">
      <CardHeader className="bg-slate-800 pb-3 pt-4">
        <CardTitle className="text-sm text-slate-300 text-center font-medium">
          Cronómetro de Lectura
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 text-center bg-white">
        {/* Current Time Display */}
        {startTime && (
          <div className="mb-5 flex items-center justify-center gap-6 text-sm">
            <div className="text-center">
              <span className="text-slate-400 text-xs block mb-1">Inicio</span>
              <span className="text-lg font-light text-slate-700" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>{formatClockTime(startTime)}</span>
            </div>
            <div className="text-slate-300">—</div>
            <div className="text-center">
              <span className="text-slate-400 text-xs block mb-1">Fin</span>
              <span className="text-lg font-light text-slate-700" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>{formatClockTime(endTime)}</span>
            </div>
          </div>
        )}
        
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
  );
}
