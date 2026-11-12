// Variantes del modo oscuro. La app pinta el modo oscuro con la escala «zinc» de Tailwind;
// cada variante cambia esa escala por otra paleta (variables --zinc-* en index.css),
// así que afecta a toda la app y no solo al fondo.
const base = {
  bg: 'bg-zinc-900', panel: 'bg-zinc-800', panelHover: 'hover:bg-zinc-700',
  border: 'border-zinc-700', borderHover: 'hover:border-zinc-600',
  text: 'text-zinc-200', textMuted: 'text-zinc-400', textSubtle: 'text-zinc-500',
};

export const darkThemes = {
  zinc: { ...base, name: 'Grafito', colors: { bg: '#18181b', panel: '#27272a', border: '#52525b', text: '#e4e4e7' } },
  amoled: { ...base, name: 'AMOLED negro', colors: { bg: '#000000', panel: '#141416', border: '#46464c', text: '#e4e4e7' } },
  slate: { ...base, name: 'Azul noche', colors: { bg: '#0c152a', panel: '#182644', border: '#405478', text: '#d6e1f2' } },
  neutral: { ...base, name: 'Cálido', colors: { bg: '#1c1713', panel: '#2d251e', border: '#5a4f44', text: '#e7dfd5' } },
  forest: { ...base, name: 'Verde bosque', colors: { bg: '#0e1a14', panel: '#1b2b23', border: '#425c4e', text: '#d6e5dd' } },
  plum: { ...base, name: 'Berenjena', colors: { bg: '#191122', panel: '#2a1e38', border: '#5c4a70', text: '#e3dbed' } },
};

/** Aplica la variante a toda la página (o la quita en modo claro). */
export function applyDarkTheme(themeKey, darkMode) {
  try {
    const el = document.documentElement;
    if (darkMode && darkThemes[themeKey] && themeKey !== 'zinc') el.dataset.darkTheme = themeKey;
    else delete el.dataset.darkTheme;
  } catch { /* sin documento */ }
}

// Helper function to get theme classes
export function getThemeClasses(themeKey, darkMode) {
  if (!darkMode) return null;
  return darkThemes[themeKey] || darkThemes.zinc;
}

// Default theme
export const defaultDarkTheme = 'zinc';

// Variantes del modo claro (fondo de la página, tarjetas y grises claros; ver index.css)
export const lightThemes = {
  classic: { colors: { bg: '#fafaf9', panel: '#ffffff', border: '#e2e8f0' } },
  cream: { colors: { bg: '#f0e6d2', panel: '#fdf8ec', border: '#e8ddc8' } },
  sky: { colors: { bg: '#e0ecfa', panel: '#f6faff', border: '#d4e0f2' } },
  mint: { colors: { bg: '#def1e5', panel: '#f6fcf8', border: '#cfe5d7' } },
  lavender: { colors: { bg: '#eae4f8', panel: '#faf8ff', border: '#ddd3f0' } },
  pearl: { colors: { bg: '#e1e5ea', panel: '#f3f5f8', border: '#d4d9df' } },
};
export const defaultLightTheme = 'classic';

/** Aplica la variante clara a toda la página (o la quita en modo oscuro). */
export function applyLightTheme(themeKey, darkMode) {
  try {
    const el = document.documentElement;
    if (!darkMode && lightThemes[themeKey] && themeKey !== 'classic') el.dataset.lightTheme = themeKey;
    else delete el.dataset.lightTheme;
  } catch { /* sin documento */ }
}
