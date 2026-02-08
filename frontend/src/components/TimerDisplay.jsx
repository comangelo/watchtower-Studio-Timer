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
    <Card className="border-2 border-slate-200 shadow-lg rounded-2xl overflow-hidden" data-testid="main-timer-card">
      <CardHeader className="bg-gradient-to-r from-slate-800 to-slate-900 pb-4 pt-5">
        <CardTitle className="font-heading text-sm uppercase tracking-widest text-slate-300 text-center">
          Cronómetro de Lectura
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 text-center bg-white">
        {/* Current Time Display */}
        {startTime && (
          <div className="mb-5 p-3 bg-slate-50 rounded-xl border border-slate-100">
            <div className="flex items-center justify-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <Clock className="w-4 h-4 text-green-600" />
                </div>
                <div className="text-left">
                  <span className="text-slate-500 text-xs block">Inicio</span>
                  <span className="font-mono font-bold text-slate-800">{formatClockTime(startTime)}</span>
                </div>
              </div>
              <div className="text-slate-300">→</div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                  <Clock className="w-4 h-4 text-red-600" />
                </div>
                <div className="text-left">
                  <span className="text-slate-500 text-xs block">Fin</span>
                  <span className="font-mono font-bold text-slate-800">{formatClockTime(endTime)}</span>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Main Timer */}
        <div className="py-4">
          <p className="font-mono text-6xl lg:text-7xl font-bold text-slate-800 tracking-tighter tabular-nums" data-testid="elapsed-time">
            {formatTime(elapsedTime)}
          </p>
          <p className="text-slate-500 mt-2 text-sm">Tiempo transcurrido</p>
        </div>
        
        {/* Progress Bar */}
        <div className="mt-4 mb-6">
          <Progress value={progressPercentage} className="h-3 rounded-full" />
          <p className="text-xs text-slate-400 mt-2 font-medium">{Math.round(progressPercentage)}% completado</p>
        </div>

        {/* Timer Controls - Large and Visible */}
        <div className="flex items-center justify-center gap-4">
          <Button 
            onClick={onToggle}
            className={`rounded-full w-20 h-20 shadow-xl transition-all active:scale-95 ${
              isTimerRunning 
                ? 'bg-slate-700 hover:bg-slate-800 shadow-slate-300' 
                : 'bg-orange-500 hover:bg-orange-600 shadow-orange-300'
            }`}
            data-testid="timer-toggle-btn"
          >
            {isTimerRunning ? (
              <Pause className="w-8 h-8" />
            ) : (
              <Play className="w-8 h-8 ml-1" />
            )}
          </Button>
          <Button 
            variant="outline"
            onClick={onReset}
            className="rounded-full w-16 h-16 border-2 border-slate-300 hover:border-slate-400 hover:bg-slate-50"
            data-testid="timer-reset-btn"
          >
            <RotateCcw className="w-6 h-6 text-slate-600" />
          </Button>
        </div>
        
        {!startTime && (
          <p className="text-sm text-slate-400 mt-5 bg-slate-50 py-2 px-4 rounded-full inline-block">
            Presiona ▶ para iniciar
          </p>
        )}
      </CardContent>
    </Card>
  );
}
