import { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import { toast } from "sonner";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { 
  Timer,
  Download,
  FileImage,
  File,
  Maximize,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Clock,
  Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import PresentationMode from "@/components/PresentationMode";

// Import refactored components
import { UploadZone } from "@/components/UploadZone";
import { AnalysisSummary } from "@/components/AnalysisSummary";
import { TimerDisplay } from "@/components/TimerDisplay";
import { CountdownTimer } from "@/components/CountdownTimer";
import { QuickStats } from "@/components/QuickStats";
import { NotificationSettings } from "@/components/NotificationSettings";
import { ParagraphCard } from "@/components/ParagraphCard";
import { FinalQuestionsSection } from "@/components/FinalQuestionsSection";

// Import hooks
import { useLocalStorage, useLocalStorageString } from "@/hooks/useLocalStorage";
import { useNotifications } from "@/hooks/useNotifications";
import { useScheduleCalculator } from "@/hooks/useScheduleCalculator";

// Import utils
import { addSecondsToDate } from "@/utils/timeFormatters";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function HomePage() {
  // Core state
  const [analysisResult, setAnalysisResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  
  // Timer state
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [remainingTime, setRemainingTime] = useState(3600);
  const [startTime, setStartTime] = useState(null);
  const [endTime, setEndTime] = useState(null);
  
  // Refs
  const timerRef = useRef(null);
  const fileInputRef = useRef(null);
  const exportRef = useRef(null);
  
  // Notification state
  const [notificationPlayed, setNotificationPlayed] = useState({
    fiveMin: false,
    oneMin: false,
    now: false
  });
  
  // Settings with localStorage persistence
  const [soundEnabled, setSoundEnabled] = useLocalStorage('pdfTimer_soundEnabled', true);
  const [vibrationEnabled, setVibrationEnabled] = useLocalStorage('pdfTimer_vibrationEnabled', true);
  const [alertTimes, setAlertTimes] = useLocalStorage('pdfTimer_alertTimes', { firstAlert: 5, secondAlert: 1 });
  const [presentationTheme, setPresentationTheme] = useLocalStorageString('pdfTimer_presentationTheme', 'dark');
  
  // Presentation mode
  const [isPresentationMode, setIsPresentationMode] = useState(false);
  
  // Manual paragraph navigation
  const [currentManualParagraph, setCurrentManualParagraph] = useState(0);
  const [paragraphStartTimes, setParagraphStartTimes] = useState({});
  const [lowTimeAlertShown, setLowTimeAlertShown] = useState(false);

  // Custom hooks
  const { playNotificationSound, triggerVibration } = useNotifications(soundEnabled, vibrationEnabled);
  const {
    getAdjustedFinalQuestionsTime,
    getAdjustedFinalQuestionTime,
    getAdjustedParagraphTimes,
    getFinalQuestionsTimeSeconds,
    getFinalQuestionsTime,
  } = useScheduleCalculator(analysisResult, startTime, remainingTime, currentManualParagraph);

  // Presentation mode functions
  const enterPresentationMode = useCallback(() => {
    setIsPresentationMode(true);
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(err => {
        console.log('Fullscreen not supported:', err);
      });
    }
  }, []);

  const exitPresentationMode = useCallback(() => {
    setIsPresentationMode(false);
    if (document.fullscreenElement && document.exitFullscreen) {
      document.exitFullscreen().catch(err => {
        console.log('Exit fullscreen error:', err);
      });
    }
  }, []);

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && isPresentationMode) {
        setIsPresentationMode(false);
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [isPresentationMode]);

  // Paragraph navigation
  const goToNextParagraph = useCallback(() => {
    if (!analysisResult || currentManualParagraph >= analysisResult.paragraphs.length - 1) return;
    const nextIndex = currentManualParagraph + 1;
    setCurrentManualParagraph(nextIndex);
    const now = new Date();
    setParagraphStartTimes(prev => ({ ...prev, [nextIndex]: now }));
    toast.success(`Avanzando al Párrafo ${nextIndex + 1}`);
  }, [currentManualParagraph, analysisResult]);

  const goToPreviousParagraph = useCallback(() => {
    if (currentManualParagraph <= 0) return;
    const prevIndex = currentManualParagraph - 1;
    setCurrentManualParagraph(prevIndex);
    toast.info(`Volviendo al Párrafo ${prevIndex + 1}`);
  }, [currentManualParagraph]);

  // Check for low question time alert
  useEffect(() => {
    if (!isTimerRunning || !analysisResult) return;
    
    const adjustedTimes = getAdjustedFinalQuestionsTime();
    if (!adjustedTimes || !adjustedTimes.perQuestion) return;
    
    const timePerQuestion = adjustedTimes.perQuestion;
    
    if (timePerQuestion < 20 && !lowTimeAlertShown) {
      setLowTimeAlertShown(true);
      playNotificationSound('urgent');
      triggerVibration([300, 100, 300, 100, 300]);
      toast.error(`⚠️ ¡Alerta! Solo ${Math.round(timePerQuestion)} seg por pregunta. ¡Acelera la lectura!`, { 
        duration: 10000,
        important: true
      });
    }
    
    if (timePerQuestion >= 25 && lowTimeAlertShown) {
      setLowTimeAlertShown(false);
    }
  }, [isTimerRunning, analysisResult, getAdjustedFinalQuestionsTime, lowTimeAlertShown, playNotificationSound, triggerVibration]);

  // Check for notification triggers
  useEffect(() => {
    if (!isTimerRunning || !analysisResult) return;
    
    const finalQuestionsSeconds = getFinalQuestionsTimeSeconds();
    if (finalQuestionsSeconds <= 0) return;
    
    const timeUntilFinalQuestions = finalQuestionsSeconds - elapsedTime;
    
    const firstAlertSeconds = alertTimes.firstAlert * 60;
    if (timeUntilFinalQuestions <= firstAlertSeconds && timeUntilFinalQuestions > firstAlertSeconds - 5 && !notificationPlayed.fiveMin) {
      playNotificationSound('warning');
      triggerVibration([200, 100, 200]);
      setNotificationPlayed(prev => ({ ...prev, fiveMin: true }));
      toast.warning(`⏰ ${alertTimes.firstAlert} minuto${alertTimes.firstAlert > 1 ? 's' : ''} para las preguntas de repaso`, { duration: 5000 });
    }
    
    const secondAlertSeconds = alertTimes.secondAlert * 60;
    if (timeUntilFinalQuestions <= secondAlertSeconds && timeUntilFinalQuestions > secondAlertSeconds - 5 && !notificationPlayed.oneMin) {
      playNotificationSound('urgent');
      triggerVibration([200, 100, 200, 100, 200]);
      setNotificationPlayed(prev => ({ ...prev, oneMin: true }));
      toast.warning(`⚠️ ${alertTimes.secondAlert} minuto${alertTimes.secondAlert > 1 ? 's' : ''} para las preguntas de repaso`, { duration: 5000 });
    }
    
    if (timeUntilFinalQuestions <= 0 && timeUntilFinalQuestions > -5 && !notificationPlayed.now) {
      playNotificationSound('final');
      triggerVibration([500, 200, 500, 200, 500]);
      setNotificationPlayed(prev => ({ ...prev, now: true }));
      toast.success("🎯 ¡Es hora de las preguntas de repaso!", { duration: 8000 });
    }
  }, [elapsedTime, isTimerRunning, analysisResult, notificationPlayed, playNotificationSound, getFinalQuestionsTimeSeconds, alertTimes, triggerVibration]);

  // Initialize remaining time when analysis is complete
  useEffect(() => {
    if (analysisResult) {
      setRemainingTime(3600);
    }
  }, [analysisResult]);

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

  // File upload handler
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
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      
      setAnalysisResult(response.data);
      setElapsedTime(0);
      setIsTimerRunning(false);
      setStartTime(null);
      setEndTime(null);
      setCurrentManualParagraph(0);
      toast.success("PDF analizado correctamente");
    } catch (error) {
      console.error("Error uploading PDF:", error);
      toast.error(error.response?.data?.detail || "Error al procesar el PDF");
    } finally {
      setIsLoading(false);
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e) => { e.preventDefault(); setIsDragging(false); };
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileUpload(e.dataTransfer.files[0]);
  };

  // Timer controls
  const toggleTimer = () => {
    if (!isTimerRunning) {
      const now = new Date();
      if (!startTime) {
        setStartTime(now);
        setEndTime(addSecondsToDate(now, 3600));
      }
    }
    setIsTimerRunning(!isTimerRunning);
  };

  const resetTimer = () => {
    setIsTimerRunning(false);
    setElapsedTime(0);
    setRemainingTime(3600);
    setStartTime(null);
    setEndTime(null);
    setNotificationPlayed({ fiveMin: false, oneMin: false, now: false });
    setCurrentManualParagraph(0);
    setParagraphStartTimes({});
    setLowTimeAlertShown(false);
  };

  const resetAll = () => {
    setAnalysisResult(null);
    resetTimer();
  };

  // Start from specific paragraph
  const startFromParagraph = useCallback((paragraphIndex) => {
    let cumulativeTime = 0;
    for (let i = 0; i < paragraphIndex; i++) {
      cumulativeTime += analysisResult.paragraphs[i].total_time_seconds;
    }
    
    setElapsedTime(Math.floor(cumulativeTime));
    setRemainingTime(3600 - Math.floor(cumulativeTime));
    
    const now = new Date();
    const virtualStartTime = new Date(now.getTime() - cumulativeTime * 1000);
    setStartTime(virtualStartTime);
    setEndTime(addSecondsToDate(virtualStartTime, 3600));
    setCurrentManualParagraph(paragraphIndex);
    setIsTimerRunning(true);
    setNotificationPlayed({ fiveMin: false, oneMin: false, now: false });
    
    toast.success(`Iniciando desde Párrafo ${paragraphIndex + 1}`);
  }, [analysisResult]);

  // Export functions
  const exportToImage = async () => {
    if (!exportRef.current) return;
    toast.loading("Generando imagen...");
    try {
      const canvas = await html2canvas(exportRef.current, { scale: 2, backgroundColor: '#ffffff', useCORS: true });
      const link = document.createElement('a');
      link.download = `cronograma-${analysisResult.filename.replace('.pdf', '')}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      toast.dismiss();
      toast.success("Imagen exportada correctamente");
    } catch (error) {
      toast.dismiss();
      toast.error("Error al exportar imagen");
    }
  };

  const exportToPDF = async () => {
    if (!exportRef.current) return;
    toast.loading("Generando PDF...");
    try {
      const canvas = await html2canvas(exportRef.current, { scale: 2, backgroundColor: '#ffffff', useCORS: true });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
        unit: 'px',
        format: [canvas.width, canvas.height]
      });
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      pdf.save(`cronograma-${analysisResult.filename.replace('.pdf', '')}.pdf`);
      toast.dismiss();
      toast.success("PDF exportado correctamente");
    } catch (error) {
      toast.dismiss();
      toast.error("Error al exportar PDF");
    }
  };

  // Calculate progress
  const progressPercentage = analysisResult ? Math.min(100, (elapsedTime / 3600) * 100) : 0;
  const adjustedFinalTimes = getAdjustedFinalQuestionsTime();

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur-md sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-slate-700 rounded-xl flex items-center justify-center shadow-lg">
              <Timer className="w-7 h-7 text-orange-500" strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="font-heading font-bold text-xl text-purple-700" data-testid="app-title">
                ATALAYA DE ESTUDIO
              </h1>
              <p className="text-xs text-slate-700 font-semibold tracking-wide">Calculadora de Tiempo</p>
            </div>
          </div>
          {analysisResult && (
            <div className="flex items-center gap-3">
              <Button 
                variant="outline" 
                onClick={enterPresentationMode} 
                className="rounded-full px-5 py-2 border-2 border-slate-300 text-slate-700 hover:border-orange-400 hover:text-orange-600 hover:bg-orange-50 font-medium transition-all" 
                data-testid="presentation-mode-btn"
              >
                <Maximize className="w-4 h-4 mr-2" />
                Presentación
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="rounded-full px-5 py-2 border-2 border-slate-300 text-slate-700 hover:border-slate-400 font-medium" 
                    data-testid="export-btn"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Exportar
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="rounded-xl">
                  <DropdownMenuItem onClick={exportToImage} data-testid="export-image-btn" className="cursor-pointer">
                    <FileImage className="w-4 h-4 mr-2" />
                    Exportar como Imagen (PNG)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={exportToPDF} data-testid="export-pdf-btn" className="cursor-pointer">
                    <File className="w-4 h-4 mr-2" />
                    Exportar como PDF
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button 
                variant="ghost" 
                onClick={resetAll} 
                className="rounded-full px-4 py-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 font-medium" 
                data-testid="new-analysis-btn"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Nuevo
              </Button>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {!analysisResult ? (
          <UploadZone
            onFileSelect={handleFileUpload}
            isDragging={isDragging}
            isLoading={isLoading}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            fileInputRef={fileInputRef}
          />
        ) : (
          <div ref={exportRef} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Column - Analysis */}
            <div className="lg:col-span-8 space-y-6">
              <AnalysisSummary analysisResult={analysisResult} />

              {/* Paragraph Progress Indicator */}
              {isTimerRunning && (
                <Card className="border-2 border-green-200 bg-gradient-to-r from-green-50 to-white shadow-md rounded-2xl">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg shadow-green-200">
                          <span className="text-white font-bold text-lg">{currentManualParagraph + 1}</span>
                        </div>
                        <div>
                          <p className="text-base font-bold text-slate-800">
                            Párrafo {currentManualParagraph + 1} <span className="text-slate-400 font-normal">de {analysisResult.total_paragraphs}</span>
                          </p>
                          <p className="text-sm text-slate-500">
                            Usa los botones para navegar
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="outline" 
                          onClick={goToPreviousParagraph} 
                          disabled={currentManualParagraph <= 0} 
                          className="rounded-full w-12 h-12 border-2 border-slate-300 hover:border-green-400 hover:bg-green-50 disabled:opacity-40" 
                          data-testid="prev-paragraph-btn"
                        >
                          <ChevronLeft className="w-5 h-5" />
                        </Button>
                        <Button 
                          onClick={goToNextParagraph} 
                          disabled={currentManualParagraph >= analysisResult.paragraphs.length - 1} 
                          className="rounded-full w-12 h-12 bg-green-500 hover:bg-green-600 text-white shadow-lg shadow-green-200 disabled:opacity-40" 
                          data-testid="next-paragraph-btn"
                        >
                          <ChevronRight className="w-5 h-5" />
                        </Button>
                      </div>
                    </div>
                    
                    {/* Adjusted Times Summary */}
                    {adjustedFinalTimes.perQuestion && adjustedFinalTimes.perQuestion !== 35 && (
                      <div className={`mt-4 p-4 rounded-xl border-2 ${adjustedFinalTimes.perQuestion < 20 ? 'bg-orange-100 border-orange-300' : 'bg-slate-50 border-slate-200'}`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Clock className={`w-4 h-4 ${adjustedFinalTimes.perQuestion < 20 ? 'text-orange-600' : 'text-slate-600'}`} />
                            <span className="text-sm font-medium text-slate-700">Tiempo por pregunta:</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className={`font-mono text-xl font-bold ${adjustedFinalTimes.perQuestion < 20 ? 'text-orange-600' : 'text-slate-800'}`}>
                              {Math.round(adjustedFinalTimes.perQuestion)} seg
                            </span>
                            <span className="text-sm text-slate-400">(orig: 35s)</span>
                          </div>
                        </div>
                      </div>
                    )}
                </CardContent>
              </Card>
              )}

              {/* Paragraphs List */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-heading font-semibold text-lg text-zinc-900">
                    Desglose por párrafo
                  </h3>
                  {isTimerRunning && (
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" onClick={goToPreviousParagraph} disabled={currentManualParagraph <= 0} className="text-xs" data-testid="prev-paragraph-btn-2">
                        <ChevronLeft className="w-3 h-3 mr-1" />
                        Anterior
                      </Button>
                      <Badge variant="secondary" className="font-mono">
                        {currentManualParagraph + 1} / {analysisResult.total_paragraphs}
                      </Badge>
                      <Button size="sm" variant="outline" onClick={goToNextParagraph} disabled={currentManualParagraph >= analysisResult.paragraphs.length - 1} className="text-xs" data-testid="next-paragraph-btn-2">
                        Siguiente
                        <ChevronRight className="w-3 h-3 ml-1" />
                      </Button>
                    </div>
                  )}
                </div>
                
                <div className="space-y-3">
                  {analysisResult.paragraphs.map((paragraph, index) => (
                    <ParagraphCard
                      key={paragraph.number}
                      paragraph={paragraph}
                      index={index}
                      startTime={startTime}
                      paragraphTimes={getAdjustedParagraphTimes(index)}
                      onStartFromHere={() => startFromParagraph(index)}
                      isTimerRunning={isTimerRunning}
                      isCurrentParagraph={isTimerRunning && index === currentManualParagraph}
                      isCompletedParagraph={isTimerRunning && index < currentManualParagraph}
                      elapsedTime={elapsedTime}
                      onGoToNext={goToNextParagraph}
                      isLastParagraph={index === analysisResult.paragraphs.length - 1}
                      adjustedQuestionTime={adjustedFinalTimes.perQuestion}
                    />
                  ))}
                </div>
              </div>

              {/* Final Questions Section - After all paragraphs */}
              {analysisResult.final_questions?.length > 0 && (
                <FinalQuestionsSection
                  finalQuestions={analysisResult.final_questions}
                  finalQuestionsTitle={analysisResult.final_questions_title}
                  startTime={startTime}
                  isTimerRunning={isTimerRunning}
                  adjustedTimes={adjustedFinalTimes}
                  getQuestionTime={getAdjustedFinalQuestionTime}
                  originalStartTime={getFinalQuestionsTimeSeconds()}
                />
              )}
            </div>

            {/* Right Column - Timers */}
            <div className="lg:col-span-4 space-y-6">
              <div className="lg:sticky lg:top-24 space-y-6">
                <TimerDisplay
                  elapsedTime={elapsedTime}
                  isTimerRunning={isTimerRunning}
                  startTime={startTime}
                  endTime={endTime}
                  progressPercentage={progressPercentage}
                  onToggle={toggleTimer}
                  onReset={resetTimer}
                />

                <CountdownTimer
                  remainingTime={remainingTime}
                  adjustedTimes={adjustedFinalTimes}
                  isTimerRunning={isTimerRunning}
                />

                <QuickStats
                  analysisResult={analysisResult}
                  currentManualParagraph={currentManualParagraph}
                />

                <NotificationSettings
                  soundEnabled={soundEnabled}
                  setSoundEnabled={setSoundEnabled}
                  vibrationEnabled={vibrationEnabled}
                  setVibrationEnabled={setVibrationEnabled}
                  alertTimes={alertTimes}
                  setAlertTimes={setAlertTimes}
                  onTestSound={() => playNotificationSound('warning')}
                  onTestVibration={() => triggerVibration([200, 100, 200])}
                />
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Presentation Mode Overlay */}
      {isPresentationMode && (
        <PresentationMode
          analysisResult={analysisResult}
          elapsedTime={elapsedTime}
          remainingTime={remainingTime}
          isTimerRunning={isTimerRunning}
          onToggleTimer={toggleTimer}
          onResetTimer={resetTimer}
          onExit={exitPresentationMode}
          currentParagraphIndex={currentManualParagraph}
          theme={presentationTheme}
          onThemeChange={setPresentationTheme}
        />
      )}
    </div>
  );
}
