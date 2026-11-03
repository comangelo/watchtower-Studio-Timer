import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { t, currentLanguage, currentPtVariant, setPtVariant } from "@/i18n";

/**
 * Al elegir portugués, la app pregunta una vez: ¿Portugal o Brasil?
 * Decide qué edición de La Atalaya se busca en jw.org (TPO o T) y el formato de fechas.
 */
export function PtVariantDialog({ darkMode = false }) {
  const open = currentLanguage() === "pt" && !currentPtVariant();
  const options = [
    { v: "PT", label: t("ptPortugal") },
    { v: "BR", label: t("ptBrazil") },
  ];
  return (
    <Dialog open={open}>
      <DialogContent
        className={`max-w-sm rounded-2xl [&>button]:hidden ${darkMode ? "bg-zinc-800 border-zinc-700 text-zinc-100" : ""}`}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
        data-testid="pt-variant-dialog"
      >
        <DialogHeader>
          <DialogTitle>{t("ptVariantTitle")}</DialogTitle>
          <DialogDescription className={darkMode ? "text-zinc-400" : ""}>{t("ptVariantHint")}</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 pt-2">
          {options.map((o) => (
            <button
              key={o.v}
              type="button"
              onClick={() => setPtVariant(o.v)}
              className={`rounded-xl py-4 flex items-center justify-center text-lg font-bold border-2 transition-colors ${
                darkMode ? "border-zinc-600 hover:border-orange-500 bg-zinc-700/50" : "border-slate-200 hover:border-orange-500 bg-slate-50"
              }`}
              data-testid={`pt-variant-${o.v}`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
