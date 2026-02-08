import { Clock, Timer, MessageCircleQuestion, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatClockTime, addSecondsToDate, formatTimeCompact } from "../utils/timeFormatters";

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
    <Card className={`shadow-sm rounded-2xl ${isCriticalTime ? 'border-red-500 bg-red-50' : isLowTime ? 'border-orange-400 bg-orange-50' : 'border-red-200 bg-red-50/30'}`} data-testid="final-questions-section">
      {/* Low Time Alert Banner */}
      {isLowTime && (
        <div className={`${isCriticalTime ? 'bg-red-500' : 'bg-orange-500'} text-white px-4 py-2 flex items-center justify-center gap-2 rounded-t-2xl`}>
          <AlertCircle className="w-4 h-4" />
          <span className="text-sm font-medium">
            {isCriticalTime ? '¡Tiempo crítico!' : '¡Acelera!'}
          </span>
        </div>
      )}
      
      <CardHeader className="pb-3">
        <CardTitle className="text-base text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          Preguntas de Repaso
          <Badge variant="destructive" className="ml-2 text-xs">{finalQuestions.length}</Badge>
        </CardTitle>
        <p className="text-sm text-red-600">
          Después de "¿QUÉ RESPONDERÍA?"
        </p>
        
        {/* Time indicators - Minimalist */}
        {startTime && (
          <div className="mt-4 flex items-center gap-6 text-sm">
            <div className="text-center">
              <span className="text-red-400 text-xs block mb-1">Inicio</span>
              <span className="text-lg font-light text-red-700" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
                {isTimerRunning && adjustedTimes.start 
                  ? formatClockTime(adjustedTimes.start)
                  : formatClockTime(addSecondsToDate(startTime, originalStartTime))
                }
              </span>
            </div>
            <div className="text-red-300">—</div>
            <div className="text-center">
              <span className="text-red-400 text-xs block mb-1">Fin</span>
              <span className="text-lg font-light text-red-700" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
                {isTimerRunning && adjustedTimes.end
                  ? formatClockTime(adjustedTimes.end)
                  : formatClockTime(addSecondsToDate(startTime, originalStartTime + (finalQuestions.length * 35)))
                }
              </span>
            </div>
            <div className="text-red-300">|</div>
            <div className={`text-center px-3 py-2 rounded-lg ${
              isCriticalTime ? 'bg-red-200' :
              isLowTime ? 'bg-orange-200' :
              isAdjusted ? (timeDiff > 0 ? 'bg-green-100' : 'bg-orange-100') : 'bg-red-100'
            }`}>
              <span className="text-xs block mb-1 text-slate-500">Por pregunta</span>
              <span 
                className={`text-xl font-light ${
                  isCriticalTime ? 'text-red-700' :
                  isLowTime ? 'text-orange-700' :
                  isAdjusted ? (timeDiff > 0 ? 'text-green-700' : 'text-orange-700') : 'text-red-700'
                }`}
                style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
              >
                {Math.round(perQuestionTime)}s
              </span>
              {isAdjusted && (
                <span className={`text-xs block ${timeDiff > 0 ? 'text-green-600' : 'text-orange-600'}`}>
                  {timeDiff > 0 ? '+' : ''}{Math.round(timeDiff)}s
                </span>
              )}
            </div>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-2 pt-0">
        {finalQuestions.map((q, idx) => (
          <div 
            key={idx}
            className={`rounded-xl py-3 px-4 text-sm ${
              isCriticalTime ? 'bg-red-100 text-red-900' :
              isLowTime ? 'bg-orange-100 text-orange-900' :
              'bg-red-100/50 text-red-800'
            }`}
            data-testid={`final-question-${idx}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 flex items-start gap-2">
                <MessageCircleQuestion className={`w-4 h-4 mt-0.5 flex-shrink-0 ${isCriticalTime ? 'text-red-600' : isLowTime ? 'text-orange-600' : 'text-red-500'}`} />
                <span>{q.text}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`text-sm font-light px-2 py-0.5 rounded-full ${
                  isCriticalTime ? 'bg-red-200 text-red-700' :
                  isLowTime ? 'bg-orange-200 text-orange-700' :
                  isAdjusted ? (timeDiff > 0 ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700') : 
                  'bg-red-200 text-red-600'
                }`} style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
                  +{formatTimeCompact(perQuestionTime)}
                </span>
                {startTime && (
                  <span className="text-xs text-red-500" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
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
