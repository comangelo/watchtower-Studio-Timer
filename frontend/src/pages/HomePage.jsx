import { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import { toast } from "sonner";
import { 
  Upload, 
  Play, 
  Pause, 
  RotateCcw, 
  Clock, 
  FileText, 
  MessageCircleQuestion,
  Timer,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Format seconds to MM:SS or HH:MM:SS
const formatTime = (seconds) => {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hrs > 0) {
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

// Format seconds to readable text
const formatTimeText = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  if (mins === 0) return `${secs} seg`;
  if (secs === 0) return `${mins} min`;
  return `${mins} min ${secs} seg`;
};

export default function HomePage() {
  const [analysisResult, setAnalysisResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  
  // Timer states
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [remainingTime, setRemainingTime] = useState(0);
  
  const timerRef = useRef(null);
  const fileInputRef = useRef(null);

  // Calculate time until last questions
  const calculateTimeUntilLastQuestions = useCallback(() => {
    if (!analysisResult) return 0;
    
    // Find the last paragraph with questions
    let timeUntilLastQuestion = 0;
    let foundLastQuestion = false;
    
    for (let i = analysisResult.paragraphs.length - 1; i >= 0; i--) {
      const para = analysisResult.paragraphs[i];
      if (para.questions.length > 0 && !foundLastQuestion) {
        foundLastQuestion = true;
        // Time is the sum of all paragraphs up to and including this one (reading only)
        for (let j = 0; j <= i; j++) {
          timeUntilLastQuestion += analysisResult.paragraphs[j].reading_time_seconds;
        }
        break;
      }
    }
    
    return timeUntilLastQuestion || analysisResult.total_reading_time_seconds;
  }, [analysisResult]);

  // Initialize remaining time when analysis is complete
  useEffect(() => {
    if (analysisResult) {
      setRemainingTime(calculateTimeUntilLastQuestions());
    }
  }, [analysisResult, calculateTimeUntilLastQuestions]);

  // Timer effect
  useEffect(() => {
    if (isTimerRunning) {
      timerRef.current = setInterval(() => {
        setElapsedTime(prev => prev + 1);
        setRemainingTime(prev => Math.max(0, prev - 1));
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isTimerRunning]);

  // Handle file upload
  const handleFileUpload = async (file) => {
    if (!file || !file.name.toLowerCase().endsWith('.pdf')) {
      toast.error("Por favor, selecciona un archivo PDF válido");
      return;
    }

    setIsLoading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post(`${API}/analyze-pdf`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      setAnalysisResult(response.data);
      setElapsedTime(0);
      setIsTimerRunning(false);
      toast.success("PDF analizado correctamente");
    } catch (error) {
      console.error("Error uploading PDF:", error);
      toast.error(error.response?.data?.detail || "Error al procesar el PDF");
    } finally {
      setIsLoading(false);
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    handleFileUpload(file);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) handleFileUpload(file);
  };

  // Timer controls
  const toggleTimer = () => {
    setIsTimerRunning(!isTimerRunning);
  };

  const resetTimer = () => {
    setIsTimerRunning(false);
    setElapsedTime(0);
    if (analysisResult) {
      setRemainingTime(calculateTimeUntilLastQuestions());
    }
  };

  const resetAll = () => {
    setAnalysisResult(null);
    setIsTimerRunning(false);
    setElapsedTime(0);
    setRemainingTime(0);
  };

  // Calculate progress percentage
  const progressPercentage = analysisResult 
    ? Math.min(100, (elapsedTime / analysisResult.total_time_seconds) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-zinc-100 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-zinc-900 rounded-xl flex items-center justify-center">
              <Timer className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-heading font-bold text-xl text-zinc-900" data-testid="app-title">
                Calculadora de Tiempo
              </h1>
              <p className="text-xs text-zinc-500">Lectura en voz alta</p>
            </div>
          </div>
          {analysisResult && (
            <Button 
              variant="ghost" 
              onClick={resetAll}
              className="text-zinc-500 hover:text-zinc-900"
              data-testid="new-analysis-btn"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Nuevo análisis
            </Button>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {!analysisResult ? (
          /* Upload State */
          <div className="animate-in max-w-2xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="font-heading font-bold text-4xl md:text-5xl text-zinc-900 tracking-tight mb-4">
                Analiza tu PDF
              </h2>
              <p className="text-lg text-zinc-500 max-w-md mx-auto">
                Sube un artículo y calcula el tiempo necesario para leerlo en voz alta
              </p>
            </div>

            {/* Upload Zone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`
                upload-zone cursor-pointer border-2 border-dashed rounded-2xl p-16 text-center
                ${isDragging 
                  ? 'border-orange-500 bg-orange-50/30' 
                  : 'border-zinc-200 hover:border-orange-500 hover:bg-orange-50/10'
                }
                ${isLoading ? 'opacity-50 pointer-events-none' : ''}
              `}
              data-testid="upload-zone"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                onChange={handleFileChange}
                className="hidden"
                data-testid="file-input"
              />
              
              <div className={`
                w-20 h-20 mx-auto mb-6 rounded-2xl flex items-center justify-center
                ${isDragging ? 'bg-orange-100' : 'bg-zinc-100'}
              `}>
                <Upload className={`w-10 h-10 ${isDragging ? 'text-orange-500' : 'text-zinc-400'}`} />
              </div>
              
              <p className="font-heading font-semibold text-xl text-zinc-900 mb-2">
                {isLoading ? 'Analizando...' : 'Arrastra tu PDF aquí'}
              </p>
              <p className="text-zinc-500">
                o haz clic para seleccionar un archivo
              </p>
              
              <div className="mt-8 flex items-center justify-center gap-6 text-sm text-zinc-400">
                <span className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  180 palabras/min
                </span>
                <span className="flex items-center gap-2">
                  <MessageCircleQuestion className="w-4 h-4" />
                  35 seg/respuesta
                </span>
              </div>
            </div>
          </div>
        ) : (
          /* Analysis Result State */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in">
            {/* Left Column - Paragraphs */}
            <div className="lg:col-span-8 space-y-6">
              {/* Summary Card */}
              <Card className="border-zinc-100 shadow-sm" data-testid="summary-card">
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="font-heading text-xl text-zinc-900 flex items-center gap-2">
                        <FileText className="w-5 h-5 text-orange-500" />
                        {analysisResult.filename}
                      </CardTitle>
                      <p className="text-sm text-zinc-500 mt-1">
                        {analysisResult.total_paragraphs} párrafos · {analysisResult.total_words} palabras
                      </p>
                    </div>
                    <Badge variant="secondary" className="font-mono" data-testid="total-questions-badge">
                      {analysisResult.total_questions} preguntas
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-zinc-50 rounded-xl">
                      <p className="text-2xl font-mono font-bold text-zinc-900" data-testid="reading-time">
                        {formatTimeText(analysisResult.total_reading_time_seconds)}
                      </p>
                      <p className="text-xs text-zinc-500 mt-1">Tiempo de lectura</p>
                    </div>
                    <div className="text-center p-4 bg-orange-50 rounded-xl">
                      <p className="text-2xl font-mono font-bold text-orange-600" data-testid="question-time">
                        {formatTimeText(analysisResult.total_question_time_seconds)}
                      </p>
                      <p className="text-xs text-zinc-500 mt-1">Tiempo de respuestas</p>
                    </div>
                    <div className="text-center p-4 bg-zinc-900 rounded-xl">
                      <p className="text-2xl font-mono font-bold text-white" data-testid="total-time">
                        {formatTimeText(analysisResult.total_time_seconds)}
                      </p>
                      <p className="text-xs text-zinc-400 mt-1">Tiempo total</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Paragraphs List */}
              <div className="space-y-4">
                <h3 className="font-heading font-semibold text-lg text-zinc-900">
                  Desglose por párrafo
                </h3>
                <ScrollArea className="h-[500px] pr-4 custom-scrollbar">
                  <div className="space-y-3">
                    {analysisResult.paragraphs.map((para, index) => (
                      <ParagraphCard key={para.number} paragraph={para} index={index} />
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </div>

            {/* Right Column - Timers */}
            <div className="lg:col-span-4 space-y-6">
              <div className="lg:sticky lg:top-24 space-y-6">
                {/* Main Timer */}
                <Card className="border-zinc-100 shadow-sm overflow-hidden" data-testid="main-timer-card">
                  <CardHeader className="bg-zinc-50 border-b border-zinc-100 pb-3">
                    <CardTitle className="font-heading text-sm uppercase tracking-widest text-zinc-500 text-center">
                      Cronómetro de lectura
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-8 text-center">
                    <div 
                      className={`font-mono text-6xl md:text-7xl font-bold tracking-tighter tabular-nums ${isTimerRunning ? 'text-orange-500 timer-active' : 'text-zinc-900'}`}
                      role="timer"
                      aria-live="polite"
                      data-testid="elapsed-time-display"
                    >
                      {formatTime(elapsedTime)}
                    </div>
                    <p className="text-sm text-zinc-400 mt-2">Tiempo transcurrido</p>
                    
                    {/* Progress Bar */}
                    <div className="mt-6">
                      <Progress value={progressPercentage} className="h-2" />
                      <p className="text-xs text-zinc-400 mt-2">
                        {progressPercentage.toFixed(0)}% completado
                      </p>
                    </div>

                    {/* Timer Controls */}
                    <div className="flex items-center justify-center gap-4 mt-8">
                      <Button
                        onClick={toggleTimer}
                        size="lg"
                        className={`
                          rounded-full w-16 h-16 p-0
                          ${isTimerRunning 
                            ? 'bg-orange-500 hover:bg-orange-600' 
                            : 'bg-zinc-900 hover:bg-zinc-800'
                          }
                        `}
                        data-testid="timer-toggle-btn"
                      >
                        {isTimerRunning 
                          ? <Pause className="w-6 h-6" /> 
                          : <Play className="w-6 h-6 ml-1" />
                        }
                      </Button>
                      <Button
                        onClick={resetTimer}
                        variant="outline"
                        size="lg"
                        className="rounded-full w-12 h-12 p-0"
                        data-testid="timer-reset-btn"
                      >
                        <RotateCcw className="w-5 h-5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Countdown Timer */}
                <Card className="border-orange-200 bg-orange-50/30 shadow-sm" data-testid="countdown-timer-card">
                  <CardHeader className="pb-3">
                    <CardTitle className="font-heading text-sm uppercase tracking-widest text-orange-600 text-center">
                      Tiempo hasta las últimas preguntas
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 text-center">
                    <div 
                      className={`font-mono text-5xl font-bold tracking-tighter tabular-nums ${remainingTime <= 60 ? 'text-red-500' : 'text-orange-600'}`}
                      role="timer"
                      aria-live="polite"
                      data-testid="remaining-time-display"
                    >
                      {formatTime(remainingTime)}
                    </div>
                    <p className="text-xs text-orange-600/70 mt-2">
                      {remainingTime <= 0 ? '¡Es hora de las preguntas!' : 'Tiempo restante'}
                    </p>
                  </CardContent>
                </Card>

                {/* Quick Stats */}
                <Card className="border-zinc-100 shadow-sm">
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-zinc-500">Velocidad de lectura</span>
                        <span className="font-mono text-sm font-medium text-zinc-900">180 PPM</span>
                      </div>
                      <Separator />
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-zinc-500">Tiempo por respuesta</span>
                        <span className="font-mono text-sm font-medium text-zinc-900">35 seg</span>
                      </div>
                      <Separator />
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-zinc-500">Total preguntas</span>
                        <span className="font-mono text-sm font-medium text-orange-600" data-testid="total-questions-stat">
                          {analysisResult.total_questions}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// Paragraph Card Component
function ParagraphCard({ paragraph, index }) {
  const [isOpen, setIsOpen] = useState(false);
  const hasQuestions = paragraph.questions.length > 0;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div 
        className={`
          paragraph-card rounded-xl border p-4 relative overflow-hidden
          ${hasQuestions 
            ? 'border-orange-200 bg-orange-50/20' 
            : 'border-zinc-100 bg-white hover:shadow-md'
          }
        `}
        style={{ animationDelay: `${index * 50}ms` }}
        data-testid={`paragraph-card-${paragraph.number}`}
      >
        {/* Paragraph Number Badge */}
        <span className="absolute top-3 left-3 text-xs font-bold text-zinc-300">
          #{paragraph.number}
        </span>

        {/* Time Badge */}
        <Badge 
          variant={hasQuestions ? "default" : "secondary"}
          className={`absolute top-3 right-3 font-mono text-xs ${hasQuestions ? 'bg-orange-500' : ''}`}
          data-testid={`paragraph-time-${paragraph.number}`}
        >
          {formatTimeText(paragraph.total_time_seconds)}
        </Badge>

        {/* Content */}
        <div className="mt-6">
          <p className="text-sm text-zinc-600 line-clamp-2 pr-20">
            {paragraph.text}
          </p>
          
          {/* Stats Row */}
          <div className="flex items-center gap-4 mt-3 text-xs text-zinc-400">
            <span>{paragraph.word_count} palabras</span>
            <span>·</span>
            <span>{formatTimeText(paragraph.reading_time_seconds)} lectura</span>
            {hasQuestions && (
              <>
                <span>·</span>
                <span className="text-orange-500 font-medium">
                  {paragraph.questions.length} pregunta{paragraph.questions.length > 1 ? 's' : ''}
                </span>
              </>
            )}
          </div>

          {/* Questions Section */}
          {hasQuestions && (
            <>
              <CollapsibleTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full mt-3 text-orange-600 hover:text-orange-700 hover:bg-orange-100"
                  data-testid={`toggle-questions-${paragraph.number}`}
                >
                  {isOpen ? (
                    <>
                      <ChevronUp className="w-4 h-4 mr-2" />
                      Ocultar preguntas
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-4 h-4 mr-2" />
                      Ver preguntas ({paragraph.questions.length})
                    </>
                  )}
                </Button>
              </CollapsibleTrigger>
              
              <CollapsibleContent>
                <div className="mt-3 space-y-2">
                  {paragraph.questions.map((q, qIndex) => (
                    <div 
                      key={qIndex}
                      className="question-highlight rounded-lg py-2 text-sm text-orange-800"
                      data-testid={`question-${paragraph.number}-${qIndex}`}
                    >
                      <MessageCircleQuestion className="w-4 h-4 inline mr-2 text-orange-500" />
                      {q.text}
                      <span className="ml-2 text-xs text-orange-500">
                        (+{q.answer_time} seg)
                      </span>
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </>
          )}
        </div>
      </div>
    </Collapsible>
  );
}
