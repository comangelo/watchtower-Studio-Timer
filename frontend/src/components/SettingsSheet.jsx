import { createContext, useContext } from "react";
import {
  Settings, Timer, Mic, Sparkles, Clock, MessageCircleQuestion, MessagesSquare,
  Bell, Volume2, Vibrate, MonitorPlay, Sun, Moon, Check, BookOpen, Palette,
} from "lucide-react";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { LAYOUTS } from "@/components/PresentationMode";
import { darkThemes } from "@/utils/darkThemes";

const ThemeCtx = createContext({});

function Section({ children, testid }) {
  const c = useContext(ThemeCtx);
  return (
  <div className={`rounded-2xl border p-4 space-y-4 ${c.card}`} data-testid={testid}>{children}</div>
  );
}

function Row({ icon: Icon, color = "text-orange-500", label, hint, value, valueColor = "text-orange-500" }) {
  const c = useContext(ThemeCtx);
  return (
  <div className="flex items-start justify-between gap-3">
    <div className="flex items-start gap-2 min-w-0">
      <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${color}`} />
      <div className="min-w-0">
        <p className={`text-sm font-semibold ${c.text}`}>{label}</p>
        {hint && <p className={`text-xs ${c.muted}`}>{hint}</p>}
      </div>
    </div>
    {value != null && <span className={`text-base font-bold tabular-nums shrink-0 ${valueColor}`}>{value}</span>}
  </div>
  );
}

function Range({ value, onChange, min, max, step, left, right, thumb = "", range = "[&>span>span]:bg-orange-500", testid }) {
  const c = useContext(ThemeCtx);
  return (
  <div>
    <Slider value={[value]} onValueChange={(v) => onChange(v[0])} min={min} max={max} step={step}
      className={`w-full ${range} ${c.track || ""} ${thumb}`} data-testid={testid} />
    <div className={`flex justify-between text-[11px] mt-1.5 ${c.subtle}`}><span>{left}</span><span>{right}</span></div>
  </div>
  );
}

function Choice({ options, value, onChange, active = "bg-orange-500 text-white", sub = "text-orange-100", testid }) {
  const c = useContext(ThemeCtx);
  return (
  <div className="flex gap-2">
    {options.map((o) => {
      const on = value === o.value;
      return (
        <button key={o.value} onClick={() => onChange(o.value)}
          className={`flex-1 rounded-xl py-2.5 px-1 text-center transition-all ${on ? `${active} shadow-md` : c.chip}`}
          data-testid={`${testid}-${o.value}`}>
          <span className="block text-sm font-semibold">{o.label}</span>
          {o.description && <span className={`block text-[11px] mt-0.5 ${on ? sub : c.subtle}`}>{o.description}</span>}
        </button>
      );
    })}
  </div>
  );
}

function Toggle({ icon: Icon, label, hint, checked, onChange, testid, color = "text-green-500" }) {
  const c = useContext(ThemeCtx);
  return (
  <label className="flex items-center justify-between gap-3 cursor-pointer">
    <span className="flex items-start gap-2 min-w-0">
      <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${checked ? color : c.subtle}`} />
      <span className="min-w-0">
        <span className={`block text-sm font-semibold ${c.text}`}>{label}</span>
        {hint && <span className={`block text-xs ${c.muted}`}>{hint}</span>}
      </span>
    </span>
    <Switch checked={!!checked} onCheckedChange={(v) => onChange(!!v)} data-testid={testid} />
  </label>
  );
}

function AlertInput({ label, field, max, testid, alertTimes, setAlertTimes }) {
  const c = useContext(ThemeCtx);
  return (
  <div className="flex items-center gap-2">
    <span className={`text-sm w-20 ${c.text}`}>{label}</span>
    <input type="number" min="0" max={max} placeholder="–" inputMode="numeric"
      value={alertTimes?.[field] || ""}
      onChange={(e) => setAlertTimes((prev) => ({ ...prev, [field]: e.target.value === "" ? 0 : parseInt(e.target.value) || 0 }))}
      className={`w-16 h-9 rounded-lg border px-2 text-sm ${c.input}`} data-testid={testid} />
    <span className={`text-xs ${c.muted}`}>min antes</span>
  </div>
  );
}


export const SETTINGS_TABS = [
  { id: "tiempo", label: "Tiempo", icon: Timer },
  { id: "lectura", label: "Lectura", icon: BookOpen },
  { id: "avisos", label: "Avisos", icon: Bell },
  { id: "pantalla", label: "Pantalla", icon: MonitorPlay },
];

const SPEEDS = [
  { value: 150, label: "Lento", description: "150 PPM" },
  { value: 180, label: "Normal", description: "180 PPM" },
  { value: 210, label: "Rápido", description: "210 PPM" },
];

const LONG_PARAGRAPH = [
  { value: 0, label: "Sin extra", description: "Solo preguntas" },
  { value: 1, label: "Normal", description: "Recomendado" },
  { value: 1.5, label: "Más", description: "Muchos comentarios" },
];

export const speedLabel = (v) => SPEEDS.find((s) => s.value === v)?.label || `${v} PPM`;

/**
 * Todos los ajustes en un solo panel lateral, con pestañas
 * Tiempo · Lectura · Avisos · Pantalla.
 */
export function SettingsSheet({
  open,
  onOpenChange,
  tab = "tiempo",
  onTabChange,
  hasStarted = false,
  // Tiempo
  totalDuration, setTotalDuration,
  introductionDuration, setIntroductionDuration,
  closingWordsDuration, setClosingWordsDuration,
  circuitVisitMode, setCircuitVisitMode, circuitVisitMinutes,
  // Lectura
  readingSpeed, setReadingSpeed,
  answerTime, setAnswerTime,
  longParagraphWeight, setLongParagraphWeight,
  // Avisos
  soundEnabled, setSoundEnabled,
  vibrationEnabled, setVibrationEnabled,
  overtimeAlertEnabled, setOvertimeAlertEnabled,
  fiveMinuteWarningEnabled, setFiveMinuteWarningEnabled,
  alertTimes, setAlertTimes,
  onTestSound, onTestVibration,
  // Pantalla
  darkMode, setDarkMode,
  darkTheme, setDarkTheme,
  presentationLayout, setPresentationLayout,
}) {
  const c = darkMode
    ? {
        sheet: "bg-zinc-900 border-zinc-700 text-zinc-100",
        card: "bg-zinc-800 border-zinc-700",
        text: "text-zinc-100",
        muted: "text-zinc-400",
        subtle: "text-zinc-500",
        chip: "bg-zinc-700 text-zinc-300 hover:bg-zinc-600",
        tabs: "bg-zinc-800",
        tabOff: "text-zinc-400 hover:text-zinc-200",
        tabOn: "bg-zinc-600 text-white shadow",
        input: "bg-zinc-700 border-zinc-600 text-zinc-100",
        btn: "border-zinc-600 text-zinc-200 hover:bg-zinc-700",
        track: "[&>span]:bg-zinc-700 [&_[role=slider]]:border-zinc-300",
      }
    : {
        sheet: "bg-stone-50 border-slate-200 text-slate-900",
        card: "bg-white border-slate-200",
        text: "text-slate-800",
        muted: "text-slate-500",
        subtle: "text-slate-400",
        chip: "bg-slate-100 text-slate-600 hover:bg-slate-200",
        tabs: "bg-slate-200/70",
        tabOff: "text-slate-500 hover:text-slate-800",
        tabOn: "bg-white text-slate-900 shadow",
        input: "bg-white border-slate-300 text-slate-900",
        btn: "border-slate-300 text-slate-700 hover:bg-slate-100",
      };

  return (
    <ThemeCtx.Provider value={c}>
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right"
        className={`w-full sm:max-w-md p-0 flex flex-col gap-0 ${c.sheet} [&>button]:text-current [&>button]:opacity-80 [&>button]:top-5`}
        data-testid="settings-sheet">
        <div className="px-5 pt-5 pb-3">
          <SheetTitle className={`flex items-center gap-2 text-lg font-bold ${c.text}`}>
            <Settings className="w-5 h-5 text-orange-500" /> Ajustes
          </SheetTitle>
          <SheetDescription className={`text-xs ${c.muted}`}>Se guardan en este dispositivo.</SheetDescription>
          <div className={`mt-4 grid grid-cols-4 gap-1 rounded-xl p-1 ${c.tabs}`} role="tablist">
            {SETTINGS_TABS.map((t) => {
              const Icon = t.icon;
              const on = tab === t.id;
              return (
                <button key={t.id} role="tab" aria-selected={on} onClick={() => onTabChange?.(t.id)}
                  className={`rounded-lg py-2 flex flex-col items-center gap-0.5 text-xs font-semibold transition-colors ${on ? c.tabOn : c.tabOff}`}
                  data-testid={`settings-tab-${t.id}`}>
                  <Icon className="w-4 h-4" />{t.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-8 space-y-4">
          {tab === "tiempo" && (
            <>
              <Section testid="settings-section-tiempo">
                <Row icon={Timer} label="Duración del estudio" value={`${totalDuration} min`}
                  hint={circuitVisitMode ? "Visita del superintendente de circuito" : null} />
                <Range value={totalDuration} onChange={setTotalDuration} min={0} max={60} step={1} left="0" right="60 min" testid="duration-slider" />
              </Section>
              <Section>
                <Row icon={Mic} color="text-blue-500" label="Introducción" value={`${introductionDuration} s`} valueColor="text-blue-500" />
                <Range value={introductionDuration} onChange={setIntroductionDuration} min={30} max={180} step={10}
                  left="30 s" right="3 min" thumb="[&_[role=slider]]:bg-blue-500" range="[&>span>span]:bg-blue-500" testid="introduction-time-slider" />
                <Row icon={Sparkles} color="text-purple-500" label="Conclusión" value={`${closingWordsDuration} s`} valueColor="text-purple-500" />
                <Range value={closingWordsDuration} onChange={setClosingWordsDuration} min={30} max={180} step={10}
                  left="30 s" right="3 min" thumb="[&_[role=slider]]:bg-purple-500" range="[&>span>span]:bg-purple-500" testid="closing-time-slider" />
              </Section>
              {setCircuitVisitMode && (
                <Section>
                  <label className={`flex items-center justify-between gap-3 ${hasStarted ? "opacity-60" : "cursor-pointer"}`}>
                    <span className="min-w-0">
                      <span className={`block text-sm font-semibold ${c.text}`}>Visita del superintendente de circuito</span>
                      <span className={`block text-xs ${c.muted}`}>
                        {hasStarted ? "No se puede cambiar con el estudio en marcha." : `Estudio de ${circuitVisitMinutes} min sin leer los párrafos.`}
                      </span>
                    </span>
                    <Switch checked={!!circuitVisitMode} onCheckedChange={(v) => setCircuitVisitMode(!!v)} disabled={hasStarted}
                      className="data-[state=checked]:bg-indigo-600" data-testid="settings-circuit-switch" />
                  </label>
                </Section>
              )}
            </>
          )}

          {tab === "lectura" && (
            <>
              <Section testid="settings-section-lectura">
                <Row icon={Clock} label="Velocidad de lectura" hint="Cuánto tarda el lector en leer un párrafo." />
                <Choice options={SPEEDS} value={readingSpeed} onChange={setReadingSpeed} testid="speed" />
              </Section>
              <Section>
                <Row icon={MessageCircleQuestion} label="Tiempo por respuesta" value={`${answerTime} s`}
                  hint="Tiempo previsto para cada pregunta." />
                <Range value={answerTime} onChange={setAnswerTime} min={15} max={90} step={5} left="15 s" right="90 s" testid="answer-time-slider" />
              </Section>
              <Section>
                <Row icon={MessagesSquare} color="text-emerald-500" label="Párrafos largos o agrupados"
                  hint="Tiempo extra para más comentarios." />
                <Choice options={LONG_PARAGRAPH} value={longParagraphWeight} onChange={setLongParagraphWeight}
                  active="bg-emerald-500 text-white" sub="text-emerald-100" testid="long-paragraph" />
              </Section>
              {hasStarted && (
                <p className={`text-xs px-1 ${c.muted}`}>Con el estudio en marcha, la velocidad y la respuesta se aplican al siguiente estudio.</p>
              )}
            </>
          )}

          {tab === "avisos" && (
            <>
              <Section testid="settings-section-avisos">
                <Toggle icon={Volume2} label="Sonido" checked={soundEnabled} onChange={setSoundEnabled} testid="sound-toggle" />
                <Toggle icon={Vibrate} label="Vibración" checked={vibrationEnabled} onChange={setVibrationEnabled} testid="vibration-toggle" />
                <div className="flex gap-2">
                  <button onClick={onTestSound} disabled={!soundEnabled}
                    className={`flex-1 h-9 rounded-lg border text-xs font-semibold disabled:opacity-40 ${c.btn}`} data-testid="test-sound-btn">Probar sonido</button>
                  <button onClick={onTestVibration} disabled={!vibrationEnabled}
                    className={`flex-1 h-9 rounded-lg border text-xs font-semibold disabled:opacity-40 ${c.btn}`} data-testid="test-vibration-btn">Probar vibración</button>
                </div>
              </Section>
              <Section>
                <Toggle icon={Timer} color="text-orange-500" label="Párrafo excedido" hint="Avisa si un párrafo pasa de su tiempo."
                  checked={overtimeAlertEnabled} onChange={setOvertimeAlertEnabled} testid="overtime-alert-toggle" />
                <Toggle icon={Timer} color="text-red-500" label="Faltan 5 minutos" hint="Avisa 5 min antes de la hora de fin."
                  checked={fiveMinuteWarningEnabled} onChange={setFiveMinuteWarningEnabled} testid="five-minute-warning-toggle" />
              </Section>
              <Section>
                <Row icon={Bell} label="Aviso antes del repaso" hint="Minutos antes de las preguntas de repaso (vacío = sin aviso)." />
                <AlertInput label="1.er aviso" field="firstAlert" max={30} alertTimes={alertTimes} setAlertTimes={setAlertTimes} testid="first-alert-input" />
                <AlertInput label="2.º aviso" field="secondAlert" max={10} alertTimes={alertTimes} setAlertTimes={setAlertTimes} testid="second-alert-input" />
              </Section>
            </>
          )}

          {tab === "pantalla" && (
            <>
              <Section testid="settings-section-pantalla">
                <Row icon={darkMode ? Moon : Sun} color={darkMode ? "text-yellow-400" : "text-orange-500"} label="Tema" />
                <div className="flex gap-2">
                  {[{ v: false, label: "Claro", Icon: Sun }, { v: true, label: "Oscuro", Icon: Moon }].map(({ v, label, Icon }) => (
                    <button key={label} onClick={() => setDarkMode(v)}
                      className={`flex-1 rounded-xl py-2.5 flex items-center justify-center gap-2 text-sm font-semibold ${darkMode === v ? "bg-orange-500 text-white shadow-md" : c.chip}`}
                      data-testid={`theme-${v ? "dark" : "light"}`}>
                      <Icon className="w-4 h-4" />{label}
                    </button>
                  ))}
                </div>
                {darkMode && (
                  <div className="space-y-1.5" data-testid="dark-variants">
                    <p className={`text-xs flex items-center gap-1 ${c.muted}`}><Palette className="w-3 h-3" /> Variante oscura</p>
                    {Object.entries(darkThemes).map(([key, th]) => (
                      <button key={key} onClick={() => setDarkTheme(key)}
                        className={`w-full flex items-center gap-3 rounded-xl px-3 py-2 text-left ${darkTheme === key ? "ring-2 ring-orange-500" : ""} ${c.chip}`}>
                        <span className="w-5 h-5 rounded-full border-2 shrink-0" style={{ backgroundColor: th.colors.panel, borderColor: th.colors.border }} />
                        <span className="flex-1 min-w-0">
                          <span className="block text-sm font-semibold">{th.name}</span>
                          <span className={`block text-[11px] ${c.subtle}`}>{th.description}</span>
                        </span>
                        {darkTheme === key && <Check className="w-4 h-4 text-orange-500" />}
                      </button>
                    ))}
                  </div>
                )}
              </Section>
              <Section>
                <Row icon={MonitorPlay} label="Diseño del modo presentación" hint="También se cambia durante el estudio, arriba a la derecha." />
                <Choice options={LAYOUTS.map((l) => ({ value: l.id, label: l.name, description: l.description }))}
                  value={presentationLayout} onChange={setPresentationLayout} testid="layout-option" />
              </Section>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
    </ThemeCtx.Provider>
  );
}
