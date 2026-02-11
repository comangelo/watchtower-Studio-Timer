import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  Play, 
  Pause, 
  RotateCcw, 
  X,
  Timer,
  Palette,
  ChevronRight,
  Mic,
  BookOpen,
  HelpCircle,
  Sparkles,
  CheckCircle2
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { formatTime, formatClockTime, formatTimeCompact } from "../utils/timeFormatters";

// Theme configurations
const THEMES = {
  dark: {
    name: "🌙 Oscuro",
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
    name: "☀️ Claro",
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
    name: "🌊 Azul Océano",
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
  amoled: {
    name: "📱 AMOLED Negro",
    bg: "bg-black",
    text: "text-white",
    textMuted: "text-zinc-400",
    textDimmed: "text-zinc-500",
    border: "border-zinc-800",
    card: "bg-zinc-950",
    accent: "text-orange-500",
    accentBg: "bg-orange-500",
    success: "text-green-500",
    warning: "text-orange-500",
    danger: "text-red-500",
    progressBg: "bg-zinc-950",
    buttonOutline: "border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-600",
    kbd: "bg-zinc-950 text-zinc-400"
  }
};

// Study phases
const PHASES = {
  INTRO: 'intro',
  PARAGRAPHS: 'paragraphs',
  REVIEW: 'review',
  CONCLUSION: 'conclusion',
  FINISHED: 'finished'
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
  onParagraphChange,
  theme = 'dark',
  onThemeChange,
  totalDurationSeconds = 3600,
  startTime,
  endTime,
  introductionTime = 60,
  conclusionTime = 60,
  onStartStudy,
  studyPhase: externalStudyPhase,
  onPhaseChange
}) {
  // Internal study phase state (can be controlled externally)
  const [internalPhase, setInternalPhase] = useState(PHASES.INTRO);
  const [currentReviewQuestion, setCurrentReviewQuestion] = useState(0);
  const [phaseElapsed, setPhaseElapsed] = useState(0);
  
  // Use external phase if provided, otherwise use internal
  const studyPhase = externalStudyPhase || internalPhase;
  const setStudyPhase = onPhaseChange || setInternalPhase;
  
  // Phase timer
  useEffect(() => {
    let interval;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setPhaseElapsed(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning]);
  
  // Reset phase elapsed when phase changes
  useEffect(() => {
    setPhaseElapsed(0);
  }, [studyPhase, currentParagraphIndex, currentReviewQuestion]);

  // Calculate derived values
  const currentParagraph = useMemo(() => {
    if (!analysisResult || !analysisResult.paragraphs) return null;
    return analysisResult.paragraphs[currentParagraphIndex] || null;
  }, [analysisResult, currentParagraphIndex]);
  
  const currentReviewQuestionData = useMemo(() => {
    if (!analysisResult || !analysisResult.final_questions) return null;
    return analysisResult.final_questions[currentReviewQuestion] || null;
  }, [analysisResult, currentReviewQuestion]);
  
  const progressPercentage = useMemo(() => {
    return Math.min(100, (elapsedTime / totalDurationSeconds) * 100);
  }, [elapsedTime, totalDurationSeconds]);
  
  const isLowTime = remainingTime <= 300;
  const isOvertime = remainingTime <= 0;
  
  const t = THEMES[theme] || THEMES.dark;
  
  // Get phase-specific info
  const getPhaseInfo = () => {
    switch (studyPhase) {
      case PHASES.INTRO:
        return {
          title: "Palabras de Introducción",
          icon: Mic,
          color: "text-blue-400",
          bgColor: "bg-blue-500",
          estimatedTime: introductionTime,
          subtitle: "El conductor introduce el tema del artículo"
        };
      case PHASES.PARAGRAPHS:
        return {
          title: `Párrafo ${currentParagraph?.number || 1}`,
          icon: BookOpen,
          color: "text-green-400",
          bgColor: "bg-green-500",
          estimatedTime: currentParagraph?.total_time_seconds || 60,
          subtitle: `de ${analysisResult?.total_paragraphs || 0} párrafos`
        };
      case PHASES.REVIEW:
        return {
          title: `Pregunta de Repaso ${currentReviewQuestion + 1}`,
          icon: HelpCircle,
          color: "text-red-400",
          bgColor: "bg-red-500",
          estimatedTime: currentReviewQuestionData?.answer_time || 35,
          subtitle: `de ${analysisResult?.final_questions?.length || 0} preguntas`
        };
      case PHASES.CONCLUSION:
        return {
          title: "Palabras de Conclusión",
          icon: Sparkles,
          color: "text-purple-400",
          bgColor: "bg-purple-500",
          estimatedTime: conclusionTime,
          subtitle: "El conductor resume y anima a la congregación"
        };
      case PHASES.FINISHED:
        return {
          title: "¡Estudio Finalizado!",
          icon: CheckCircle2,
          color: "text-green-400",
          bgColor: "bg-green-500",
          estimatedTime: 0,
          subtitle: "Gracias por tu dedicación"
        };
      default:
        return { title: "", icon: Timer, color: "", bgColor: "", estimatedTime: 0, subtitle: "" };
    }
  };
  
  const phaseInfo = getPhaseInfo();
  const PhaseIcon = phaseInfo.icon;
  const isPhaseOvertime = phaseElapsed > phaseInfo.estimatedTime;
  
  // Navigation handlers
  const handleStartStudy = () => {
    if (onStartStudy) {
      onStartStudy();
    } else {
      onToggleTimer();
    }
    setStudyPhase(PHASES.INTRO);
  };
  
  const handleNextStep = () => {
    setPhaseElapsed(0);
    
    switch (studyPhase) {
      case PHASES.INTRO:
        setStudyPhase(PHASES.PARAGRAPHS);
        if (onParagraphChange) onParagraphChange(0);
        break;
      case PHASES.PARAGRAPHS:
        if (currentParagraphIndex < (analysisResult?.paragraphs?.length || 1) - 1) {
          if (onParagraphChange) onParagraphChange(currentParagraphIndex + 1);
        } else {
          // Last paragraph - go to review questions
          if (analysisResult?.final_questions?.length > 0) {
            setStudyPhase(PHASES.REVIEW);
            setCurrentReviewQuestion(0);
          } else {
            setStudyPhase(PHASES.CONCLUSION);
          }
        }
        break;
      case PHASES.REVIEW:
        if (currentReviewQuestion < (analysisResult?.final_questions?.length || 1) - 1) {
          setCurrentReviewQuestion(prev => prev + 1);
        } else {
          setStudyPhase(PHASES.CONCLUSION);
        }
        break;
      case PHASES.CONCLUSION:
        setStudyPhase(PHASES.FINISHED);
        onToggleTimer(); // Stop timer
        break;
      default:
        break;
    }
  };
  
  const handlePrevStep = () => {
    setPhaseElapsed(0);
    
    switch (studyPhase) {
      case PHASES.PARAGRAPHS:
        if (currentParagraphIndex > 0) {
          if (onParagraphChange) onParagraphChange(currentParagraphIndex - 1);
        } else {
          setStudyPhase(PHASES.INTRO);
        }
        break;
      case PHASES.REVIEW:
        if (currentReviewQuestion > 0) {
          setCurrentReviewQuestion(prev => prev - 1);
        } else {
          setStudyPhase(PHASES.PARAGRAPHS);
          if (onParagraphChange) onParagraphChange((analysisResult?.paragraphs?.length || 1) - 1);
        }
        break;
      case PHASES.CONCLUSION:
        if (analysisResult?.final_questions?.length > 0) {
          setStudyPhase(PHASES.REVIEW);
          setCurrentReviewQuestion((analysisResult?.final_questions?.length || 1) - 1);
        } else {
          setStudyPhase(PHASES.PARAGRAPHS);
          if (onParagraphChange) onParagraphChange((analysisResult?.paragraphs?.length || 1) - 1);
        }
        break;
      default:
        break;
    }
  };
  
  // Get next button text
  const getNextButtonText = () => {
    switch (studyPhase) {
      case PHASES.INTRO:
        return "Pasar al Párrafo 1";
      case PHASES.PARAGRAPHS:
        if (currentParagraphIndex < (analysisResult?.paragraphs?.length || 1) - 1) {
          return `Siguiente Párrafo (${currentParagraphIndex + 2})`;
        }
        return analysisResult?.final_questions?.length > 0 
          ? "Pasar a Preguntas de Repaso" 
          : "Palabras de Conclusión";
      case PHASES.REVIEW:
        if (currentReviewQuestion < (analysisResult?.final_questions?.length || 1) - 1) {
          return `Siguiente Pregunta (${currentReviewQuestion + 2})`;
        }
        return "Palabras de Conclusión";
      case PHASES.CONCLUSION:
        return "Finalizar Estudio";
      default:
        return "Siguiente";
    }
  };

  // Handle ESC key to exit
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onExit();
      }
      if (e.key === ' ' || e.key === 'Space') {
        e.preventDefault();
        if (studyPhase === PHASES.INTRO && !isTimerRunning) {
          handleStartStudy();
        } else {
          onToggleTimer();
        }
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (isTimerRunning) handleNextStep();
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (isTimerRunning) handlePrevStep();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onExit, onToggleTimer, studyPhase, isTimerRunning, currentParagraphIndex, currentReviewQuestion]);

  const formatRemainingTime = (seconds) => {
    const isNegative = seconds < 0;
    const absSeconds = Math.abs(seconds);
    const hours = Math.floor(absSeconds / 3600);
    const mins = Math.floor((absSeconds % 3600) / 60);
    const secs = absSeconds % 60;
    
    if (hours > 0) {
      return `${isNegative ? '-' : ''}${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${isNegative ? '-' : ''}${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div 
      className={`fixed inset-0 z-[9999] ${t.bg} ${t.text} flex flex-col`}
      data-testid="presentation-mode"
    >
      {/* Top Bar */}
      <div className={`flex items-center justify-between px-4 md:px-8 py-2 border-b ${t.border} shrink-0`}>
        <div className="flex items-center gap-4">
          <div className={`w-8 h-8 md:w-10 md:h-10 ${t.accentBg} rounded-xl flex items-center justify-center`}>
            <Timer className="w-4 h-4 md:w-5 md:h-5 text-white" />
          </div>
          <div>
            <h1 className="font-heading font-bold text-sm md:text-lg truncate max-w-[200px] md:max-w-none">{analysisResult.filename}</h1>
            <p className={`text-xs ${t.textMuted} hidden md:block`}>ATALAYA DE ESTUDIO</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Theme Selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className={`${t.textMuted} hover:${t.text}`}>
                <Palette className="w-4 h-4 md:mr-2" />
                <span className="hidden md:inline">Tema</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Seleccionar Tema</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {Object.entries(THEMES).map(([key, value]) => (
                <DropdownMenuItem
                  key={key}
                  onClick={() => onThemeChange(key)}
                  className={theme === key ? 'bg-accent' : ''}
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

          <Button variant="ghost" size="sm" onClick={onExit} className={`${t.textMuted} hover:${t.text}`}>
            <X className="w-4 h-4 md:mr-2" />
            <span className="hidden md:inline">Salir</span>
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 md:px-8 py-4 overflow-auto">
        
        {/* Time Schedule */}
        <div className={`${t.card} rounded-2xl px-6 md:px-12 py-4 md:py-6 mb-4 md:mb-6 border ${t.border} w-full max-w-xl`}>
          <div className="flex items-center justify-center gap-6 md:gap-14">
            <div className="text-center">
              <span className="text-[10px] md:text-xs font-bold text-emerald-400 uppercase tracking-widest">Inicio</span>
              <p className={`text-2xl md:text-4xl font-bold mt-1 ${startTime ? 'text-emerald-400' : 'text-emerald-400/60'}`}
                style={{ fontFamily: 'system-ui' }}>
                {startTime ? formatClockTime(startTime) : '--:--'}
              </p>
            </div>
            <div className="flex flex-col items-center">
              <div className={`w-8 md:w-14 h-px ${t.border.replace('border-', 'bg-')} opacity-60`}></div>
              <span className="text-xs md:text-sm font-bold text-orange-400 my-1">{Math.round(totalDurationSeconds / 60)} min</span>
              <div className={`w-8 md:w-14 h-px ${t.border.replace('border-', 'bg-')} opacity-60`}></div>
            </div>
            <div className="text-center">
              <span className={`text-[10px] md:text-xs font-bold uppercase tracking-widest ${isOvertime ? 'text-rose-400' : isLowTime ? 'text-rose-400' : 'text-amber-400'}`}>Fin</span>
              <p className={`text-2xl md:text-4xl font-bold mt-1 ${
                !endTime ? 'text-amber-400/60' : isOvertime ? 'text-rose-400 animate-pulse' : isLowTime ? 'text-rose-400' : 'text-amber-400'
              }`} style={{ fontFamily: 'system-ui' }}>
                {endTime ? formatClockTime(endTime) : '--:--'}
              </p>
            </div>
          </div>
        </div>

        {/* Current Phase Card */}
        <div className={`w-full max-w-xl ${t.card} rounded-2xl p-4 md:p-6 mb-4 border ${t.border}`}>
          <div className="flex items-center gap-4 mb-4">
            <div className={`w-12 h-12 ${phaseInfo.bgColor} rounded-xl flex items-center justify-center`}>
              <PhaseIcon className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h2 className={`text-xl md:text-2xl font-bold ${phaseInfo.color}`}>{phaseInfo.title}</h2>
              <p className={`text-sm ${t.textMuted}`}>{phaseInfo.subtitle}</p>
            </div>
            {studyPhase !== PHASES.FINISHED && (
              <div className="text-right">
                <p className={`text-2xl md:text-3xl font-bold ${isPhaseOvertime ? 'text-red-400' : t.text}`}>
                  {formatTimeCompact(phaseElapsed)}
                </p>
                <p className={`text-xs ${t.textDimmed}`}>/ {formatTimeCompact(phaseInfo.estimatedTime)}</p>
              </div>
            )}
          </div>
          
          {/* Phase Progress Bar */}
          {studyPhase !== PHASES.FINISHED && phaseInfo.estimatedTime > 0 && (
            <div className={`h-2 rounded-full ${t.progressBg} overflow-hidden`}>
              <div 
                className={`h-full rounded-full transition-all duration-500 ${
                  isPhaseOvertime ? 'bg-red-500' : phaseInfo.bgColor
                }`}
                style={{ width: `${Math.min(100, (phaseElapsed / phaseInfo.estimatedTime) * 100)}%` }}
              />
            </div>
          )}
          
          {/* Question text for review phase */}
          {studyPhase === PHASES.REVIEW && currentReviewQuestionData && (
            <div className={`mt-4 p-4 rounded-xl ${t.progressBg}`}>
              <p className={`text-sm md:text-base ${t.text}`}>{currentReviewQuestionData.text}</p>
              {currentReviewQuestionData.parenthesis_content && (
                <p className={`text-xs mt-2 ${t.textMuted}`}>({currentReviewQuestionData.parenthesis_content})</p>
              )}
            </div>
          )}
        </div>

        {/* Main Timers */}
        <div className="flex items-center justify-center gap-6 md:gap-12 mb-4 md:mb-6 w-full">
          <div className="text-center flex-1 max-w-xs">
            <p className={`text-xs md:text-sm font-medium ${t.textDimmed} mb-1`}>Transcurrido</p>
            <div className={`text-4xl md:text-6xl font-light tracking-tight ${isTimerRunning ? t.accent : t.text}`}
              style={{ fontFamily: 'system-ui' }}>
              {formatTime(elapsedTime)}
            </div>
          </div>
          <div className={`w-px h-12 md:h-16 ${t.border.replace('border-', 'bg-')} opacity-30`} />
          <div className="text-center flex-1 max-w-xs">
            <p className={`text-xs md:text-sm font-medium ${t.textDimmed} mb-1`}>Restante</p>
            <div className={`text-4xl md:text-6xl font-light tracking-tight ${
              isOvertime ? 'text-red-500 animate-pulse' : isLowTime ? t.danger : t.success
            }`} style={{ fontFamily: 'system-ui' }}>
              {formatRemainingTime(remainingTime)}
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full max-w-xl mb-4 md:mb-6">
          <div className={`h-2 md:h-3 rounded-full ${t.progressBg} overflow-hidden`}>
            <div 
              className={`h-full rounded-full transition-all duration-500 ${isLowTime ? 'bg-red-500' : 'bg-green-500'}`}
              style={{ width: `${Math.min(100, progressPercentage)}%` }}
            />
          </div>
          <p className={`text-center text-sm md:text-lg font-bold mt-2 ${isLowTime ? t.danger : t.success}`}>
            {progressPercentage.toFixed(0)}%
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3 md:gap-4 flex-wrap justify-center">
          {/* Start Study Button (only before starting) */}
          {studyPhase === PHASES.INTRO && !isTimerRunning && (
            <Button
              onClick={handleStartStudy}
              size="lg"
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-full px-6 md:px-8 py-3 text-base md:text-lg"
            >
              <Play className="w-5 h-5 mr-2" />
              Iniciar Estudio
            </Button>
          )}
          
          {/* Navigation Controls (when running) */}
          {isTimerRunning && studyPhase !== PHASES.FINISHED && (
            <>
              {/* Previous */}
              {studyPhase !== PHASES.INTRO && (
                <Button
                  onClick={handlePrevStep}
                  variant="outline"
                  size="lg"
                  className={`rounded-full ${t.buttonOutline}`}
                >
                  Anterior
                </Button>
              )}
              
              {/* Play/Pause */}
              <Button
                onClick={onToggleTimer}
                size="lg"
                className={`rounded-full p-0 text-white shadow-lg ${
                  isTimerRunning ? t.accentBg + ' hover:opacity-90' : 'bg-green-600 hover:bg-green-700'
                }`}
                style={{ width: '56px', height: '56px' }}
              >
                {isTimerRunning ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
              </Button>
              
              {/* Next */}
              <Button
                onClick={handleNextStep}
                size="lg"
                className={`rounded-full px-6 ${
                  studyPhase === PHASES.CONCLUSION 
                    ? 'bg-green-600 hover:bg-green-700' 
                    : studyPhase === PHASES.REVIEW && currentReviewQuestion >= (analysisResult?.final_questions?.length || 1) - 1
                      ? 'bg-purple-600 hover:bg-purple-700'
                      : studyPhase === PHASES.PARAGRAPHS && currentParagraphIndex >= (analysisResult?.paragraphs?.length || 1) - 1
                        ? 'bg-red-600 hover:bg-red-700'
                        : 'bg-green-600 hover:bg-green-700'
                } text-white`}
              >
                {getNextButtonText()}
                <ChevronRight className="w-5 h-5 ml-1" />
              </Button>
            </>
          )}
          
          {/* Reset (always visible when not initial) */}
          {(isTimerRunning || studyPhase !== PHASES.INTRO) && (
            <Button
              onClick={() => {
                onResetTimer();
                setStudyPhase(PHASES.INTRO);
                setCurrentReviewQuestion(0);
                setPhaseElapsed(0);
              }}
              variant="outline"
              size="sm"
              className={`rounded-full ${t.buttonOutline}`}
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* Keyboard shortcuts */}
        <p className={`text-xs ${t.textDimmed} mt-4 hidden md:block`}>
          <kbd className={`px-2 py-1 ${t.kbd} rounded`}>Espacio</kbd> iniciar/pausar · 
          <kbd className={`px-2 py-1 ${t.kbd} rounded mx-1`}>←</kbd>/<kbd className={`px-2 py-1 ${t.kbd} rounded`}>→</kbd> navegar · 
          <kbd className={`px-2 py-1 ${t.kbd} rounded ml-1`}>ESC</kbd> salir
        </p>
      </div>

      {/* Bottom Stats */}
      <div className={`flex items-center justify-center gap-3 md:gap-6 px-4 py-2 border-t ${t.border} text-xs ${t.textDimmed} shrink-0`}>
        <span>{analysisResult.total_paragraphs} párrafos</span>
        <span>·</span>
        <span>{analysisResult.total_questions} preguntas</span>
        <span>·</span>
        <span>{analysisResult.final_questions?.length || 0} repaso</span>
      </div>
    </div>
  );
}
