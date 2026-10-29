import { useCallback, useEffect, useState } from "react";
import {
  ChevronLeft, ChevronRight, Download, FileUp, Loader2, CalendarDays, ExternalLink,
  BookCheck, FolderOpen, Trash2, Library, ChevronDown,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  addWeeks, mondayOf, weekLabel, issueForWeek, fetchIssuePdf, devicePlatform,
} from "@/utils/jwWeekly";
import {
  findIssueForDate, getIssueFile, listIssues, deleteIssue,
  folderSupported, getSavedFolder, chooseFolder, forgetFolder, ensureFolderPermission, findIssueInFolder,
} from "@/utils/pdfLibrary";

const HELP = {
  android: "Se guardará en Descargas. Después pulsa el paso 2 y elige el archivo. La app guardará una copia y las próximas semanas ya no tendrás que elegirlo.",
  ios: "Se abrirá el PDF: pulsa Compartir → «Guardar en Archivos». Después pulsa el paso 2 y elígelo en Archivos. La app guardará una copia para las próximas semanas.",
  desktop: "Se guardará en Descargas. Después pulsa el paso 2 o arrastra el archivo al recuadro de abajo. La app guardará una copia para las próximas semanas.",
};

/**
 * Recuadro "Artículo de esta semana".
 * 1) Si la revista de la semana ya está guardada en la app → botón para abrirla directamente.
 * 2) En Windows, si se eligió una carpeta de revistas → la busca allí.
 * 3) Si no → enlace oficial de jw.org para descargarla y botón para elegirla.
 */
export function JwWeeklyCard({
  weekMonday, onWeekChange, onChoosePdf, onOpenFile, libraryVersion = 0, isLoading = false, darkMode = false,
}) {
  const [state, setState] = useState({ status: "loading", info: null, issue: null });
  const [saved, setSaved] = useState(null);          // revista guardada que contiene la semana
  const [issues, setIssues] = useState([]);           // todas las guardadas
  const [showLibrary, setShowLibrary] = useState(false);
  const [folder, setFolder] = useState(null);         // carpeta de Windows
  const [folderState, setFolderState] = useState({ status: "idle", file: null });
  const platform = devicePlatform();
  const canUseFolder = folderSupported();
  const thisWeek = mondayOf(new Date());
  const isThisWeek = weekMonday.getTime() === thisWeek.getTime();
  const issue = issueForWeek(weekMonday);

  // Enlace oficial de jw.org
  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading", info: null, issue });
    fetchIssuePdf(issue)
      .then((info) => { if (!cancelled) setState({ status: info ? "ok" : "missing", info, issue }); })
      .catch(() => { if (!cancelled) setState({ status: "error", info: null, issue }); });
    return () => { cancelled = true; };
  }, [issue]);

  // Biblioteca de la app
  const refreshLibrary = useCallback(async () => {
    try {
      setSaved(await findIssueForDate(weekMonday));
      setIssues(await listIssues());
    } catch {
      setSaved(null); setIssues([]);
    }
  }, [weekMonday]);
  useEffect(() => { refreshLibrary(); }, [refreshLibrary, libraryVersion]);

  // Carpeta de Windows: si ya hay permiso, buscar sola la revista de la semana
  const searchFolder = useCallback(async (handle, ask) => {
    if (!handle) return;
    setFolderState({ status: "searching", file: null });
    try {
      const ok = await ensureFolderPermission(handle, ask);
      if (!ok) { setFolderState({ status: "needs-permission", file: null }); return; }
      const file = await findIssueInFolder(handle, issue);
      setFolderState({ status: file ? "found" : "not-found", file });
    } catch {
      setFolderState({ status: "needs-permission", file: null });
    }
  }, [issue]);

  useEffect(() => {
    if (!canUseFolder) return;
    let cancelled = false;
    getSavedFolder().then((h) => {
      if (cancelled) return;
      setFolder(h);
      if (h) searchFolder(h, false);
    });
    return () => { cancelled = true; };
  }, [canUseFolder, searchFolder]);

  const openSaved = async () => {
    const file = await getIssueFile(saved.key);
    if (file) onOpenFile(file, weekMonday);
  };
  const pickFolder = async () => {
    try {
      const h = await chooseFolder();
      setFolder(h);
      searchFolder(h, true);
    } catch { /* el usuario canceló */ }
  };
  const removeIssue = async (key) => { await deleteIssue(key); refreshLibrary(); };

  const muted = darkMode ? "text-zinc-400" : "text-slate-500";
  const strong = darkMode ? "text-zinc-100" : "text-slate-800";
  const warn = darkMode ? "text-amber-300" : "text-amber-700";
  const showDownloadSteps = !saved && folderState.status !== "found";

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

        {/* 1) Ya guardada en la app */}
        {saved && (
          <div className="space-y-2" data-testid="jw-saved">
            <Button
              onClick={openSaved}
              disabled={isLoading}
              className="w-full h-auto py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold justify-start"
              data-testid="jw-open-saved"
            >
              {isLoading ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <BookCheck className="w-5 h-5 mr-2 shrink-0" />}
              <span className="text-left leading-tight">
                {isThisWeek ? "Abrir el artículo de esta semana" : "Abrir el artículo de esa semana"}
                <span className="block text-xs font-normal opacity-90">Guardado en la app · {saved.title}</span>
              </span>
            </Button>
          </div>
        )}

        {/* 2) Encontrada en la carpeta de Windows */}
        {!saved && folderState.status === "found" && (
          <Button
            onClick={() => onOpenFile(folderState.file, weekMonday)}
            disabled={isLoading}
            className="w-full h-auto py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold justify-start"
            data-testid="jw-open-folder"
          >
            {isLoading ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <FolderOpen className="w-5 h-5 mr-2 shrink-0" />}
            <span className="text-left leading-tight">
              Abrir el artículo de {isThisWeek ? "esta" : "esa"} semana
              <span className="block text-xs font-normal opacity-90">Encontrado en tu carpeta «{folder?.name}» · {folderState.file?.name}</span>
            </span>
          </Button>
        )}

        {/* 3) Descargar de jw.org y elegir el PDF */}
        {showDownloadSteps && (
          <>
            {state.status === "loading" && (
              <p className={`text-sm flex items-center gap-2 ${muted}`}><Loader2 className="w-4 h-4 animate-spin" /> Buscando la revista en jw.org…</p>
            )}
            {state.status === "missing" && (
              <p className={`text-sm ${warn}`} data-testid="jw-missing">La revista de esa semana todavía no está publicada en jw.org.</p>
            )}
            {state.status === "error" && (
              <p className={`text-sm ${warn}`} data-testid="jw-error">
                No se pudo consultar jw.org (¿sin conexión?). Puedes descargar la revista desde jw.org → Biblioteca → Revistas y elegirla abajo.
              </p>
            )}

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
              <p className={`text-xs ${muted}`}>
                {folder && folderState.status === "not-found"
                  ? `Guárdala en tu carpeta «${folder.name}» (o elígela con el paso 2).`
                  : HELP[platform]}
              </p>
            </div>

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
                <span className="block text-xs font-normal opacity-80">La app buscará dentro el artículo de la semana</span>
              </span>
            </Button>
          </>
        )}

        {/* Carpeta de revistas (solo Windows con Chrome/Edge) */}
        {canUseFolder && (
          <div className={`rounded-xl px-3 py-2 text-xs flex flex-wrap items-center gap-2 ${darkMode ? "bg-zinc-700/50 text-zinc-300" : "bg-white border border-sky-100 text-slate-600"}`} data-testid="jw-folder">
            <FolderOpen className="w-4 h-4 text-sky-600 shrink-0" />
            {folder ? (
              <>
                <span className="flex-1 min-w-0">
                  Carpeta de revistas: <b>{folder.name}</b>
                  {folderState.status === "searching" && " · buscando…"}
                  {folderState.status === "not-found" && ` · no está el número de ${state.info?.title?.toLowerCase() || issue}`}
                </span>
                {folderState.status === "needs-permission" && (
                  <button type="button" className="font-semibold text-sky-700 underline" onClick={() => searchFolder(folder, true)} data-testid="jw-folder-permission">
                    Buscar en la carpeta
                  </button>
                )}
                <button type="button" className="underline" onClick={pickFolder}>Cambiar</button>
                <button type="button" className="underline" onClick={async () => { await forgetFolder(); setFolder(null); setFolderState({ status: "idle", file: null }); }}>Quitar</button>
              </>
            ) : (
              <>
                <span className="flex-1 min-w-0">¿Guardas las revistas en una carpeta? Elígela y la app las buscará sola.</span>
                <button type="button" className="font-semibold text-sky-700 underline" onClick={pickFolder} data-testid="jw-folder-choose">Elegir carpeta</button>
              </>
            )}
          </div>
        )}

        {/* Revistas guardadas en la app */}
        {issues.length > 0 && (
          <div data-testid="jw-library">
            <button
              type="button"
              onClick={() => setShowLibrary((v) => !v)}
              className={`w-full flex items-center gap-2 text-xs font-semibold ${muted}`}
              data-testid="jw-library-toggle"
            >
              <Library className="w-4 h-4" /> Revistas guardadas en la app ({issues.length})
              <ChevronDown className={`w-4 h-4 ml-auto transition-transform ${showLibrary ? "rotate-180" : ""}`} />
            </button>
            {showLibrary && (
              <ul className="mt-2 space-y-1.5">
                {issues.map((r) => (
                  <li key={r.key} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs ${darkMode ? "bg-zinc-700/50 text-zinc-200" : "bg-white border border-slate-100 text-slate-700"}`}>
                    <span className="flex-1 min-w-0">
                      <b>{r.title}</b> · {r.weeks.length} artículos
                      <span className={`block ${muted}`}>{r.weeks.map((w) => w.label.toLowerCase()).join(" · ")}</span>
                    </span>
                    <button type="button" onClick={() => removeIssue(r.key)} aria-label={`Borrar ${r.title}`} className="p-1 text-red-500 hover:text-red-700" data-testid="jw-library-delete">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </li>
                ))}
                <li className={`text-[11px] ${muted}`}>Se borran solas a los 3 meses de su última semana.</li>
              </ul>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
