import { FileText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatTimeText } from "../utils/timeFormatters";

export function AnalysisSummary({ analysisResult }) {
  if (!analysisResult) return null;

  const paragraphQuestions = analysisResult.paragraphs.reduce(
    (sum, p) => sum + p.questions.filter(q => !q.is_final_question).length, 0
  );
  const reviewQuestions = analysisResult.final_questions?.length || 0;

  return (
    <Card className="mb-8 border-zinc-100 shadow-sm" data-testid="analysis-summary">
      <CardContent className="p-6">
        <div className="flex items-start gap-4 mb-6">
          <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <FileText className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <h3 className="font-heading font-semibold text-lg text-zinc-900" data-testid="pdf-filename">
              {analysisResult.filename}
            </h3>
            <p className="text-sm text-zinc-500">
              {analysisResult.total_paragraphs} párrafos · {analysisResult.total_words} palabras
            </p>
          </div>
          <div className="ml-auto text-right">
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium text-orange-600" data-testid="paragraph-questions-count">
                {paragraphQuestions} preguntas de párrafos
              </span>
              {reviewQuestions > 0 && (
                <span className="text-sm font-medium text-red-600" data-testid="review-questions-count">
                  {reviewQuestions} preguntas de repaso
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="bg-zinc-50 rounded-xl p-5 text-center">
            <p className="text-sm text-zinc-500 mb-2">Lectura</p>
            <p className="text-3xl font-light text-zinc-900" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }} data-testid="reading-time">
              {formatTimeText(analysisResult.total_reading_time_seconds)}
            </p>
          </div>
          <div className="bg-orange-50 rounded-xl p-5 text-center">
            <p className="text-sm text-orange-600 mb-2">Respuestas</p>
            <p className="text-3xl font-light text-orange-600" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }} data-testid="question-time">
              {formatTimeText(analysisResult.total_question_time_seconds)}
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
