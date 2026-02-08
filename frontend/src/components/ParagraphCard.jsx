import { useState, useEffect, useRef } from "react";
import { Play, Clock, ArrowRight, ChevronDown, ChevronUp, MessageCircleQuestion, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { formatTimeText, formatClockTime } from "../utils/timeFormatters";

export function ParagraphCard({ 
  paragraph, 
  index, 
  startTime, 
  paragraphTimes, 
  onStartFromHere, 
  isTimerRunning, 
  isCurrentParagraph, 
  isCompletedParagraph, 
  elapsedTime, 
  onGoToNext, 
  isLastParagraph 
}) {
  const [isOpen, setIsOpen] = useState(false);
  const cardRef = useRef(null);
  const hasQuestions = paragraph.questions.length > 0;
  const hasFinalQuestions = paragraph.questions.some(q => q.is_final_question);

  // Auto-scroll to current paragraph
  useEffect(() => {
    if (isCurrentParagraph && cardRef.current) {
      cardRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [isCurrentParagraph]);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div 
        ref={cardRef}
        className={`
          group relative p-5 rounded-2xl border-2 transition-all duration-300 hover:shadow-md
          ${isCompletedParagraph
            ? 'border-slate-200 bg-slate-50/50 opacity-70'
            : isCurrentParagraph 
              ? 'border-green-400 bg-green-50 shadow-lg shadow-green-100 scale-[1.01]' 
              : hasFinalQuestions 
                ? 'border-red-200 bg-red-50/30 hover:border-red-300' 
                : hasQuestions 
                  ? 'border-orange-100 bg-white hover:border-orange-300' 
                  : 'border-slate-100 bg-white hover:border-slate-300'
          }
        `}
        style={{ animationDelay: `${index * 50}ms` }}
        data-testid={`paragraph-card-${paragraph.number}`}
      >
        {/* Completed Indicator */}
        {isCompletedParagraph && (
          <div className="absolute top-0 left-0 right-0 bg-slate-500 text-white text-xs font-bold py-1.5 px-4 flex items-center justify-center gap-2 rounded-t-xl">
            <Check className="w-3.5 h-3.5" />
            COMPLETADO
          </div>
        )}

        {/* Current Paragraph Indicator */}
        {isCurrentParagraph && (
          <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-green-500 to-green-600 text-white text-xs font-bold py-2 px-4 flex items-center justify-center gap-2 rounded-t-xl">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white"></span>
            </span>
            LEYENDO AHORA
          </div>
        )}

        {/* Content Container */}
        <div className={isCurrentParagraph || isCompletedParagraph ? 'mt-8' : ''}>
          {/* Header Row */}
          <div className="flex items-center justify-between mb-3">
            <span className={`text-sm font-bold ${isCompletedParagraph ? 'text-slate-400' : isCurrentParagraph ? 'text-green-700' : 'text-slate-700'}`}>
              Párrafo {paragraph.number}
            </span>
            <Badge 
              className={`font-mono text-sm px-3 py-1 ${
                isCompletedParagraph ? 'bg-slate-200 text-slate-600' : 
                isCurrentParagraph ? 'bg-green-500 text-white' : 
                hasFinalQuestions ? 'bg-red-500 text-white' :
                hasQuestions ? 'bg-orange-100 text-orange-700' : 
                'bg-slate-100 text-slate-600'
              }`}
              data-testid={`paragraph-time-${paragraph.number}`}
            >
              {paragraphTimes.adjustedDuration ? formatTimeText(paragraphTimes.adjustedDuration) : formatTimeText(paragraph.total_time_seconds)}
            </Badge>
          </div>

          {/* Time Schedule */}
          {startTime && paragraphTimes.start && !isCompletedParagraph && (
            <div className="mb-4 flex items-center gap-3 text-xs">
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full ${isCurrentParagraph ? 'bg-green-100' : 'bg-slate-100'}`}>
                <Clock className={`w-3.5 h-3.5 ${isCurrentParagraph ? 'text-green-600' : 'text-slate-500'}`} />
                <span className={isCurrentParagraph ? 'text-green-700 font-medium' : 'text-slate-600'}>
                  {formatClockTime(paragraphTimes.start)} - {formatClockTime(paragraphTimes.end)}
                </span>
              </div>
              {paragraphTimes.adjustedDuration !== paragraph.total_time_seconds && (
                <span className="text-orange-500 text-xs font-semibold px-2 py-1 bg-orange-50 rounded-full">
                  ajustado
                </span>
              )}
            </div>
          )}
          
          {/* Paragraph Text */}
          <p className={`text-sm leading-relaxed ${isCompletedParagraph ? 'text-slate-400' : isCurrentParagraph ? 'text-slate-800' : 'text-slate-600'}`}>
            {paragraph.text}
          </p>
          
          {/* Stats Row */}
          <div className={`flex items-center gap-3 mt-4 text-xs ${isCompletedParagraph ? 'text-slate-400' : 'text-slate-500'}`}>
            <span className="px-2 py-1 bg-slate-50 rounded-full">{paragraph.word_count} palabras</span>
            <span className="px-2 py-1 bg-slate-50 rounded-full">{formatTimeText(paragraph.reading_time_seconds)} lectura</span>
            {hasQuestions && (
              <span className={`px-2 py-1 rounded-full font-medium ${hasFinalQuestions ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'}`}>
                {paragraph.questions.length} pregunta{paragraph.questions.length > 1 ? 's' : ''}
              </span>
            )}
          </div>

          {/* Action Buttons - Improved Visibility */}
          <div className="mt-5 flex flex-wrap items-center gap-3">
            {/* Next Paragraph Button - Primary Action */}
            {isCurrentParagraph && !isLastParagraph && (
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  onGoToNext();
                }}
                className="rounded-full px-6 py-5 text-sm font-bold bg-green-500 hover:bg-green-600 text-white shadow-lg shadow-green-200 hover:shadow-green-300 transition-all active:scale-95"
                data-testid={`next-from-paragraph-${paragraph.number}`}
              >
                <ArrowRight className="w-4 h-4 mr-2" />
                Siguiente Párrafo
              </Button>
            )}

            {/* Start from here Button - Secondary Action */}
            {!isCurrentParagraph && !isCompletedParagraph && (
              <Button
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  onStartFromHere();
                }}
                className="rounded-full px-5 py-4 text-sm font-semibold border-2 border-slate-300 text-slate-700 hover:border-orange-400 hover:text-orange-600 hover:bg-orange-50 transition-all"
                data-testid={`start-from-paragraph-${paragraph.number}`}
              >
                <Play className="w-4 h-4 mr-2" />
                Iniciar desde aquí
              </Button>
            )}
            
            {/* Questions Toggle */}
            {hasQuestions && (
              <CollapsibleTrigger asChild>
                <Button 
                  variant="ghost" 
                  className={`rounded-full px-4 py-3 text-sm font-medium transition-all ${
                    hasFinalQuestions 
                      ? 'text-red-600 hover:bg-red-50' 
                      : isCurrentParagraph 
                        ? 'text-green-600 hover:bg-green-100' 
                        : 'text-slate-600 hover:bg-slate-100'
                  }`}
                  data-testid={`toggle-questions-${paragraph.number}`}
                >
                  {isOpen ? (
                    <>
                      <ChevronUp className="w-4 h-4 mr-1" />
                      Ocultar preguntas
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-4 h-4 mr-1" />
                      Ver {paragraph.questions.length} pregunta{paragraph.questions.length > 1 ? 's' : ''}
                    </>
                  )}
                </Button>
              </CollapsibleTrigger>
            )}
          </div>

          {/* Questions Section */}
          {hasQuestions && (
            <CollapsibleContent>
              <div className="mt-4 space-y-2 pl-2 border-l-2 border-orange-200">
                {paragraph.questions.map((q, qIndex) => (
                  <div 
                    key={qIndex}
                    className={`rounded-xl py-3 px-4 text-sm ${
                      q.is_final_question 
                        ? 'bg-red-50 text-red-800 border border-red-200' 
                        : 'bg-orange-50 text-orange-800 border border-orange-100'
                    }`}
                    data-testid={`question-${paragraph.number}-${qIndex}`}
                  >
                    <div className="flex items-start gap-2">
                      <MessageCircleQuestion className={`w-4 h-4 mt-0.5 flex-shrink-0 ${q.is_final_question ? 'text-red-500' : 'text-orange-500'}`} />
                      <div className="flex-1">
                        <span>{q.text}</span>
                        <span className={`ml-2 text-xs font-mono ${q.is_final_question ? 'text-red-500' : 'text-orange-500'}`}>
                          +{q.answer_time}s
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          )}
        </div>
      </div>
    </Collapsible>
  );
}
