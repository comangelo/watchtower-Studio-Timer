import { Timer, Scale, Info } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { formatTimeCompact } from "../utils/timeFormatters";

export function DurationAdjuster({ 
  totalDuration, 
  setTotalDuration, 
  originalTotalTime,
  scaleFactor,
  plannedPerQuestion = 35,
  answerTime = 35,
  readingFitsInTime = true,
  darkMode = false 
}) {
  // La lectura es fija; lo que cambia con la duración es el tiempo de comentario por pregunta
  const diff = plannedPerQuestion - answerTime;
  const isScaling = Math.abs(diff) >= 1;
  const isShorter = diff < 0;
  
  return (
    <Card className={`border shadow-sm overflow-hidden ${
      darkMode 
        ? 'bg-gradient-to-br from-zinc-800 to-zinc-900 border-zinc-600' 
        : 'bg-gradient-to-br from-orange-50 to-white border-orange-100'
    }`} data-testid="duration-adjuster">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
            darkMode ? 'bg-orange-900/50' : 'bg-orange-100'
          }`}>
            <Timer className={`w-4 h-4 ${darkMode ? 'text-orange-400' : 'text-orange-600'}`} />
          </div>
          <div className="flex-1">
            <h4 className={`font-semibold text-sm ${darkMode ? 'text-zinc-100' : 'text-slate-800'}`}>
              Ajuste de Duración
            </h4>
            <p className={`text-xs ${darkMode ? 'text-zinc-400' : 'text-slate-500'}`}>
              La lectura es fija; se ajusta el tiempo de comentarios
            </p>
          </div>
        </div>

        {/* Duration Slider */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className={`text-sm font-medium ${darkMode ? 'text-zinc-300' : 'text-slate-600'}`}>
              Duración total
            </span>
            <span className="text-xl font-bold text-orange-500" style={{ fontFamily: 'system-ui' }}>
              {totalDuration} min
            </span>
          </div>
          
          <Slider
            value={[totalDuration]}
            onValueChange={(value) => setTotalDuration(value[0])}
            min={15}
            max={90}
            step={1}
            className="w-full"
            data-testid="duration-adjuster-slider"
          />
          
          <div className={`flex justify-between text-xs ${darkMode ? 'text-zinc-500' : 'text-slate-400'}`}>
            <span>15 min</span>
            <span>90 min</span>
          </div>
        </div>

        {/* Comment time info */}
        <div className={`mt-4 p-3 rounded-xl border-2 ${
          !readingFitsInTime
            ? darkMode ? 'bg-red-950/50 border-red-800' : 'bg-red-50 border-red-200'
            : isScaling
              ? isShorter
                ? darkMode ? 'bg-orange-950/50 border-orange-800' : 'bg-orange-50 border-orange-200'
                : darkMode ? 'bg-green-950/50 border-green-800' : 'bg-green-50 border-green-200'
              : darkMode ? 'bg-zinc-700/50 border-zinc-600' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex items-center gap-2 mb-2">
            <Scale className={`w-4 h-4 ${
              isScaling
                ? isShorter ? 'text-orange-500' : 'text-green-500'
                : darkMode ? 'text-zinc-400' : 'text-slate-500'
            }`} />
            <span className={`text-sm font-semibold ${
              isScaling
                ? isShorter ? 'text-orange-600' : 'text-green-600'
                : darkMode ? 'text-zinc-300' : 'text-slate-600'
            }`}>
              Comentarios: {plannedPerQuestion} s por pregunta
            </span>
          </div>
          
          <div className={`text-xs ${darkMode ? 'text-zinc-400' : 'text-slate-500'}`}>
            <div className="flex justify-between mb-1">
              <span>Tiempo natural del artículo:</span>
              <span className="font-mono">{formatTimeCompact(originalTotalTime)}</span>
            </div>
            <div className="flex justify-between mb-1">
              <span>Tiempo configurado:</span>
              <span className="font-mono font-bold">{totalDuration} min</span>
            </div>
            <div className="flex justify-between">
              <span>Respuesta configurada:</span>
              <span className="font-mono">{answerTime} s</span>
            </div>
          </div>
          
          {(isScaling || !readingFitsInTime) && (
            <div className={`mt-2 pt-2 border-t text-xs flex items-center gap-1.5 ${
              !readingFitsInTime
                ? darkMode ? 'border-red-800 text-red-300' : 'border-red-200 text-red-600'
                : isShorter
                  ? darkMode ? 'border-orange-800 text-orange-300' : 'border-orange-200 text-orange-600'
                  : darkMode ? 'border-green-800 text-green-300' : 'border-green-200 text-green-600'
            }`}>
              <Info className="w-3.5 h-3.5 shrink-0" />
              {!readingFitsInTime
                ? 'La lectura, la introducción y la conclusión no caben en esta duración.'
                : isShorter
                  ? 'Hay menos tiempo del configurado para cada comentario.'
                  : 'Sobra tiempo: cada pregunta tendrá más tiempo de comentarios.'
              }
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
