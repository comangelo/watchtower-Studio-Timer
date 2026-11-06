import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { toast } from "@/utils/notify";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { 
  Timer,
  Download,
  FileImage,
  File,
  FileText,
  Maximize,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Clock,
  Check,
  Pencil,
  X,
  Moon,
  Settings,
  Sun,
  Palette,
  Eye,
  EyeOff,
  Globe, ChevronDown as ChevronDownLv,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import PresentationMode, { DEFAULT_LAYOUT } from "@/components/PresentationMode";

// Import refactored components
import { UploadZone } from "@/components/UploadZone";
import { SettingsSheet, speedLabel } from "@/components/SettingsSheet";
import { PtVariantDialog } from "@/components/PtVariantDialog";
import { AnalysisSummary } from "@/components/AnalysisSummary";
import { TimerDisplay } from "@/components/TimerDisplay";
import { ParagraphCard } from "@/components/ParagraphCard";
import { FinalQuestionsSection } from "@/components/FinalQuestionsSection";
import { ParagraphStatsPanel } from "@/components/ParagraphStatsPanel";
import { IntroductionWordsSection } from "@/components/IntroductionWordsSection";

// Import hooks
import { useLocalStorage, useLocalStorageString } from "@/hooks/useLocalStorage";
import { useNotifications } from "@/hooks/useNotifications";
import { countQuestions } from "@/utils/timePlan";
import { t, tn, useLanguage, LANGUAGES, currentLanguage, setLanguage, currentLocale, currentPtVariant } from "@/i18n";
import { withoutParagraphReading, CIRCUIT_VISIT_MINUTES } from "@/utils/circuitVisit";
import { CircuitVisitToggle } from "@/components/CircuitVisitToggle";
import { StudyActionBar } from "@/components/StudyActionBar";
import { getNextStep } from "@/utils/nextStep";
import { JwWeeklyCard } from "@/components/JwWeeklyCard";
import { mondayOf } from "@/utils/jwWeekly";
import { saveIssue } from "@/utils/pdfLibrary";
import { analyzeFile } from "@/analysis/analyzeFile";
import { useUpdateNotifier } from "@/hooks/useUpdateNotifier";
import { useWakeLock } from "@/hooks/useWakeLock";
import { useScheduleCalculator } from "@/hooks/useScheduleCalculator";

// Import utils
import { addSecondsToDate } from "@/utils/timeFormatters";
import { darkThemes, defaultDarkTheme } from "@/utils/darkThemes";


export default function HomePage() {
  useLanguage(); // vuelve a pintar la pantalla al cambiar de idioma
  // Core state
  // Análisis tal como sale del PDF (el que se ve puede ser la versión "visita del superintendente")
  const [rawAnalysisResult, setAnalysisResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  
  // Timer state
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [remainingTime, setRemainingTime] = useState(60 * 60); // Will be updated when totalDuration changes
  const [startTime, setStartTime] = useState(null);
  // Con el estudio iniciado, la pantalla no se apaga
  useWakeLock(startTime !== null);
  const [endTime, setEndTime] = useState(null);
  const [manualEndTime, setManualEndTime] = useState(null); // For manual end time override
  
  // Refs
  const timerRef = useRef(null);
  const fileInputRef = useRef(null);
  // Semana elegida para buscar el artículo dentro de la revista completa (por defecto, la actual)
  const [jwWeekMonday, setJwWeekMonday] = useState(() => mondayOf(new Date()));
  // Último PDF analizado (para cambiar de semana sin volver a elegir el archivo)
  const lastFileRef = useRef(null);
  // Cambia cada vez que se guarda una revista en la biblioteca de la app
  const [libraryVersion, setLibraryVersion] = useState(0);
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
  const [alertTimes, setAlertTimes] = useLocalStorage('pdfTimer_alertTimes', { firstAlert: 0, secondAlert: 0 });
  // Aviso cuando faltan 5 minutos para la hora de fin (modo presentación y alerta)
  const [fiveMinuteWarningEnabled, setFiveMinuteWarningEnabled] = useLocalStorage('pdfTimer_fiveMinuteWarning', true);
  const [overtimeAlertEnabled, setOvertimeAlertEnabled] = useLocalStorage('pdfTimer_overtimeAlert', true);
  const [darkMode, setDarkMode] = useLocalStorage('pdfTimer_darkMode', false);
  const [darkTheme, setDarkTheme] = useLocalStorageString('pdfTimer_darkTheme', defaultDarkTheme);
  // Diseño del modo presentación: panel ordenado, semáforo o clásico
  const [presentationLayout, setPresentationLayout] = useLocalStorageString('pdfTimer_presentationLayout', DEFAULT_LAYOUT);
  // Ordenador (pantalla ancha): dos columnas. Móvil: el plan arriba y la barra de botones abajo.
  const [isDesktop, setIsDesktop] = useState(() => typeof window !== 'undefined' && !!window.matchMedia?.('(min-width: 1024px)')?.matches);
  useEffect(() => {
    const mq = window.matchMedia?.('(min-width: 1024px)');
    if (!mq) return undefined;
    const onChange = () => setIsDesktop(mq.matches);
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, []);
  
  // Get current theme config
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState('tiempo');
  const openSettings = (tab = 'tiempo') => { setSettingsTab(tab); setSettingsOpen(true); };
  const currentTheme = darkMode ? (darkThemes[darkTheme] || darkThemes.zinc) : null;
  
  // Configurable reading settings
  const [readingSpeed, setReadingSpeed] = useLocalStorage('pdfTimer_readingSpeed', 180);
  const [storedAnswerTime, setAnswerTime] = useLocalStorage('pdfTimer_answerTime', 35);
  // Mínimo 30 s (los ajustes antiguos podían bajar hasta 15 s).
  const answerTime = Math.max(30, Number(storedAnswerTime) || 35);
  const [normalDuration, setNormalDuration] = useLocalStorage('pdfTimer_totalDuration', 60);
  // Semana de la visita del superintendente de circuito: 30 min y sin lectura de párrafos
  const [circuitVisitMode, setCircuitVisitMode] = useLocalStorage('pdfTimer_circuitVisitMode', false);
  const [circuitVisitDuration, setCircuitVisitDuration] = useLocalStorage('pdfTimer_circuitVisitDuration', CIRCUIT_VISIT_MINUTES);
  // Duración en uso: cada modo guarda la suya (al volver al modo normal se recuperan los 60 min)
  const totalDuration = circuitVisitMode ? circuitVisitDuration : normalDuration;
  const setTotalDuration = circuitVisitMode ? setCircuitVisitDuration : setNormalDuration;
  // Análisis en uso: en la visita del superintendente, sin la lectura de los párrafos
  const analysisResult = useMemo(
    () => (circuitVisitMode ? withoutParagraphReading(rawAnalysisResult) : rawAnalysisResult),
    [circuitVisitMode, rawAnalysisResult]
  );
  // Comentarios extra en párrafos largos o agrupados: 0 = sin extra, 1 = normal, 1.5 = más
  const [longParagraphWeight, setLongParagraphWeight] = useLocalStorage('pdfTimer_longParagraphWeight', 1);
  
  // Calculate total seconds from duration in minutes
  const totalDurationSeconds = totalDuration * 60;
  
  // Presentation mode
  const [isPresentationMode, setIsPresentationMode] = useState(false);
  
  // Show/hide paragraph content globally
  const [showAllParagraphContent, setShowAllParagraphContent] = useState(false);
  
  // Manual paragraph navigation
  const [currentManualParagraph, setCurrentManualParagraph] = useState(0);
  const [paragraphStartTimes, setParagraphStartTimes] = useState({});
  const [lowTimeAlertShown, setLowTimeAlertShown] = useState(false);
  
  // Statistics tracking - stores actual time spent on each paragraph
  const [paragraphStats, setParagraphStats] = useState({});
  const [paragraphStartTime, setParagraphStartTime] = useState(null);
  
  // Review questions navigation
  const [isInReviewMode, setIsInReviewMode] = useState(false);
  const [currentReviewQuestion, setCurrentReviewQuestion] = useState(0);
  const [reviewQuestionStartTime, setReviewQuestionStartTime] = useState(null);
  
  // Introduction words section
  const [isInIntroductionMode, setIsInIntroductionMode] = useState(false);
  const [introductionStartTime, setIntroductionStartTime] = useState(null);
  const [introductionDuration, setIntroductionDuration] = useLocalStorage('pdfTimer_introductionDuration', 60); // 1 minute default
  const [conclusionDuration, setConclusionDuration] = useLocalStorage('pdfTimer_conclusionDuration', 60); // 1 minute default
  
  // Closing words section
  const [isInClosingWordsMode, setIsInClosingWordsMode] = useState(false);
  const [closingWordsStartTime, setClosingWordsStartTime] = useState(null);
  const [closingWordsDuration, setClosingWordsDuration] = useLocalStorage('pdfTimer_closingWordsDuration', 60); // 1 minute default
  
  // Presentation mode phase state (persists when exiting/entering presentation mode)
  const [presentationPhase, setPresentationPhase] = useState('intro');
  const [, setPresentationReviewQuestion] = useState(0);

  // Participaciones (comentarios) marcadas durante el estudio
  const [commentStats, setCommentStats] = useState({ paragraphs: {}, review: {} });
  // Segundos transcurridos en el tramo actual (párrafo, pregunta de repaso, etc.)
  const [segmentTimer, setSegmentTimer] = useState({ key: '', elapsed: 0 });
  
  // State for editing end time on initial screen (before PDF upload)
  const [isEditingInitialEndTime, setIsEditingInitialEndTime] = useState(false);
  const [initialEditHours, setInitialEditHours] = useState('');
  const [initialEditMinutes, setInitialEditMinutes] = useState('');


  // Custom hooks
  useUpdateNotifier();
  const { playNotificationSound, triggerVibration } = useNotifications(soundEnabled, vibrationEnabled);
  const {
    getAdjustedFinalQuestionsTime,
    getAdjustedFinalQuestionTime,
    getAdjustedParagraphTimes,
    getFinalQuestionsTimeSeconds,
    getSecondsUntilReview,
    getScaleFactor,
    originalTotalTime,
    plannedPerQuestion,
    staticPlan,
  } = useScheduleCalculator({
    analysisResult,
    startTime,
    remainingTime,
    currentManualParagraph,
    totalDurationSeconds,
    introductionDuration,
    // La conclusión que se configura en Ajustes es "closingWordsDuration"
    conclusionDuration: closingWordsDuration,
    answerTime,
    isInIntroductionMode,
    introductionStartTime,
    isInReviewMode,
    currentReviewQuestion,
    reviewQuestionStartTime,
    isInClosingWordsMode,
    paragraphStartTime,
    longParagraphWeight,
  });

  // Group paragraphs that belong together based on "grouped_with" field
  const groupedParagraphs = React.useMemo(() => {
    if (!analysisResult?.paragraphs) return [];
    
    const paragraphs = analysisResult.paragraphs;
    const groups = [];
    const processedIndices = new Set();
    
    paragraphs.forEach((para, index) => {
      if (processedIndices.has(index)) return;
      
      const groupedWith = para.grouped_with || [];
      
      if (groupedWith.length > 1) {
        // This paragraph is part of a group
        const groupParagraphs = groupedWith
          .map(num => paragraphs.find(p => p.number === num))
          .filter(Boolean);
        
        // Mark all paragraphs in this group as processed
        groupParagraphs.forEach(gp => {
          const gIndex = paragraphs.findIndex(p => p.number === gp.number);
          processedIndices.add(gIndex);
        });
        
        // Only add the group once (when we encounter the first paragraph of the group)
        if (para.number === Math.min(...groupedWith)) {
          groups.push({
            type: 'group',
            paragraphs: groupParagraphs,
            firstParagraph: groupParagraphs[0],
            indices: groupParagraphs.map(gp => paragraphs.findIndex(p => p.number === gp.number))
          });
        }
      } else {
        // Single paragraph
        processedIndices.add(index);
        groups.push({
          type: 'single',
          paragraphs: [para],
          firstParagraph: para,
          indices: [index]
        });
      }
    });
    
    return groups;
  }, [analysisResult?.paragraphs]);

  // Fase actual del estudio (para el modo presentación y los contadores)
  const studyPhase = presentationPhase === 'finished' ? 'finished'
    : isInClosingWordsMode ? 'conclusion'
    : isInReviewMode ? 'review'
    : isInIntroductionMode ? 'intro'
    : startTime ? 'paragraphs'
    : 'initial';

  // Grupo de párrafos actual (un párrafo suelto o un grupo como "6, 7")
  const currentParagraphGroup = React.useMemo(
    () => groupedParagraphs.find(g => g.indices.includes(currentManualParagraph)) || null,
    [groupedParagraphs, currentManualParagraph]
  );
  const currentGroupFirst = currentParagraphGroup ? currentParagraphGroup.indices[0] : currentManualParagraph;
  const currentGroupLast = currentParagraphGroup
    ? currentParagraphGroup.indices[currentParagraphGroup.indices.length - 1]
    : currentManualParagraph;

  // El cronómetro del tramo vuelve a 0 cada vez que cambia el tramo
  // (se calcula en el mismo render para que el color no "parpadee" al cambiar de párrafo)
  const segmentKey = `${studyPhase}-${currentGroupFirst}-${currentReviewQuestion}`;
  const segmentElapsed = segmentTimer.key === segmentKey ? segmentTimer.elapsed : 0;
  const segmentKeyRef = useRef(segmentKey);
  segmentKeyRef.current = segmentKey;

  // Marcar un comentario en el párrafo (o pregunta de repaso) actual
  const handleAddComment = useCallback(() => {
    if (studyPhase === 'paragraphs') {
      setCommentStats(prev => ({ ...prev, paragraphs: { ...prev.paragraphs, [currentGroupFirst]: (prev.paragraphs[currentGroupFirst] || 0) + 1 } }));
    } else if (studyPhase === 'review') {
      setCommentStats(prev => ({ ...prev, review: { ...prev.review, [currentReviewQuestion]: (prev.review[currentReviewQuestion] || 0) + 1 } }));
    } else {
      return;
    }
    triggerVibration([40]);
  }, [studyPhase, currentGroupFirst, currentReviewQuestion, triggerVibration]);

  const totalComments = React.useMemo(
    () => [...Object.values(commentStats.paragraphs), ...Object.values(commentStats.review)].reduce((a, b) => a + b, 0),
    [commentStats]
  );
  const phaseComments = studyPhase === 'review'
    ? (commentStats.review[currentReviewQuestion] || 0)
    : (commentStats.paragraphs[currentGroupFirst] || 0);

  // Avanzar al siguiente párrafo o grupo, guardando la estadística del actual
  const goToNextGroup = useCallback(() => {
    if (!analysisResult) return;
    const first = currentGroupFirst;
    const last = currentGroupLast;
    if (last >= analysisResult.paragraphs.length - 1) return;
    const group = analysisResult.paragraphs.slice(first, last + 1);
    if (paragraphStartTime) {
      const actualTimeSpent = Math.round((Date.now() - paragraphStartTime) / 1000);
      const estimated = Math.round(getAdjustedParagraphTimes(first, last).adjustedDuration
        || group.reduce((sum, p) => sum + p.total_time_seconds, 0));
      setParagraphStats(prev => ({
        ...prev,
        [first]: {
          paragraphNumber: group.map(p => p.number).join(', '),
          estimatedTime: estimated,
          actualTime: actualTimeSpent,
          difference: actualTimeSpent - estimated,
          wordCount: group.reduce((sum, p) => sum + p.word_count, 0),
          questionsCount: group.reduce((sum, p) => sum + countQuestions(p), 0),
          comments: commentStats.paragraphs[first] || 0,
        }
      }));
    }
    const nextIndex = last + 1;
    setCurrentManualParagraph(nextIndex);
    setParagraphStartTime(Date.now());
    setParagraphStartTimes(prev => ({ ...prev, [nextIndex]: new Date() }));
    toast.success(`Avanzando al Párrafo ${analysisResult.paragraphs[nextIndex].number}`);
  }, [analysisResult, currentGroupFirst, currentGroupLast, paragraphStartTime, getAdjustedParagraphTimes, commentStats]);

  // Tiempo previsto del tramo actual (para el recuadro de colores)
  const currentSegmentEstimate = (() => {
    switch (studyPhase) {
      case 'intro': return introductionDuration;
      case 'paragraphs': return getAdjustedParagraphTimes(currentGroupFirst, currentGroupLast).adjustedDuration || 0;
      case 'review': return getAdjustedFinalQuestionsTime().perQuestion || 0;
      case 'conclusion': return closingWordsDuration;
      default: return 0;
    }
  })();

  // Presentation mode functions
  const enterPresentationMode = useCallback(() => {
    // Sync presentation phase with current HomePage state before entering
    let newPhase = presentationPhase;
    if (isInIntroductionMode) {
      newPhase = 'intro';
    } else if (isInReviewMode) {
      newPhase = 'review';
    } else if (isInClosingWordsMode) {
      newPhase = 'conclusion';
    } else if (isTimerRunning && currentManualParagraph >= 0) {
      // Timer is running and we're on a paragraph
      newPhase = 'paragraphs';
    } else if (!isTimerRunning && currentManualParagraph > 0) {
      // Timer stopped but we've made progress - stay on paragraphs
      newPhase = 'paragraphs';
    }
    
    // Update states synchronously - phase first, then show modal
    setPresentationPhase(newPhase);
    if (isInReviewMode) {
      setPresentationReviewQuestion(currentReviewQuestion);
    }
    
    // Use setTimeout to ensure state is updated before showing modal
    setTimeout(() => {
      setIsPresentationMode(true);
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(err => {
          console.log('Fullscreen not supported:', err);
        });
      }
    }, 0);
  }, [isInIntroductionMode, isInReviewMode, isInClosingWordsMode, isTimerRunning, currentManualParagraph, currentReviewQuestion, presentationPhase]);

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

  // Paragraph navigation (avanzar: goToNextGroup)
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
    if (!adjustedTimes || adjustedTimes.perQuestion === undefined || isInClosingWordsMode) return;
    
    const timePerQuestion = adjustedTimes.perQuestion;
    
    if (timePerQuestion < 20 && !lowTimeAlertShown) {
      setLowTimeAlertShown(true);
      playNotificationSound('urgent');
      triggerVibration([300, 100, 300, 100, 300]);
      toast.alert(`⚠️ ¡Alerta! Solo ${Math.round(timePerQuestion)} seg por pregunta. ¡Acelera la lectura!`, { 
        duration: 10000,
        important: true
      });
    }
    
    if (timePerQuestion >= 25 && lowTimeAlertShown) {
      setLowTimeAlertShown(false);
    }
  }, [isTimerRunning, analysisResult, getAdjustedFinalQuestionsTime, lowTimeAlertShown, playNotificationSound, triggerVibration, isInClosingWordsMode]);

  // Check for notification triggers
  useEffect(() => {
    if (!isTimerRunning || !analysisResult) return;
    
    // Segundos hasta el repaso según el plan RECALCULADO (no el inicial)
    const timeUntilFinalQuestions = getSecondsUntilReview();
    if (timeUntilFinalQuestions === null) return;
    
    // First alert - only if value > 0
    if (alertTimes.firstAlert > 0) {
      const firstAlertSeconds = alertTimes.firstAlert * 60;
      if (timeUntilFinalQuestions <= firstAlertSeconds && timeUntilFinalQuestions > 0 && !notificationPlayed.fiveMin) {
        playNotificationSound('warning');
        triggerVibration([200, 100, 200]);
        setNotificationPlayed(prev => ({ ...prev, fiveMin: true }));
        toast.warning(`⏰ ${alertTimes.firstAlert} minuto${alertTimes.firstAlert > 1 ? 's' : ''} para las preguntas de repaso`, { duration: 5000 });
      }
    }
    
    // Second alert - only if value > 0
    if (alertTimes.secondAlert > 0) {
      const secondAlertSeconds = alertTimes.secondAlert * 60;
      if (timeUntilFinalQuestions <= secondAlertSeconds && timeUntilFinalQuestions > 0 && !notificationPlayed.oneMin) {
        playNotificationSound('urgent');
        triggerVibration([200, 100, 200, 100, 200]);
        setNotificationPlayed(prev => ({ ...prev, oneMin: true }));
        toast.warning(`⚠️ ${alertTimes.secondAlert} minuto${alertTimes.secondAlert > 1 ? 's' : ''} para las preguntas de repaso`, { duration: 5000 });
      }
    }
    
    const reviewAlertsOn = alertTimes.firstAlert > 0 || alertTimes.secondAlert > 0;
    if (reviewAlertsOn && timeUntilFinalQuestions <= 0 && !notificationPlayed.now) {
      playNotificationSound('final');
      triggerVibration([500, 200, 500, 200, 500]);
      setNotificationPlayed(prev => ({ ...prev, now: true }));
      toast.success("🎯 ¡Es hora de las preguntas de repaso!", { duration: 8000 });
    }
  }, [elapsedTime, isTimerRunning, analysisResult, notificationPlayed, playNotificationSound, getSecondsUntilReview, alertTimes, triggerVibration]);

  // Aviso: faltan 5 minutos para la hora de fin
  useEffect(() => {
    if (!isTimerRunning || !analysisResult || !fiveMinuteWarningEnabled) return;
    if (studyPhase === 'finished' || studyPhase === 'initial') return;
    if (remainingTime <= 300 && remainingTime > 0 && !notificationPlayed.endFiveMin) {
      playNotificationSound('urgent');
      triggerVibration([500, 200, 500]);
      setNotificationPlayed(prev => ({ ...prev, endFiveMin: true }));
      toast.warning("EN 5 MINUTOS DEBE CONCLUIR", { duration: 10000, important: true });
    }
  }, [remainingTime, isTimerRunning, analysisResult, fiveMinuteWarningEnabled, studyPhase, notificationPlayed, playNotificationSound, triggerVibration]);

  // Initialize remaining time when analysis is complete or duration changes
  useEffect(() => {
    if (analysisResult) {
      setRemainingTime(totalDurationSeconds);
    }
  }, [analysisResult, totalDurationSeconds]);

  // Timer effect
  useEffect(() => {
    if (isTimerRunning) {
      timerRef.current = setInterval(() => {
        setElapsedTime(prev => prev + 1);
        setRemainingTime(prev => Math.max(0, prev - 1));
        setSegmentTimer(prev => prev.key === segmentKeyRef.current
          ? { key: prev.key, elapsed: prev.elapsed + 1 }
          : { key: segmentKeyRef.current, elapsed: 1 });
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
  const handleFileUpload = async (file, targetDate = jwWeekMonday) => {
    if (!file || !(file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf')) {
      toast.error(t("errInvalidPdf"));
      return;
    }

    setIsLoading(true);

    try {
      // El PDF se analiza en el propio dispositivo: no se envía a ningún servidor
      // Si es la revista completa, se analiza solo el artículo de la semana elegida
      const result = await analyzeFile(file, readingSpeed, answerTime, { targetDate });
      lastFileRef.current = file;
      // Revista completa: guardar una copia en la app para las próximas semanas
      if (result.from_issue && result.issue_weeks?.length > 1) {
        saveIssue(file, result.issue_weeks)
          .then(() => setLibraryVersion((v) => v + 1))
          .catch((e) => console.warn('No se pudo guardar la revista en la app', e));
      }
      
      setAnalysisResult(result);
      setElapsedTime(0);
      setIsTimerRunning(false);
      setStartTime(null);
      setEndTime(null);
      setCurrentManualParagraph(0);
      toast.success("PDF analizado correctamente");
    } catch (error) {
      console.error("Error uploading PDF:", error);
      const msg = error?.message === 'ERR_NO_TEXT' ? t("errNoText") : error?.message === 'ERR_FORMAT' ? t("errFormat") : error?.message;
      toast.error(msg ? `${t("errProcessPdf")}: ${msg}` : t("errProcessPdf"));
    } finally {
      setIsLoading(false);
    }
  };

  // Con la revista completa cargada: analizar otro artículo (otra semana) del mismo PDF
  const handleSelectIssueWeek = useCallback((weekStartIso) => {
    if (!lastFileRef.current || startTime) return;
    const d = new Date(weekStartIso);
    setJwWeekMonday(mondayOf(d));
    handleFileUpload(lastFileRef.current, d);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startTime, readingSpeed, answerTime]);

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
      // If this is the first time starting, use startIntroductionMode to begin with introduction
      if (!startTime) {
        startIntroductionMode();
        return; // startIntroductionMode already sets isTimerRunning to true
      }
    }
    setIsTimerRunning(!isTimerRunning);
  };

  const resetTimer = () => {
    setIsTimerRunning(false);
    setElapsedTime(0);
    setRemainingTime(totalDurationSeconds);
    setStartTime(null);
    setEndTime(null);
    // Don't reset manualEndTime so user keeps their preference
    setNotificationPlayed({ fiveMin: false, oneMin: false, now: false });
    setCurrentManualParagraph(0);
    setParagraphStartTimes({});
    setLowTimeAlertShown(false);
    setParagraphStats({});
    setParagraphStartTime(null);
    setIsInReviewMode(false);
    setCurrentReviewQuestion(0);
    setReviewQuestionStartTime(null);
    setIsInIntroductionMode(false);
    setIntroductionStartTime(null);
    setIsInClosingWordsMode(false);
    setClosingWordsStartTime(null);
    setCommentStats({ paragraphs: {}, review: {} });
    setSegmentTimer({ key: '', elapsed: 0 });
    setPresentationPhase('intro');
  };

  const resetAll = () => {
    setAnalysisResult(null);
    setManualEndTime(null); // Reset manual end time when starting fresh
    resetTimer();
  };

  // Start introduction mode and main timer
  const startIntroductionMode = useCallback(() => {
    setIsInIntroductionMode(true);
    setIntroductionStartTime(Date.now());
    setPresentationPhase('intro'); // Sync presentation phase
    
    // Start main timer
    const now = new Date();
    setStartTime(now);
    if (manualEndTime) {
      setEndTime(manualEndTime);
      const diffSeconds = Math.floor((manualEndTime.getTime() - now.getTime()) / 1000);
      setRemainingTime(Math.max(0, diffSeconds));
    } else {
      setEndTime(addSecondsToDate(now, totalDurationSeconds));
    }
    setIsTimerRunning(true);
    
    toast.success("Iniciando Palabras de Introducción");
  }, [manualEndTime, totalDurationSeconds]);

  // Move to first paragraph after introduction
  const goToFirstParagraph = useCallback(() => {
    setIsInIntroductionMode(false);
    setCurrentManualParagraph(0);
    setParagraphStartTime(Date.now());
    setPresentationPhase('paragraphs'); // Sync presentation phase
    toast.success("Pasando al Párrafo 1");
  }, []);

  // Start review questions mode
  const startReviewMode = useCallback(() => {
    setIsInReviewMode(true);
    setCurrentReviewQuestion(0);
    setReviewQuestionStartTime(Date.now());
    setPresentationPhase('review'); // Sync presentation phase
    setPresentationReviewQuestion(0);
    toast.success("Iniciando Preguntas de Repaso");
  }, []);

  // Navigate to next review question
  const goToNextReviewQuestion = useCallback(() => {
    if (!analysisResult?.final_questions) return;
    
    const nextQuestion = currentReviewQuestion + 1;
    if (nextQuestion < analysisResult.final_questions.length) {
      setCurrentReviewQuestion(nextQuestion);
      setReviewQuestionStartTime(Date.now());
      setPresentationReviewQuestion(nextQuestion); // Sync presentation review question
      toast.success(`Pregunta de repaso ${nextQuestion + 1}`);
    }
  }, [currentReviewQuestion, analysisResult]);

  // Start closing words mode
  const startClosingWordsMode = useCallback(() => {
    setIsInClosingWordsMode(true);
    setClosingWordsStartTime(Date.now());
    setPresentationPhase('conclusion'); // Sync presentation phase
    toast.success("Iniciando Palabras de Conclusión");
  }, []);

  // Finish study
  const finishStudy = useCallback(() => {
    setIsTimerRunning(false);
    setIsInClosingWordsMode(false);
    setIsInReviewMode(false);
    setPresentationPhase('finished'); // Sync presentation phase
    toast.success("¡Estudio finalizado! 🎉");
  }, []);

  // Start from specific paragraph
  const startFromParagraph = useCallback((paragraphIndex) => {
    // Como si la introducción y los párrafos anteriores hubieran durado lo planificado
    const cumulativeTime = staticPlan?.paragraphOffsets?.[paragraphIndex] ?? 0;
    
    setIsInIntroductionMode(false);
    setElapsedTime(Math.floor(cumulativeTime));
    setRemainingTime(totalDurationSeconds - Math.floor(cumulativeTime));
    
    const now = new Date();
    const virtualStartTime = new Date(now.getTime() - cumulativeTime * 1000);
    setStartTime(virtualStartTime);
    setEndTime(addSecondsToDate(virtualStartTime, totalDurationSeconds));
    setCurrentManualParagraph(paragraphIndex);
    setIsTimerRunning(true);
    setNotificationPlayed({ fiveMin: false, oneMin: false, now: false });
    setParagraphStartTime(Date.now()); // Start timing this paragraph
    
    toast.success(`Iniciando desde Párrafo ${paragraphIndex + 1}`);
  }, [totalDurationSeconds, staticPlan]);

  // Export functions
  const exportToImage = async () => {
    if (!exportRef.current) return;
    toast.loading(t("generatingImage"));
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
      toast.error(t("errExportImage"));
    }
  };

  const exportToPDF = async () => {
    if (!exportRef.current) return;
    toast.loading(t("generatingPdf"));
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
      toast.error(t("errExportPdf"));
    }
  };

  // Calculate progress
  const progressPercentage = analysisResult ? Math.min(100, (elapsedTime / totalDurationSeconds) * 100) : 0;
  const adjustedFinalTimes = getAdjustedFinalQuestionsTime();

  // «Plan de hoy»: hora actual, hora de fin y duración (o restante), con los controles del cronómetro
  const planCard = analysisResult ? (
    <TimerDisplay
      elapsedTime={elapsedTime}
      isTimerRunning={isTimerRunning}
      startTime={startTime}
      endTime={endTime}
      progressPercentage={progressPercentage}
      onToggle={toggleTimer}
      onReset={resetTimer}
      remainingTime={remainingTime}
      totalDuration={totalDuration}
      manualEndTime={manualEndTime}
      onManualEndTimeChange={setManualEndTime}
      fiveMinuteWarningEnabled={fiveMinuteWarningEnabled}
      perQuestion={isTimerRunning && adjustedFinalTimes.perQuestion !== undefined ? adjustedFinalTimes.perQuestion : plannedPerQuestion}
      plannedPerQuestion={plannedPerQuestion}
      circuitVisitMode={circuitVisitMode}
      onCircuitVisitChange={startTime ? undefined : setCircuitVisitMode}
      circuitVisitMinutes={circuitVisitDuration}
    />
  ) : null;

  // Botón «Siguiente» de la barra inferior (móvil): mismo orden que el modo presentación
  const nextStep = analysisResult ? getNextStep({
    phase: studyPhase,
    groupedParagraphs,
    currentParagraphGroup,
    totalParagraphs: analysisResult.paragraphs?.length || 0,
    finalsCount: analysisResult.final_questions?.length || 0,
    currentReviewQuestion,
  }) : null;
  const handleNextStep = () => {
    switch (nextStep?.action) {
      case 'start': startIntroductionMode(); break;
      case 'firstParagraph': goToFirstParagraph(); break;
      case 'nextGroup': goToNextGroup(); break;
      case 'review': startReviewMode(); break;
      case 'nextReview': goToNextReviewQuestion(); break;
      case 'closing': startClosingWordsMode(); break;
      case 'finish': finishStudy(); break;
      default: break;
    }
  };
  const showActionBar = !!analysisResult && !isPresentationMode && !isDesktop && !!nextStep;

  return (
    <div className={`min-h-screen transition-colors duration-300 ${darkMode ? currentTheme?.bg || 'bg-zinc-900' : 'bg-stone-50'}`}>
      {/* Header */}
      <header className={`border-b sticky top-0 z-50 shadow-sm backdrop-blur-md transition-colors duration-300 ${
        darkMode 
          ? `${currentTheme?.border || 'border-zinc-700'} ${currentTheme?.panel || 'bg-zinc-800'}/90` 
          : 'border-slate-200 bg-white/90'
      }`}>
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3">
              <img 
                src="/logo-icon.png" 
                alt={t('appName')} 
                className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl shadow-lg"
              />
              <div>
                <h1 className="font-heading font-bold text-base sm:text-xl text-orange-500" data-testid="app-title">
                  {t('appNameUpper')}
                </h1>
                <p className={`text-xs font-semibold tracking-wide hidden sm:block ${darkMode ? currentTheme?.textMuted || 'text-zinc-400' : 'text-slate-700'}`}>{t('appTagline')}</p>
              </div>
            </div>
            <div className="flex items-center gap-1 sm:gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    title={t("language")}
                    aria-label={t("language")}
                    data-testid="language-btn"
                    className={`rounded-full h-9 sm:h-10 pl-2.5 pr-2 gap-1.5 text-xs font-black border ${
                      darkMode ? 'border-zinc-600 text-zinc-100 hover:bg-zinc-700' : 'border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <Globe className="w-4 h-4" />
                    {LANGUAGES.find((l) => l.code === currentLanguage())?.short}
                    {currentLanguage() === "pt" && currentPtVariant() && <span className="opacity-60">·{currentPtVariant()}</span>}
                    <ChevronDownLv className="w-3.5 h-3.5 opacity-60" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className={`rounded-xl min-w-[180px] ${darkMode ? 'bg-zinc-800 border-zinc-700' : ''}`}>
                  {LANGUAGES.map((l) => (
                    <DropdownMenuItem
                      key={l.code}
                      onClick={() => setLanguage(l.code)}
                      className={`cursor-pointer ${darkMode ? 'text-zinc-100 hover:bg-zinc-700 focus:bg-zinc-700' : ''}`}
                      data-testid={`language-option-${l.code}`}
                    >
                      <span className="w-7 text-[11px] font-black opacity-60">{l.short}</span>
                      <span className="flex-1">{l.name}</span>
                      {currentLanguage() === l.code && <Check className="w-4 h-4 text-orange-500" />}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => openSettings(settingsTab)}
                className={`rounded-full w-9 h-9 sm:w-10 sm:h-10 ${
                  darkMode ? 'text-zinc-200 hover:bg-zinc-700' : 'text-slate-600 hover:bg-slate-100'
                }`}
                title={t("settings")}
                aria-label={t("settings")}
                data-testid="settings-btn"
              >
                <Settings className="w-5 h-5" />
              </Button>
              
              {analysisResult && (
                <>
                <Button 
                  variant="outline" 
                  onClick={enterPresentationMode} 
                  className={`rounded-full px-2 sm:px-5 py-1.5 sm:py-2 border-2 font-medium transition-all text-xs sm:text-sm ${
                    darkMode
                      ? 'border-zinc-500 text-zinc-100 hover:border-orange-400 hover:text-orange-400 hover:bg-orange-500/10'
                      : 'border-slate-300 text-slate-700 hover:border-orange-400 hover:text-orange-600 hover:bg-orange-50'
                  }`}
                  data-testid="presentation-mode-btn"
                >
                  <Maximize className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">{t("presentation")}</span>
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="outline" 
                      className={`rounded-full px-2 sm:px-5 py-1.5 sm:py-2 border-2 font-medium text-xs sm:text-sm ${
                        darkMode
                          ? 'border-zinc-500 text-zinc-100 hover:border-zinc-400 hover:bg-zinc-700'
                          : 'border-slate-300 text-slate-700 hover:border-slate-400'
                      }`}
                      data-testid="export-btn"
                    >
                      <Download className="w-4 h-4 sm:mr-2" />
                      <span className="hidden sm:inline">{t("export")}</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className={`rounded-xl ${darkMode ? 'bg-zinc-800 border-zinc-600' : ''}`}>
                    <DropdownMenuItem onClick={exportToImage} data-testid="export-image-btn" className={`cursor-pointer ${darkMode ? 'text-zinc-100 hover:bg-zinc-700 focus:bg-zinc-700' : ''}`}>
                      <FileImage className="w-4 h-4 mr-2" />
                      {t("exportImage")}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={exportToPDF} data-testid="export-pdf-btn" className={`cursor-pointer ${darkMode ? 'text-zinc-100 hover:bg-zinc-700 focus:bg-zinc-700' : ''}`}>
                      <File className="w-4 h-4 mr-2" />
                      {t("exportPdf")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button 
                  variant="ghost" 
                  onClick={resetAll} 
                  className={`rounded-full px-2 sm:px-4 py-1.5 sm:py-2 font-medium text-xs sm:text-sm ${
                    darkMode
                      ? 'text-zinc-200 hover:text-zinc-50 hover:bg-zinc-700'
                      : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                  }`}
                  data-testid="new-analysis-btn"
                >
                  <RotateCcw className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">{t("newStudy")}</span>
                </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className={`max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-8 ${showActionBar ? (studyPhase === 'paragraphs' || studyPhase === 'review' ? 'pb-48' : 'pb-32') : ''}`}>
        {!analysisResult ? (
          <div className="space-y-4">
            {/* Plan de hoy (antes de cargar el artículo): compacto */}
            {(() => {
              const hhmm = (d) => d.toLocaleTimeString(currentLocale(), { hour: '2-digit', minute: '2-digit', hour12: false });
              const endPreview = manualEndTime || new Date(Date.now() + totalDuration * 60 * 1000);
              const durationPreview = manualEndTime
                ? Math.max(0, Math.round((manualEndTime.getTime() - Date.now()) / 60000))
                : totalDuration;
              const openEdit = () => {
                setInitialEditHours(endPreview.getHours().toString().padStart(2, '0'));
                setInitialEditMinutes(endPreview.getMinutes().toString().padStart(2, '0'));
                setIsEditingInitialEndTime(true);
              };
              const saveEdit = () => {
                const hours = parseInt(initialEditHours) || 0;
                const minutes = parseInt(initialEditMinutes) || 0;
                if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
                  const newEndTime = new Date();
                  newEndTime.setHours(hours, minutes, 0, 0);
                  setManualEndTime(newEndTime);
                  setIsEditingInitialEndTime(false);
                }
              };
              return (
                <div className="rounded-2xl bg-zinc-900 text-white p-4 shadow-xl border border-zinc-800" data-testid="start-plan-card">
                  <p className="text-[11px] font-bold tracking-[0.2em] text-zinc-400 uppercase">
                    {t('planToday', { n: durationPreview })}{manualEndTime ? ` · ${t('manualEnd')}` : ''}
                  </p>
                  <div className="mt-2 grid grid-cols-3 gap-2 text-center items-end">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">{t("now")}</p>
                      <p className="text-2xl sm:text-3xl font-black tabular-nums">{hhmm(new Date())}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">{t("ends")}</p>
                      {isEditingInitialEndTime ? (
                        <div className="flex items-center justify-center gap-1">
                          <input
                            type="text" inputMode="numeric"
                            value={initialEditHours}
                            onChange={(e) => setInitialEditHours(e.target.value.replace(/\D/g, '').slice(0, 2))}
                            className="w-11 h-10 text-center bg-zinc-800 border-2 border-yellow-500/60 rounded-lg text-yellow-300 text-xl font-black focus:outline-none focus:border-yellow-400"
                            placeholder="HH" maxLength={2} autoFocus
                          />
                          <span className="text-yellow-400 text-xl font-black">:</span>
                          <input
                            type="text" inputMode="numeric"
                            value={initialEditMinutes}
                            onChange={(e) => setInitialEditMinutes(e.target.value.replace(/\D/g, '').slice(0, 2))}
                            className="w-11 h-10 text-center bg-zinc-800 border-2 border-yellow-500/60 rounded-lg text-yellow-300 text-xl font-black focus:outline-none focus:border-yellow-400"
                            placeholder="MM" maxLength={2}
                          />
                        </div>
                      ) : (
                        <button onClick={openEdit} className="text-2xl sm:text-3xl font-black tabular-nums text-yellow-400 hover:text-yellow-300" title={t("changeEndTime")} data-testid="start-end-time">
                          {hhmm(endPreview)}
                        </button>
                      )}
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">{t("duration")}</p>
                      <p className="text-2xl sm:text-3xl font-black tabular-nums text-orange-400">{durationPreview}<span className="text-sm ml-0.5">min</span></p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap justify-center gap-2">
                    {isEditingInitialEndTime ? (
                      <>
                        <button onClick={saveEdit} className="inline-flex items-center gap-1.5 rounded-xl px-4 h-9 bg-emerald-600 hover:bg-emerald-500 text-sm font-bold">
                          <Check className="w-4 h-4" /> {t("save")}
                        </button>
                        <button onClick={() => setIsEditingInitialEndTime(false)} className="inline-flex items-center gap-1.5 rounded-xl px-4 h-9 bg-zinc-700 hover:bg-zinc-600 text-sm font-bold">
                          <X className="w-4 h-4" /> {t("cancel")}
                        </button>
                      </>
                    ) : manualEndTime ? (
                      <button onClick={() => setManualEndTime(null)} className="inline-flex items-center gap-1.5 rounded-xl px-4 h-9 bg-zinc-800 hover:bg-zinc-700 text-sm font-semibold text-cyan-300">
                        <RotateCcw className="w-4 h-4" /> {t("autoTime")}
                      </button>
                    ) : (
                      <button onClick={openEdit} className="inline-flex items-center gap-1.5 rounded-xl px-4 h-9 bg-zinc-800 hover:bg-zinc-700 text-sm font-semibold text-zinc-200">
                        <Pencil className="w-4 h-4 text-yellow-400" /> {t("changeEndTime")}
                      </button>
                    )}
                  </div>
                </div>
              );
            })()}

            <JwWeeklyCard
              weekMonday={jwWeekMonday}
              onWeekChange={setJwWeekMonday}
              onChoosePdf={() => fileInputRef.current?.click()}
              onOpenFile={(file, monday) => handleFileUpload(file, monday)}
              libraryVersion={libraryVersion}
              isLoading={isLoading}
              darkMode={darkMode}
            />
            <CircuitVisitToggle
              enabled={circuitVisitMode}
              onChange={setCircuitVisitMode}
              minutes={circuitVisitDuration}
              darkMode={darkMode}
            />
            <button
              onClick={() => openSettings('tiempo')}
              className={`w-full text-left rounded-2xl border shadow-sm p-4 flex items-center gap-3 transition-colors ${
                darkMode ? 'bg-zinc-800 border-zinc-700 hover:bg-zinc-700' : 'bg-white border-slate-200 hover:bg-slate-50'
              }`}
              data-testid="settings-summary"
            >
              <span className={`w-9 h-9 shrink-0 rounded-lg flex items-center justify-center ${darkMode ? 'bg-zinc-700 text-zinc-200' : 'bg-slate-100 text-slate-600'}`}>
                <Settings className="w-4 h-4" />
              </span>
              <span className="flex-1 min-w-0">
                <span className={`block font-semibold text-sm ${darkMode ? 'text-zinc-100' : 'text-slate-800'}`}>{t('studySettings')}</span>
                <span className={`block text-xs mt-0.5 ${darkMode ? 'text-zinc-400' : 'text-slate-500'}`}>
                  {t('settingsSummary', { dur: totalDuration, speed: speedLabel(readingSpeed).toLowerCase(), answer: answerTime, intro: introductionDuration })}
                </span>
              </span>
              <span className="text-sm font-semibold text-orange-500 shrink-0">{t("change")}</span>
            </button>
            <UploadZone
              onFileSelect={handleFileUpload}
              isDragging={isDragging}
              isLoading={isLoading}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              fileInputRef={fileInputRef}
              readingSpeed={readingSpeed}
              answerTime={answerTime}
              darkMode={darkMode}
            />
          </div>
        ) : (
          <div ref={exportRef} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Column - Analysis */}
            <div className="lg:col-span-8 space-y-6">
              {!isDesktop && planCard}
              <AnalysisSummary 
                analysisResult={analysisResult} 
                onSelectIssueWeek={startTime ? undefined : handleSelectIssueWeek}
                darkMode={darkMode} 
                totalDurationMinutes={totalDuration}
                introductionDuration={introductionDuration}
                closingWordsDuration={closingWordsDuration}
              />

              {/* Introduction Words Section */}
              <IntroductionWordsSection
                finalStretch={remainingTime <= 300}
                isActive={isInIntroductionMode}
                isTimerRunning={isTimerRunning}
                estimatedTime={introductionDuration}
                onStartIntroduction={startIntroductionMode}
                onGoToFirstParagraph={goToFirstParagraph}
                hasStarted={startTime !== null}
                overtimeAlertEnabled={overtimeAlertEnabled}
                soundEnabled={soundEnabled}
                vibrationEnabled={vibrationEnabled}
                playNotificationSound={playNotificationSound}
                triggerVibration={triggerVibration}
                darkMode={darkMode}
              />

              {/* Paragraphs List */}
              <div className="space-y-2">
                {/* Cabecera de la lista */}
                <div data-testid="paragraphs-header">
                  <div className="flex items-center justify-between gap-3 px-1">
                    <div className="min-w-0">
                      <h3 className={`font-heading font-bold text-base ${darkMode ? 'text-zinc-100' : 'text-zinc-900'}`}>
                        {t('paragraphsTitle')}
                      </h3>
                      <p className={`text-xs ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
                        {tn('paragraphs', analysisResult.total_paragraphs)} · {t('words', { n: analysisResult.total_words })}
                      </p>
                    </div>
                    <button
                      onClick={() => setShowAllParagraphContent(!showAllParagraphContent)}
                      className={`shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 h-8 text-xs font-semibold border transition-colors ${
                        showAllParagraphContent
                          ? 'bg-orange-500 border-orange-500 text-white'
                          : darkMode ? 'border-zinc-600 text-zinc-200 hover:bg-zinc-700' : 'border-slate-300 text-slate-700 hover:bg-slate-100'
                      }`}
                      data-testid="toggle-all-content-btn"
                    >
                      {showAllParagraphContent ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      {showAllParagraphContent ? t('hideTexts') : t('showAllTexts')}
                    </button>
                  </div>
                  {isTimerRunning && !isInIntroductionMode && (
                    <div className="flex items-center justify-center gap-2 mt-2">
                      <Button size="sm" variant="outline" onClick={goToPreviousParagraph} disabled={currentManualParagraph <= 0} className={`text-xs rounded-full ${darkMode ? 'border-zinc-600 bg-zinc-800 text-zinc-100 hover:bg-zinc-700 hover:text-white' : ''}`} data-testid="prev-paragraph-btn-2">
                        <ChevronLeft className="w-3 h-3 mr-1" />
                        {t('previous')}
                      </Button>
                      <Badge className={`font-mono px-3 py-1 ${darkMode ? 'bg-orange-700 text-white' : 'bg-orange-100 text-orange-700'}`}>
                        {currentManualParagraph + 1} / {analysisResult.total_paragraphs}
                      </Badge>
                      <Button size="sm" variant="outline" onClick={goToNextGroup} disabled={currentGroupLast >= analysisResult.paragraphs.length - 1} className={`text-xs rounded-full ${darkMode ? 'border-zinc-600 bg-zinc-800 text-zinc-100 hover:bg-zinc-700 hover:text-white' : ''}`} data-testid="next-paragraph-btn-2">
                        {t('next')}
                        <ChevronRight className="w-3 h-3 ml-1" />
                      </Button>
                    </div>
                  )}
                </div>
                
                <div className="space-y-2">
                  {groupedParagraphs.map((group, groupIndex) => {
                    const firstIndex = group.indices[0];
                    const lastIndex = group.indices[group.indices.length - 1];
                    // Show as current if timer is running and we're on this group
                    const isCurrentGroup = isTimerRunning && !isInIntroductionMode && group.indices.includes(currentManualParagraph);
                    // Show as completed if we've passed this group (regardless of timer state)
                    const isCompletedGroup = !isInIntroductionMode && lastIndex < currentManualParagraph;
                    
                    return (
                      <ParagraphCard
                        finalStretch={remainingTime <= 300}
                        key={`group-${group.firstParagraph.number}`}
                        paragraph={group.firstParagraph}
                        groupedParagraphs={group.paragraphs}
                        index={firstIndex}
                        startTime={startTime}
                        paragraphTimes={getAdjustedParagraphTimes(firstIndex, lastIndex)}
                        onStartFromHere={() => startFromParagraph(firstIndex)}
                        isTimerRunning={isTimerRunning && !isInIntroductionMode}
                        isCurrentParagraph={isCurrentGroup}
                        isCompletedParagraph={isCompletedGroup || isInReviewMode}
                        elapsedTime={elapsedTime}
                        onGoToNext={goToNextGroup}
                        isLastParagraph={lastIndex === analysisResult.paragraphs.length - 1}
                        adjustedQuestionTime={adjustedFinalTimes.perQuestion}
                        plannedQuestionTime={plannedPerQuestion}
                        overtimeAlertEnabled={overtimeAlertEnabled}
                        soundEnabled={soundEnabled}
                        vibrationEnabled={vibrationEnabled}
                        playNotificationSound={playNotificationSound}
                        triggerVibration={triggerVibration}
                        onStartReview={startReviewMode}
                        hasReviewQuestions={analysisResult.final_questions?.length > 0}
                        darkMode={darkMode}
                        showContentGlobal={showAllParagraphContent}
                        onAddComment={isCurrentGroup ? handleAddComment : undefined}
                        commentCount={commentStats.paragraphs[firstIndex] || 0}
                      />
                    );
                  })}
                </div>
              </div>

              {/* Final Questions Section - After all paragraphs */}
              {analysisResult.final_questions?.length > 0 && (
                <FinalQuestionsSection
                  finalStretch={remainingTime <= 300}
                  finalQuestions={analysisResult.final_questions}
                  finalQuestionsTitle={analysisResult.final_questions_title}
                  startTime={startTime}
                  isTimerRunning={isTimerRunning}
                  adjustedTimes={adjustedFinalTimes}
                  plannedPerQuestion={plannedPerQuestion}
                  getQuestionTime={getAdjustedFinalQuestionTime}
                  originalStartTime={getFinalQuestionsTimeSeconds()}
                  isInReviewMode={isInReviewMode}
                  currentReviewQuestion={currentReviewQuestion}
                  onStartReview={startReviewMode}
                  onNextReviewQuestion={goToNextReviewQuestion}
                  onStartClosingWords={startClosingWordsMode}
                  isInClosingWordsMode={isInClosingWordsMode}
                  closingWordsDuration={closingWordsDuration}
                  onFinishStudy={finishStudy}
                  overtimeAlertEnabled={overtimeAlertEnabled}
                  soundEnabled={soundEnabled}
                  vibrationEnabled={vibrationEnabled}
                  playNotificationSound={playNotificationSound}
                  triggerVibration={triggerVibration}
                  darkMode={darkMode}
                  onAddComment={handleAddComment}
                  reviewCommentStats={commentStats.review}
                />
              )}
            </div>

            {/* Right Column - Timers */}
            <div className="lg:col-span-4 space-y-6">
              <div className="lg:sticky lg:top-24 space-y-6">
                {isDesktop && planCard}

                {/* Statistics Panel - shows after at least one paragraph is completed */}
                <ParagraphStatsPanel
                  paragraphStats={paragraphStats}
                  totalParagraphs={analysisResult.paragraphs.length}
                />
              </div>
            </div>
          </div>
        )}
      </main>

      {showActionBar && (
        <StudyActionBar
          nextStep={nextStep}
          onNext={handleNextStep}
          canComment={studyPhase === 'paragraphs' || studyPhase === 'review'}
          onAddComment={handleAddComment}
          totalComments={totalComments}
          onPresentation={enterPresentationMode}
          darkMode={darkMode}
        />
      )}

      <PtVariantDialog darkMode={darkMode} />
      <SettingsSheet
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        tab={settingsTab}
        onTabChange={setSettingsTab}
        hasStarted={startTime !== null}
        totalDuration={totalDuration}
        setTotalDuration={setTotalDuration}
        introductionDuration={introductionDuration}
        setIntroductionDuration={setIntroductionDuration}
        closingWordsDuration={closingWordsDuration}
        setClosingWordsDuration={setClosingWordsDuration}
        circuitVisitMode={circuitVisitMode}
        setCircuitVisitMode={setCircuitVisitMode}
        circuitVisitMinutes={circuitVisitDuration}
        readingSpeed={readingSpeed}
        setReadingSpeed={setReadingSpeed}
        answerTime={answerTime}
        setAnswerTime={setAnswerTime}
        longParagraphWeight={longParagraphWeight}
        setLongParagraphWeight={setLongParagraphWeight}
        soundEnabled={soundEnabled}
        setSoundEnabled={setSoundEnabled}
        vibrationEnabled={vibrationEnabled}
        setVibrationEnabled={setVibrationEnabled}
        overtimeAlertEnabled={overtimeAlertEnabled}
        setOvertimeAlertEnabled={setOvertimeAlertEnabled}
        fiveMinuteWarningEnabled={fiveMinuteWarningEnabled}
        setFiveMinuteWarningEnabled={setFiveMinuteWarningEnabled}
        alertTimes={alertTimes}
        setAlertTimes={setAlertTimes}
        onTestSound={() => playNotificationSound('warning')}
        onTestVibration={() => triggerVibration([200, 100, 200])}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        darkTheme={darkTheme}
        setDarkTheme={setDarkTheme}
        presentationLayout={presentationLayout}
        setPresentationLayout={setPresentationLayout}
      />

      {/* Presentation Mode Overlay */}
      {isPresentationMode && (
        <PresentationMode
          analysisResult={analysisResult}
          elapsedTime={elapsedTime}
          remainingTime={remainingTime}
          isTimerRunning={isTimerRunning}
          onToggleTimer={toggleTimer}
          onExit={exitPresentationMode}
          phase={studyPhase}
          currentParagraphGroup={currentParagraphGroup}
          groupedParagraphs={groupedParagraphs}
          currentReviewQuestion={currentReviewQuestion}
          phaseElapsedTime={segmentElapsed}
          estimatedTime={currentSegmentEstimate}
          endTime={endTime || manualEndTime}
          layout={presentationLayout}
          onLayoutChange={setPresentationLayout}
          totalDurationSeconds={totalDurationSeconds}
          totalComments={totalComments}
          phaseComments={phaseComments}
          onAddComment={handleAddComment}
          fiveMinuteWarningEnabled={fiveMinuteWarningEnabled}
          onStartStudy={startIntroductionMode}
          onGoToFirstParagraph={goToFirstParagraph}
          onGoToNextGroup={goToNextGroup}
          onStartReview={startReviewMode}
          onNextReviewQuestion={goToNextReviewQuestion}
          onStartClosingWords={startClosingWordsMode}
          onFinishStudy={finishStudy}
        />
      )}
    </div>
  );
}
