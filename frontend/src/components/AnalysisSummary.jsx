import { FileText, MessageCircle, HelpCircle, Image, BookOpen, Layers, StickyNote, Clock, Sparkles, Star } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatTimeCompact } from "../utils/timeFormatters";

// Número del artículo (sale del nombre del archivo, p. ej. "Articulo_de_Estudio_83_…")
// y título (el impreso en el PDF; si no se encontró, el del nombre del archivo).
function getArticleHeading(analysisResult) {
  const filename = analysisResult?.filename || '';
  let name = filename.replace(/\.[^/.]+$/, '');
  // Prefijos añadidos por algunos sistemas al subir el archivo ("24046e1c-…")
  name = name.replace(/^[0-9a-f]{6,}[-_ ]+/i, '');
  const num = /art[ií]culo[\s_-]*(?:de[\s_-]*)?(?:estudio[\s_-]*)?(\d{1,3})(?!\d)/i.exec(name);
  let articleLine = num ? `ARTÍCULO DE ESTUDIO ${num[1]}` : 'ARTÍCULO DE ESTUDIO';
  // Semana impresa en el artículo ("26 DE OCTUBRE-1 DE NOVIEMBRE DE 2026")
  if (analysisResult?.week_label) articleLine += ` · ${analysisResult.week_label}`;

  let titleLine = (analysisResult?.article_title || '').trim();
  if (!titleLine) {
    titleLine = name
      .replace(/^art[ií]culo[\s_-]*(?:de[\s_-]*)?(?:estudio[\s_-]*)?\d*[\s_-]*/i, '')
      .replace(/[_-]+/g, ' ')
      .trim()
      .toLowerCase();
    titleLine = titleLine.charAt(0).toUpperCase() + titleLine.slice(1);
  }
  return { articleLine, titleLine };
}

const shortMin = (sec) => (sec < 90 ? `${Math.round(sec)} s` : `${Math.round(sec / 60)} min`);

export function AnalysisSummary({ 
  analysisResult, 
  darkMode = false,
  totalDurationMinutes = 60,
  introductionDuration = 60,
  closingWordsDuration = 60,
  onSelectIssueWeek
}) {
  if (!analysisResult) return null;
  const issueWeeks = analysisResult.from_issue ? (analysisResult.issue_weeks || []).filter(w => w && w.label) : [];

  const paragraphQuestions = analysisResult.total_paragraph_questions || 
    analysisResult.paragraphs.reduce(
      (sum, p) => sum + p.questions.filter(q => !q.is_final_question).length, 0
    );
  const reviewQuestions = analysisResult.total_review_questions || analysisResult.final_questions?.length || 0;
  const totalImages = analysisResult.total_images || 0;
  const totalScriptures = analysisResult.total_scriptures || 0;
  const totalNotes = analysisResult.total_notes || 0;
  const totalHighlights = analysisResult.total_highlights || 0;
  const totalParagraphs = analysisResult.total_paragraphs || 0;

  // Time calculations
  const readingTimeSeconds = analysisResult.total_reading_time_seconds || 0;
  const questionTimeSeconds = analysisResult.total_question_time_seconds || 0;
  const articleTimeSeconds = readingTimeSeconds + questionTimeSeconds;
  const totalDurationSeconds = totalDurationMinutes * 60;
  const fixedTimeSeconds = introductionDuration + closingWordsDuration;
  const availableTimeSeconds = totalDurationSeconds - articleTimeSeconds - fixedTimeSeconds;

  // Reparto: lo que no es lectura, introducción ni conclusión queda para preguntas y comentarios
  const commentSeconds = totalDurationSeconds - readingTimeSeconds - fixedTimeSeconds;
  const segments = [
    { key: 'intro', label: 'Introducción', seconds: introductionDuration, bar: 'bg-blue-500', testid: 'intro-time' },
    { key: 'reading', label: 'Lectura', seconds: readingTimeSeconds, bar: 'bg-slate-400', testid: 'reading-time' },
    { key: 'comments', label: 'Comentarios', seconds: Math.max(0, commentSeconds), bar: 'bg-orange-500', testid: 'question-time' },
    { key: 'closing', label: 'Conclusión', seconds: closingWordsDuration, bar: 'bg-purple-500', testid: 'closing-time' },
  ].filter((seg) => seg.seconds > 0);
  const barTotal = Math.max(1, segments.reduce((sum, seg) => sum + seg.seconds, 0));
  const chipTone = darkMode
    ? { zinc: 'bg-zinc-700 text-zinc-200', orange: 'bg-orange-900/60 text-orange-200', blue: 'bg-blue-900/60 text-blue-200', purple: 'bg-purple-900/60 text-purple-200', amber: 'bg-amber-900/60 text-amber-200', cyan: 'bg-cyan-900/60 text-cyan-200', rose: 'bg-rose-900/60 text-rose-200' }
    : { zinc: 'bg-zinc-100 text-zinc-700', orange: 'bg-orange-50 text-orange-700', blue: 'bg-blue-50 text-blue-700', purple: 'bg-purple-50 text-purple-700', amber: 'bg-amber-50 text-amber-700', cyan: 'bg-cyan-50 text-cyan-700', rose: 'bg-rose-50 text-rose-700' };

  // Parse the filename into article line and title
  const { articleLine, titleLine } = getArticleHeading(analysisResult);

  return (
    <Card className={`shadow-sm ${darkMode ? 'border-zinc-600 bg-zinc-800' : 'border-zinc-100'}`} data-testid="analysis-summary">
      <CardContent className="p-4 sm:p-6">
        {/* Header with formatted title */}
        <div className="mb-3">
          <p className={`text-xs font-bold tracking-wide mb-1 ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
            {articleLine}
          </p>
          <h3 className={`font-heading font-bold text-xl sm:text-2xl leading-tight ${darkMode ? 'text-orange-400' : 'text-orange-600'}`} data-testid="pdf-filename">
            {titleLine}
          </h3>

          {analysisResult.from_issue && analysisResult.week_exact === false && (
            <p className={`mt-2 text-xs font-medium ${darkMode ? 'text-amber-300' : 'text-amber-700'}`} data-testid="week-not-in-issue">
              Esta revista no trae la semana elegida; se muestra el artículo más cercano. Elige otra semana abajo o descarga el número correcto.
            </p>
          )}
          {issueWeeks.length > 1 && onSelectIssueWeek && (
            <div className="mt-3" data-testid="issue-weeks">
              <p className={`text-xs mb-1.5 ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>Otros artículos de esta revista:</p>
              <div className="flex flex-wrap gap-2">
                {issueWeeks.map((w) => {
                  const active = w.label === analysisResult.week_label;
                  return (
                    <button
                      key={w.label}
                      type="button"
                      disabled={active}
                      onClick={() => onSelectIssueWeek(w.start)}
                      className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
                        active
                          ? 'bg-sky-600 text-white border-sky-600'
                          : darkMode ? 'border-zinc-500 text-zinc-200 hover:bg-zinc-700' : 'border-sky-200 text-sky-800 hover:bg-sky-50'
                      }`}
                      data-testid="issue-week-option"
                    >
                      {w.label.toLowerCase()}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          {analysisResult.circuit_visit && (
            <p className={`inline-flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full text-xs font-semibold ${darkMode ? 'bg-indigo-900/60 text-indigo-200 border border-indigo-600' : 'bg-indigo-100 text-indigo-800 border border-indigo-200'}`} data-testid="circuit-visit-badge">
              Visita del superintendente · {totalDurationMinutes} min · sin lectura de párrafos
            </p>
          )}
        </div>

        {/* Contenido del artículo en una línea */}
        <div className="flex flex-wrap gap-1.5 mb-5">
          {(
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${chipTone.zinc}`} data-testid="paragraphs-count">
              <Layers className="w-3.5 h-3.5" />{totalParagraphs} {totalParagraphs === 1 ? 'párrafo' : 'párrafos'}
            </span>
          )}
          {(
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${chipTone.orange}`} data-testid="paragraph-questions-count">
              <MessageCircle className="w-3.5 h-3.5" />{paragraphQuestions} {paragraphQuestions === 1 ? 'pregunta' : 'preguntas'}
            </span>
          )}
          {totalScriptures > 0 && (
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${chipTone.blue}`} data-testid="scriptures-count">
              <BookOpen className="w-3.5 h-3.5" />{totalScriptures} {totalScriptures === 1 ? 'texto' : 'textos'}
            </span>
          )}
          {totalImages > 0 && (
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${chipTone.purple}`} data-testid="images-count">
              <Image className="w-3.5 h-3.5" />{totalImages} {totalImages === 1 ? 'imagen' : 'imágenes'}
            </span>
          )}
          {totalNotes > 0 && (
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${chipTone.amber}`} data-testid="notes-count">
              <StickyNote className="w-3.5 h-3.5" />{totalNotes} {totalNotes === 1 ? 'nota' : 'notas'}
            </span>
          )}
          {totalHighlights > 0 && (
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${chipTone.cyan}`} data-testid="highlights-count">
              <Star className="w-3.5 h-3.5" />{totalHighlights} {totalHighlights === 1 ? 'idea importante' : 'ideas importantes'}
            </span>
          )}
          {reviewQuestions > 0 && (
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${chipTone.rose}`} data-testid="review-questions-count">
              <HelpCircle className="w-3.5 h-3.5" />{reviewQuestions} {'repaso'}
            </span>
          )}
        </div>

        {/* Reparto del tiempo en una sola barra */}
        <div data-testid="time-split">
          <div className="flex items-baseline justify-between mb-2">
            <p className={`text-xs font-bold uppercase tracking-wider ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
              Reparto de los {totalDurationMinutes} min
            </p>
            <p className={`text-xs ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>
              Artículo sin pausas: {shortMin(articleTimeSeconds)}
            </p>
          </div>
          <div className={`flex h-4 w-full overflow-hidden rounded-full ${darkMode ? 'bg-zinc-700' : 'bg-zinc-100'}`}>
            {segments.map((seg) => (
              <div key={seg.key} className={`${seg.bar} h-full`} style={{ width: `${(seg.seconds / barTotal) * 100}%` }} title={`${seg.label}: ${formatTimeCompact(seg.seconds)}`} />
            ))}
          </div>
          <div className="mt-2.5 grid grid-cols-2 sm:grid-cols-4 gap-x-3 gap-y-1.5">
            {segments.map((seg) => (
              <div key={seg.key} className="flex items-center gap-1.5 min-w-0" data-testid={seg.testid}>
                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${seg.bar}`} />
                <span className={`text-xs truncate ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>{seg.label}</span>
                <span className={`text-xs font-bold tabular-nums ml-auto ${darkMode ? 'text-zinc-100' : 'text-zinc-800'}`}>{shortMin(seg.seconds)}</span>
              </div>
            ))}
          </div>
          {commentSeconds < 0 && (
            <p className={`mt-3 text-xs font-semibold rounded-lg px-3 py-2 ${darkMode ? 'bg-red-950/60 text-red-300' : 'bg-red-50 text-red-700'}`} data-testid="available-time">
              No cabe: faltan {formatTimeCompact(Math.abs(commentSeconds))} para la lectura, la introducción y la conclusión.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
