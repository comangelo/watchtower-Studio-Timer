import { useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  Play, 
  Pause, 
  RotateCcw, 
  X,
  Clock,
  Timer,
  MessageCircleQuestion,
  Palette
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { formatTime, formatClockTime, addSecondsToDate } from "../utils/timeFormatters";

// Theme configurations
const THEMES = {
  dark: {
    name: "Oscuro",
    bg: "bg-zinc-900",
    text: "text-white",
    textMuted: "text-zinc-400",
    textDimmed: "text-zinc-500",
    border: "border-zinc-800",
    card: "bg-zinc-800/50",
    accent: "text-orange-500",
    accentBg: "bg-orange-500",
    success: "text-green-400",
    warning: "text-orange-400",
    danger: "text-red-400",
    progressBg: "bg-zinc-800",
    buttonOutline: "border-zinc-600 text-zinc-400 hover:text-white hover:border-zinc-500",
    kbd: "bg-zinc-800 text-zinc-400"
  },
  light: {
    name: "Claro",
    bg: "bg-white",
    text: "text-zinc-900",
    textMuted: "text-zinc-600",
    textDimmed: "text-zinc-400",
    border: "border-zinc-200",
    card: "bg-zinc-100",
    accent: "text-orange-600",
    accentBg: "bg-orange-500",
    success: "text-green-600",
    warning: "text-orange-600",
    danger: "text-red-600",
    progressBg: "bg-zinc-200",
    buttonOutline: "border-zinc-300 text-zinc-600 hover:text-zinc-900 hover:border-zinc-400",
    kbd: "bg-zinc-200 text-zinc-600"
  },
  blue: {
    name: "Azul Océano",
    bg: "bg-slate-900",
    text: "text-white",
    textMuted: "text-slate-400",
    textDimmed: "text-slate-500",
    border: "border-slate-700",
    card: "bg-slate-800/50",
    accent: "text-cyan-400",
    accentBg: "bg-cyan-500",
    success: "text-emerald-400",
    warning: "text-amber-400",
    danger: "text-rose-400",
    progressBg: "bg-slate-800",
    buttonOutline: "border-slate-600 text-slate-400 hover:text-white hover:border-slate-500",
    kbd: "bg-slate-800 text-slate-400"
  },
  green: {
    name: "Verde Bosque",
    bg: "bg-emerald-950",
    text: "text-white",
    textMuted: "text-emerald-300",
    textDimmed: "text-emerald-400",
    border: "border-emerald-800",
    card: "bg-emerald-900/50",
    accent: "text-lime-400",
    accentBg: "bg-lime-500",
    success: "text-green-400",
    warning: "text-yellow-400",
    danger: "text-red-400",
    progressBg: "bg-emerald-900",
    buttonOutline: "border-emerald-700 text-emerald-400 hover:text-white hover:border-emerald-600",
    kbd: "bg-emerald-900 text-emerald-400"
  },
  purple: {
    name: "Púrpura Noche",
    bg: "bg-violet-950",
    text: "text-white",
    textMuted: "text-violet-300",
    textDimmed: "text-violet-400",
    border: "border-violet-800",
    card: "bg-violet-900/50",
    accent: "text-fuchsia-400",
    accentBg: "bg-fuchsia-500",
    success: "text-emerald-400",
    warning: "text-amber-400",
    danger: "text-rose-400",
    progressBg: "bg-violet-900",
    buttonOutline: "border-violet-700 text-violet-400 hover:text-white hover:border-violet-600",
    kbd: "bg-violet-900 text-violet-400"
  },
  warm: {
    name: "Cálido Atardecer",
    bg: "bg-amber-950",
    text: "text-white",
    textMuted: "text-amber-200",
    textDimmed: "text-amber-300",
    border: "border-amber-800",
    card: "bg-amber-900/50",
    accent: "text-yellow-400",
    accentBg: "bg-yellow-500",
    success: "text-lime-400",
    warning: "text-orange-400",
    danger: "text-red-400",
    progressBg: "bg-amber-900",
    buttonOutline: "border-amber-700 text-amber-400 hover:text-white hover:border-amber-600",
    kbd: "bg-amber-900 text-amber-400"
  },
  highContrast: {
    name: "Alto Contraste",
    bg: "bg-black",
    text: "text-white",
    textMuted: "text-yellow-300",
    textDimmed: "text-yellow-400",
    border: "border-yellow-500",
    card: "bg-zinc-900",
    accent: "text-yellow-400",
    accentBg: "bg-yellow-500",
    success: "text-green-400",
    warning: "text-yellow-400",
    danger: "text-red-500",
    progressBg: "bg-zinc-900",
    buttonOutline: "border-yellow-500 text-yellow-400 hover:text-yellow-300 hover:border-yellow-400",
    kbd: "bg-zinc-900 text-yellow-400"
  }
};

export default function PresentationMode({
  analysisResult,
  elapsedTime,
  remainingTime,
  isTimerRunning,
  onToggleTimer,
  onResetTimer,
  onExit,
  currentParagraphIndex = 0,
  theme = 'dark',
  onThemeChange
}) {
  // Calculate derived values
  const currentParagraph = useMemo(() => {
    if (!analysisResult || !analysisResult.paragraphs) return null;
    return analysisResult.paragraphs[currentParagraphIndex] || null;
  }, [analysisResult, currentParagraphIndex]);
  
  const progressPercentage = useMemo(() => {
    return Math.min(100, (elapsedTime / 3600) * 100);
  }, [elapsedTime]);
  
  // Calculate start and end times based on elapsed time
  const startTime = useMemo(() => {
    if (elapsedTime === 0 && !isTimerRunning) return null;
    return new Date(Date.now() - elapsedTime * 1000);
  }, [elapsedTime, isTimerRunning]);
  
  const endTime = useMemo(() => {
    if (!startTime) return null;
    return addSecondsToDate(startTime, 3600);
  }, [startTime]);
  
  // Calculate final questions time
  const finalQuestionsTime = useMemo(() => {
    if (!startTime || !analysisResult) return null;
    if (analysisResult.final_questions_start_time > 0) {
      return addSecondsToDate(startTime, analysisResult.final_questions_start_time);
    }
    return null;
  }, [startTime, analysisResult]);
  
  const t = THEMES[theme] || THEMES.dark;
  
  // Handle ESC key to exit
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onExit();
      }
      if (e.key === ' ' || e.key === 'Space') {
        e.preventDefault();
        onToggleTimer();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onExit, onToggleTimer]);

  return (
    <div 
      className={`fixed inset-0 z-[9999] ${t.bg} ${t.text} flex flex-col`}
      data-testid="presentation-mode"
    >
      {/* Top Bar */}
      <div className={`flex items-center justify-between px-8 py-4 border-b ${t.border}`}>
        <div className="flex items-center gap-4">
          <div className={`w-10 h-10 ${t.accentBg} rounded-xl flex items-center justify-center`}>
            <Timer className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-heading font-bold text-lg">{analysisResult.filename}</h1>
            <p className={`text-sm ${t.textMuted}`}>Modo Presentación</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Theme Selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={`${t.textMuted} hover:${t.text}`}
                data-testid="theme-selector-btn"
              >
                <Palette className="w-5 h-5 mr-2" />
                Tema
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Seleccionar Tema</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {Object.entries(THEMES).map(([key, value]) => (
                <DropdownMenuItem
                  key={key}
                  onClick={() => setTheme(key)}
                  className={theme === key ? 'bg-accent' : ''}
                  data-testid={`theme-${key}`}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-4 h-4 rounded-full ${value.accentBg}`} />
                    <span>{value.name}</span>
                    {theme === key && <span className="ml-auto">✓</span>}
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="ghost"
            size="sm"
            onClick={exitPresentationMode}
            className={`${t.textMuted} hover:${t.text}`}
            data-testid="exit-presentation-btn"
          >
            <X className="w-5 h-5 mr-2" />
            Salir (ESC)
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 py-12">
        {/* Time Schedule */}
        {startTime && (
          <div className={`flex items-center gap-12 mb-8 ${t.textMuted}`}>
            <div className="text-center">
              <p className="text-xs uppercase tracking-wider mb-1">Inicio</p>
              <p className={`font-mono text-2xl ${t.success}`}>{formatClockTime(startTime)}</p>
            </div>
            <div className={`text-4xl ${t.textDimmed}`}>→</div>
            <div className="text-center">
              <p className="text-xs uppercase tracking-wider mb-1">Fin (60 min)</p>
              <p className={`font-mono text-2xl ${t.warning}`}>{formatClockTime(endTime)}</p>
            </div>
            {finalQuestionsTime && (
              <>
                <div className={`text-4xl ${t.textDimmed}`}>|</div>
                <div className="text-center">
                  <p className="text-xs uppercase tracking-wider mb-1">Preguntas Finales</p>
                  <p className={`font-mono text-2xl ${t.danger}`}>{formatClockTime(finalQuestionsTime)}</p>
                </div>
              </>
            )}
          </div>
        )}

        {/* Main Timers */}
        <div className="flex items-center gap-16 mb-12">
          {/* Elapsed Time */}
          <div className="text-center">
            <p className={`text-sm uppercase tracking-widest ${t.textDimmed} mb-2`}>Tiempo Transcurrido</p>
            <div 
              className={`font-mono text-8xl md:text-9xl font-bold tracking-tighter tabular-nums ${isTimerRunning ? t.accent : t.text}`}
              data-testid="presentation-elapsed-time"
            >
              {formatTime(elapsedTime)}
            </div>
          </div>

          {/* Divider */}
          <div className={`w-px h-32 ${t.border.replace('border-', 'bg-')}`} />

          {/* Remaining Time */}
          <div className="text-center">
            <p className={`text-sm uppercase tracking-widest ${t.textDimmed} mb-2`}>Tiempo Restante</p>
            <div 
              className={`font-mono text-8xl md:text-9xl font-bold tracking-tighter tabular-nums ${remainingTime <= 300 ? t.danger : t.textMuted}`}
              data-testid="presentation-remaining-time"
            >
              {formatTime(remainingTime)}
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full max-w-4xl mb-8">
          <Progress value={progressPercentage} className={`h-3 ${t.progressBg}`} />
          <p className={`text-center text-sm ${t.textDimmed} mt-2`}>
            {progressPercentage.toFixed(0)}% completado
          </p>
        </div>

        {/* Current Paragraph Info */}
        {currentParagraph && (
          <div className={`w-full max-w-4xl ${t.card} rounded-2xl p-6 mb-8`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className={`text-2xl font-bold ${t.accent}`}>#{currentParagraph.number}</span>
                <span className={t.textMuted}>Párrafo actual</span>
              </div>
              <div className="flex items-center gap-4">
                <span className={`text-sm ${t.textDimmed}`}>{currentParagraph.word_count} palabras</span>
                <span className={`font-mono text-lg ${t.warning}`}>{Math.round(currentParagraph.total_time_seconds)} seg</span>
              </div>
            </div>
            
            {currentParagraph.questions.length > 0 && (
              <div className={`flex items-center gap-2 ${t.warning}`}>
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
                ? t.accentBg + ' hover:opacity-90' 
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
            className={`rounded-full w-14 h-14 p-0 ${t.buttonOutline}`}
            data-testid="presentation-reset-btn"
          >
            <RotateCcw className="w-6 h-6" />
          </Button>
        </div>

        <p className={`text-sm ${t.textDimmed} mt-6`}>
          Presiona <kbd className={`px-2 py-1 ${t.kbd} rounded`}>Espacio</kbd> para iniciar/pausar · <kbd className={`px-2 py-1 ${t.kbd} rounded`}>ESC</kbd> para salir
        </p>
      </div>

      {/* Bottom Stats */}
      <div className={`flex items-center justify-center gap-8 px-8 py-4 border-t ${t.border} text-sm ${t.textDimmed}`}>
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
