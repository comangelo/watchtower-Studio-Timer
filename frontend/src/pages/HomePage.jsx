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
  BookOpen,
  Compass,
  Smartphone,
  ClipboardList,
  History,
} from "lucide-react";
import { manualUrl, guideUrl } from "@/utils/manual";
import { playStoreUrl, suggestPlayStoreApp } from "@/utils/donation";
import { saveReport, openReport } from "@/utils/studyHistory";
import { getArticleHeading } from "@/components/AnalysisSummary";
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
import { nextButtonUrgency } from "@/utils/nextUrgency";
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
import { darkThemes, defaultDarkTheme, applyDarkTheme, defaultLightTheme, applyLightTheme } from "@/utils/darkThemes";


/** Lo que hay que leer o comentar en un tramo, para el informe: citas, imágenes, notas e ideas importantes. */
function segmentExtras(questions, refs) {
  const qs = questions || [];
  const is = (q, ...types) => types.includes(q.content_type);
  // "Esaera Zaharrak 14:29" y "Zaharrak 14:29" son la misma cita: se queda la completa
  const all = [...new Set(refs || [])];
  const x = {
    refs: all.filter((r) => !all.some((o) => o !== r && o.endsWith(' ' + r))),
    scriptures: qs.filter((q) => is(q, 'scripture', 'both')).length,
    images: qs.filter((q) => is(q, 'image', 'both')).length,
    notes: qs.filter((q) => is(q, 'note')).length,
    highlights: qs.reduce((n, q) => n + (q.highlight_contents || []).length, 0),
  };
  return x.refs.length || x.scriptures || x.images || x.notes || x.highlights ? x : undefined;
}

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
  // Tarjeta «¿Primera vez?» con el manual; el botón del manual de la cabecera queda siempre.
  const [manualCardHidden, setManualCardHidden] = useLocalStorage('pdfTimer_manualCardHidden', false);
  const [playCardHidden, setPlayCardHidden] = useLocalStorage('pdfTimer_playCardHidden', false);
  const showPlayCard = !playCardHidden && suggestPlayStoreApp();
  const [vibrationEnabled, setVibrationEnabled] = useLocalStorage('pdfTimer_vibrationEnabled', true);
  const [alertTimes, setAlertTimes] = useLocalStorage('pdfTimer_alertTimes', { firstAlert: 0, secondAlert: 0 });
  // Aviso cuando faltan 5 minutos para la hora de fin (modo presentación y alerta)
  const [fiveMinuteWarningEnabled, setFiveMinuteWarningEnabled] = useLocalStorage('pdfTimer_fiveMinuteWarning', true);
  const [overtimeAlertEnabled, setOvertimeAlertEnabled] = useLocalStorage('pdfTimer_overtimeAlert', true);
  const [nextButtonAlertEnabled, setNextButtonAlertEnabled] = useLocalStorage('pdfTimer_nextButtonAlert', true);
  const [darkMode, setDarkMode] = useLocalStorage('pdfTimer_darkMode', false);
  const [darkTheme, setDarkTheme] = useLocalStorageString('pdfTimer_darkTheme', defaultDarkTheme);
  const [lightTheme, setLightTheme] = useLocalStorageString('pdfTimer_lightTheme', defaultLightTheme);
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
  // La variante cambia los grises de toda la app (también el modo presentación y los diálogos)
  useEffect(() => { applyDarkTheme(darkTheme, darkMode); }, [darkTheme, darkMode]);
  useEffect(() => { applyLightTheme(lightTheme, darkMode); }, [lightTheme, darkMode]);
  
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
  // Duración real de la conclusión: lo configurado o, si sobran minutos al terminar el repaso, todo el sobrante
  const [conclusionTarget, setConclusionTarget] = useState(null);
  // Registro de tramos para el informe (introducción, párrafos, repaso, conclusión)
  const studyLogRef = useRef({ startedAt: null, open: null, done: [] });
  const [lastReportId, setLastReportId] = useState(null);
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

  // Informe: abre y cierra tramos con su hora real
  const openLogSegment = useCallback((seg) => {
    studyLogRef.current.open = { ...seg, start: Date.now() };
  }, []);
  const closeLogSegment = useCallback((extra = {}) => {
    const log = studyLogRef.current;
    if (!log.open) return;
    const end = Date.now();
    log.done.push({ ...log.open, ...extra, end, actual: Math.round((end - log.open.start) / 1000) });
    log.open = null;
  }, []);

  // Guarda la estadística (previsto / real) del párrafo o grupo actual
  const recordCurrentGroupStats = useCallback(() => {
    if (!analysisResult || !paragraphStartTime) return;
    const first = currentGroupFirst;
    const last = currentGroupLast;
    const group = analysisResult.paragraphs.slice(first, last + 1);
    if (group.length === 0) return;
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
    if (studyLogRef.current.open?.kind === 'paragraph') {
      closeLogSegment({
        numbers: group.map(p => p.number).join(', '),
        count: group.length,
        // Previsto según el plan del inicio del estudio (la columna suma la duración elegida)
        estimated: staticPlan ? Math.round(group.reduce((sum, p) => sum + staticPlan.paragraphDuration(p), 0)) : estimated,
        words: group.reduce((sum, p) => sum + p.word_count, 0),
        questions: group.reduce((sum, p) => sum + countQuestions(p), 0),
        comments: commentStats.paragraphs[first] || 0,
        extras: segmentExtras(group.flatMap((p) => p.questions || []), group.flatMap((p) => p.scripture_refs || [])),
      });
    }
  }, [analysisResult, currentGroupFirst, currentGroupLast, paragraphStartTime, getAdjustedParagraphTimes, commentStats, closeLogSegment, staticPlan]);

  // Avanzar al siguiente párrafo o grupo, guardando la estadística del actual
  const goToNextGroup = useCallback(() => {
    if (!analysisResult) return;
    const last = currentGroupLast;
    if (last >= analysisResult.paragraphs.length - 1) return;
    recordCurrentGroupStats();
    const nextIndex = last + 1;
    openLogSegment({ kind: 'paragraph' });
    setCurrentManualParagraph(nextIndex);
    setParagraphStartTime(Date.now());
    setParagraphStartTimes(prev => ({ ...prev, [nextIndex]: new Date() }));
    toast.success(`Avanzando al Párrafo ${analysisResult.paragraphs[nextIndex].number}`);
  }, [analysisResult, currentGroupLast, recordCurrentGroupStats, openLogSegment]);

  // Tiempo previsto del tramo actual (para el recuadro de colores)
  const currentSegmentEstimate = (() => {
    switch (studyPhase) {
      case 'intro': return introductionDuration;
      case 'paragraphs': return getAdjustedParagraphTimes(currentGroupFirst, currentGroupLast).adjustedDuration || 0;
      case 'review': return getAdjustedFinalQuestionsTime().perQuestion || 0;
      case 'conclusion': return conclusionTarget ?? closingWordsDuration;
      default: return 0;
    }
  })();

  // Botón «Siguiente» en rojo (y parpadeando si ya no hay de dónde recuperar tiempo)
  const nextUrgency = nextButtonAlertEnabled ? nextButtonUrgency({
    phase: studyPhase,
    running: isTimerRunning,
    segmentElapsed,
    segmentEstimate: currentSegmentEstimate,
    remainingTime,
    analysis: analysisResult,
    currentGroupLast,
    currentReviewQuestion,
    conclusionSeconds: closingWordsDuration,
  }) : 'none';

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
      // En móviles y tabletas no se pide la pantalla completa del navegador: Android
      // muestra entonces un aviso abajo («para salir de la pantalla completa…») que
      // tapa los botones. El modo presentación ya ocupa toda la pantalla de la app.
      const isTouch = window.matchMedia?.('(pointer: coarse)').matches;
      if (isTouch) {
        // El botón «atrás» del móvil cierra el modo presentación en vez de salir de la app
        window.history.pushState({ presentation: true }, '');
      } else if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(err => {
          console.log('Fullscreen not supported:', err);
        });
      }
    }, 0);
  }, [isInIntroductionMode, isInReviewMode, isInClosingWordsMode, isTimerRunning, currentManualParagraph, currentReviewQuestion, presentationPhase]);

  const exitPresentationMode = useCallback(() => {
    setIsPresentationMode(false);
    if (window.history.state?.presentation) window.history.back();
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
    // Botón «atrás» del móvil
    const handlePopState = () => { if (isPresentationMode) setIsPresentationMode(false); };
    window.addEventListener('popstate', handlePopState);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      window.removeEventListener('popstate', handlePopState);
    };
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
  // Los segundos se cuentan con el reloj real (Date.now), no sumando 1 en cada tic:
  // si el móvil apaga la pantalla o el navegador frena la página, al volver se
  // recupera el tiempo transcurrido. Lo que falta se calcula siempre contra la hora de fin.
  const lastTickRef = useRef(0);
  const endTimeRef = useRef(null);
  endTimeRef.current = endTime;
  const runningRef = useRef(false);
  runningRef.current = isTimerRunning;
  useEffect(() => {
    if (!startTime) return undefined;
    lastTickRef.current = Date.now();
    const tick = () => {
      const now = Date.now();
      const d = Math.floor((now - lastTickRef.current) / 1000);
      if (d <= 0) return;
      lastTickRef.current += d * 1000;
      const end = endTimeRef.current ? new Date(endTimeRef.current).getTime() : null;
      // La hora de fin es fija: lo que falta sigue bajando aunque el cronómetro esté en pausa
      if (end) setRemainingTime(Math.max(0, Math.round((end - now) / 1000)));
      if (!runningRef.current) return; // en pausa no cuentan el total ni el tramo
      if (!end) setRemainingTime(prev => Math.max(0, prev - d));
      setElapsedTime(prev => prev + d);
      setSegmentTimer(prev => prev.key === segmentKeyRef.current
        ? { key: prev.key, elapsed: prev.elapsed + d }
        : { key: segmentKeyRef.current, elapsed: d });
    };
    timerRef.current = setInterval(tick, 250);
    const onVisible = () => { if (document.visibilityState === 'visible') tick(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [startTime]);

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

  // Arrastrar y soltar el PDF en cualquier parte de la pantalla de inicio (ordenador)
  const handleFileUploadRef = useRef(null);
  handleFileUploadRef.current = handleFileUpload;
  useEffect(() => {
    if (analysisResult) { setIsDragging(false); return undefined; }
    let depth = 0;
    const hasFiles = (e) => Array.from(e.dataTransfer?.types || []).includes('Files');
    const onEnter = (e) => { if (!hasFiles(e)) return; e.preventDefault(); depth += 1; setIsDragging(true); };
    const onOver = (e) => { if (hasFiles(e)) e.preventDefault(); };
    const onLeave = (e) => { if (!hasFiles(e)) return; depth = Math.max(0, depth - 1); if (depth === 0) setIsDragging(false); };
    const onDropWin = (e) => {
      if (!hasFiles(e)) return;
      e.preventDefault(); depth = 0; setIsDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file) handleFileUploadRef.current?.(file);
    };
    window.addEventListener('dragenter', onEnter);
    window.addEventListener('dragover', onOver);
    window.addEventListener('dragleave', onLeave);
    window.addEventListener('drop', onDropWin);
    return () => {
      window.removeEventListener('dragenter', onEnter);
      window.removeEventListener('dragover', onOver);
      window.removeEventListener('dragleave', onLeave);
      window.removeEventListener('drop', onDropWin);
    };
  }, [analysisResult]);

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
    setConclusionTarget(null);
    studyLogRef.current = { startedAt: null, open: null, done: [] };
    setLastReportId(null);
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
    studyLogRef.current = { startedAt: Date.now(), open: null, done: [] };
    setLastReportId(null);
    openLogSegment({ kind: 'intro', estimated: introductionDuration });
    setIsInIntroductionMode(true);
    setIntroductionStartTime(Date.now());
    setPresentationPhase('intro'); // Sync presentation phase
    
    // Start main timer
    const now = new Date();
    setStartTime(now);
    // «Cambiar hora de fin» solo sirve para ACORTAR el estudio (p. ej. si el discurso
    // público terminó tarde). El estudio nunca dura más de lo configurado: si se empieza
    // antes, termina antes.
    const fullEnd = addSecondsToDate(now, totalDurationSeconds);
    if (manualEndTime && manualEndTime.getTime() < fullEnd.getTime()) {
      setEndTime(manualEndTime);
      const diffSeconds = Math.floor((manualEndTime.getTime() - now.getTime()) / 1000);
      setRemainingTime(Math.max(0, diffSeconds));
    } else {
      setEndTime(addSecondsToDate(now, totalDurationSeconds));
    }
    setIsTimerRunning(true);
    
    toast.success("Iniciando Palabras de Introducción");
  }, [manualEndTime, totalDurationSeconds, introductionDuration, openLogSegment]);

  // Move to first paragraph after introduction
  const goToFirstParagraph = useCallback(() => {
    closeLogSegment();
    openLogSegment({ kind: 'paragraph' });
    setIsInIntroductionMode(false);
    setCurrentManualParagraph(0);
    setParagraphStartTime(Date.now());
    setPresentationPhase('paragraphs'); // Sync presentation phase
    toast.success("Pasando al Párrafo 1");
  }, [closeLogSegment, openLogSegment]);

  // Cierra la pregunta de repaso actual en el informe (con su tiempo previsto y comentarios)
  const closeReviewSegment = useCallback(() => {
    const open = studyLogRef.current.open;
    if (open?.kind !== 'review') return;
    closeLogSegment({
      estimated: Math.round(staticPlan?.perQuestion ?? getAdjustedFinalQuestionsTime().perQuestion ?? 0),
      comments: commentStats.review[open.index] || 0,
      extras: segmentExtras([analysisResult?.final_questions?.[open.index]].filter(Boolean)),
    });
  }, [closeLogSegment, getAdjustedFinalQuestionsTime, commentStats, staticPlan, analysisResult]);

  // Start review questions mode
  const startReviewMode = useCallback(() => {
    // Solo se entra una vez: un segundo toque no debe reiniciar la primera pregunta
    if (studyPhase === 'review' || studyPhase === 'conclusion' || studyPhase === 'finished') return;
    // El último párrafo o grupo termina al empezar el repaso: también cuenta en las estadísticas
    if (studyPhase === 'paragraphs') recordCurrentGroupStats();
    else closeLogSegment();
    openLogSegment({ kind: 'review', index: 0 });
    setIsInReviewMode(true);
    setCurrentReviewQuestion(0);
    setReviewQuestionStartTime(Date.now());
    setPresentationPhase('review'); // Sync presentation phase
    setPresentationReviewQuestion(0);
    toast.success("Iniciando Preguntas de Repaso");
  }, [studyPhase, recordCurrentGroupStats, closeLogSegment, openLogSegment]);

  // Navigate to next review question
  const goToNextReviewQuestion = useCallback(() => {
    if (!analysisResult?.final_questions) return;
    
    const nextQuestion = currentReviewQuestion + 1;
    if (nextQuestion < analysisResult.final_questions.length) {
      closeReviewSegment();
      openLogSegment({ kind: 'review', index: nextQuestion });
      setCurrentReviewQuestion(nextQuestion);
      setReviewQuestionStartTime(Date.now());
      setPresentationReviewQuestion(nextQuestion); // Sync presentation review question
      toast.success(`Pregunta de repaso ${nextQuestion + 1}`);
    }
  }, [currentReviewQuestion, analysisResult, closeReviewSegment, openLogSegment]);

  // Start closing words mode
  const startClosingWordsMode = useCallback(() => {
    if (studyPhase === 'conclusion' || studyPhase === 'finished') return;
    if (studyPhase === 'paragraphs') recordCurrentGroupStats();
    else if (studyPhase === 'review') closeReviewSegment();
    else closeLogSegment();
    // La conclusión dura exactamente lo que queda hasta la hora de fin:
    // si sobran minutos los aprovecha, y si queda menos de lo configurado se acorta
    const endMs = endTime ? new Date(endTime).getTime() : null;
    const target = Math.max(0, Math.round(endMs ? (endMs - Date.now()) / 1000 : (remainingTime || 0)));
    openLogSegment({ kind: 'conclusion', estimated: closingWordsDuration, extraTime: Math.max(0, target - closingWordsDuration) });
    setConclusionTarget(target);
    setIsInClosingWordsMode(true);
    setClosingWordsStartTime(Date.now());
    setPresentationPhase('conclusion'); // Sync presentation phase
    toast.success("Iniciando Palabras de Conclusión");
  }, [studyPhase, recordCurrentGroupStats, closeReviewSegment, closeLogSegment, openLogSegment, closingWordsDuration, remainingTime, endTime]);

  // Finish study
  const finishStudy = useCallback(() => {
    if (studyPhase === 'finished') return;
    if (studyPhase === 'paragraphs') recordCurrentGroupStats();
    else if (studyPhase === 'review') closeReviewSegment();
    else closeLogSegment();
    // Guarda el informe en el historial de este dispositivo
    const log = studyLogRef.current;
    if (analysisResult && log.startedAt && log.done.length) {
      const { articleLine, titleLine } = getArticleHeading(analysisResult);
      const report = {
        id: String(log.startedAt),
        version: 1,
        lang: currentLanguage(),
        articleLine,
        titleLine,
        weekLabel: analysisResult.week_label || '',
        circuitVisit: !!analysisResult.circuit_visit,
        startedAt: log.startedAt,
        endedAt: Date.now(),
        plannedSeconds: totalDurationSeconds,
        plannedEnd: endTime ? new Date(endTime).getTime() : null,
        segments: log.done.map(({ start, end, ...rest }) => ({ ...rest, start, end })),
      };
      report.totalComments = report.segments.reduce((n, sg) => n + (sg.comments || 0), 0);
      if (saveReport(report)) setLastReportId(report.id);
    }
    setIsTimerRunning(false);
    setIsInClosingWordsMode(false);
    setIsInReviewMode(false);
    setPresentationPhase('finished'); // Sync presentation phase
    toast.success("¡Estudio finalizado! 🎉");
  }, [studyPhase, recordCurrentGroupStats, closeReviewSegment, closeLogSegment, analysisResult, totalDurationSeconds, endTime]);

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
    if (!studyLogRef.current.startedAt) studyLogRef.current = { startedAt: Date.now(), open: null, done: [] };
    else closeLogSegment();
    openLogSegment({ kind: 'paragraph' });
    
    toast.success(`Iniciando desde Párrafo ${paragraphIndex + 1}`);
  }, [totalDurationSeconds, staticPlan, closeLogSegment, openLogSegment]);

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
      {isDragging && !analysisResult && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-orange-500/15 backdrop-blur-sm pointer-events-none p-6" data-testid="drop-overlay">
          <div className={`rounded-3xl border-4 border-dashed border-orange-500 px-10 py-12 text-center shadow-2xl ${darkMode ? 'bg-zinc-900/95 text-zinc-100' : 'bg-white/95 text-slate-800'}`}>
            <FileText className="w-14 h-14 mx-auto mb-4 text-orange-500" />
            <p className="font-heading font-bold text-2xl">{t('dropPdfAnywhere')}</p>
          </div>
        </div>
      )}
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
              <div className={analysisResult ? 'hidden sm:block' : ''}>
                <h1 className="font-heading font-bold text-base sm:text-xl text-orange-500" data-testid="app-title">
                  {t('appNameUpper')}
                </h1>
                <p className={`text-xs font-semibold tracking-wide hidden sm:block ${darkMode ? currentTheme?.textMuted || 'text-zinc-400' : 'text-slate-700'}`}>{t('appTagline')}</p>
              </div>
            </div>
            <div className="flex items-center gap-1 sm:gap-2">
              <Button
                asChild
                variant="ghost"
                title={t("userManual")}
                aria-label={t("userManual")}
                data-testid="manual-btn"
                className={`rounded-full h-9 sm:h-10 w-9 sm:w-auto px-0 sm:px-3 gap-1.5 text-xs font-bold border ${
                  darkMode ? 'border-zinc-600 text-zinc-100 hover:bg-zinc-700' : 'border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <a href={manualUrl()} target="_blank" rel="noopener">
                  <BookOpen className="w-4 h-4 text-orange-500" />
                  <span className="hidden sm:inline">{t("manualShort")}</span>
                </a>
              </Button>
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
                    <ChevronDownLv className="hidden sm:block w-3.5 h-3.5 opacity-60" />
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
              const fullEndPreview = new Date(Date.now() + totalDuration * 60 * 1000);
              const endPreview = manualEndTime && manualEndTime < fullEndPreview ? manualEndTime : fullEndPreview;
              const durationPreview = Math.min(totalDuration, Math.max(0, Math.round((endPreview.getTime() - Date.now()) / 60000)));
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

            {!manualCardHidden && (
              <div
                className={`rounded-2xl border shadow-sm p-4 flex items-start gap-3 ${
                  darkMode ? 'bg-zinc-800 border-orange-500/40' : 'bg-orange-50 border-orange-200'
                }`}
                data-testid="manual-card"
              >
                <span className="w-9 h-9 shrink-0 rounded-lg flex items-center justify-center bg-orange-500 text-white">
                  <BookOpen className="w-5 h-5" />
                </span>
                <div className="flex-1 min-w-0">
                  <p className={`font-semibold text-sm ${darkMode ? 'text-zinc-100' : 'text-slate-800'}`}>{t('manualCardTitle')}</p>
                  <p className={`text-xs mt-0.5 leading-relaxed ${darkMode ? 'text-zinc-400' : 'text-slate-600'}`}>{t('manualCardText')}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <a
                      href={guideUrl()}
                      target="_blank"
                      rel="noopener"
                      className="inline-flex items-center gap-1.5 rounded-xl px-3.5 h-9 bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold"
                      data-testid="guide-card-open"
                    >
                      <Compass className="w-4 h-4" /> {t('quickGuide')}
                    </a>
                    <a
                      href={manualUrl()}
                      target="_blank"
                      rel="noopener"
                      className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 h-9 border text-sm font-bold ${
                        darkMode ? 'border-orange-400/60 text-orange-300 hover:bg-zinc-700' : 'border-orange-300 text-orange-700 hover:bg-orange-100'
                      }`}
                      data-testid="manual-card-open"
                    >
                      <BookOpen className="w-4 h-4" /> {t('userManual')}
                    </a>
                    <button
                      onClick={() => setManualCardHidden(true)}
                      className={`ml-1 text-xs font-semibold ${darkMode ? 'text-zinc-400 hover:text-zinc-200' : 'text-slate-500 hover:text-slate-700'}`}
                      data-testid="manual-card-hide"
                    >
                      {t('manualHide')}
                    </button>
                  </div>
                </div>
              </div>
            )}
            {showPlayCard && (
              <div
                className={`rounded-2xl border shadow-sm p-4 flex items-start gap-3 ${
                  darkMode ? 'bg-zinc-800 border-emerald-500/40' : 'bg-emerald-50 border-emerald-200'
                }`}
                data-testid="play-card"
              >
                <span className="w-9 h-9 shrink-0 rounded-lg flex items-center justify-center bg-emerald-600 text-white">
                  <Smartphone className="w-5 h-5" />
                </span>
                <div className="flex-1 min-w-0">
                  <p className={`font-semibold text-sm ${darkMode ? 'text-zinc-100' : 'text-slate-800'}`}>{t('playCardTitle')}</p>
                  <p className={`text-xs mt-0.5 leading-relaxed ${darkMode ? 'text-zinc-400' : 'text-slate-600'}`}>{t('playCardText')}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <a
                      href={playStoreUrl('banner')}
                      target="_blank"
                      rel="noopener"
                      className="inline-flex items-center gap-1.5 rounded-xl px-3.5 h-9 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold"
                      data-testid="play-card-open"
                    >
                      <Download className="w-4 h-4" /> {t('playCardOpen')}
                    </a>
                    <button
                      onClick={() => setPlayCardHidden(true)}
                      className={`ml-1 text-xs font-semibold ${darkMode ? 'text-zinc-400 hover:text-zinc-200' : 'text-slate-500 hover:text-slate-700'}`}
                      data-testid="play-card-hide"
                    >
                      {t('manualHide')}
                    </button>
                  </div>
                </div>
              </div>
            )}
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
              fileInputRef={fileInputRef}
              darkMode={darkMode}
            />
          </div>
        ) : (
          <div ref={exportRef} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Column - Analysis */}
            <div className="lg:col-span-8 space-y-6">
              {studyPhase === 'finished' && lastReportId && (
                <div className={`rounded-2xl border shadow-sm p-4 flex items-start gap-3 ${darkMode ? 'bg-zinc-800 border-emerald-500/40' : 'bg-emerald-50 border-emerald-200'}`} data-testid="report-card">
                  <span className="w-9 h-9 shrink-0 rounded-lg flex items-center justify-center bg-emerald-600 text-white">
                    <ClipboardList className="w-5 h-5" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className={`font-semibold text-sm ${darkMode ? 'text-zinc-100' : 'text-slate-800'}`}>{t('reportReadyTitle')}</p>
                    <p className={`text-xs mt-0.5 leading-relaxed ${darkMode ? 'text-zinc-400' : 'text-slate-600'}`}>{t('reportReadyText')}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <button onClick={() => openReport(lastReportId)} className="inline-flex items-center gap-1.5 rounded-xl px-3.5 h-9 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold" data-testid="report-open">
                        <ClipboardList className="w-4 h-4" /> {t('viewReport')}
                      </button>
                      <button onClick={() => openReport(null)} className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 h-9 border text-sm font-bold ${darkMode ? 'border-emerald-400/60 text-emerald-300 hover:bg-zinc-700' : 'border-emerald-300 text-emerald-700 hover:bg-emerald-100'}`} data-testid="report-history">
                        <History className="w-4 h-4" /> {t('studyHistory')}
                      </button>
                    </div>
                  </div>
                </div>
              )}
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
                segmentElapsed={studyPhase === 'intro' ? segmentElapsed : undefined}
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
                    // (solo durante los párrafos: al pasar al repaso el último deja de estar en curso)
                    const isCurrentGroup = isTimerRunning && studyPhase === 'paragraphs' && group.indices.includes(currentManualParagraph);
                    // Show as completed if we've passed this group (regardless of timer state)
                    const isCompletedGroup = !isInIntroductionMode && (lastIndex < currentManualParagraph
                      || studyPhase === 'review' || studyPhase === 'conclusion' || studyPhase === 'finished');
                    
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
                        segmentElapsed={isCurrentGroup ? segmentElapsed : undefined}
                        extraItemSeconds={analysisResult.extra_item_seconds}
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
                  closingWordsDuration={isInClosingWordsMode && conclusionTarget != null ? conclusionTarget : closingWordsDuration}
                  pastEnd={remainingTime <= 0}
                  segmentElapsed={studyPhase === 'review' || studyPhase === 'conclusion' ? segmentElapsed : undefined}
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
          phaseComments={phaseComments}
          phaseLabel={studyPhase === 'review' ? t('pmThisQuestion') : t('pmThisParagraph')}
          onPresentation={enterPresentationMode}
          darkMode={darkMode}
          urgency={nextUrgency}
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
        nextButtonAlertEnabled={nextButtonAlertEnabled}
        setNextButtonAlertEnabled={setNextButtonAlertEnabled}
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
        lightTheme={lightTheme}
        setLightTheme={setLightTheme}
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
          onOpenReport={lastReportId ? () => openReport(lastReportId) : undefined}
          urgency={nextUrgency}
          startTime={startTime}
        />
      )}
    </div>
  );
}
