import { Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { t, currentLanguage } from "@/i18n";
import { dayMonth } from "@/i18n/dates";
import { latestRelease, releaseItems } from "@/utils/whatsNew";

/** Ventana «Novedades de esta versión». */
export function WhatsNewDialog({ open, onClose, darkMode }) {
  const rel = latestRelease();
  if (!rel) return null;
  const items = releaseItems(rel, currentLanguage());
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className={`max-w-[92vw] sm:max-w-md rounded-2xl ${darkMode ? "bg-zinc-900 border-zinc-700 text-zinc-100" : "bg-white text-slate-900"}`} data-testid="whats-new-dialog">
        <DialogTitle className="flex items-center gap-2 text-lg font-bold">
          <span className="w-8 h-8 rounded-lg bg-brand-500 text-white flex items-center justify-center"><Sparkles className="w-4 h-4" /></span>
          {t("whatsNewTitle")}
        </DialogTitle>
        <DialogDescription className={`text-xs ${darkMode ? "text-zinc-400" : "text-slate-500"}`}>
          {dayMonth(new Date(`${rel.id}T12:00:00`), true)}
        </DialogDescription>
        <ul className="space-y-2.5 mt-1">
          {items.map((it, i) => (
            <li key={i} className={`flex gap-2.5 text-sm leading-snug ${darkMode ? "text-zinc-200" : "text-slate-700"}`}>
              <span className="mt-1.5 w-2 h-2 rounded-full bg-brand-500 shrink-0" />
              <span>{it}</span>
            </li>
          ))}
        </ul>
        <button onClick={onClose} className="mt-3 w-full h-11 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold outline-none focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-300" data-testid="whats-new-ok">
          {t("whatsNewOk")}
        </button>
      </DialogContent>
    </Dialog>
  );
}
