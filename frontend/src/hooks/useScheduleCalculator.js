import { useCallback } from 'react';
import { addSecondsToDate } from '../utils/timeFormatters';

export function useScheduleCalculator(analysisResult, startTime, remainingTime, currentManualParagraph) {
  
  // Calculate adjusted time for final questions based on manual progress
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

  // Calculate paragraph times based on start time (original, not adjusted)
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

  // Get final questions time as Date
  const getFinalQuestionsTime = useCallback(() => {
    if (!startTime || !analysisResult) return null;
    const seconds = getFinalQuestionsTimeSeconds();
    if (seconds > 0) {
      return addSecondsToDate(startTime, seconds);
    }
    return null;
  }, [startTime, analysisResult, getFinalQuestionsTimeSeconds]);

  return {
    getAdjustedFinalQuestionsTime,
    getAdjustedFinalQuestionTime,
    getAdjustedParagraphTimes,
    getParagraphTimes,
    getFinalQuestionsTimeSeconds,
    getFinalQuestionsTime,
  };
}
