import { FileText, MessageCircle, HelpCircle, Image, BookOpen, Layers, StickyNote } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatTimeCompact } from "../utils/timeFormatters";

export function AnalysisSummary({ analysisResult, darkMode = false }) {
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

        {/* Stats Pills Row - Ordenados según solicitud */}
        <div className="flex flex-wrap gap-2 mb-6">
          {/* 1. Cantidad de párrafos */}
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
            darkMode 
              ? 'bg-zinc-700 text-zinc-200 border border-zinc-600' 
              : 'bg-zinc-100 text-zinc-700 border border-zinc-200'
          }`} data-testid="paragraphs-count">
            <Layers className="w-4 h-4" />
            <span>{totalParagraphs}</span>
            <span className={`${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>{totalParagraphs === 1 ? 'párrafo' : 'párrafos'}</span>
          </div>

          {/* 2. Cantidad de preguntas */}
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
            darkMode 
              ? 'bg-orange-900/60 text-orange-200 border border-orange-700' 
              : 'bg-orange-50 text-orange-700 border border-orange-200'
          }`} data-testid="paragraph-questions-count">
            <MessageCircle className="w-4 h-4" />
            <span>{paragraphQuestions}</span>
            <span className={`${darkMode ? 'text-orange-300/70' : 'text-orange-600/70'}`}>{paragraphQuestions === 1 ? 'pregunta' : 'preguntas'}</span>
          </div>
          
          {/* 3. Cantidad de textos para leer */}
          {totalScriptures > 0 && (
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
              darkMode 
                ? 'bg-blue-900/60 text-blue-200 border border-blue-700' 
                : 'bg-blue-50 text-blue-700 border border-blue-200'
            }`} data-testid="scriptures-count">
              <BookOpen className="w-4 h-4" />
              <span>{totalScriptures}</span>
              <span className={`${darkMode ? 'text-blue-300/70' : 'text-blue-600/70'}`}>{totalScriptures === 1 ? 'texto' : 'textos'}</span>
            </div>
          )}

          {/* 4. Cantidad de imágenes */}
          {totalImages > 0 && (
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
              darkMode 
                ? 'bg-purple-900/60 text-purple-200 border border-purple-700' 
                : 'bg-purple-50 text-purple-700 border border-purple-200'
            }`} data-testid="images-count">
              <Image className="w-4 h-4" />
              <span>{totalImages}</span>
              <span className={`${darkMode ? 'text-purple-300/70' : 'text-purple-600/70'}`}>{totalImages === 1 ? 'imagen' : 'imágenes'}</span>
            </div>
          )}
          
          {/* 5. Cantidad de notas */}
          {totalNotes > 0 && (
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
              darkMode 
                ? 'bg-amber-900/60 text-amber-200 border border-amber-700' 
                : 'bg-amber-50 text-amber-700 border border-amber-200'
            }`} data-testid="notes-count">
              <StickyNote className="w-4 h-4" />
              <span>{totalNotes}</span>
              <span className={`${darkMode ? 'text-amber-300/70' : 'text-amber-600/70'}`}>{totalNotes === 1 ? 'nota' : 'notas'}</span>
            </div>
          )}
          
          {/* 6. Cantidad de preguntas de repaso */}
          {reviewQuestions > 0 && (
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
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

        {/* Time Cards Grid */}
        <div className="grid grid-cols-3 gap-4">
          <div className={`rounded-xl p-5 text-center ${darkMode ? 'bg-zinc-700 border border-zinc-600' : 'bg-zinc-50'}`}>
            <p className={`text-sm mb-2 ${darkMode ? 'text-zinc-300' : 'text-zinc-500'}`}>Lectura</p>
            <p className={`text-3xl font-light ${darkMode ? 'text-zinc-50' : 'text-zinc-900'}`} style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }} data-testid="reading-time">
              {formatTimeCompact(analysisResult.total_reading_time_seconds)}
            </p>
          </div>
          <div className={`rounded-xl p-5 text-center ${darkMode ? 'bg-orange-900/50 border border-orange-800' : 'bg-orange-50'}`}>
            <p className={`text-sm mb-2 ${darkMode ? 'text-orange-300' : 'text-orange-600'}`}>Respuestas</p>
            <p className={`text-3xl font-light ${darkMode ? 'text-orange-300' : 'text-orange-600'}`} style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }} data-testid="question-time">
              {formatTimeCompact(analysisResult.total_question_time_seconds)}
            </p>
          </div>
          <div className="bg-zinc-900 rounded-xl p-5 text-center">
            <p className="text-sm text-zinc-400 mb-2">Total</p>
            <p className="text-3xl font-light text-white" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }} data-testid="total-time">
              60 min
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
