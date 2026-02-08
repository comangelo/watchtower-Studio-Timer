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
    <Card className="border-zinc-100 shadow-sm overflow-hidden" data-testid="main-timer-card">
      <CardHeader className="bg-zinc-50 border-b border-zinc-100 pb-3">
        <CardTitle className="font-heading text-sm uppercase tracking-widest text-zinc-500 text-center">
          Cronómetro de Lectura
        </CardTitle>
      </CardHeader>
      <CardContent className="p-8 text-center">
        {/* Current Time Display */}
        {startTime && (
          <div className="mb-4 p-3 bg-green-50 rounded-lg">
            <div className="flex items-center justify-center gap-4 text-sm">
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4 text-green-600" />
                <span className="text-green-700">Inicio:</span>
                <span className="font-mono font-bold text-green-800">{formatClockTime(startTime)}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-green-700">→</span>
                <span className="text-green-700">Fin:</span>
                <span className="font-mono font-bold text-green-800">{formatClockTime(endTime)}</span>
              </div>
            </div>
          </div>
        )}
        
        <p className="font-mono text-6xl font-bold text-zinc-900 tracking-tight" data-testid="elapsed-time">
          {formatTime(elapsedTime)}
        </p>
        <p className="text-zinc-500 mt-2">Tiempo transcurrido</p>
        
        {/* Progress Bar */}
        <div className="mt-6">
          <Progress value={progressPercentage} className="h-2" />
          <p className="text-xs text-zinc-400 mt-2">{Math.round(progressPercentage)}% completado</p>
        </div>

        {/* Timer Controls */}
        <div className="flex items-center justify-center gap-4 mt-8">
          <Button 
            size="lg" 
            onClick={onToggle}
            className={`rounded-full w-14 h-14 ${isTimerRunning ? 'bg-orange-500 hover:bg-orange-600' : 'bg-green-500 hover:bg-green-600'}`}
            data-testid="timer-toggle-btn"
          >
            {isTimerRunning ? (
              <Pause className="w-6 h-6" />
            ) : (
              <Play className="w-6 h-6 ml-1" />
            )}
          </Button>
          <Button 
            size="lg" 
            variant="outline"
            onClick={onReset}
            className="rounded-full w-14 h-14"
            data-testid="timer-reset-btn"
          >
            <RotateCcw className="w-5 h-5" />
          </Button>
        </div>
        
        {!startTime && (
          <p className="text-xs text-zinc-400 mt-4">
            Presiona play para iniciar con la hora actual
          </p>
        )}
      </CardContent>
    </Card>
  );
}
