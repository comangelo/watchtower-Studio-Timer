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
          paragraph-card rounded-xl border p-4 relative overflow-hidden transition-all duration-300
          ${isCompletedParagraph
            ? 'border-zinc-200 bg-zinc-50 opacity-60'
            : isCurrentParagraph 
              ? 'border-green-500 bg-green-50 ring-2 ring-green-500 ring-offset-2 shadow-lg scale-[1.02]' 
              : hasFinalQuestions 
                ? 'border-red-300 bg-red-50/30' 
                : hasQuestions 
                  ? 'border-orange-200 bg-orange-50/20' 
                  : 'border-zinc-100 bg-white hover:shadow-md'
          }
        `}
        style={{ animationDelay: `${index * 50}ms` }}
        data-testid={`paragraph-card-${paragraph.number}`}
      >
        {/* Completed Indicator */}
        {isCompletedParagraph && (
          <div className="absolute top-0 left-0 right-0 bg-zinc-400 text-white text-xs font-bold py-1 px-3 flex items-center justify-center gap-2">
            <Check className="w-3 h-3" />
            COMPLETADO
          </div>
        )}

        {/* Current Paragraph Indicator */}
        {isCurrentParagraph && (
          <div className="absolute top-0 left-0 right-0 bg-green-500 text-white text-xs font-bold py-1 px-3 flex items-center justify-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
            </span>
            LEYENDO AHORA
          </div>
        )}

        {/* Paragraph Number Badge */}
        <span className={`absolute ${isCurrentParagraph || isCompletedParagraph ? 'top-10' : 'top-3'} left-3 text-xs font-bold ${isCompletedParagraph ? 'text-zinc-400' : isCurrentParagraph ? 'text-green-600' : 'text-zinc-300'}`}>
          #{paragraph.number}
        </span>

        {/* Time Badge */}
        <Badge 
          variant={isCompletedParagraph ? "secondary" : isCurrentParagraph ? "default" : hasFinalQuestions ? "destructive" : hasQuestions ? "default" : "secondary"}
          className={`absolute ${isCurrentParagraph || isCompletedParagraph ? 'top-10' : 'top-3'} right-3 font-mono text-xs ${isCompletedParagraph ? 'bg-zinc-300' : isCurrentParagraph ? 'bg-green-600' : hasQuestions && !hasFinalQuestions ? 'bg-orange-500' : ''}`}
          data-testid={`paragraph-time-${paragraph.number}`}
        >
          {paragraphTimes.adjustedDuration ? formatTimeText(paragraphTimes.adjustedDuration) : formatTimeText(paragraph.total_time_seconds)}
        </Badge>

        {/* Content */}
        <div className={isCurrentParagraph || isCompletedParagraph ? 'mt-12' : 'mt-6'}>
          {/* Time Schedule for paragraph */}
          {startTime && paragraphTimes.start && !isCompletedParagraph && (
            <div className="mb-3 flex items-center gap-4 text-xs">
              <div className={`flex items-center gap-1 px-2 py-1 rounded ${isCurrentParagraph ? 'bg-green-200' : 'bg-zinc-100'}`}>
                <Clock className={`w-3 h-3 ${isCurrentParagraph ? 'text-green-700' : 'text-zinc-500'}`} />
                <span className={isCurrentParagraph ? 'text-green-700' : 'text-zinc-600'}>Inicio:</span>
                <span className={`font-mono font-bold ${isCurrentParagraph ? 'text-green-800' : 'text-zinc-800'}`}>{formatClockTime(paragraphTimes.start)}</span>
              </div>
              <div className={`flex items-center gap-1 px-2 py-1 rounded ${isCurrentParagraph ? 'bg-green-200' : 'bg-green-100'}`}>
                <Clock className={`w-3 h-3 ${isCurrentParagraph ? 'text-green-700' : 'text-green-600'}`} />
                <span className={isCurrentParagraph ? 'text-green-700' : 'text-green-600'}>Fin:</span>
                <span className={`font-mono font-bold ${isCurrentParagraph ? 'text-green-800' : 'text-green-700'}`}>{formatClockTime(paragraphTimes.end)}</span>
              </div>
              {paragraphTimes.adjustedDuration !== paragraph.total_time_seconds && (
                <span className="text-orange-500 text-xs font-medium">
                  (ajustado)
                </span>
              )}
            </div>
          )}
          
          <p className={`text-sm line-clamp-2 pr-20 ${isCompletedParagraph ? 'text-zinc-400' : isCurrentParagraph ? 'text-green-800 font-medium' : 'text-zinc-600'}`}>
            {paragraph.text}
          </p>
          
          {/* Stats Row */}
          <div className={`flex items-center gap-4 mt-3 text-xs ${isCompletedParagraph ? 'text-zinc-400' : isCurrentParagraph ? 'text-green-600' : 'text-zinc-400'}`}>
            <span>{paragraph.word_count} palabras</span>
            <span>·</span>
            <span>{formatTimeText(paragraph.reading_time_seconds)} lectura</span>
            {hasQuestions && (
              <>
                <span>·</span>
                <span className={`font-medium ${hasFinalQuestions ? 'text-red-500' : isCurrentParagraph ? 'text-green-700' : 'text-orange-500'}`}>
                  {paragraph.questions.length} pregunta{paragraph.questions.length > 1 ? 's' : ''}
                  {hasFinalQuestions && ' (FINAL)'}
                </span>
              </>
            )}
          </div>

          {/* Action buttons */}
          <div className="mt-3 flex items-center gap-2">
            {/* Next Paragraph Button - Only on current paragraph */}
            {isCurrentParagraph && !isLastParagraph && (
              <Button
                variant="default"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onGoToNext();
                }}
                className="text-xs bg-green-600 hover:bg-green-700 text-white"
                data-testid={`next-from-paragraph-${paragraph.number}`}
              >
                <ArrowRight className="w-3 h-3 mr-1" />
                Pasar al siguiente párrafo
              </Button>
            )}

            {/* Start from here - Only when not current and not completed */}
            {!isCurrentParagraph && !isCompletedParagraph && (
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onStartFromHere();
                }}
                className="text-xs border-green-300 text-green-700 hover:bg-green-50 hover:border-green-400"
                data-testid={`start-from-paragraph-${paragraph.number}`}
              >
                <Play className="w-3 h-3 mr-1" />
                Iniciar desde aquí
              </Button>
            )}
            
            {hasQuestions && (
              <CollapsibleTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className={`text-xs ${hasFinalQuestions ? 'text-red-600 hover:text-red-700 hover:bg-red-100' : isCurrentParagraph ? 'text-green-700 hover:bg-green-200' : 'text-orange-600 hover:text-orange-700 hover:bg-orange-100'}`}
                  data-testid={`toggle-questions-${paragraph.number}`}
                >
                  {isOpen ? (
                    <>
                      <ChevronUp className="w-3 h-3 mr-1" />
                      Ocultar
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-3 h-3 mr-1" />
                      Ver preguntas ({paragraph.questions.length})
                    </>
                  )}
                </Button>
              </CollapsibleTrigger>
            )}
          </div>

          {/* Questions Section */}
          {hasQuestions && (
            <CollapsibleContent>
              <div className="mt-3 space-y-2">
                {paragraph.questions.map((q, qIndex) => (
                  <div 
                    key={qIndex}
                    className={`rounded-lg py-2 text-sm ${q.is_final_question ? 'bg-red-50 border-l-3 border-red-500 pl-3 text-red-800' : isCurrentParagraph ? 'bg-green-100 border-l-3 border-green-500 pl-3 text-green-800' : 'question-highlight text-orange-800'}`}
                    data-testid={`question-${paragraph.number}-${qIndex}`}
                  >
                    <MessageCircleQuestion className={`w-4 h-4 inline mr-2 ${q.is_final_question ? 'text-red-500' : isCurrentParagraph ? 'text-green-600' : 'text-orange-500'}`} />
                    {q.text}
                    <span className={`ml-2 text-xs ${q.is_final_question ? 'text-red-500' : isCurrentParagraph ? 'text-green-600' : 'text-orange-500'}`}>
                      (+{q.answer_time} seg)
                    </span>
                    {q.is_final_question && (
                      <Badge variant="destructive" className="ml-2 text-xs">FINAL</Badge>
                    )}
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
