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
  folderSupported, getSavedFolder, issueTitle, chooseFolder, forgetFolder, ensureFolderPermission, findIssueInFolder,
} from "@/utils/pdfLibrary";
import { t, currentLocale, jwLanguageCode } from "@/i18n";

const HELP = { android: "jwHelpAndroid", ios: "jwHelpIos", desktop: "jwHelpDesktop" };

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
  // Tras pulsar «Descargar», el paso 2 se resalta para que baste un toque al volver a la app.
  const [downloaded, setDownloaded] = useState(false);
  const platform = devicePlatform();
  const canUseFolder = folderSupported();
  const thisWeek = mondayOf(new Date());
  const isThisWeek = weekMonday.getTime() === thisWeek.getTime();
  const issue = issueForWeek(weekMonday);
  const jwLang = jwLanguageCode(); // revista en el idioma de la app
  useEffect(() => { setDownloaded(false); }, [issue, jwLang]);

  // Enlace oficial de jw.org
  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading", info: null, issue });
    fetchIssuePdf(issue, jwLang)
      .then((info) => { if (!cancelled) setState({ status: info ? "ok" : "missing", info, issue }); })
      .catch(() => { if (!cancelled) setState({ status: "error", info: null, issue }); });
    return () => { cancelled = true; };
  }, [issue, jwLang]);

  // Biblioteca de la app
  const refreshLibrary = useCallback(async () => {
    try {
      setSaved(await findIssueForDate(weekMonday, jwLang));
      setIssues(await listIssues());
    } catch {
      setSaved(null); setIssues([]);
    }
  }, [weekMonday, jwLang]);
  useEffect(() => { refreshLibrary(); }, [refreshLibrary, libraryVersion]);

  // Carpeta de Windows: si ya hay permiso, buscar sola la revista de la semana
  const searchFolder = useCallback(async (handle, ask) => {
    if (!handle) return;
    setFolderState({ status: "searching", file: null });
    try {
      const ok = await ensureFolderPermission(handle, ask);
      if (!ok) { setFolderState({ status: "needs-permission", file: null }); return; }
      const file = await findIssueInFolder(handle, issue, jwLang);
      setFolderState({ status: file ? "found" : "not-found", file });
    } catch {
      setFolderState({ status: "needs-permission", file: null });
    }
  }, [issue, jwLang]);

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
            <p className={`font-bold ${strong}`}>{isThisWeek ? t("jwThisWeekArticle") : t("jwWeekArticle")}</p>
            <p className={`text-xs ${muted}`}>{t("weeklySource")}</p>
          </div>
        </div>

        {/* Semana con flechas */}
        <div className={`flex items-center justify-between gap-2 rounded-xl px-2 py-2 ${darkMode ? "bg-zinc-700/60" : "bg-white border border-sky-100"}`}>
          <Button variant="ghost" size="icon" onClick={() => onWeekChange(addWeeks(weekMonday, -1))} aria-label={t("jwPrevWeek")} data-testid="jw-week-prev">
            <ChevronLeft />
          </Button>
          <div className="text-center min-w-0">
            <p className={`font-semibold text-sm sm:text-base ${strong}`} data-testid="jw-week-label">{weekLabel(weekMonday)}</p>
            {state.status === "ok" && (
              <p className={`text-xs ${muted}`} data-testid="jw-issue-label">{t("jwIssueOf", { title: state.info.title.toLowerCase() })}</p>
            )}
            {!isThisWeek && (
              <button type="button" className="text-xs font-semibold text-sky-600 underline" onClick={() => onWeekChange(thisWeek)}>
                {t("jwBackToThisWeek")}
              </button>
            )}
          </div>
          <Button variant="ghost" size="icon" onClick={() => onWeekChange(addWeeks(weekMonday, 1))} aria-label={t("jwNextWeek")} data-testid="jw-week-next">
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
                {isThisWeek ? t("jwOpenThisWeek") : t("jwOpenThatWeek")}
                <span className="block text-xs font-normal opacity-90">{t("jwSavedInApp")} · {issueTitle(saved.fileName, saved.weeks)}</span>
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
              {isThisWeek ? t("jwOpenThisWeek") : t("jwOpenThatWeek")}
              <span className="block text-xs font-normal opacity-90">{t("jwFoundInFolder", { folder: folder?.name })} · {folderState.file?.name}</span>
            </span>
          </Button>
        )}

        {/* 3) Descargar de jw.org y elegir el PDF */}
        {showDownloadSteps && (
          <>
            {state.status === "loading" && (
              <p className={`text-sm flex items-center gap-2 ${muted}`}><Loader2 className="w-4 h-4 animate-spin" /> {t("jwSearching")}</p>
            )}
            {state.status === "missing" && (
              <p className={`text-sm ${warn}`} data-testid="jw-missing">{t("jwMissing")}</p>
            )}
            {state.status === "error" && (
              <p className={`text-sm ${warn}`} data-testid="jw-error">
                {t("jwError")}
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
                  <a href={state.info.url} target="_blank" rel="noopener noreferrer" onClick={() => setDownloaded(true)}>
                    <Download className="w-5 h-5 mr-2 shrink-0" />
                    <span className="text-left leading-tight">
                      {t("jwStep1")}
                      <span className="block text-xs font-normal opacity-90">
                        {t("jwOfficialPdf")} · {(state.info.size / 1048576).toLocaleString(currentLocale(), { maximumFractionDigits: 1 })} MB
                      </span>
                    </span>
                    <ExternalLink className="w-4 h-4 ml-auto opacity-80" />
                  </a>
                ) : (
                  <span><Download className="w-5 h-5 mr-2 inline" /> {t("jwStep1")}</span>
                )}
              </Button>
              <p className={`text-xs ${muted}`}>
                {folder && folderState.status === "not-found"
                  ? t("jwSaveInFolder", { folder: folder.name })
                  : t(HELP[platform])}
              </p>
            </div>

            <Button
              onClick={onChoosePdf}
              disabled={isLoading}
              variant={downloaded ? "default" : "outline"}
              className={`w-full h-auto rounded-xl font-semibold justify-start border-2 ${
                downloaded
                  ? "py-4 bg-emerald-600 hover:bg-emerald-700 border-emerald-600 text-white shadow-lg ring-4 ring-emerald-300/60"
                  : `py-3 ${darkMode ? "border-sky-500 text-sky-200" : "border-sky-300 text-sky-800"}`
              }`}
              data-testid="jw-choose-pdf"
              data-ready={downloaded ? "1" : undefined}
            >
              {isLoading ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <FileUp className={`${downloaded ? "w-6 h-6" : "w-5 h-5"} mr-2`} />}
              <span className="text-left leading-tight">
                {t("jwStep2")}
                <span className={`block font-normal ${downloaded ? "text-sm font-semibold mt-0.5" : "text-xs opacity-80"}`}>
                  {downloaded ? t("jwStep2Ready") : t("jwStep2Hint")}
                </span>
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
                  {t("jwFolderLabel")} <b>{folder.name}</b>
                  {folderState.status === "searching" && ` · ${t("jwFolderSearching")}`}
                  {folderState.status === "not-found" && ` · ${t("jwFolderNotFound", { title: state.info?.title?.toLowerCase() || issue })}`}
                </span>
                {folderState.status === "needs-permission" && (
                  <button type="button" className="font-semibold text-sky-700 underline" onClick={() => searchFolder(folder, true)} data-testid="jw-folder-permission">
                    {t("jwFolderSearch")}
                  </button>
                )}
                <button type="button" className="underline" onClick={pickFolder}>{t("change")}</button>
                <button type="button" className="underline" onClick={async () => { await forgetFolder(); setFolder(null); setFolderState({ status: "idle", file: null }); }}>{t("remove")}</button>
              </>
            ) : (
              <>
                <span className="flex-1 min-w-0">{t("jwFolderAsk")}</span>
                <button type="button" className="font-semibold text-sky-700 underline" onClick={pickFolder} data-testid="jw-folder-choose">{t("jwFolderChoose")}</button>
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
              <Library className="w-4 h-4" /> {t("jwLibrary", { n: issues.length })}
              <ChevronDown className={`w-4 h-4 ml-auto transition-transform ${showLibrary ? "rotate-180" : ""}`} />
            </button>
            {showLibrary && (
              <ul className="mt-2 space-y-1.5">
                {issues.map((r) => (
                  <li key={r.key} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs ${darkMode ? "bg-zinc-700/50 text-zinc-200" : "bg-white border border-slate-100 text-slate-700"}`}>
                    <span className="flex-1 min-w-0">
                      <b>{issueTitle(r.fileName, r.weeks)}</b> · {t("jwArticles", { n: r.weeks.length })}
                      <span className={`block ${muted}`}>{r.weeks.map((w) => w.label.toLowerCase()).join(" · ")}</span>
                    </span>
                    <button type="button" onClick={() => removeIssue(r.key)} aria-label={t("delete")} className="p-1 text-red-500 hover:text-red-700" data-testid="jw-library-delete">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </li>
                ))}
                <li className={`text-[11px] ${muted}`}>{t("jwLibraryCleanup")}</li>
              </ul>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
