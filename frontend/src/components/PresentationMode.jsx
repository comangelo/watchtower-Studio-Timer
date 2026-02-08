import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  Play, 
  Pause, 
  RotateCcw, 
  X,
  Clock,
  Timer,
  MessageCircleQuestion
} from "lucide-react";

export default function PresentationMode({
  analysisResult,
  elapsedTime,
  remainingTime,
  startTime,
  endTime,
  isTimerRunning,
  toggleTimer,
  resetTimer,
  exitPresentationMode,
  getCurrentParagraph,
  finalQuestionsTime,
  formatTime,
  formatClockTime,
  progressPercentage
}) {
  const currentParagraph = getCurrentParagraph();
  
  // Handle ESC key to exit
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        exitPresentationMode();
      }
      if (e.key === ' ' || e.key === 'Space') {
        e.preventDefault();
        toggleTimer();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [exitPresentationMode, toggleTimer]);

  return (
    <div 
      className="fixed inset-0 z-[9999] bg-zinc-900 text-white flex flex-col"
      data-testid="presentation-mode"
    >
      {/* Top Bar */}
      <div className="flex items-center justify-between px-8 py-4 border-b border-zinc-800">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center">
            <Timer className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-heading font-bold text-lg">{analysisResult.filename}</h1>
            <p className="text-sm text-zinc-400">Modo Presentación</p>
          </div>
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={exitPresentationMode}
          className="text-zinc-400 hover:text-white hover:bg-zinc-800"
          data-testid="exit-presentation-btn"
        >
          <X className="w-5 h-5 mr-2" />
          Salir (ESC)
        </Button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 py-12">
        {/* Time Schedule */}
        {startTime && (
          <div className="flex items-center gap-12 mb-8 text-zinc-400">
            <div className="text-center">
              <p className="text-xs uppercase tracking-wider mb-1">Inicio</p>
              <p className="font-mono text-2xl text-green-400">{formatClockTime(startTime)}</p>
            </div>
            <div className="text-4xl text-zinc-600">→</div>
            <div className="text-center">
              <p className="text-xs uppercase tracking-wider mb-1">Fin (60 min)</p>
              <p className="font-mono text-2xl text-orange-400">{formatClockTime(endTime)}</p>
            </div>
            {finalQuestionsTime && (
              <>
                <div className="text-4xl text-zinc-600">|</div>
                <div className="text-center">
                  <p className="text-xs uppercase tracking-wider mb-1">Preguntas Finales</p>
                  <p className="font-mono text-2xl text-red-400">{formatClockTime(finalQuestionsTime)}</p>
                </div>
              </>
            )}
          </div>
        )}

        {/* Main Timers */}
        <div className="flex items-center gap-16 mb-12">
          {/* Elapsed Time */}
          <div className="text-center">
            <p className="text-sm uppercase tracking-widest text-zinc-500 mb-2">Tiempo Transcurrido</p>
            <div 
              className={`font-mono text-8xl md:text-9xl font-bold tracking-tighter tabular-nums ${isTimerRunning ? 'text-orange-500' : 'text-white'}`}
              data-testid="presentation-elapsed-time"
            >
              {formatTime(elapsedTime)}
            </div>
          </div>

          {/* Divider */}
          <div className="w-px h-32 bg-zinc-700" />

          {/* Remaining Time */}
          <div className="text-center">
            <p className="text-sm uppercase tracking-widest text-zinc-500 mb-2">Tiempo Restante</p>
            <div 
              className={`font-mono text-8xl md:text-9xl font-bold tracking-tighter tabular-nums ${remainingTime <= 300 ? 'text-red-500' : 'text-zinc-400'}`}
              data-testid="presentation-remaining-time"
            >
              {formatTime(remainingTime)}
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full max-w-4xl mb-8">
          <Progress value={progressPercentage} className="h-3 bg-zinc-800" />
          <p className="text-center text-sm text-zinc-500 mt-2">
            {progressPercentage.toFixed(0)}% completado
          </p>
        </div>

        {/* Current Paragraph Info */}
        {currentParagraph && (
          <div className="w-full max-w-4xl bg-zinc-800/50 rounded-2xl p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl font-bold text-orange-500">#{currentParagraph.number}</span>
                <span className="text-zinc-400">Párrafo actual</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm text-zinc-500">{currentParagraph.word_count} palabras</span>
                <span className="font-mono text-lg text-orange-400">{Math.round(currentParagraph.total_time_seconds)} seg</span>
              </div>
            </div>
            
            {currentParagraph.questions.length > 0 && (
              <div className="flex items-center gap-2 text-orange-400">
                <MessageCircleQuestion className="w-5 h-5" />
                <span>{currentParagraph.questions.length} pregunta{currentParagraph.questions.length > 1 ? 's' : ''} en este párrafo</span>
              </div>
            )}
          </div>
        )}

        {/* Controls */}
        <div className="flex items-center gap-6">
          <Button
            onClick={toggleTimer}
            size="lg"
            className={`
              rounded-full w-20 h-20 p-0 text-white
              ${isTimerRunning 
                ? 'bg-orange-500 hover:bg-orange-600' 
                : 'bg-green-600 hover:bg-green-700'
              }
            `}
            data-testid="presentation-toggle-btn"
          >
            {isTimerRunning 
              ? <Pause className="w-8 h-8" /> 
              : <Play className="w-8 h-8 ml-1" />
            }
          </Button>
          <Button
            onClick={resetTimer}
            variant="outline"
            size="lg"
            className="rounded-full w-14 h-14 p-0 border-zinc-600 text-zinc-400 hover:text-white hover:border-zinc-500"
            data-testid="presentation-reset-btn"
          >
            <RotateCcw className="w-6 h-6" />
          </Button>
        </div>

        <p className="text-sm text-zinc-600 mt-6">
          Presiona <kbd className="px-2 py-1 bg-zinc-800 rounded text-zinc-400">Espacio</kbd> para iniciar/pausar · <kbd className="px-2 py-1 bg-zinc-800 rounded text-zinc-400">ESC</kbd> para salir
        </p>
      </div>

      {/* Bottom Stats */}
      <div className="flex items-center justify-center gap-8 px-8 py-4 border-t border-zinc-800 text-sm text-zinc-500">
        <span>{analysisResult.total_paragraphs} párrafos</span>
        <span>·</span>
        <span>{analysisResult.total_words} palabras</span>
        <span>·</span>
        <span>{analysisResult.total_questions} preguntas</span>
        <span>·</span>
        <span>180 PPM</span>
      </div>
    </div>
  );
}
