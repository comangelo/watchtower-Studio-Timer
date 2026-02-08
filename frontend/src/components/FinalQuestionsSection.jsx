import { Clock, Timer, MessageCircleQuestion, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatClockTime, addSecondsToDate } from "../utils/timeFormatters";

export function FinalQuestionsSection({ 
  finalQuestions, 
  startTime, 
  isTimerRunning, 
  adjustedTimes, 
  getQuestionTime, 
  originalStartTime 
}) {
  if (!finalQuestions || finalQuestions.length === 0) return null;
  
  const totalTime = isTimerRunning && adjustedTimes.totalTime 
    ? adjustedTimes.totalTime 
    : finalQuestions.length * 35;
  
  const perQuestionTime = isTimerRunning && adjustedTimes.perQuestion
    ? adjustedTimes.perQuestion
    : 35;
  
  const isAdjusted = isTimerRunning && perQuestionTime !== 35;
  const timeDiff = perQuestionTime - 35;
  const isLowTime = isTimerRunning && perQuestionTime < 20;
  const isCriticalTime = isTimerRunning && perQuestionTime < 10;

  return (
    <Card className={`shadow-sm ${isCriticalTime ? 'border-red-600 bg-red-100 animate-pulse' : isLowTime ? 'border-orange-500 bg-orange-100' : 'border-red-300 bg-red-50/30'}`} data-testid="final-questions-section">
      {/* Low Time Alert Banner */}
      {isLowTime && (
        <div className={`${isCriticalTime ? 'bg-red-600' : 'bg-orange-500'} text-white px-4 py-2 flex items-center justify-center gap-2`}>
          <AlertCircle className="w-5 h-5 animate-bounce" />
          <span className="font-bold">
            {isCriticalTime 
              ? '¡CRÍTICO! Menos de 10 seg por pregunta' 
              : '¡ALERTA! Tiempo por pregunta muy bajo'}
          </span>
          <AlertCircle className="w-5 h-5 animate-bounce" />
        </div>
      )}
      
      <CardHeader className="pb-3">
        <CardTitle className="font-heading text-lg text-red-700 flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          Preguntas de Repaso
          <Badge variant="destructive" className="ml-2">{finalQuestions.length}</Badge>
        </CardTitle>
        <p className="text-sm text-red-600">
          Preguntas después de "¿QUÉ RESPONDERÍAS?" - {Math.round(totalTime)} seg total
          {isAdjusted && (
            <span className={`ml-2 font-medium ${timeDiff > 0 ? 'text-green-600' : isLowTime ? 'text-red-600 font-bold' : 'text-orange-600'}`}>
              ({timeDiff > 0 ? '+' : ''}{Math.round(timeDiff)} seg/pregunta)
            </span>
          )}
        </p>
        
        {/* Time indicator for final questions */}
        {startTime && (
          <div className="mt-3 flex items-center gap-4 text-xs flex-wrap">
            <div className="flex items-center gap-1 px-3 py-2 bg-red-100 rounded-lg">
              <Clock className="w-4 h-4 text-red-600" />
              <span className="text-red-700 font-medium">Inicio:</span>
              <span className="font-mono font-bold text-red-800 text-sm">
                {isTimerRunning && adjustedTimes.start 
                  ? formatClockTime(adjustedTimes.start)
                  : formatClockTime(addSecondsToDate(startTime, originalStartTime))
                }
              </span>
            </div>
            <div className="flex items-center gap-1 px-3 py-2 bg-red-200 rounded-lg">
              <Clock className="w-4 h-4 text-red-700" />
              <span className="text-red-700 font-medium">Fin:</span>
              <span className="font-mono font-bold text-red-900 text-sm">
                {isTimerRunning && adjustedTimes.end
                  ? formatClockTime(adjustedTimes.end)
                  : formatClockTime(addSecondsToDate(startTime, originalStartTime + (finalQuestions.length * 35)))
                }
              </span>
            </div>
            <div className={`flex items-center gap-1 px-3 py-2 rounded-lg ${
              isCriticalTime ? 'bg-red-600 text-white' :
              isLowTime ? 'bg-orange-500 text-white' :
              isAdjusted ? (timeDiff > 0 ? 'bg-green-100' : 'bg-orange-100') : 'bg-zinc-100'
            }`}>
              <Timer className={`w-4 h-4 ${isCriticalTime || isLowTime ? 'text-white animate-pulse' : isAdjusted ? (timeDiff > 0 ? 'text-green-600' : 'text-orange-600') : 'text-zinc-600'}`} />
              <span className={`font-medium ${isCriticalTime || isLowTime ? 'text-white' : isAdjusted ? (timeDiff > 0 ? 'text-green-700' : 'text-orange-700') : 'text-zinc-700'}`}>
                Por pregunta:
              </span>
              <span className={`font-mono font-bold text-sm ${isCriticalTime || isLowTime ? 'text-white' : isAdjusted ? (timeDiff > 0 ? 'text-green-800' : 'text-orange-800') : 'text-zinc-800'}`}>
                {Math.round(perQuestionTime)} seg
              </span>
              {isAdjusted && !isLowTime && (
                <span className={`text-xs ${timeDiff > 0 ? 'text-green-600' : 'text-orange-600'}`}>
                  (orig: 35s)
                </span>
              )}
            </div>
          </div>
        )}
        
        {/* Low time warning message */}
        {isLowTime && (
          <div className={`mt-3 p-3 rounded-lg ${isCriticalTime ? 'bg-red-200 border-2 border-red-600' : 'bg-orange-200 border-2 border-orange-500'}`}>
            <p className={`text-sm font-bold ${isCriticalTime ? 'text-red-800' : 'text-orange-800'}`}>
              {isCriticalTime 
                ? '🚨 ¡Situación crítica! Las respuestas deben ser MUY breves o no habrá tiempo suficiente.'
                : '⚠️ ¡Acelera la lectura! El tiempo por pregunta está muy bajo.'}
            </p>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-2">
        {finalQuestions.map((q, idx) => (
          <div 
            key={idx}
            className={`border-l-4 rounded-lg py-3 px-4 text-sm ${
              isCriticalTime ? 'bg-red-200 border-red-600 text-red-900' :
              isLowTime ? 'bg-orange-200 border-orange-500 text-orange-900' :
              'bg-red-100 border-red-500 text-red-800'
            }`}
            data-testid={`final-question-${idx}`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <MessageCircleQuestion className={`w-4 h-4 inline mr-2 ${isCriticalTime ? 'text-red-700' : isLowTime ? 'text-orange-700' : 'text-red-500'}`} />
                {q.text}
              </div>
              <div className="flex items-center gap-2 ml-3">
                <span className={`text-xs font-mono whitespace-nowrap font-bold ${
                  isCriticalTime ? 'text-red-700' :
                  isLowTime ? 'text-orange-700' :
                  isAdjusted ? (timeDiff > 0 ? 'text-green-600' : 'text-orange-600') : 'text-red-500'
                }`}>
                  +{Math.round(perQuestionTime)} seg
                </span>
                {startTime && (
                  <span className={`text-xs px-2 py-1 rounded font-mono whitespace-nowrap ${
                    isCriticalTime ? 'bg-red-300 text-red-800' :
                    isLowTime ? 'bg-orange-300 text-orange-800' :
                    'bg-red-200 text-red-700'
                  }`}>
                    {isTimerRunning && getQuestionTime
                      ? formatClockTime(getQuestionTime(idx))
                      : formatClockTime(addSecondsToDate(startTime, originalStartTime + (idx * 35)))
                    }
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
