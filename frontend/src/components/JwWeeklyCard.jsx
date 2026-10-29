import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Download, FileUp, Loader2, CalendarDays, ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  addWeeks, mondayOf, weekLabel, issueForWeek, fetchIssuePdf, devicePlatform,
} from "@/utils/jwWeekly";

const HELP = {
  android: "Se guardará en Descargas. Después pulsa el paso 2 y elige el archivo.",
  ios: "Se abrirá el PDF: pulsa Compartir → «Guardar en Archivos». Después pulsa el paso 2 y elígelo en Archivos.",
  desktop: "Se guardará en Descargas. Después pulsa el paso 2 o arrastra el archivo al recuadro de abajo.",
};

/**
 * Recuadro "Artículo de esta semana": calcula la semana, busca en jw.org el número
 * de La Atalaya que le corresponde y ofrece el enlace oficial al PDF.
 * La revista se descarga en el dispositivo y la app encuentra dentro el artículo de la semana.
 */
export function JwWeeklyCard({ weekMonday, onWeekChange, onChoosePdf, isLoading = false, darkMode = false }) {
  const [state, setState] = useState({ status: "loading", info: null, issue: null });
  const platform = devicePlatform();
  const thisWeek = mondayOf(new Date());
  const isThisWeek = weekMonday.getTime() === thisWeek.getTime();

  useEffect(() => {
    let cancelled = false;
    const issue = issueForWeek(weekMonday);
    setState({ status: "loading", info: null, issue });
    fetchIssuePdf(issue)
      .then((info) => { if (!cancelled) setState({ status: info ? "ok" : "missing", info, issue }); })
      .catch(() => { if (!cancelled) setState({ status: "error", info: null, issue }); });
    return () => { cancelled = true; };
  }, [weekMonday]);

  const muted = darkMode ? "text-zinc-400" : "text-slate-500";
  const strong = darkMode ? "text-zinc-100" : "text-slate-800";

  return (
    <Card
      className={`border shadow-sm ${darkMode ? "bg-zinc-800 border-zinc-600" : "bg-gradient-to-br from-sky-50 to-white border-sky-200"}`}
      data-testid="jw-weekly-card"
    >
      <CardContent className="p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-600 text-white flex items-center justify-center shrink-0">
            <CalendarDays className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className={`font-bold ${strong}`}>{isThisWeek ? "Artículo de esta semana" : "Artículo de la semana"}</p>
            <p className={`text-xs ${muted}`}>La Atalaya (edición de estudio) · jw.org</p>
          </div>
        </div>

        {/* Semana con flechas */}
        <div className={`flex items-center justify-between gap-2 rounded-xl px-2 py-2 ${darkMode ? "bg-zinc-700/60" : "bg-white border border-sky-100"}`}>
          <Button variant="ghost" size="icon" onClick={() => onWeekChange(addWeeks(weekMonday, -1))} aria-label="Semana anterior" data-testid="jw-week-prev">
            <ChevronLeft />
          </Button>
          <div className="text-center min-w-0">
            <p className={`font-semibold text-sm sm:text-base ${strong}`} data-testid="jw-week-label">{weekLabel(weekMonday)}</p>
            {state.status === "ok" && (
              <p className={`text-xs ${muted}`} data-testid="jw-issue-label">Número de {state.info.title.toLowerCase()}</p>
            )}
            {!isThisWeek && (
              <button type="button" className="text-xs font-semibold text-sky-600 underline" onClick={() => onWeekChange(thisWeek)}>
                Volver a esta semana
              </button>
            )}
          </div>
          <Button variant="ghost" size="icon" onClick={() => onWeekChange(addWeeks(weekMonday, 1))} aria-label="Semana siguiente" data-testid="jw-week-next">
            <ChevronRight />
          </Button>
        </div>

        {state.status === "loading" && (
          <p className={`text-sm flex items-center gap-2 ${muted}`}><Loader2 className="w-4 h-4 animate-spin" /> Buscando la revista en jw.org…</p>
        )}
        {state.status === "missing" && (
          <p className={`text-sm ${darkMode ? "text-amber-300" : "text-amber-700"}`} data-testid="jw-missing">
            La revista de esa semana todavía no está publicada en jw.org.
          </p>
        )}
        {state.status === "error" && (
          <p className={`text-sm ${darkMode ? "text-amber-300" : "text-amber-700"}`} data-testid="jw-error">
            No se pudo consultar jw.org (¿sin conexión?). Puedes descargar la revista desde jw.org → Biblioteca → Revistas y elegirla abajo.
          </p>
        )}

        {/* Paso 1: descargar */}
        <div className="space-y-2">
          <Button
            asChild={state.status === "ok"}
            disabled={state.status !== "ok"}
            className="w-full h-auto py-3 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-semibold justify-start"
            data-testid="jw-download"
          >
            {state.status === "ok" ? (
              <a href={state.info.url} target="_blank" rel="noopener noreferrer">
                <Download className="w-5 h-5 mr-2 shrink-0" />
                <span className="text-left leading-tight">
                  1. Descargar la revista de jw.org
                  <span className="block text-xs font-normal opacity-90">
                    PDF oficial · {(state.info.size / 1048576).toLocaleString("es-ES", { maximumFractionDigits: 1 })} MB
                  </span>
                </span>
                <ExternalLink className="w-4 h-4 ml-auto opacity-80" />
              </a>
            ) : (
              <span><Download className="w-5 h-5 mr-2 inline" /> 1. Descargar la revista de jw.org</span>
            )}
          </Button>
          <p className={`text-xs ${muted}`}>{HELP[platform]}</p>
        </div>

        {/* Paso 2: elegir el PDF */}
        <Button
          onClick={onChoosePdf}
          disabled={isLoading}
          variant="outline"
          className={`w-full h-auto py-3 rounded-xl font-semibold justify-start border-2 ${darkMode ? "border-sky-500 text-sky-200" : "border-sky-300 text-sky-800"}`}
          data-testid="jw-choose-pdf"
        >
          {isLoading ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <FileUp className="w-5 h-5 mr-2" />}
          <span className="text-left leading-tight">
            2. Elegir el PDF descargado
            <span className="block text-xs font-normal opacity-80">La app buscará dentro el artículo de esta semana</span>
          </span>
        </Button>
      </CardContent>
    </Card>
  );
}
