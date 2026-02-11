import { FileText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatTimeCompact } from "../utils/timeFormatters";

export function AnalysisSummary({ analysisResult, darkMode = false }) {
  if (!analysisResult) return null;

  const paragraphQuestions = analysisResult.paragraphs.reduce(
    (sum, p) => sum + p.questions.filter(q => !q.is_final_question).length, 0
  );
  const reviewQuestions = analysisResult.final_questions?.length || 0;

  return (
    <Card className={`mb-8 shadow-sm ${darkMode ? 'border-zinc-700 bg-zinc-800' : 'border-zinc-100'}`} data-testid="analysis-summary">
      <CardContent className="p-6">
        <div className="flex items-start gap-4 mb-6">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
            darkMode ? 'bg-orange-900/50' : 'bg-orange-100'
          }`}>
            <FileText className={`w-5 h-5 ${darkMode ? 'text-orange-400' : 'text-orange-600'}`} />
          </div>
          <div>
            <h3 className={`font-heading font-semibold text-lg ${darkMode ? 'text-zinc-100' : 'text-zinc-900'}`} data-testid="pdf-filename">
              {analysisResult.filename}
            </h3>
            <p className={`text-sm ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
              {analysisResult.total_paragraphs} párrafos · {analysisResult.total_words} palabras
            </p>
          </div>
          <div className="ml-auto text-right">
            <div className="flex flex-col gap-1">
              <span className={`text-sm font-medium ${darkMode ? 'text-orange-400' : 'text-orange-600'}`} data-testid="paragraph-questions-count">
                {paragraphQuestions} preguntas de párrafos
              </span>
              {reviewQuestions > 0 && (
                <span className={`text-sm font-medium ${darkMode ? 'text-red-400' : 'text-red-600'}`} data-testid="review-questions-count">
                  {reviewQuestions} preguntas de repaso
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className={`rounded-xl p-5 text-center ${darkMode ? 'bg-zinc-700' : 'bg-zinc-50'}`}>
            <p className={`text-sm mb-2 ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>Lectura</p>
            <p className={`text-3xl font-light ${darkMode ? 'text-zinc-100' : 'text-zinc-900'}`} style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }} data-testid="reading-time">
              {formatTimeCompact(analysisResult.total_reading_time_seconds)}
            </p>
          </div>
          <div className={`rounded-xl p-5 text-center ${darkMode ? 'bg-orange-950/50' : 'bg-orange-50'}`}>
            <p className={`text-sm mb-2 ${darkMode ? 'text-orange-400' : 'text-orange-600'}`}>Respuestas</p>
            <p className={`text-3xl font-light ${darkMode ? 'text-orange-400' : 'text-orange-600'}`} style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }} data-testid="question-time">
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
