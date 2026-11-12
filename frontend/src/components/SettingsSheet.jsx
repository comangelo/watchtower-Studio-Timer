import { createContext, useContext } from "react";
import {
  Settings, Timer, Mic, Sparkles, Clock, MessageCircleQuestion, MessagesSquare,
  Bell, Volume2, Vibrate, MonitorPlay, Sun, Moon, Check, BookOpen, Palette, Languages, ArrowRight,
} from "lucide-react";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { LAYOUTS } from "@/components/PresentationMode";
import { darkThemes, lightThemes } from "@/utils/darkThemes";
import { t, LANGUAGES, currentLanguage, setLanguage, currentPtVariant, setPtVariant } from "@/i18n";
import { manualUrl } from "@/utils/manual";

const ThemeCtx = createContext({});

function Section({ children, testid }) {
  const c = useContext(ThemeCtx);
  return (
  <div className={`rounded-2xl border p-4 space-y-4 ${c.card}`} data-testid={testid}>{children}</div>
  );
}

function Row({ icon: Icon, color = "text-brand-500", label, hint, value, valueColor = "text-brand-500" }) {
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

function Range({ value, onChange, min, max, step, left, right, thumb = "", range = "[&>span>span]:bg-brand-500", testid }) {
  const c = useContext(ThemeCtx);
  return (
  <div>
    <Slider value={[value]} onValueChange={(v) => onChange(v[0])} min={min} max={max} step={step}
      className={`w-full ${range} ${c.track || ""} ${thumb}`} data-testid={testid} />
    <div className={`flex justify-between text-[11px] mt-1.5 ${c.subtle}`}><span>{left}</span><span>{right}</span></div>
  </div>
  );
}

function Choice({ options, value, onChange, active = "bg-brand-500 text-white", sub = "text-brand-100", testid }) {
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
    <span className={`text-xs ${c.muted}`}>{t("minBefore")}</span>
  </div>
  );
}


export const SETTINGS_TABS = [
  { id: "tiempo", label: "tabTime", icon: Timer },
  { id: "lectura", label: "tabReading", icon: BookOpen },
  { id: "avisos", label: "tabAlerts", icon: Bell },
  { id: "pantalla", label: "tabDisplay", icon: MonitorPlay },
];

const SPEEDS = [
  { value: 150, label: "speedSlow", description: "150 PPM" },
  { value: 180, label: "speedNormal", description: "180 PPM" },
  { value: 210, label: "speedFast", description: "210 PPM" },
];

const LONG_PARAGRAPH = [
  { value: 0, label: "extraNone", description: "extraNoneDesc" },
  { value: 1, label: "speedNormal", description: "extraNormalDesc" },
  { value: 1.5, label: "extraMore", description: "extraMoreDesc" },
];

export const speedLabel = (v) => { const s = SPEEDS.find((x) => x.value === v); return s ? t(s.label) : `${v} PPM`; };

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
  nextButtonAlertEnabled, setNextButtonAlertEnabled,
  fiveMinuteWarningEnabled, setFiveMinuteWarningEnabled,
  alertTimes, setAlertTimes,
  onTestSound, onTestVibration,
  // Pantalla
  darkMode, setDarkMode,
  darkTheme, setDarkTheme,
  lightTheme, setLightTheme,
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
            <Settings className="w-5 h-5 text-brand-500" /> {t("settings")}
          </SheetTitle>
          <SheetDescription className={`text-xs ${c.muted}`}>{t("settingsSavedHere")}</SheetDescription>
          <a href={manualUrl()} target="_blank" rel="noopener"
            className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-500 hover:text-brand-600"
            data-testid="settings-manual-link">
            <BookOpen className="w-4 h-4" /> {t("userManual")}
          </a>
          <div className={`mt-4 grid grid-cols-4 gap-1 rounded-xl p-1 ${c.tabs}`} role="tablist">
            {SETTINGS_TABS.map((tb) => {
              const Icon = tb.icon;
              const on = tab === tb.id;
              return (
                <button key={tb.id} role="tab" aria-selected={on} onClick={() => onTabChange?.(tb.id)}
                  className={`rounded-lg py-2 flex flex-col items-center gap-0.5 text-xs font-semibold transition-colors ${on ? c.tabOn : c.tabOff}`}
                  data-testid={`settings-tab-${tb.id}`}>
                  <Icon className="w-4 h-4" />{t(tb.label)}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-8 space-y-4">
          {tab === "tiempo" && (
            <>
              <Section testid="settings-section-tiempo">
                <Row icon={Timer} label={t("studyDuration")} value={`${totalDuration} min`}
                  hint={circuitVisitMode ? t("circuitVisit") : null} />
                <Range value={totalDuration} onChange={setTotalDuration} min={0} max={60} step={1} left="0" right="60 min" testid="duration-slider" />
              </Section>
              <Section>
                <Row icon={Mic} color="text-blue-500" label={t("introduction")} value={`${introductionDuration} s`} valueColor="text-blue-500" />
                <Range value={introductionDuration} onChange={setIntroductionDuration} min={30} max={180} step={10}
                  left="30 s" right="3 min" thumb="[&_[role=slider]]:bg-blue-500" range="[&>span>span]:bg-blue-500" testid="introduction-time-slider" />
                <Row icon={Sparkles} color="text-purple-500" label={t("conclusion")} value={`${closingWordsDuration} s`} valueColor="text-purple-500" />
                <Range value={closingWordsDuration} onChange={setClosingWordsDuration} min={30} max={180} step={10}
                  left="30 s" right="3 min" thumb="[&_[role=slider]]:bg-purple-500" range="[&>span>span]:bg-purple-500" testid="closing-time-slider" />
              </Section>
              {setCircuitVisitMode && (
                <Section>
                  <label className={`flex items-center justify-between gap-3 ${hasStarted ? "opacity-60" : "cursor-pointer"}`}>
                    <span className="min-w-0">
                      <span className={`block text-sm font-semibold ${c.text}`}>{t("circuitVisit")}</span>
                      <span className={`block text-xs ${c.muted}`}>
                        {hasStarted ? t("cannotChangeRunning") : t("circuitOff", { n: circuitVisitMinutes })}
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
                <Row icon={Clock} label={t("readingSpeed")} hint={t("readingSpeedHint")} />
                <Choice options={SPEEDS.map((o) => ({ ...o, label: t(o.label) }))} value={readingSpeed} onChange={setReadingSpeed} testid="speed" />
              </Section>
              <Section>
                <Row icon={MessageCircleQuestion} label={t("answerTime")} value={`${answerTime} s`}
                  hint={t("answerTimeHint")} />
                <Range value={answerTime} onChange={setAnswerTime} min={30} max={90} step={5} left="30 s" right="90 s" testid="answer-time-slider" />
              </Section>
              <Section>
                <Row icon={MessagesSquare} color="text-emerald-500" label={t("longParagraphs")}
                  hint={t("longParagraphsHint")} />
                <Choice options={LONG_PARAGRAPH.map((o) => ({ ...o, label: t(o.label), description: t(o.description) }))} value={longParagraphWeight} onChange={setLongParagraphWeight}
                  active="bg-emerald-500 text-white" sub="text-emerald-100" testid="long-paragraph" />
              </Section>
              {hasStarted && (
                <p className={`text-xs px-1 ${c.muted}`}>{t("appliesNextStudy")}</p>
              )}
            </>
          )}

          {tab === "avisos" && (
            <>
              <Section testid="settings-section-avisos">
                <Toggle icon={Volume2} label={t("sound")} checked={soundEnabled} onChange={setSoundEnabled} testid="sound-toggle" />
                <Toggle icon={Vibrate} label={t("vibration")} checked={vibrationEnabled} onChange={setVibrationEnabled} testid="vibration-toggle" />
                <div className="flex gap-2">
                  <button onClick={onTestSound} disabled={!soundEnabled}
                    className={`flex-1 h-9 rounded-lg border text-xs font-semibold disabled:opacity-40 ${c.btn}`} data-testid="test-sound-btn">{t("testSound")}</button>
                  <button onClick={onTestVibration} disabled={!vibrationEnabled}
                    className={`flex-1 h-9 rounded-lg border text-xs font-semibold disabled:opacity-40 ${c.btn}`} data-testid="test-vibration-btn">{t("testVibration")}</button>
                </div>
              </Section>
              <Section>
                <Toggle icon={Timer} color="text-brand-500" label={t("alertParagraphOver")} hint={t("alertParagraphOverHint")}
                  checked={overtimeAlertEnabled} onChange={setOvertimeAlertEnabled} testid="overtime-alert-toggle" />
                {setNextButtonAlertEnabled && (
                  <Toggle icon={ArrowRight} color="text-red-500" label={t("alertNextButton")} hint={t("alertNextButtonHint")}
                    checked={nextButtonAlertEnabled} onChange={setNextButtonAlertEnabled} testid="next-button-alert-toggle" />
                )}
                <Toggle icon={Timer} color="text-red-500" label={t("alertFiveMin")} hint={t("alertFiveMinHint")}
                  checked={fiveMinuteWarningEnabled} onChange={setFiveMinuteWarningEnabled} testid="five-minute-warning-toggle" />
              </Section>
              <Section>
                <Row icon={Bell} label={t("alertBeforeReview")} hint={t("alertBeforeReviewHint")} />
                <AlertInput label={t("firstAlert")} field="firstAlert" max={30} alertTimes={alertTimes} setAlertTimes={setAlertTimes} testid="first-alert-input" />
                <AlertInput label={t("secondAlert")} field="secondAlert" max={10} alertTimes={alertTimes} setAlertTimes={setAlertTimes} testid="second-alert-input" />
              </Section>
            </>
          )}

          {tab === "pantalla" && (
            <>
              <Section testid="settings-section-idioma">
                <Row icon={Languages} label={t("language")} />
                <div className="grid grid-cols-2 gap-2">
                  {LANGUAGES.map((l) => {
                    const on = currentLanguage() === l.code;
                    return (
                      <button key={l.code} onClick={() => setLanguage(l.code)}
                        className={`rounded-xl py-2.5 px-3 flex items-center gap-2 text-sm font-semibold ${on ? "bg-brand-500 text-white shadow-md" : c.chip}`}
                        data-testid={`language-${l.code}`}>
                        <span className="text-[11px] font-black opacity-80 w-6">{l.short}</span>{l.name}
                        {on && <Check className="w-4 h-4 ml-auto" />}
                      </button>
                    );
                  })}
                </div>
                {currentLanguage() === "pt" && (
                  <div className="mt-3" data-testid="settings-pt-variant">
                    <p className="text-xs font-semibold mb-2 opacity-70">{t("ptVariantLabel")}</p>
                    <div className="grid grid-cols-2 gap-2">
                      {[{ v: "PT", label: t("ptPortugal") }, { v: "BR", label: t("ptBrazil") }].map(({ v, label }) => {
                        const on = currentPtVariant() === v;
                        return (
                          <button key={v} onClick={() => setPtVariant(v)}
                            className={`rounded-xl py-2 px-3 flex items-center gap-2 text-sm font-semibold ${on ? "bg-brand-500 text-white shadow-md" : c.chip}`}
                            data-testid={`settings-pt-${v}`}>
                            {label}{on && <Check className="w-4 h-4 ml-auto" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </Section>
              <Section testid="settings-section-pantalla">
                <Row icon={darkMode ? Moon : Sun} color={darkMode ? "text-yellow-400" : "text-brand-500"} label={t("theme")} />
                <div className="flex gap-2">
                  {[{ v: false, label: t("light"), Icon: Sun }, { v: true, label: t("dark"), Icon: Moon }].map(({ v, label, Icon }) => (
                    <button key={label} onClick={() => setDarkMode(v)}
                      className={`flex-1 rounded-xl py-2.5 flex items-center justify-center gap-2 text-sm font-semibold ${darkMode === v ? "bg-brand-500 text-white shadow-md" : c.chip}`}
                      data-testid={`theme-${v ? "dark" : "light"}`}>
                      <Icon className="w-4 h-4" />{label}
                    </button>
                  ))}
                </div>
                {!darkMode && (
                  <div className="space-y-1.5" data-testid="light-variants">
                    <p className={`text-xs flex items-center gap-1 ${c.muted}`}><Palette className="w-3 h-3" /> {t("lightVariant")}</p>
                    {Object.entries(lightThemes).map(([key, th]) => (
                      <button key={key} onClick={() => setLightTheme(key)} data-testid={`light-theme-${key}`}
                        className={`w-full flex items-center gap-3 rounded-xl px-3 py-2 text-left border ${lightTheme === key ? "ring-2 ring-brand-500" : ""}`}
                        style={{ backgroundColor: th.colors.panel, borderColor: th.colors.border, color: '#1e293b' }}>
                        <span className="w-5 h-5 rounded-full border-2 shrink-0" style={{ backgroundColor: th.colors.bg, borderColor: th.colors.border }} />
                        <span className="flex-1 min-w-0">
                          <span className="block text-sm font-semibold">{t(`ltheme_${key}`)}</span>
                          <span className="block text-[11px] opacity-70">{t(`ltheme_${key}_desc`)}</span>
                        </span>
                        {lightTheme === key && <Check className="w-4 h-4 text-brand-500" />}
                      </button>
                    ))}
                  </div>
                )}
                {darkMode && (
                  <div className="space-y-1.5" data-testid="dark-variants">
                    <p className={`text-xs flex items-center gap-1 ${c.muted}`}><Palette className="w-3 h-3" /> {t("darkVariant")}</p>
                    {Object.entries(darkThemes).map(([key, th]) => (
                      <button key={key} onClick={() => setDarkTheme(key)}
                        className={`w-full flex items-center gap-3 rounded-xl px-3 py-2 text-left ${darkTheme === key ? "ring-2 ring-brand-500" : ""} ${c.chip}`}>
                        <span className="w-5 h-5 rounded-full border-2 shrink-0" style={{ backgroundColor: th.colors.panel, borderColor: th.colors.border }} />
                        <span className="flex-1 min-w-0">
                          <span className="block text-sm font-semibold">{t(`theme_${key}`)}</span>
                          <span className={`block text-[11px] ${c.subtle}`}>{t(`theme_${key}_desc`)}</span>
                        </span>
                        {darkTheme === key && <Check className="w-4 h-4 text-brand-500" />}
                      </button>
                    ))}
                  </div>
                )}
              </Section>
              <Section>
                <Row icon={MonitorPlay} label={t("presentationLayout")} hint={t("presentationLayoutHint")} />
                <Choice options={LAYOUTS.map((l) => ({ value: l.id, label: t(`layout_${l.id}`), description: t(`layout_${l.id}_desc`) }))}
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
