import { formatTimeText } from "../utils/timeFormatters";
import { Card, CardContent } from "@/components/ui/card";
import { Gauge, MessageCircleQuestion, BookOpen } from "lucide-react";

export function QuickStats({ analysisResult, currentManualParagraph, readingSpeed = 180 }) {
  if (!analysisResult) return null;

  const totalQuestions = analysisResult.paragraphs.reduce(
    (sum, p) => sum + p.questions.length, 0
  ) + (analysisResult.final_questions?.length || 0);

  const stats = [
    {
      icon: Gauge,
      label: "Velocidad",
      value: `${readingSpeed}`,
      unit: "PPM",
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      icon: MessageCircleQuestion,
      label: "Total de preguntas",
      value: totalQuestions,
      unit: "",
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
    },
    {
      icon: BookOpen,
      label: "Párrafo actual",
      value: `${currentManualParagraph + 1}`,
      unit: `/ ${analysisResult.total_paragraphs}`,
      color: "text-emerald-500",
      bgColor: "bg-emerald-500/10",
    },
  ];

  return (
    <Card className="border-0 shadow-lg bg-gradient-to-br from-slate-50 to-white overflow-hidden">
      <CardContent className="p-0">
        <div className="grid grid-cols-3 divide-x divide-slate-100">
          {stats.map((stat, index) => (
            <div 
              key={index} 
              className="p-3 sm:p-4 text-center hover:bg-slate-50/50 transition-colors"
            >
              <div className={`inline-flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-xl ${stat.bgColor} mb-2`}>
                <stat.icon className={`w-4 h-4 sm:w-5 sm:h-5 ${stat.color}`} />
              </div>
              <div className="flex items-baseline justify-center gap-1">
                <span className={`text-lg sm:text-2xl font-black ${stat.color}`}>
                  {stat.value}
                </span>
                {stat.unit && (
                  <span className="text-xs sm:text-sm text-slate-400 font-medium">
                    {stat.unit}
                  </span>
                )}
              </div>
              <p className="text-[10px] sm:text-xs text-slate-500 font-medium mt-1 leading-tight">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
