import { useMemo, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Printer, ArrowLeft, Trash2, History, ClipboardList, Clock, MessageCircle } from "lucide-react";
import { t, tn, currentLocale } from "@/i18n";
import { longDate as fmtLongDate, shortDate as fmtShortDate } from "@/i18n/dates";
import { loadHistory, deleteReport, reportUrl } from "@/utils/studyHistory";

/**
 * Informe del estudio y historial (/informe y /informe?id=…).
 * Se abre en una pestaña aparte para revisarlo e imprimirlo o guardarlo en PDF.
 * Los datos salen del historial guardado en este dispositivo.
 */

const pad = (n) => String(n).padStart(2, "0");
function mmss(sec) {
  const s = Math.max(0, Math.round(Math.abs(sec || 0)));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h ? `${h}:${pad(m)}:${pad(s % 60)}` : `${m}:${pad(s % 60)}`;
}
function diffText(sec) {
  if (!sec) return "0:00";
  return `${sec > 0 ? "+" : "−"}${mmss(sec)}`;
}
const clock = (ms) => (ms ? new Date(ms).toLocaleTimeString(currentLocale(), { hour: "2-digit", minute: "2-digit" }) : "—");
const longDate = (ms) => fmtLongDate(ms);
const shortDate = (ms) => fmtShortDate(ms);

/** "Texto para leer: Santiago 5:7, 8 · Imagen para comentar · Nota para comentar" */
function extrasLine(x) {
  if (!x) return "";
  const parts = [];
  const nScr = Math.max(x.scriptures || 0, x.refs?.length ? 1 : 0);
  if (nScr) parts.push(x.refs?.length ? `${tn("tbScripture", x.refs.length)}: ${x.refs.join(", ")}` : tn("tbScripture", nScr));
  if (x.images) parts.push(tn("tbImage", x.images));
  if (x.notes) parts.push(tn("tbNote", x.notes));
  if (x.highlights) parts.push(tn("tbHighlight", x.highlights));
  return parts.join(" · ");
}

function segLabel(sg) {
  switch (sg.kind) {
    case "intro": return t("rpIntro");
    case "paragraph": return (sg.count || 1) > 1 ? t("paragraphsN", { n: sg.numbers }) : t("paragraphN", { n: sg.numbers || "" });
    case "review": return t("reviewN", { n: (sg.index || 0) + 1 });
    case "conclusion": return t("rpConclusion");
    default: return "";
  }
}

const diffClass = (d) => (d > 30 ? "text-red-600" : d < -30 ? "text-emerald-600" : "text-slate-600");
const rowClass = (d) => (d > 30 ? "bg-red-50" : d < -30 ? "bg-emerald-50" : "");

function Report({ report }) {
  const segs = report.segments || [];
  const realDuration = Math.round((report.endedAt - report.startedAt) / 1000);
  const planned = report.plannedSeconds || 0;
  const totalPlanned = segs.reduce((n, s) => n + (s.estimated || 0), 0);
  const totalActual = segs.reduce((n, s) => n + (s.actual || 0), 0);
  const endVsPlan = report.plannedEnd ? Math.round((report.endedAt - report.plannedEnd) / 1000) : realDuration - planned;
  const endLine = Math.abs(endVsPlan) < 30
    ? t("rpOnTime")
    : endVsPlan < 0 ? t("rpFinishedEarly", { t: mmss(endVsPlan) }) : t("rpFinishedLate", { t: mmss(endVsPlan) });

  return (
    <article className="rp-sheet bg-white rounded-2xl shadow-sm border border-slate-200 p-5 sm:p-8" data-testid="report">
      <header className="flex items-start gap-4 border-b border-slate-200 pb-4">
        <img src="/icon-192.png" alt="" className="w-12 h-12 rounded-xl" />
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-widest text-orange-600">{t("reportTitle")}</p>
          <h1 className="font-heading text-xl sm:text-2xl font-bold text-slate-900 leading-tight">{report.titleLine || report.articleLine}</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {[report.articleLine, report.weekLabel && !report.articleLine?.includes(report.weekLabel) ? report.weekLabel : null].filter(Boolean).join(" · ")}
          </p>
          <p className="text-sm text-slate-700 mt-1 first-letter:uppercase">{longDate(report.startedAt)}{report.circuitVisit ? ` · ${t("rpCircuit")}` : ""}</p>
        </div>
      </header>

      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5" data-testid="report-summary">
        <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
          <p className="text-[11px] font-bold uppercase text-slate-500">{t("rpStart")}</p>
          <p className="text-2xl font-black tabular-nums text-slate-900">{clock(report.startedAt)}</p>
        </div>
        <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
          <p className="text-[11px] font-bold uppercase text-slate-500">{t("rpEnd")}</p>
          <p className="text-2xl font-black tabular-nums text-slate-900">{clock(report.endedAt)}</p>
          {report.plannedEnd ? <p className="text-xs text-slate-500">{t("rpPlannedEnd")}: {clock(report.plannedEnd)}</p> : null}
        </div>
        <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
          <p className="text-[11px] font-bold uppercase text-slate-500">{t("rpDuration")}</p>
          <p className="text-2xl font-black tabular-nums text-slate-900">{mmss(realDuration)}</p>
          <p className="text-xs text-slate-500">{t("rpPlanned")}: {mmss(planned)}</p>
        </div>
        <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
          <p className="text-[11px] font-bold uppercase text-slate-500">{t("rpComments")}</p>
          <p className="text-2xl font-black tabular-nums text-slate-900">{report.totalComments || 0}</p>
        </div>
      </section>
      <p className={`mt-3 text-sm font-semibold ${Math.abs(endVsPlan) < 30 ? "text-emerald-700" : endVsPlan < 0 ? "text-emerald-700" : "text-red-700"}`} data-testid="report-endline">
        {endLine}
      </p>

      <h2 className="font-heading text-lg font-bold text-slate-900 mt-6 mb-2">{t("rpDetail")}</h2>
      <div className="overflow-x-auto -mx-1">
        <table className="w-full text-[12px] sm:text-sm border-collapse" data-testid="report-table">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wide text-slate-500 border-b-2 border-slate-300">
              <th className="py-2 px-1 sm:px-1.5">{t("rpTime")}</th>
              <th className="py-2 px-1 sm:px-1.5">{t("rpPart")}</th>
              <th className="py-2 px-1 sm:px-1.5 text-right hidden sm:table-cell print:table-cell">{t("rpWords")}</th>
              <th className="py-2 px-1 sm:px-1.5 text-right hidden sm:table-cell print:table-cell">{t("rpQuestions")}</th>
              <th className="py-2 px-1 sm:px-1.5 text-right">{t("rpPlanned")}</th>
              <th className="py-2 px-1 sm:px-1.5 text-right">{t("rpActual")}</th>
              <th className="py-2 px-1 sm:px-1.5 text-right">{t("rpDifference")}</th>
              <th className="py-2 px-1 sm:px-1.5 text-right" title={t("rpComments")}>✋</th>
            </tr>
          </thead>
          <tbody>
            {segs.map((sg, i) => {
              const d = (sg.actual || 0) - (sg.estimated || 0);
              // La conclusión puede usar el tiempo sobrante: solo se marca si pasa de ese margen
              const shade = sg.kind === "conclusion" ? (sg.actual || 0) - (sg.estimated || 0) - Math.max(0, sg.extraTime || 0) : d;
              return (
                <tr key={i} className={`border-b border-slate-100 ${rowClass(shade)}`} data-testid={`report-row-${sg.kind}`}>
                  <td className="py-1.5 px-1 sm:px-1.5 tabular-nums text-slate-500">{clock(sg.start)}</td>
                  <td className="py-1.5 px-1 sm:px-1.5 font-semibold text-slate-800">
                    {segLabel(sg)}
                    {sg.extras ? (
                      <span className="block text-[11px] font-normal text-blue-700" data-testid="report-extras">{extrasLine(sg.extras)}</span>
                    ) : null}
                    {sg.kind === "conclusion" && sg.extraTime > 30 ? (
                      <span className="block text-[11px] font-normal text-slate-500">{t("rpConclusionExtra", { t: mmss(sg.extraTime) })}</span>
                    ) : null}
                  </td>
                  <td className="py-1.5 px-1 sm:px-1.5 text-right tabular-nums text-slate-600 hidden sm:table-cell print:table-cell">{sg.words ?? ""}</td>
                  <td className="py-1.5 px-1 sm:px-1.5 text-right tabular-nums text-slate-600 hidden sm:table-cell print:table-cell">{sg.questions ?? ""}</td>
                  <td className="py-1.5 px-1 sm:px-1.5 text-right tabular-nums">{mmss(sg.estimated)}</td>
                  <td className="py-1.5 px-1 sm:px-1.5 text-right tabular-nums font-semibold">{mmss(sg.actual)}</td>
                  <td className={`py-1.5 px-1 sm:px-1.5 text-right tabular-nums font-bold ${diffClass(d)}`}>{diffText(d)}</td>
                  <td className="py-1.5 px-1 sm:px-1.5 text-right tabular-nums">{sg.comments ? sg.comments : ""}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-slate-300 font-bold">
              <td className="py-2 px-1 sm:px-1.5" />
              <td className="py-2 px-1 sm:px-1.5">{t("rpTotal")}</td>
              <td className="py-2 px-1 sm:px-1.5 hidden sm:table-cell print:table-cell" colSpan={2} />
              <td className="py-2 px-1 sm:px-1.5 text-right tabular-nums">{mmss(totalPlanned)}</td>
              <td className="py-2 px-1 sm:px-1.5 text-right tabular-nums">{mmss(totalActual)}</td>
              <td className={`py-2 px-1 sm:px-1.5 text-right tabular-nums ${diffClass(totalActual - totalPlanned)}`}>{diffText(totalActual - totalPlanned)}</td>
              <td className="py-2 px-1 sm:px-1.5 text-right tabular-nums">{report.totalComments || ""}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="mt-3 text-xs text-slate-500">
        <span className="inline-block w-3 h-3 rounded-sm bg-emerald-100 border border-emerald-300 align-middle mr-1" /> {t("rpFaster")}
        <span className="inline-block w-3 h-3 rounded-sm bg-red-100 border border-red-300 align-middle ml-4 mr-1" /> {t("rpSlower")}
        <span className="ml-4">✋ = {t("rpComments")}</span>
      </p>
      <p className="mt-4 pt-2 border-t border-slate-200 text-[11px] text-slate-400">{t("rpGenerated")}</p>
    </article>
  );
}

export default function ReportPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [version, setVersion] = useState(0);
  const history = useMemo(() => loadHistory(), [version]); // eslint-disable-line react-hooks/exhaustive-deps
  const id = params.get("id");
  const report = id ? history.find((r) => r.id === id) : history[0];
  const [confirmId, setConfirmId] = useState(null);

  const remove = (rid) => {
    if (confirmId !== rid) { setConfirmId(rid); return; }
    deleteReport(rid);
    setConfirmId(null);
    setVersion((v) => v + 1);
    if (rid === report?.id) navigate("/informe", { replace: true });
  };

  return (
    <div className="min-h-screen bg-stone-100 py-4 sm:py-8 px-3 sm:px-6" data-testid="report-page">
      <style>{`@media print { .no-print { display: none !important; } body, .min-h-screen { background: #fff !important; } .rp-sheet { border: 0 !important; box-shadow: none !important; padding: 0 !important; } @page { size: A4; margin: 10mm; } .rp-sheet section, .rp-sheet h2 { margin-top: 10px !important; } .rp-sheet td { padding-top: 3px !important; padding-bottom: 3px !important; } tr { break-inside: avoid; } }`}</style>
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="no-print flex flex-wrap items-center gap-2">
          <a href="/" className="inline-flex items-center gap-1.5 rounded-xl px-3.5 h-10 border border-slate-300 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50" data-testid="report-back">
            <ArrowLeft className="w-4 h-4" /> {t("rpBackToApp")}
          </a>
          {report && (
            <button onClick={() => window.print()} className="inline-flex items-center gap-1.5 rounded-xl px-4 h-10 bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold" data-testid="report-print">
              <Printer className="w-4 h-4" /> {t("rpPrint")}
            </button>
          )}
        </div>

        {report ? <Report report={report} /> : (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-600" data-testid="report-empty">
            <ClipboardList className="w-10 h-10 mx-auto text-slate-300 mb-3" />
            {t("rpNoReports")}
          </div>
        )}

        {history.length > 0 && (
          <section className="no-print bg-white rounded-2xl border border-slate-200 p-4 sm:p-6" data-testid="report-history-list">
            <h2 className="font-heading text-lg font-bold text-slate-900 flex items-center gap-2"><History className="w-5 h-5 text-orange-500" /> {t("studyHistory")}</h2>
            <p className="text-xs text-slate-500 mb-3">{t("rpOnDevice")}</p>
            <ul className="divide-y divide-slate-100">
              {history.map((r) => {
                const active = r.id === report?.id;
                const dur = Math.round((r.endedAt - r.startedAt) / 1000);
                return (
                  <li key={r.id} className={`flex items-center gap-3 py-2.5 ${active ? "bg-orange-50 -mx-2 px-2 rounded-lg" : ""}`}>
                    <a href={reportUrl(r.id)} onClick={(e) => { e.preventDefault(); navigate(reportUrl(r.id)); window.scrollTo(0, 0); }} className="flex-1 min-w-0" data-testid="report-history-item">
                      <p className="text-sm font-semibold text-slate-800 truncate">{r.titleLine || r.articleLine}</p>
                      <p className="text-xs text-slate-500 flex flex-wrap gap-x-3">
                        <span>{shortDate(r.startedAt)}</span>
                        <span className="inline-flex items-center gap-1"><Clock className="w-3 h-3" />{clock(r.startedAt)}–{clock(r.endedAt)} · {mmss(dur)}</span>
                        <span className="inline-flex items-center gap-1"><MessageCircle className="w-3 h-3" />{r.totalComments || 0}</span>
                      </p>
                    </a>
                    <button onClick={() => remove(r.id)} className={`shrink-0 inline-flex items-center gap-1 rounded-lg px-2 h-8 text-xs font-semibold ${confirmId === r.id ? "bg-red-600 text-white" : "text-slate-400 hover:text-red-600"}`} title={t("rpDelete")} data-testid="report-delete">
                      <Trash2 className="w-4 h-4" />{confirmId === r.id ? t("rpDeleteConfirm") : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
