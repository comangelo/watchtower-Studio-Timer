import { FileText, MessageCircle, HelpCircle, Image, BookOpen, Layers, StickyNote, Clock, Plus, Minus, Equal } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatTimeCompact } from "../utils/timeFormatters";

export function AnalysisSummary({ 
  analysisResult, 
  darkMode = false,
  totalDurationMinutes = 60,
  introductionDuration = 60,
  closingWordsDuration = 60
}) {
  if (!analysisResult) return null;

  const paragraphQuestions = analysisResult.total_paragraph_questions || 
    analysisResult.paragraphs.reduce(
      (sum, p) => sum + p.questions.filter(q => !q.is_final_question).length, 0
    );
  const reviewQuestions = analysisResult.total_review_questions || analysisResult.final_questions?.length || 0;
  const totalImages = analysisResult.total_images || 0;
  const totalScriptures = analysisResult.total_scriptures || 0;
  const totalNotes = analysisResult.total_notes || 0;
  const totalParagraphs = analysisResult.total_paragraphs || 0;

  // Time calculations
  const readingTimeSeconds = analysisResult.total_reading_time_seconds || 0;
  const questionTimeSeconds = analysisResult.total_question_time_seconds || 0;
  const articleTimeSeconds = readingTimeSeconds + questionTimeSeconds; // Lectura + Respuestas
  const totalDurationSeconds = totalDurationMinutes * 60;
  const fixedTimeSeconds = introductionDuration + closingWordsDuration; // Intro + Conclusión
  const availableTimeSeconds = totalDurationSeconds - articleTimeSeconds - fixedTimeSeconds; // Tiempo para preguntas adicionales

  return (
    <Card className={`mb-8 shadow-sm ${darkMode ? 'border-zinc-600 bg-zinc-800' : 'border-zinc-100'}`} data-testid="analysis-summary">
      <CardContent className="p-6">
        {/* Header with filename */}
        <div className="flex items-start gap-4 mb-6">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
            darkMode ? 'bg-orange-900/50' : 'bg-orange-100'
          }`}>
            <FileText className={`w-5 h-5 ${darkMode ? 'text-orange-400' : 'text-orange-600'}`} />
          </div>
          <div className="flex-1">
            <h3 className={`font-heading font-semibold text-lg ${darkMode ? 'text-zinc-50' : 'text-zinc-900'}`} data-testid="pdf-filename">
              {analysisResult.filename}
            </h3>
            <p className={`text-sm ${darkMode ? 'text-zinc-300' : 'text-zinc-500'}`}>
              {analysisResult.total_words} palabras
            </p>
          </div>
        </div>

        {/* Stats Pills Row */}
        <div className="flex flex-wrap gap-2 mb-6">
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
            darkMode 
              ? 'bg-zinc-700 text-zinc-200 border border-zinc-600' 
              : 'bg-zinc-100 text-zinc-700 border border-zinc-200'
          }`} data-testid="paragraphs-count">
            <Layers className="w-4 h-4" />
            <span>{totalParagraphs}</span>
            <span className={`${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>{totalParagraphs === 1 ? 'párrafo' : 'párrafos'}</span>
          </div>

          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
            darkMode 
              ? 'bg-orange-900/60 text-orange-200 border border-orange-700' 
              : 'bg-orange-50 text-orange-700 border border-orange-200'
          }`} data-testid="paragraph-questions-count">
            <MessageCircle className="w-4 h-4" />
            <span>{paragraphQuestions}</span>
            <span className={`${darkMode ? 'text-orange-300/70' : 'text-orange-600/70'}`}>{paragraphQuestions === 1 ? 'pregunta' : 'preguntas'}</span>
          </div>
          
          {totalScriptures > 0 && (
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
              darkMode 
                ? 'bg-blue-900/60 text-blue-200 border border-blue-700' 
                : 'bg-blue-50 text-blue-700 border border-blue-200'
            }`} data-testid="scriptures-count">
              <BookOpen className="w-4 h-4" />
              <span>{totalScriptures}</span>
              <span className={`${darkMode ? 'text-blue-300/70' : 'text-blue-600/70'}`}>{totalScriptures === 1 ? 'texto' : 'textos'}</span>
            </div>
          )}

          {totalImages > 0 && (
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
              darkMode 
                ? 'bg-purple-900/60 text-purple-200 border border-purple-700' 
                : 'bg-purple-50 text-purple-700 border border-purple-200'
            }`} data-testid="images-count">
              <Image className="w-4 h-4" />
              <span>{totalImages}</span>
              <span className={`${darkMode ? 'text-purple-300/70' : 'text-purple-600/70'}`}>{totalImages === 1 ? 'imagen' : 'imágenes'}</span>
            </div>
          )}
          
          {totalNotes > 0 && (
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
              darkMode 
                ? 'bg-amber-900/60 text-amber-200 border border-amber-700' 
                : 'bg-amber-50 text-amber-700 border border-amber-200'
            }`} data-testid="notes-count">
              <StickyNote className="w-4 h-4" />
              <span>{totalNotes}</span>
              <span className={`${darkMode ? 'text-amber-300/70' : 'text-amber-600/70'}`}>{totalNotes === 1 ? 'nota' : 'notas'}</span>
            </div>
          )}
          
          {reviewQuestions > 0 && (
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
              darkMode 
                ? 'bg-red-900/60 text-red-200 border border-red-700' 
                : 'bg-red-50 text-red-700 border border-red-200'
            }`} data-testid="review-questions-count">
              <HelpCircle className="w-4 h-4" />
              <span>{reviewQuestions}</span>
              <span className={`${darkMode ? 'text-red-300/70' : 'text-red-600/70'}`}>repaso</span>
            </div>
          )}
        </div>

        {/* Time Breakdown Section - Redesigned */}
        <div className={`rounded-2xl p-5 ${darkMode ? 'bg-zinc-900/50 border border-zinc-700' : 'bg-gradient-to-br from-slate-50 to-white border border-slate-200'}`}>
          
          {/* Row 1: Lectura + Respuestas = Tiempo del Artículo */}
          <div className="grid grid-cols-7 gap-2 items-center mb-4">
            {/* Lectura */}
            <div className={`col-span-2 rounded-xl p-3 text-center ${darkMode ? 'bg-zinc-800 border border-zinc-700' : 'bg-white border border-slate-200 shadow-sm'}`}>
              <p className={`text-xs mb-1 ${darkMode ? 'text-zinc-400' : 'text-slate-500'}`}>Lectura</p>
              <p className={`text-xl font-semibold ${darkMode ? 'text-zinc-100' : 'text-slate-800'}`} data-testid="reading-time">
                {formatTimeCompact(readingTimeSeconds)}
              </p>
            </div>
            
            {/* Plus sign */}
            <div className="col-span-1 flex justify-center">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center ${darkMode ? 'bg-zinc-700' : 'bg-slate-200'}`}>
                <Plus className={`w-4 h-4 ${darkMode ? 'text-zinc-400' : 'text-slate-500'}`} />
              </div>
            </div>
            
            {/* Respuestas */}
            <div className={`col-span-2 rounded-xl p-3 text-center ${darkMode ? 'bg-orange-900/30 border border-orange-800' : 'bg-orange-50 border border-orange-200 shadow-sm'}`}>
              <p className={`text-xs mb-1 ${darkMode ? 'text-orange-400' : 'text-orange-600'}`}>Respuestas</p>
              <p className={`text-xl font-semibold ${darkMode ? 'text-orange-300' : 'text-orange-600'}`} data-testid="question-time">
                {formatTimeCompact(questionTimeSeconds)}
              </p>
            </div>
            
            {/* Equals sign */}
            <div className="col-span-1 flex justify-center">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center ${darkMode ? 'bg-zinc-700' : 'bg-slate-200'}`}>
                <Equal className={`w-4 h-4 ${darkMode ? 'text-zinc-400' : 'text-slate-500'}`} />
              </div>
            </div>
            
            {/* Tiempo del Artículo */}
            <div className={`col-span-1 rounded-xl p-3 text-center ${darkMode ? 'bg-blue-900/30 border border-blue-800' : 'bg-blue-50 border border-blue-200 shadow-sm'}`}>
              <p className={`text-xs mb-1 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>Artículo</p>
              <p className={`text-xl font-bold ${darkMode ? 'text-blue-300' : 'text-blue-600'}`} data-testid="article-time">
                {formatTimeCompact(articleTimeSeconds)}
              </p>
            </div>
          </div>

          {/* Divider */}
          <div className={`border-t my-4 ${darkMode ? 'border-zinc-700' : 'border-slate-200'}`}></div>

          {/* Row 2: Duración Total - Artículo - Intro/Conclusión = Tiempo Disponible */}
          <div className="grid grid-cols-2 gap-4">
            {/* Left: Calculation breakdown */}
            <div className={`rounded-xl p-4 ${darkMode ? 'bg-zinc-800/50' : 'bg-slate-100/50'}`}>
              <p className={`text-xs font-medium mb-3 ${darkMode ? 'text-zinc-400' : 'text-slate-500'}`}>
                Cálculo del tiempo disponible
              </p>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className={`text-sm ${darkMode ? 'text-zinc-300' : 'text-slate-600'}`}>Duración total</span>
                  <span className={`text-sm font-mono font-semibold ${darkMode ? 'text-zinc-100' : 'text-slate-800'}`}>{totalDurationMinutes} min</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className={`text-sm ${darkMode ? 'text-zinc-400' : 'text-slate-500'}`}>− Artículo</span>
                  <span className={`text-sm font-mono ${darkMode ? 'text-zinc-400' : 'text-slate-500'}`}>{formatTimeCompact(articleTimeSeconds)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className={`text-sm ${darkMode ? 'text-zinc-400' : 'text-slate-500'}`}>− Intro + Conclusión</span>
                  <span className={`text-sm font-mono ${darkMode ? 'text-zinc-400' : 'text-slate-500'}`}>{formatTimeCompact(fixedTimeSeconds)}</span>
                </div>
                <div className={`border-t pt-2 mt-2 ${darkMode ? 'border-zinc-700' : 'border-slate-300'}`}>
                  <div className="flex justify-between items-center">
                    <span className={`text-sm font-medium ${darkMode ? 'text-zinc-200' : 'text-slate-700'}`}>= Disponible</span>
                    <span className={`text-sm font-mono font-bold ${availableTimeSeconds >= 0 ? (darkMode ? 'text-green-400' : 'text-green-600') : (darkMode ? 'text-red-400' : 'text-red-600')}`}>
                      {availableTimeSeconds >= 0 ? formatTimeCompact(availableTimeSeconds) : `-${formatTimeCompact(Math.abs(availableTimeSeconds))}`}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Available time highlight */}
            <div className={`rounded-xl p-4 flex flex-col justify-center items-center text-center ${
              availableTimeSeconds >= 0 
                ? darkMode ? 'bg-green-900/30 border-2 border-green-700' : 'bg-green-50 border-2 border-green-300'
                : darkMode ? 'bg-red-900/30 border-2 border-red-700' : 'bg-red-50 border-2 border-red-300'
            }`}>
              <Clock className={`w-6 h-6 mb-2 ${
                availableTimeSeconds >= 0 
                  ? darkMode ? 'text-green-400' : 'text-green-600'
                  : darkMode ? 'text-red-400' : 'text-red-600'
              }`} />
              <p className={`text-xs mb-1 ${
                availableTimeSeconds >= 0 
                  ? darkMode ? 'text-green-400' : 'text-green-600'
                  : darkMode ? 'text-red-400' : 'text-red-600'
              }`}>
                {availableTimeSeconds >= 0 ? 'Tiempo disponible' : 'Tiempo excedido'}
              </p>
              <p className={`text-3xl font-bold ${
                availableTimeSeconds >= 0 
                  ? darkMode ? 'text-green-300' : 'text-green-600'
                  : darkMode ? 'text-red-300' : 'text-red-600'
              }`} data-testid="available-time">
                {availableTimeSeconds >= 0 ? formatTimeCompact(availableTimeSeconds) : `-${formatTimeCompact(Math.abs(availableTimeSeconds))}`}
              </p>
              <p className={`text-xs mt-2 ${darkMode ? 'text-zinc-400' : 'text-slate-500'}`}>
                {availableTimeSeconds >= 0 
                  ? 'Para preguntas adicionales'
                  : 'Considera aumentar la duración'
                }
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
