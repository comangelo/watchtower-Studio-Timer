import { useCallback, useMemo } from 'react';
import { addSecondsToDate } from '../utils/timeFormatters';
import { buildStaticPlan, buildLivePlan, countQuestions } from '../utils/timePlan';

/**
 * Calcula el plan de tiempos del estudio (ver utils/timePlan.js para los criterios).
 *
 * - Lectura fija, introducción y conclusión reservadas.
 * - El tiempo restante se reparte a partes iguales entre las preguntas reales pendientes.
 * - En vivo, el plan del párrafo actual se mantiene mientras se está en él y se
 *   recalcula al avanzar.
 */
export function useScheduleCalculator({
  analysisResult,
  startTime,
  remainingTime,
  currentManualParagraph,
  totalDurationSeconds = 3600,
  introductionDuration = 60,
  conclusionDuration = 60,
  answerTime = 35,
  isInIntroductionMode = false,
  introductionStartTime = null,
  isInReviewMode = false,
  currentReviewQuestion = 0,
  reviewQuestionStartTime = null,
  isInClosingWordsMode = false,
  paragraphStartTime = null,
  longParagraphWeight = 1,
}) {
  // ---------- Plan estático (antes de empezar) ----------
  const staticPlan = useMemo(() => buildStaticPlan({
    analysis: analysisResult,
    totalSeconds: totalDurationSeconds,
    introSeconds: introductionDuration,
    conclusionSeconds: conclusionDuration,
    answerTime,
    longParagraphWeight,
  }), [analysisResult, totalDurationSeconds, introductionDuration, conclusionDuration, answerTime, longParagraphWeight]);

  // ---------- Plan en vivo (se recalcula cada segundo con remainingTime) ----------
  const phase = isInClosingWordsMode ? 'conclusion'
    : isInReviewMode ? 'review'
    : isInIntroductionMode ? 'intro'
    : 'paragraphs';

  const phaseStartMs = phase === 'review' ? reviewQuestionStartTime
    : phase === 'intro' ? introductionStartTime
    : paragraphStartTime;

  const livePlan = useMemo(() => {
    if (!analysisResult || !startTime) return null;
    const nowMs = Date.now();
    const phaseSpent = phaseStartMs ? Math.max(0, (nowMs - phaseStartMs) / 1000) : 0;
    return buildLivePlan({
      analysis: analysisResult,
      phase,
      remainingTime,
      currentParagraph: currentManualParagraph,
      currentReviewQuestion,
      phaseSpent,
      introSeconds: introductionDuration,
      conclusionSeconds: conclusionDuration,
      longParagraphWeight,
      now: new Date(nowMs),
    });
    // remainingTime cambia cada segundo y fuerza el recálculo
  }, [analysisResult, startTime, phase, phaseStartMs, remainingTime, currentManualParagraph,
      currentReviewQuestion, introductionDuration, conclusionDuration, longParagraphWeight]);

  // Compatibilidad: "factor" = tiempo de comentario planificado ÷ tiempo de respuesta configurado
  const getScaleFactor = useCallback(() => staticPlan?.questionFactor ?? 1, [staticPlan]);

  // Introducción y conclusión duran lo configurado (ya no se escalan)
  const getScaledIntroductionTime = useCallback(() => introductionDuration, [introductionDuration]);
  const getScaledConclusionTime = useCallback(() => conclusionDuration, [conclusionDuration]);

  const plannedPerQuestion = staticPlan ? Math.round(staticPlan.perQuestion) : answerTime;

  // ---------- Preguntas de repaso ----------
  const getAdjustedFinalQuestionsTime = useCallback(() => {
    const finals = analysisResult?.final_questions?.length || 0;
    if (!livePlan || finals === 0) {
      return { start: null, end: null, plannedPerQuestion };
    }
    const perQuestion = Math.round(livePlan.perQuestion);
    return {
      start: livePlan.reviewStart,
      end: livePlan.reviewEnd,
      totalTime: Math.round(finals * livePlan.perQuestion),
      perQuestion,
      originalPerQuestion: plannedPerQuestion,
      plannedPerQuestion,
      secondsUntilStart: livePlan.secondsUntilReview,
      readingFitsInTime: livePlan.readingFitsInTime,
      scaleFactor: staticPlan?.questionFactor ?? 1,
    };
  }, [livePlan, analysisResult, plannedPerQuestion, staticPlan]);

  const getAdjustedFinalQuestionTime = useCallback((questionIndex) => {
    const adjusted = getAdjustedFinalQuestionsTime();
    if (!adjusted.start) return null;
    const done = isInReviewMode ? currentReviewQuestion : 0;
    const offsetIndex = Math.max(0, questionIndex - done);
    return addSecondsToDate(adjusted.start, offsetIndex * (livePlan?.perQuestion || 0));
  }, [getAdjustedFinalQuestionsTime, isInReviewMode, currentReviewQuestion, livePlan]);

  // ---------- Párrafos (admite grupos: índice inicial y final) ----------
  const staticSpan = useCallback((fromIdx, toIdx) => {
    const paragraphs = analysisResult.paragraphs;
    let seconds = 0;
    for (let i = fromIdx; i <= toIdx; i++) seconds += staticPlan.paragraphDuration(paragraphs[i]);
    return seconds;
  }, [analysisResult, staticPlan]);

  const getAdjustedParagraphTimes = useCallback((paragraphIndex, lastIndex = paragraphIndex) => {
    if (!analysisResult || !staticPlan) {
      return { start: null, end: null, adjustedDuration: 0 };
    }
    const paragraphs = analysisResult.paragraphs;

    // Antes de empezar: duración según el plan inicial (sin horas)
    if (!startTime) {
      let extra = 0;
      for (let i = paragraphIndex; i <= lastIndex; i++) extra += (staticPlan.commentUnits.extra[i] || 0) * staticPlan.perQuestion;
      return {
        start: null,
        end: null,
        adjustedDuration: Math.round(staticSpan(paragraphIndex, lastIndex)),
        extraCommentSeconds: Math.round(extra),
        adjustedQuestionTime: plannedPerQuestion,
        isCompleted: false,
        scaleFactor: staticPlan.questionFactor,
      };
    }

    // Ya completado (o fase de repaso/conclusión): horario planificado desde el inicio
    const completed = lastIndex < currentManualParagraph || isInReviewMode || isInClosingWordsMode;
    if (completed || !livePlan) {
      const start = addSecondsToDate(startTime, staticPlan.paragraphOffsets[paragraphIndex] || 0);
      const duration = staticSpan(paragraphIndex, lastIndex);
      let extra = 0;
      for (let i = paragraphIndex; i <= lastIndex; i++) extra += (staticPlan.commentUnits.extra[i] || 0) * staticPlan.perQuestion;
      return {
        start,
        end: addSecondsToDate(start, duration),
        adjustedDuration: Math.round(duration),
        extraCommentSeconds: Math.round(extra),
        adjustedQuestionTime: plannedPerQuestion,
        isCompleted: true,
        scaleFactor: staticPlan.questionFactor,
      };
    }

    // Pendiente o actual: horario en vivo
    const start = livePlan.paragraphStart(Math.max(paragraphIndex, livePlan.fromIndex));
    let duration = 0;
    let extra = 0;
    for (let i = paragraphIndex; i <= lastIndex; i++) {
      duration += livePlan.paragraphDuration(paragraphs[i]);
      extra += livePlan.extraCommentSeconds(i);
    }
    return {
      start,
      end: start ? addSecondsToDate(start, duration) : null,
      adjustedDuration: Math.round(duration),
      extraCommentSeconds: Math.round(extra),
      adjustedQuestionTime: Math.round(livePlan.perQuestion),
      isCompleted: false,
      isCurrent: paragraphIndex <= currentManualParagraph && currentManualParagraph <= lastIndex,
      scaleFactor: staticPlan.questionFactor,
    };
  }, [startTime, analysisResult, staticPlan, livePlan, currentManualParagraph, isInReviewMode,
      isInClosingWordsMode, staticSpan, plannedPerQuestion]);

  // Duración planificada (estática) de un párrafo o grupo, para estadísticas
  const getPlannedParagraphDuration = useCallback((fromIdx, toIdx = fromIdx) => {
    if (!analysisResult || !staticPlan) return 0;
    return staticSpan(fromIdx, toIdx);
  }, [analysisResult, staticPlan, staticSpan]);

  const getParagraphTimes = useCallback((paragraphIndex) => {
    if (!startTime || !analysisResult || !staticPlan) return { start: null, end: null };
    const start = addSecondsToDate(startTime, staticPlan.paragraphOffsets[paragraphIndex] || 0);
    const end = addSecondsToDate(start, staticPlan.paragraphDuration(analysisResult.paragraphs[paragraphIndex]));
    return { start, end, scaleFactor: staticPlan.questionFactor };
  }, [startTime, analysisResult, staticPlan]);

  // Segundos desde el inicio hasta el repaso según el plan inicial
  const getFinalQuestionsTimeSeconds = useCallback(() => staticPlan?.reviewOffset || 0, [staticPlan]);

  const getFinalQuestionsTime = useCallback(() => {
    if (!startTime || !staticPlan) return null;
    return addSecondsToDate(startTime, staticPlan.reviewOffset);
  }, [startTime, staticPlan]);

  // Segundos que faltan para el repaso según el plan recalculado
  const getSecondsUntilReview = useCallback(() => {
    if (!livePlan || isInReviewMode || isInClosingWordsMode) return null;
    return livePlan.secondsUntilReview;
  }, [livePlan, isInReviewMode, isInClosingWordsMode]);

  return {
    getAdjustedFinalQuestionsTime,
    getAdjustedFinalQuestionTime,
    getAdjustedParagraphTimes,
    getPlannedParagraphDuration,
    getParagraphTimes,
    getFinalQuestionsTimeSeconds,
    getFinalQuestionsTime,
    getSecondsUntilReview,
    getScaleFactor,
    getScaledIntroductionTime,
    getScaledConclusionTime,
    originalTotalTime: staticPlan?.naturalTotal || totalDurationSeconds,
    plannedPerQuestion,
    staticPlan,
    countQuestions,
  };
}
