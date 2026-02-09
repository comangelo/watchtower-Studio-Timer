import { formatTimeText } from "../utils/timeFormatters";
import { Card, CardContent } from "@/components/ui/card";

export function QuickStats({ analysisResult, currentManualParagraph, readingSpeed = 180 }) {
  if (!analysisResult) return null;

  const totalQuestions = analysisResult.paragraphs.reduce(
    (sum, p) => sum + p.questions.length, 0
  ) + (analysisResult.final_questions?.length || 0);

  return (
    <Card className="border-zinc-100 shadow-sm">
      <CardContent className="p-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-500">Velocidad de lectura</span>
            <span className="font-mono text-sm font-medium">{readingSpeed} PPM</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-500">Total preguntas de repaso</span>
            <span className="font-mono text-sm font-medium">{totalQuestions}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-500">Párrafo actual</span>
            <span className="font-mono text-sm font-medium">
              {currentManualParagraph + 1} / {analysisResult.total_paragraphs}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
