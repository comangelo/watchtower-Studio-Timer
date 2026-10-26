import { Briefcase } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";

/**
 * Interruptor "Visita del superintendente de circuito":
 * estudio de 30 minutos sin leer los párrafos (todo lo demás igual).
 */
export function CircuitVisitToggle({ enabled, onChange, minutes = 30, disabled = false, darkMode = false }) {
  return (
    <Card
      className={`border shadow-sm overflow-hidden transition-colors ${
        enabled
          ? darkMode
            ? "bg-indigo-950/60 border-indigo-500"
            : "bg-indigo-50 border-indigo-300"
          : darkMode
            ? "bg-zinc-800 border-zinc-600"
            : "bg-white border-slate-200"
      }`}
      data-testid="circuit-visit-toggle"
    >
      <CardContent className="p-4">
        <label className={`flex items-start gap-3 ${disabled ? "cursor-not-allowed" : "cursor-pointer"}`}>
          <div
            className={`w-9 h-9 shrink-0 rounded-lg flex items-center justify-center ${
              enabled
                ? "bg-indigo-600 text-white"
                : darkMode
                  ? "bg-zinc-700 text-zinc-300"
                  : "bg-slate-100 text-slate-500"
            }`}
          >
            <Briefcase className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className={`font-semibold text-sm ${darkMode ? "text-zinc-100" : "text-slate-800"}`}>
              Visita del superintendente de circuito
            </p>
            <p className={`text-xs mt-0.5 ${darkMode ? "text-zinc-400" : "text-slate-500"}`}>
              {enabled
                ? `Activado: estudio de ${minutes} minutos sin leer los párrafos. Preguntas, textos, imágenes y repaso igual.`
                : `Estudio de ${minutes} minutos sin leer los párrafos.`}
            </p>
            {disabled && (
              <p className={`text-xs mt-1 font-medium ${darkMode ? "text-amber-300" : "text-amber-700"}`}>
                No se puede cambiar con el estudio en marcha.
              </p>
            )}
          </div>
          <Switch
            checked={!!enabled}
            onCheckedChange={(v) => onChange(!!v)}
            disabled={disabled}
            className="mt-1 data-[state=checked]:bg-indigo-600"
            data-testid="circuit-visit-switch"
          />
        </label>
      </CardContent>
    </Card>
  );
}
