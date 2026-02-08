import { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import { toast } from "sonner";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
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
  ChevronUp,
  AlertCircle,
  Download,
  FileImage,
  File,
  Volume2,
  VolumeX,
  Bell
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

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

// Format time as HH:MM (clock format)
const formatClockTime = (date) => {
  if (!date) return "--:--";
  return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
};

// Add seconds to a date and return new date
const addSecondsToDate = (date, seconds) => {
  if (!date) return null;
  return new Date(date.getTime() + seconds * 1000);
};

export default function HomePage() {
  const [analysisResult, setAnalysisResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  
  // Timer states
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [remainingTime, setRemainingTime] = useState(3600); // 60 minutes
  
  // Real time tracking
  const [startTime, setStartTime] = useState(null); // When reading started
  const [endTime, setEndTime] = useState(null); // When 60 min will end
  
  const timerRef = useRef(null);
  const fileInputRef = useRef(null);
  const exportRef = useRef(null);
  const audioContextRef = useRef(null);
  const [notificationPlayed, setNotificationPlayed] = useState({
    fiveMin: false,
    oneMin: false,
    now: false
  });
  
  // Sound and notification settings - load from localStorage
  const [soundEnabled, setSoundEnabled] = useState(() => {
    const saved = localStorage.getItem('pdfTimer_soundEnabled');
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [vibrationEnabled, setVibrationEnabled] = useState(() => {
    const saved = localStorage.getItem('pdfTimer_vibrationEnabled');
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [alertTimes, setAlertTimes] = useState(() => {
    const saved = localStorage.getItem('pdfTimer_alertTimes');
    return saved !== null ? JSON.parse(saved) : { firstAlert: 5, secondAlert: 1 };
  });

  // Save preferences to localStorage
  useEffect(() => {
    localStorage.setItem('pdfTimer_soundEnabled', JSON.stringify(soundEnabled));
  }, [soundEnabled]);

  useEffect(() => {
    localStorage.setItem('pdfTimer_vibrationEnabled', JSON.stringify(vibrationEnabled));
  }, [vibrationEnabled]);

  useEffect(() => {
    localStorage.setItem('pdfTimer_alertTimes', JSON.stringify(alertTimes));
  }, [alertTimes]);

  // Vibration function
  const triggerVibration = useCallback((pattern) => {
    if (!vibrationEnabled) return;
    if ('vibrate' in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch (error) {
        console.log('Vibration not supported');
      }
    }
  }, [vibrationEnabled]);

  // Play notification sound
  const playNotificationSound = useCallback((type = 'alert') => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      
      const ctx = audioContextRef.current;
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      if (type === 'warning') {
        // 5 minutes warning - double beep
        oscillator.frequency.value = 880;
        oscillator.type = 'sine';
        gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.3);
        
        // Second beep
        setTimeout(() => {
          const osc2 = ctx.createOscillator();
          const gain2 = ctx.createGain();
          osc2.connect(gain2);
          gain2.connect(ctx.destination);
          osc2.frequency.value = 880;
          osc2.type = 'sine';
          gain2.gain.setValueAtTime(0.3, ctx.currentTime);
          gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
          osc2.start(ctx.currentTime);
          osc2.stop(ctx.currentTime + 0.3);
        }, 400);
      } else if (type === 'urgent') {
        // 1 minute warning - triple beep higher pitch
        oscillator.frequency.value = 1100;
        oscillator.type = 'sine';
        gainNode.gain.setValueAtTime(0.4, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.2);
        
        [300, 600].forEach(delay => {
          setTimeout(() => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.value = 1100;
            osc.type = 'sine';
            gain.gain.setValueAtTime(0.4, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.2);
          }, delay);
        });
      } else if (type === 'final') {
        // Final questions now - long tone
        oscillator.frequency.value = 660;
        oscillator.type = 'sine';
        gainNode.gain.setValueAtTime(0.5, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1);
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 1);
        
        // Rising tone after
        setTimeout(() => {
          const osc2 = ctx.createOscillator();
          const gain2 = ctx.createGain();
          osc2.connect(gain2);
          gain2.connect(ctx.destination);
          osc2.frequency.setValueAtTime(660, ctx.currentTime);
          osc2.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.5);
          osc2.type = 'sine';
          gain2.gain.setValueAtTime(0.5, ctx.currentTime);
          gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
          osc2.start(ctx.currentTime);
          osc2.stop(ctx.currentTime + 0.5);
        }, 1100);
      }
    } catch (error) {
      console.error('Error playing sound:', error);
    }
  }, []);

  // Export functions
  const exportToImage = async () => {
    if (!exportRef.current) return;
    
    toast.loading("Generando imagen...");
    try {
      const canvas = await html2canvas(exportRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
      });
      
      const link = document.createElement('a');
      link.download = `cronograma-${analysisResult.filename.replace('.pdf', '')}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      
      toast.dismiss();
      toast.success("Imagen exportada correctamente");
    } catch (error) {
      toast.dismiss();
      toast.error("Error al exportar imagen");
      console.error(error);
    }
  };

  const exportToPDF = async () => {
    if (!exportRef.current) return;
    
    toast.loading("Generando PDF...");
    try {
      const canvas = await html2canvas(exportRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
      });
      
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
      console.error(error);
    }
  };

  // Calculate paragraph times based on start time
  const getParagraphTimes = useCallback((paragraphIndex) => {
    if (!startTime || !analysisResult) return { start: null, end: null };
    
    let cumulativeTime = 0;
    for (let i = 0; i < paragraphIndex; i++) {
      cumulativeTime += analysisResult.paragraphs[i].total_time_seconds;
    }
    
    const paragraphStart = addSecondsToDate(startTime, cumulativeTime);
    const paragraphEnd = addSecondsToDate(startTime, cumulativeTime + analysisResult.paragraphs[paragraphIndex].total_time_seconds);
    
    return { start: paragraphStart, end: paragraphEnd };
  }, [startTime, analysisResult]);

  // Get final questions time in seconds from start
  const getFinalQuestionsTimeSeconds = useCallback(() => {
    if (!analysisResult) return 0;
    
    let cumulativeTime = 0;
    for (const para of analysisResult.paragraphs) {
      cumulativeTime += para.reading_time_seconds;
      if (para.questions.some(q => q.is_final_question)) {
        return cumulativeTime;
      }
      cumulativeTime += para.questions.length * 35;
    }
    
    if (analysisResult.final_questions_start_time > 0) {
      return analysisResult.final_questions_start_time;
    }
    
    return 0;
  }, [analysisResult]);

  // Check for notification triggers
  useEffect(() => {
    if (!isTimerRunning || !analysisResult) return;
    
    const finalQuestionsSeconds = getFinalQuestionsTimeSeconds();
    if (finalQuestionsSeconds <= 0) return;
    
    const timeUntilFinalQuestions = finalQuestionsSeconds - elapsedTime;
    
    // First alert (customizable, default 5 minutes)
    const firstAlertSeconds = alertTimes.firstAlert * 60;
    if (timeUntilFinalQuestions <= firstAlertSeconds && timeUntilFinalQuestions > firstAlertSeconds - 5 && !notificationPlayed.fiveMin) {
      if (soundEnabled) playNotificationSound('warning');
      triggerVibration([200, 100, 200]); // Double vibration
      setNotificationPlayed(prev => ({ ...prev, fiveMin: true }));
      toast.warning(`⏰ ${alertTimes.firstAlert} minuto${alertTimes.firstAlert > 1 ? 's' : ''} para las preguntas finales`, { duration: 5000 });
    }
    
    // Second alert (customizable, default 1 minute)
    const secondAlertSeconds = alertTimes.secondAlert * 60;
    if (timeUntilFinalQuestions <= secondAlertSeconds && timeUntilFinalQuestions > secondAlertSeconds - 5 && !notificationPlayed.oneMin) {
      if (soundEnabled) playNotificationSound('urgent');
      triggerVibration([200, 100, 200, 100, 200]); // Triple vibration
      setNotificationPlayed(prev => ({ ...prev, oneMin: true }));
      toast.warning(`⚠️ ${alertTimes.secondAlert} minuto${alertTimes.secondAlert > 1 ? 's' : ''} para las preguntas finales`, { duration: 5000 });
    }
    
    // Final questions NOW
    if (timeUntilFinalQuestions <= 0 && timeUntilFinalQuestions > -5 && !notificationPlayed.now) {
      if (soundEnabled) playNotificationSound('final');
      triggerVibration([500, 200, 500, 200, 500]); // Long vibration pattern
      setNotificationPlayed(prev => ({ ...prev, now: true }));
      toast.success("🎯 ¡Es hora de las preguntas finales!", { duration: 8000 });
    }
  }, [elapsedTime, isTimerRunning, analysisResult, notificationPlayed, playNotificationSound, getFinalQuestionsTimeSeconds, soundEnabled, alertTimes, triggerVibration]);

  // Get final questions time as Date
  const getFinalQuestionsTime = useCallback(() => {
    if (!startTime || !analysisResult) return null;
    const seconds = getFinalQuestionsTimeSeconds();
    if (seconds > 0) {
      return addSecondsToDate(startTime, seconds);
    }
    return null;
  }, [startTime, analysisResult, getFinalQuestionsTimeSeconds]);

  // Initialize remaining time when analysis is complete
  useEffect(() => {
    if (analysisResult) {
      setRemainingTime(3600); // Always 60 minutes
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
      setStartTime(null);
      setEndTime(null);
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
    if (!isTimerRunning) {
      // Starting the timer - capture current time
      const now = new Date();
      if (!startTime) {
        setStartTime(now);
        setEndTime(addSecondsToDate(now, 3600)); // 60 minutes from now
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
  };

  const resetAll = () => {
    setAnalysisResult(null);
    setIsTimerRunning(false);
    setElapsedTime(0);
    setRemainingTime(3600);
    setStartTime(null);
    setEndTime(null);
    setNotificationPlayed({ fiveMin: false, oneMin: false, now: false });
  };

  // Calculate progress percentage based on 60 minutes (3600 seconds)
  const progressPercentage = analysisResult 
    ? Math.min(100, (elapsedTime / 3600) * 100)
    : 0;

  const finalQuestionsTime = getFinalQuestionsTime();

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
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="outline"
                    className="text-zinc-700 hover:text-zinc-900"
                    data-testid="export-btn"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Exportar
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={exportToImage} data-testid="export-image-btn">
                    <FileImage className="w-4 h-4 mr-2" />
                    Exportar como Imagen (PNG)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={exportToPDF} data-testid="export-pdf-btn">
                    <File className="w-4 h-4 mr-2" />
                    Exportar como PDF
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button 
                variant="ghost" 
                onClick={resetAll}
                className="text-zinc-500 hover:text-zinc-900"
                data-testid="new-analysis-btn"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Nuevo análisis
              </Button>
            </div>
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
            {/* Left Column - Paragraphs (Exportable Content) */}
            <div className="lg:col-span-8 space-y-6" ref={exportRef}>
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
                        60 min
                      </p>
                      <p className="text-xs text-zinc-400 mt-1">Tiempo total (fijo)</p>
                    </div>
                  </div>
                  
                  {/* Time Schedule Info */}
                  {startTime && (
                    <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-xl">
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="w-4 h-4 text-green-600" />
                        <span className="font-semibold text-green-800">Horario de Lectura</span>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-green-600">Inicio:</span>
                          <span className="ml-2 font-mono font-bold text-green-800">{formatClockTime(startTime)}</span>
                        </div>
                        <div>
                          <span className="text-green-600">Fin (60 min):</span>
                          <span className="ml-2 font-mono font-bold text-green-800">{formatClockTime(endTime)}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Final Questions Alert */}
              {finalQuestionsTime && startTime && (
                <Card className="border-orange-300 bg-orange-50 shadow-sm" data-testid="final-questions-alert">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center">
                        <AlertCircle className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="font-semibold text-orange-800">Preguntas Finales</p>
                        <p className="text-sm text-orange-600">
                          Las preguntas finales comienzan a las{' '}
                          <span className="font-mono font-bold">{formatClockTime(finalQuestionsTime)}</span>
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Paragraphs List */}
              <div className="space-y-4">
                <h3 className="font-heading font-semibold text-lg text-zinc-900">
                  Desglose por párrafo
                </h3>
                <ScrollArea className="h-[500px] pr-4 custom-scrollbar">
                  <div className="space-y-3">
                    {analysisResult.paragraphs.map((para, index) => (
                      <ParagraphCard 
                        key={para.number} 
                        paragraph={para} 
                        index={index}
                        startTime={startTime}
                        paragraphTimes={getParagraphTimes(index)}
                      />
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
                    {/* Current Time Display */}
                    {startTime && (
                      <div className="mb-4 p-3 bg-green-50 rounded-lg">
                        <p className="text-xs text-green-600 uppercase tracking-wide">Hora de inicio</p>
                        <p className="font-mono text-2xl font-bold text-green-700">{formatClockTime(startTime)}</p>
                      </div>
                    )}
                    
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
                    
                    {!startTime && (
                      <p className="text-xs text-zinc-400 mt-4">
                        Presiona play para iniciar con la hora actual
                      </p>
                    )}
                  </CardContent>
                </Card>

                {/* Countdown Timer */}
                <Card className="border-orange-200 bg-orange-50/30 shadow-sm" data-testid="countdown-timer-card">
                  <CardHeader className="pb-3">
                    <CardTitle className="font-heading text-sm uppercase tracking-widest text-orange-600 text-center">
                      Tiempo restante (60 min)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 text-center">
                    {endTime && (
                      <div className="mb-3 p-2 bg-orange-100 rounded-lg">
                        <p className="text-xs text-orange-600">Finaliza a las</p>
                        <p className="font-mono text-xl font-bold text-orange-700">{formatClockTime(endTime)}</p>
                      </div>
                    )}
                    <div 
                      className={`font-mono text-5xl font-bold tracking-tighter tabular-nums ${remainingTime <= 60 ? 'text-red-500' : 'text-orange-600'}`}
                      role="timer"
                      aria-live="polite"
                      data-testid="remaining-time-display"
                    >
                      {formatTime(remainingTime)}
                    </div>
                    <p className="text-xs text-orange-600/70 mt-2">
                      {remainingTime <= 0 ? '¡Tiempo completado!' : 'Tiempo restante'}
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

                {/* Notification Settings */}
                <Card className="border-zinc-100 shadow-sm" data-testid="notification-settings-card">
                  <CardHeader className="pb-2">
                    <CardTitle className="font-heading text-sm text-zinc-700 flex items-center gap-2">
                      <Bell className="w-4 h-4" />
                      Configuración de Alertas
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <div className="space-y-4">
                      {/* Sound Toggle */}
                      <div className="flex items-center justify-between">
                        <Label htmlFor="sound-toggle" className="text-sm text-zinc-600 flex items-center gap-2">
                          {soundEnabled ? <Volume2 className="w-4 h-4 text-green-600" /> : <VolumeX className="w-4 h-4 text-zinc-400" />}
                          Sonido
                        </Label>
                        <Switch
                          id="sound-toggle"
                          checked={soundEnabled}
                          onCheckedChange={setSoundEnabled}
                          data-testid="sound-toggle"
                        />
                      </div>
                      
                      <Separator />
                      
                      {/* Alert Times */}
                      <div className="space-y-3">
                        <Label className="text-xs text-zinc-500 uppercase tracking-wide">Tiempos de aviso</Label>
                        
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-zinc-600 w-20">1er aviso:</span>
                          <Input
                            type="number"
                            min="1"
                            max="30"
                            value={alertTimes.firstAlert}
                            onChange={(e) => setAlertTimes(prev => ({ ...prev, firstAlert: Math.max(1, Math.min(30, parseInt(e.target.value) || 5)) }))}
                            className="w-16 h-8 text-center font-mono"
                            data-testid="first-alert-input"
                          />
                          <span className="text-sm text-zinc-500">min antes</span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-zinc-600 w-20">2do aviso:</span>
                          <Input
                            type="number"
                            min="1"
                            max="15"
                            value={alertTimes.secondAlert}
                            onChange={(e) => setAlertTimes(prev => ({ ...prev, secondAlert: Math.max(1, Math.min(15, parseInt(e.target.value) || 1)) }))}
                            className="w-16 h-8 text-center font-mono"
                            data-testid="second-alert-input"
                          />
                          <span className="text-sm text-zinc-500">min antes</span>
                        </div>
                      </div>
                      
                      {/* Test Sound Button */}
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full mt-2"
                        onClick={() => {
                          if (soundEnabled) {
                            playNotificationSound('warning');
                            toast.info("🔊 Prueba de sonido");
                          } else {
                            toast.info("🔇 Sonido desactivado");
                          }
                        }}
                        data-testid="test-sound-btn"
                      >
                        <Volume2 className="w-4 h-4 mr-2" />
                        Probar sonido
                      </Button>
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
function ParagraphCard({ paragraph, index, startTime, paragraphTimes }) {
  const [isOpen, setIsOpen] = useState(false);
  const hasQuestions = paragraph.questions.length > 0;
  const hasFinalQuestions = paragraph.questions.some(q => q.is_final_question);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div 
        className={`
          paragraph-card rounded-xl border p-4 relative overflow-hidden
          ${hasFinalQuestions 
            ? 'border-red-300 bg-red-50/30' 
            : hasQuestions 
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
          variant={hasFinalQuestions ? "destructive" : hasQuestions ? "default" : "secondary"}
          className={`absolute top-3 right-3 font-mono text-xs ${hasQuestions && !hasFinalQuestions ? 'bg-orange-500' : ''}`}
          data-testid={`paragraph-time-${paragraph.number}`}
        >
          {formatTimeText(paragraph.total_time_seconds)}
        </Badge>

        {/* Content */}
        <div className="mt-6">
          {/* Time Schedule for paragraph */}
          {startTime && paragraphTimes.start && (
            <div className="mb-3 flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1 px-2 py-1 bg-zinc-100 rounded">
                <Clock className="w-3 h-3 text-zinc-500" />
                <span className="text-zinc-600">Inicio:</span>
                <span className="font-mono font-bold text-zinc-800">{formatClockTime(paragraphTimes.start)}</span>
              </div>
              <div className="flex items-center gap-1 px-2 py-1 bg-green-100 rounded">
                <Clock className="w-3 h-3 text-green-600" />
                <span className="text-green-600">Fin:</span>
                <span className="font-mono font-bold text-green-700">{formatClockTime(paragraphTimes.end)}</span>
              </div>
            </div>
          )}
          
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
                <span className={`font-medium ${hasFinalQuestions ? 'text-red-500' : 'text-orange-500'}`}>
                  {paragraph.questions.length} pregunta{paragraph.questions.length > 1 ? 's' : ''}
                  {hasFinalQuestions && ' (FINAL)'}
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
                  className={`w-full mt-3 ${hasFinalQuestions ? 'text-red-600 hover:text-red-700 hover:bg-red-100' : 'text-orange-600 hover:text-orange-700 hover:bg-orange-100'}`}
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
                      className={`rounded-lg py-2 text-sm ${q.is_final_question ? 'bg-red-50 border-l-3 border-red-500 pl-3 text-red-800' : 'question-highlight text-orange-800'}`}
                      data-testid={`question-${paragraph.number}-${qIndex}`}
                    >
                      <MessageCircleQuestion className={`w-4 h-4 inline mr-2 ${q.is_final_question ? 'text-red-500' : 'text-orange-500'}`} />
                      {q.text}
                      <span className={`ml-2 text-xs ${q.is_final_question ? 'text-red-500' : 'text-orange-500'}`}>
                        (+{q.answer_time} seg)
                      </span>
                      {q.is_final_question && (
                        <Badge variant="destructive" className="ml-2 text-xs">FINAL</Badge>
                      )}
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
