import { AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatTime } from "../utils/timeFormatters";

export function CountdownTimer({ remainingTime, adjustedTimes, isTimerRunning }) {
  const timePerQuestion = isTimerRunning && adjustedTimes?.perQuestion 
    ? adjustedTimes.perQuestion 
    : 35;
  const isAdjusted = isTimerRunning && timePerQuestion !== 35;
  const timeDiff = timePerQuestion - 35;
  const isLowTime = isTimerRunning && timePerQuestion < 20;
  const isCritical = isTimerRunning && timePerQuestion < 15;

  return (
    <Card className={`border-2 shadow-lg rounded-2xl overflow-hidden transition-all ${
      isCritical ? 'border-red-400 bg-red-50' :
      isLowTime ? 'border-orange-400 bg-orange-50' :
      'border-orange-200'
    }`} data-testid="countdown-timer-card">
      <CardHeader className={`pb-3 pt-4 ${
        isCritical ? 'bg-red-500' :
        isLowTime ? 'bg-orange-500' :
        'bg-gradient-to-r from-orange-500 to-orange-600'
      }`}>
        <CardTitle className="font-heading text-sm uppercase tracking-widest text-white text-center flex items-center justify-center gap-2">
          {isLowTime && <AlertTriangle className="w-4 h-4 animate-pulse" />}
          Tiempo Restante
          {isLowTime && <AlertTriangle className="w-4 h-4 animate-pulse" />}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 text-center bg-white">
        {/* Low Time Alert */}
        {isLowTime && (
          <div className={`mb-4 p-3 rounded-xl ${isCritical ? 'bg-red-100 border border-red-200' : 'bg-orange-100 border border-orange-200'}`}>
            <span className={`text-sm font-bold ${isCritical ? 'text-red-700' : 'text-orange-700'}`}>
              {isCritical ? '🚨 ¡Tiempo crítico!' : '⚠️ ¡Acelera la lectura!'}
            </span>
          </div>
        )}
        
        {/* Main Countdown */}
        <p className={`font-mono text-5xl lg:text-6xl font-bold tracking-tighter tabular-nums ${
          isCritical ? 'text-red-600' :
          isLowTime ? 'text-orange-600' :
          'text-orange-500'
        }`} data-testid="remaining-time">
          {formatTime(remainingTime)}
        </p>
        <p className="text-slate-500 mt-2 text-sm">de 60 minutos</p>
        
        {/* Adjusted Time Info */}
        {isAdjusted && (
          <div className={`mt-5 p-4 rounded-xl ${
            isCritical ? 'bg-red-50 border-2 border-red-200' :
            isLowTime ? 'bg-orange-50 border-2 border-orange-200' :
            timeDiff > 0 ? 'bg-green-50 border border-green-200' : 'bg-orange-50 border border-orange-200'
          }`}>
            <p className="text-sm font-semibold text-slate-700 mb-1">
              Tiempo por pregunta
            </p>
            <p className={`font-mono text-2xl font-bold ${
              isCritical ? 'text-red-600' :
              isLowTime ? 'text-orange-600' :
              timeDiff > 0 ? 'text-green-600' : 'text-orange-600'
            }`}>
              {Math.round(timePerQuestion)} seg
            </p>
            <p className={`text-xs mt-1 ${timeDiff > 0 ? 'text-green-600' : 'text-orange-600'}`}>
              {timeDiff > 0 ? '+' : ''}{Math.round(timeDiff)} seg vs original (35s)
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
