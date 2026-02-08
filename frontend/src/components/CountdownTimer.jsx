import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatTime, formatTimeText } from "../utils/timeFormatters";

export function CountdownTimer({ remainingTime, adjustedTimes, isTimerRunning }) {
  const timePerQuestion = isTimerRunning && adjustedTimes?.perQuestion 
    ? adjustedTimes.perQuestion 
    : 35;
  const isAdjusted = isTimerRunning && timePerQuestion !== 35;
  const timeDiff = timePerQuestion - 35;
  const isLowTime = isTimerRunning && timePerQuestion < 20;

  return (
    <Card className="border-orange-200 bg-orange-50/30 shadow-sm" data-testid="countdown-timer-card">
      <CardHeader className="pb-3">
        <CardTitle className="font-heading text-sm uppercase tracking-widest text-orange-600 text-center">
          Tiempo Restante (60 min)
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 text-center">
        {isLowTime && (
          <div className="mb-3 p-2 bg-orange-100 rounded-lg">
            <span className="text-orange-700 text-sm font-bold animate-pulse">
              ⚠️ ¡Tiempo por pregunta bajo!
            </span>
          </div>
        )}
        <p className="font-mono text-5xl font-bold text-orange-600 tracking-tight" data-testid="remaining-time">
          {formatTime(remainingTime)}
        </p>
        <p className="text-orange-500 mt-2">Tiempo restante</p>
        
        {isAdjusted && (
          <div className={`mt-4 p-3 rounded-lg ${isLowTime ? 'bg-orange-200' : timeDiff > 0 ? 'bg-green-100' : 'bg-orange-100'}`}>
            <p className={`text-sm font-medium ${isLowTime ? 'text-orange-800' : timeDiff > 0 ? 'text-green-700' : 'text-orange-700'}`}>
              Tiempo por pregunta: <span className="font-mono font-bold">{Math.round(timePerQuestion)} seg</span>
              <span className={`ml-2 ${timeDiff > 0 ? 'text-green-600' : 'text-orange-600'}`}>
                ({timeDiff > 0 ? '+' : ''}{Math.round(timeDiff)} seg)
              </span>
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
