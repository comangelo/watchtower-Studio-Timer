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
  Bell,
  Smartphone,
  Vibrate,
  Maximize,
  Minimize,
  X,
  ArrowRight,
  Check
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
import PresentationMode from "@/components/PresentationMode";

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
  
  // Presentation mode
  const [isPresentationMode, setIsPresentationMode] = useState(false);
  const [presentationTheme, setPresentationTheme] = useState(() => {
    const saved = localStorage.getItem('pdfTimer_presentationTheme');
    return saved !== null ? saved : 'dark';
  });

  // Save presentation theme to localStorage
  useEffect(() => {
    localStorage.setItem('pdfTimer_presentationTheme', presentationTheme);
  }, [presentationTheme]);

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

  // Manual paragraph control
  const [currentManualParagraph, setCurrentManualParagraph] = useState(0);
  const [paragraphStartTimes, setParagraphStartTimes] = useState({}); // Track when each paragraph actually started

  // Go to next paragraph and recalculate times
  const goToNextParagraph = useCallback(() => {
    if (!analysisResult) return;
    
    const nextIndex = currentManualParagraph + 1;
    if (nextIndex >= analysisResult.paragraphs.length) {
      toast.info("¡Has llegado al último párrafo!");
      return;
    }
    
    // Record when this paragraph ended / next started
    const now = new Date();
    setParagraphStartTimes(prev => ({
      ...prev,
      [nextIndex]: now
    }));
    
    setCurrentManualParagraph(nextIndex);
    toast.success(`Avanzando al párrafo #${nextIndex + 1}`);
  }, [analysisResult, currentManualParagraph]);

  // Go to previous paragraph
  const goToPreviousParagraph = useCallback(() => {
    if (currentManualParagraph <= 0) {
      toast.info("Ya estás en el primer párrafo");
      return;
    }
    
    const prevIndex = currentManualParagraph - 1;
    setCurrentManualParagraph(prevIndex);
    toast.info(`Volviendo al párrafo #${prevIndex + 1}`);
  }, [currentManualParagraph]);

  // Check for low question time alert
  const [lowTimeAlertShown, setLowTimeAlertShown] = useState(false);
  
  useEffect(() => {
    if (!isTimerRunning || !analysisResult) return;
    
    const adjustedTimes = getAdjustedFinalQuestionsTime();
    if (!adjustedTimes.perQuestion) return;
    
    const timePerQuestion = adjustedTimes.perQuestion;
    
    // Alert when time per question is less than 20 seconds
    if (timePerQuestion < 20 && !lowTimeAlertShown) {
      setLowTimeAlertShown(true);
      if (soundEnabled) playNotificationSound('urgent');
      triggerVibration([300, 100, 300, 100, 300]);
      toast.error(`⚠️ ¡Alerta! Solo ${Math.round(timePerQuestion)} seg por pregunta. ¡Acelera la lectura!`, { 
        duration: 10000,
        important: true
      });
    }
    
    // Reset alert if time goes back above 25 seconds
    if (timePerQuestion >= 25 && lowTimeAlertShown) {
      setLowTimeAlertShown(false);
    }
  }, [isTimerRunning, analysisResult, getAdjustedFinalQuestionsTime, lowTimeAlertShown, soundEnabled, playNotificationSound, triggerVibration]);

  // Calculate adjusted time for final questions based on manual progress
  // READING time is FIXED, QUESTION time ADJUSTS based on remaining time
  const getAdjustedFinalQuestionsTime = useCallback(() => {
    if (!startTime || !analysisResult) return { start: null, end: null };
    
    const finalQuestionsCount = analysisResult.final_questions?.length || 0;
    if (finalQuestionsCount === 0) return { start: null, end: null };
    
    // Calculate remaining paragraphs
    const remainingParagraphs = analysisResult.paragraphs.slice(currentManualParagraph);
    
    // FIXED: Reading time for remaining paragraphs (never changes)
    const fixedReadingTime = remainingParagraphs.reduce((sum, p) => sum + p.reading_time_seconds, 0);
    
    // Count total questions (paragraphs + final questions)
    const remainingParagraphsQuestionCount = remainingParagraphs.reduce(
      (sum, p) => sum + p.questions.length, 0
    );
    const totalQuestionCount = remainingParagraphsQuestionCount + finalQuestionsCount;
    
    // Time available for ALL questions = remaining time - fixed reading time
    const timeForAllQuestions = Math.max(0, remainingTime - fixedReadingTime);
    
    // Adjusted time per question (distributed equally among all remaining questions)
    const adjustedTimePerQuestion = totalQuestionCount > 0 
      ? Math.round(timeForAllQuestions / totalQuestionCount)
      : 35;
    
    // Time for final questions specifically
    const totalFinalQuestionsTime = finalQuestionsCount * adjustedTimePerQuestion;
    
    // Calculate when final questions start (after reading time + paragraph questions)
    const paragraphsQuestionTime = remainingParagraphsQuestionCount * adjustedTimePerQuestion;
    const timeUntilFinalQuestions = fixedReadingTime + paragraphsQuestionTime;
    
    const now = new Date();
    const adjustedStart = addSecondsToDate(now, timeUntilFinalQuestions);
    const adjustedEnd = addSecondsToDate(adjustedStart, totalFinalQuestionsTime);
    
    return { 
      start: adjustedStart, 
      end: adjustedEnd,
      totalTime: totalFinalQuestionsTime,
      perQuestion: adjustedTimePerQuestion,
      originalPerQuestion: 35
    };
  }, [startTime, analysisResult, currentManualParagraph, remainingTime]);

  // Get adjusted time for each individual final question
  const getAdjustedFinalQuestionTime = useCallback((questionIndex) => {
    if (!startTime || !analysisResult) return null;
    
    const adjusted = getAdjustedFinalQuestionsTime();
    if (!adjusted.start) return null;
    
    return addSecondsToDate(adjusted.start, questionIndex * adjusted.perQuestion);
  }, [startTime, analysisResult, getAdjustedFinalQuestionsTime]);

  // Calculate adjusted paragraph times based on remaining time
  // READING time is FIXED, QUESTION time ADJUSTS
  const getAdjustedParagraphTimes = useCallback((paragraphIndex) => {
    if (!startTime || !analysisResult) return { start: null, end: null, adjustedDuration: 0 };
    
    const paragraph = analysisResult.paragraphs[paragraphIndex];
    
    // If paragraph is before current, it's completed - use original times
    if (paragraphIndex < currentManualParagraph) {
      let cumulativeTime = 0;
      for (let i = 0; i < paragraphIndex; i++) {
        cumulativeTime += analysisResult.paragraphs[i].total_time_seconds;
      }
      const paragraphStart = addSecondsToDate(startTime, cumulativeTime);
      const paragraphEnd = addSecondsToDate(startTime, cumulativeTime + paragraph.total_time_seconds);
      return { 
        start: paragraphStart, 
        end: paragraphEnd, 
        adjustedDuration: paragraph.total_time_seconds,
        adjustedQuestionTime: 35,
        isCompleted: true
      };
    }
    
    // Calculate remaining content
    const remainingParagraphs = analysisResult.paragraphs.slice(currentManualParagraph);
    const finalQuestionsCount = analysisResult.final_questions?.length || 0;
    
    // FIXED: Total reading time for remaining paragraphs
    const totalFixedReadingTime = remainingParagraphs.reduce((sum, p) => sum + p.reading_time_seconds, 0);
    
    // Total question count (paragraphs + final questions)
    const totalQuestionCount = remainingParagraphs.reduce((sum, p) => sum + p.questions.length, 0) + finalQuestionsCount;
    
    // Time available for ALL questions
    const timeForAllQuestions = Math.max(0, remainingTime - totalFixedReadingTime);
    
    // Adjusted time per question
    const adjustedTimePerQuestion = totalQuestionCount > 0 
      ? timeForAllQuestions / totalQuestionCount
      : 35;
    
    // Calculate start time for this paragraph
    let cumulativeTime = 0;
    for (let i = currentManualParagraph; i < paragraphIndex; i++) {
      const p = analysisResult.paragraphs[i];
      // Fixed reading time + adjusted question time
      cumulativeTime += p.reading_time_seconds + (p.questions.length * adjustedTimePerQuestion);
    }
    
    const now = new Date();
    const adjustedStart = addSecondsToDate(now, cumulativeTime);
    
    // This paragraph's duration: fixed reading + adjusted questions
    const thisParaDuration = paragraph.reading_time_seconds + (paragraph.questions.length * adjustedTimePerQuestion);
    const adjustedEnd = addSecondsToDate(adjustedStart, thisParaDuration);
    
    return { 
      start: adjustedStart, 
      end: adjustedEnd, 
      adjustedDuration: Math.round(thisParaDuration),
      adjustedQuestionTime: Math.round(adjustedTimePerQuestion),
      isCompleted: false,
      isCurrent: paragraphIndex === currentManualParagraph
    };
  }, [startTime, analysisResult, currentManualParagraph, remainingTime]);

  // Get current paragraph index based on elapsed time (keeping for presentation mode)
  const getCurrentParagraphIndex = useCallback(() => {
    return currentManualParagraph;
  }, [currentManualParagraph]);

  const currentParagraphIndex = getCurrentParagraphIndex();

  // Get current paragraph based on elapsed time
  const getCurrentParagraph = useCallback(() => {
    if (!analysisResult) return null;
    
    let cumulativeTime = 0;
    for (const para of analysisResult.paragraphs) {
      cumulativeTime += para.total_time_seconds;
      if (elapsedTime < cumulativeTime) {
        return para;
      }
    }
    return analysisResult.paragraphs[analysisResult.paragraphs.length - 1];
  }, [analysisResult, elapsedTime]);

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

  // Start from specific paragraph
  const startFromParagraph = useCallback((paragraphIndex) => {
    // Calculate cumulative time up to this paragraph
    let cumulativeTime = 0;
    for (let i = 0; i < paragraphIndex; i++) {
      cumulativeTime += analysisResult.paragraphs[i].total_time_seconds;
    }
    
    // Set the elapsed time as if we already read previous paragraphs
    setElapsedTime(Math.floor(cumulativeTime));
    setRemainingTime(3600 - Math.floor(cumulativeTime));
    
    // Capture current time as start time, but adjusted
    const now = new Date();
    // The "virtual" start time is now minus the cumulative time of previous paragraphs
    const virtualStartTime = new Date(now.getTime() - cumulativeTime * 1000);
    setStartTime(virtualStartTime);
    setEndTime(addSecondsToDate(virtualStartTime, 3600));
    
    // Start the timer
    setIsTimerRunning(true);
    setNotificationPlayed({ fiveMin: false, oneMin: false, now: false });
    
    toast.success(`Iniciando desde párrafo #${paragraphIndex + 1}`);
  }, [analysisResult]);

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
    setCurrentManualParagraph(0);
    setParagraphStartTimes({});
    setLowTimeAlertShown(false);
  };

  const resetAll = () => {
    setAnalysisResult(null);
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
              <Button 
                variant="outline"
                onClick={enterPresentationMode}
                className="text-zinc-700 hover:text-zinc-900"
                data-testid="presentation-mode-btn"
              >
                <Maximize className="w-4 h-4 mr-2" />
                Presentación
              </Button>
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

              {/* Final Questions Section */}
              {analysisResult.final_questions && analysisResult.final_questions.length > 0 && (
                <FinalQuestionsSection
                  finalQuestions={analysisResult.final_questions}
                  startTime={startTime}
                  isTimerRunning={isTimerRunning}
                  adjustedTimes={getAdjustedFinalQuestionsTime()}
                  getQuestionTime={getAdjustedFinalQuestionTime}
                  originalStartTime={analysisResult.final_questions_start_time}
                />
              )}

              {/* Paragraphs List */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-heading font-semibold text-lg text-zinc-900">
                    Desglose por párrafo
                  </h3>
                  
                  {/* Paragraph Navigation Controls */}
                  {isTimerRunning && (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={goToPreviousParagraph}
                        disabled={currentManualParagraph <= 0}
                        className="text-xs"
                        data-testid="prev-paragraph-btn"
                      >
                        <ChevronUp className="w-4 h-4 mr-1" />
                        Anterior
                      </Button>
                      <span className="text-sm font-mono bg-green-100 text-green-700 px-3 py-1 rounded-full">
                        {currentManualParagraph + 1} / {analysisResult.paragraphs.length}
                      </span>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={goToNextParagraph}
                        disabled={currentManualParagraph >= analysisResult.paragraphs.length - 1}
                        className="text-xs bg-green-600 hover:bg-green-700"
                        data-testid="next-paragraph-btn"
                      >
                        Siguiente
                        <ChevronDown className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                  )}
                </div>
                
                <ScrollArea className="h-[500px] pr-4 custom-scrollbar">
                  <div className="space-y-3">
                    {analysisResult.paragraphs.map((para, index) => (
                      <ParagraphCard 
                        key={para.number} 
                        paragraph={para} 
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
                      
                      {/* Vibration Toggle */}
                      <div className="flex items-center justify-between">
                        <Label htmlFor="vibration-toggle" className="text-sm text-zinc-600 flex items-center gap-2">
                          <Smartphone className={`w-4 h-4 ${vibrationEnabled ? 'text-green-600' : 'text-zinc-400'}`} />
                          Vibración
                        </Label>
                        <Switch
                          id="vibration-toggle"
                          checked={vibrationEnabled}
                          onCheckedChange={setVibrationEnabled}
                          data-testid="vibration-toggle"
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
                      
                      {/* Test Buttons */}
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
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
                          <Volume2 className="w-4 h-4 mr-1" />
                          Sonido
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => {
                            if (vibrationEnabled && 'vibrate' in navigator) {
                              navigator.vibrate([200, 100, 200]);
                              toast.info("📳 Prueba de vibración");
                            } else if (!vibrationEnabled) {
                              toast.info("📴 Vibración desactivada");
                            } else {
                              toast.info("📱 Vibración no disponible en este dispositivo");
                            }
                          }}
                          data-testid="test-vibration-btn"
                        >
                          <Smartphone className="w-4 h-4 mr-1" />
                          Vibrar
                        </Button>
                      </div>
                      
                      <p className="text-xs text-zinc-400 text-center">
                        Las preferencias se guardan automáticamente
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        )}
      </main>
      
      {/* Presentation Mode Overlay */}
      {isPresentationMode && analysisResult && (
        <PresentationMode
          analysisResult={analysisResult}
          elapsedTime={elapsedTime}
          remainingTime={remainingTime}
          startTime={startTime}
          endTime={endTime}
          isTimerRunning={isTimerRunning}
          toggleTimer={toggleTimer}
          resetTimer={resetTimer}
          exitPresentationMode={exitPresentationMode}
          getCurrentParagraph={getCurrentParagraph}
          finalQuestionsTime={getFinalQuestionsTime()}
          formatTime={formatTime}
          formatClockTime={formatClockTime}
          progressPercentage={progressPercentage}
          theme={presentationTheme}
          setTheme={setPresentationTheme}
        />
      )}
    </div>
  );
}

// Final Questions Section Component
function FinalQuestionsSection({ finalQuestions, startTime, isTimerRunning, adjustedTimes, getQuestionTime, originalStartTime }) {
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
          Preguntas Finales
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

// Paragraph Card Component
function ParagraphCard({ paragraph, index, startTime, paragraphTimes, onStartFromHere, isTimerRunning, isCurrentParagraph, isCompletedParagraph, elapsedTime, onGoToNext, isLastParagraph }) {
  const [isOpen, setIsOpen] = useState(false);
  const cardRef = useRef(null);
  const hasQuestions = paragraph.questions.length > 0;
  const hasFinalQuestions = paragraph.questions.some(q => q.is_final_question);

  // Auto-scroll to current paragraph
  useEffect(() => {
    if (isCurrentParagraph && cardRef.current) {
      cardRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [isCurrentParagraph]);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div 
        ref={cardRef}
        className={`
          paragraph-card rounded-xl border p-4 relative overflow-hidden transition-all duration-300
          ${isCompletedParagraph
            ? 'border-zinc-200 bg-zinc-50 opacity-60'
            : isCurrentParagraph 
              ? 'border-green-500 bg-green-50 ring-2 ring-green-500 ring-offset-2 shadow-lg scale-[1.02]' 
              : hasFinalQuestions 
                ? 'border-red-300 bg-red-50/30' 
                : hasQuestions 
                  ? 'border-orange-200 bg-orange-50/20' 
                  : 'border-zinc-100 bg-white hover:shadow-md'
          }
        `}
        style={{ animationDelay: `${index * 50}ms` }}
        data-testid={`paragraph-card-${paragraph.number}`}
      >
        {/* Completed Indicator */}
        {isCompletedParagraph && (
          <div className="absolute top-0 left-0 right-0 bg-zinc-400 text-white text-xs font-bold py-1 px-3 flex items-center justify-center gap-2">
            <Check className="w-3 h-3" />
            COMPLETADO
          </div>
        )}

        {/* Current Paragraph Indicator */}
        {isCurrentParagraph && (
          <div className="absolute top-0 left-0 right-0 bg-green-500 text-white text-xs font-bold py-1 px-3 flex items-center justify-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
            </span>
            LEYENDO AHORA
          </div>
        )}

        {/* Paragraph Number Badge */}
        <span className={`absolute ${isCurrentParagraph || isCompletedParagraph ? 'top-10' : 'top-3'} left-3 text-xs font-bold ${isCompletedParagraph ? 'text-zinc-400' : isCurrentParagraph ? 'text-green-600' : 'text-zinc-300'}`}>
          #{paragraph.number}
        </span>

        {/* Time Badge */}
        <Badge 
          variant={isCompletedParagraph ? "secondary" : isCurrentParagraph ? "default" : hasFinalQuestions ? "destructive" : hasQuestions ? "default" : "secondary"}
          className={`absolute ${isCurrentParagraph || isCompletedParagraph ? 'top-10' : 'top-3'} right-3 font-mono text-xs ${isCompletedParagraph ? 'bg-zinc-300' : isCurrentParagraph ? 'bg-green-600' : hasQuestions && !hasFinalQuestions ? 'bg-orange-500' : ''}`}
          data-testid={`paragraph-time-${paragraph.number}`}
        >
          {paragraphTimes.adjustedDuration ? formatTimeText(paragraphTimes.adjustedDuration) : formatTimeText(paragraph.total_time_seconds)}
        </Badge>

        {/* Content */}
        <div className={isCurrentParagraph || isCompletedParagraph ? 'mt-12' : 'mt-6'}>
          {/* Time Schedule for paragraph */}
          {startTime && paragraphTimes.start && !isCompletedParagraph && (
            <div className="mb-3 flex items-center gap-4 text-xs">
              <div className={`flex items-center gap-1 px-2 py-1 rounded ${isCurrentParagraph ? 'bg-green-200' : 'bg-zinc-100'}`}>
                <Clock className={`w-3 h-3 ${isCurrentParagraph ? 'text-green-700' : 'text-zinc-500'}`} />
                <span className={isCurrentParagraph ? 'text-green-700' : 'text-zinc-600'}>Inicio:</span>
                <span className={`font-mono font-bold ${isCurrentParagraph ? 'text-green-800' : 'text-zinc-800'}`}>{formatClockTime(paragraphTimes.start)}</span>
              </div>
              <div className={`flex items-center gap-1 px-2 py-1 rounded ${isCurrentParagraph ? 'bg-green-200' : 'bg-green-100'}`}>
                <Clock className={`w-3 h-3 ${isCurrentParagraph ? 'text-green-700' : 'text-green-600'}`} />
                <span className={isCurrentParagraph ? 'text-green-700' : 'text-green-600'}>Fin:</span>
                <span className={`font-mono font-bold ${isCurrentParagraph ? 'text-green-800' : 'text-green-700'}`}>{formatClockTime(paragraphTimes.end)}</span>
              </div>
              {paragraphTimes.adjustedDuration !== paragraph.total_time_seconds && (
                <span className="text-orange-500 text-xs font-medium">
                  (ajustado)
                </span>
              )}
            </div>
          )}
          
          <p className={`text-sm line-clamp-2 pr-20 ${isCompletedParagraph ? 'text-zinc-400' : isCurrentParagraph ? 'text-green-800 font-medium' : 'text-zinc-600'}`}>
            {paragraph.text}
          </p>
          
          {/* Stats Row */}
          <div className={`flex items-center gap-4 mt-3 text-xs ${isCompletedParagraph ? 'text-zinc-400' : isCurrentParagraph ? 'text-green-600' : 'text-zinc-400'}`}>
            <span>{paragraph.word_count} palabras</span>
            <span>·</span>
            <span>{formatTimeText(paragraph.reading_time_seconds)} lectura</span>
            {hasQuestions && (
              <>
                <span>·</span>
                <span className={`font-medium ${hasFinalQuestions ? 'text-red-500' : isCurrentParagraph ? 'text-green-700' : 'text-orange-500'}`}>
                  {paragraph.questions.length} pregunta{paragraph.questions.length > 1 ? 's' : ''}
                  {hasFinalQuestions && ' (FINAL)'}
                </span>
              </>
            )}
          </div>

          {/* Action buttons */}
          <div className="mt-3 flex items-center gap-2">
            {/* Next Paragraph Button - Only on current paragraph */}
            {isCurrentParagraph && !isLastParagraph && (
              <Button
                variant="default"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onGoToNext();
                }}
                className="text-xs bg-green-600 hover:bg-green-700 text-white"
                data-testid={`next-from-paragraph-${paragraph.number}`}
              >
                <ArrowRight className="w-3 h-3 mr-1" />
                Pasar al siguiente párrafo
              </Button>
            )}

            {/* Start from here - Only when not current and not completed */}
            {!isCurrentParagraph && !isCompletedParagraph && (
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onStartFromHere();
                }}
                className="text-xs border-green-300 text-green-700 hover:bg-green-50 hover:border-green-400"
                data-testid={`start-from-paragraph-${paragraph.number}`}
              >
                <Play className="w-3 h-3 mr-1" />
                Iniciar desde aquí
              </Button>
            )}
            
            {hasQuestions && (
              <CollapsibleTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className={`text-xs ${hasFinalQuestions ? 'text-red-600 hover:text-red-700 hover:bg-red-100' : isCurrentParagraph ? 'text-green-700 hover:bg-green-200' : 'text-orange-600 hover:text-orange-700 hover:bg-orange-100'}`}
                  data-testid={`toggle-questions-${paragraph.number}`}
                >
                  {isOpen ? (
                    <>
                      <ChevronUp className="w-3 h-3 mr-1" />
                      Ocultar
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-3 h-3 mr-1" />
                      Ver preguntas ({paragraph.questions.length})
                    </>
                  )}
                </Button>
              </CollapsibleTrigger>
            )}
          </div>

          {/* Questions Section */}
          {hasQuestions && (
            <CollapsibleContent>
              <div className="mt-3 space-y-2">
                {paragraph.questions.map((q, qIndex) => (
                  <div 
                    key={qIndex}
                    className={`rounded-lg py-2 text-sm ${q.is_final_question ? 'bg-red-50 border-l-3 border-red-500 pl-3 text-red-800' : isCurrentParagraph ? 'bg-green-100 border-l-3 border-green-500 pl-3 text-green-800' : 'question-highlight text-orange-800'}`}
                    data-testid={`question-${paragraph.number}-${qIndex}`}
                  >
                    <MessageCircleQuestion className={`w-4 h-4 inline mr-2 ${q.is_final_question ? 'text-red-500' : isCurrentParagraph ? 'text-green-600' : 'text-orange-500'}`} />
                    {q.text}
                    <span className={`ml-2 text-xs ${q.is_final_question ? 'text-red-500' : isCurrentParagraph ? 'text-green-600' : 'text-orange-500'}`}>
                      (+{q.answer_time} seg)
                    </span>
                    {q.is_final_question && (
                      <Badge variant="destructive" className="ml-2 text-xs">FINAL</Badge>
                    )}
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          )}
        </div>
      </div>
    </Collapsible>
  );
}
