export const FONTS = [
  { id: 'inter',         label: 'Inter',          family: 'Inter, system-ui, sans-serif',                 gfParam: null },
  { id: 'space-grotesk', label: 'Space Grotesk',  family: '"Space Grotesk", system-ui, sans-serif',       gfParam: null },
  { id: 'source-serif',  label: 'Source Serif 4', family: '"Source Serif 4", Georgia, serif',             gfParam: 'Source+Serif+4:opsz,wght@8..60,400;8..60,600' },
  { id: 'lora',          label: 'Lora',           family: 'Lora, Georgia, serif',                         gfParam: 'Lora:ital,wght@0,400;0,600;1,400' },
  { id: 'merriweather',  label: 'Merriweather',   family: 'Merriweather, Georgia, serif',                 gfParam: 'Merriweather:wght@300;400;700' },
  { id: 'dm-sans',       label: 'DM Sans',        family: '"DM Sans", system-ui, sans-serif',             gfParam: 'DM+Sans:wght@400;500;600' },
  { id: 'ibm-plex-sans', label: 'IBM Plex Sans',  family: '"IBM Plex Sans", system-ui, sans-serif',       gfParam: 'IBM+Plex+Sans:wght@400;500;600' },
  { id: 'nunito-sans',   label: 'Nunito Sans',    family: '"Nunito Sans", system-ui, sans-serif',         gfParam: 'Nunito+Sans:wght@400;500;600' },
];

const COLOR_VARS = ['ink','panel','rule','parchment','muted','brass','verdigris','page','page-text','page-muted','page-accent','page-border'];

export function applyFont(role, fontId) {
  const font = FONTS.find((f) => f.id === fontId);
  if (!font) return;
  document.documentElement.style.setProperty(`--font-${role}`, font.family);
  if (font.gfParam && !document.querySelector(`link[data-gf="${font.gfParam}"]`)) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.dataset.gf = font.gfParam;
    link.href = `https://fonts.googleapis.com/css2?family=${font.gfParam}&display=swap`;
    document.head.appendChild(link);
  }
}

export function applyCustomThemeColors(colors) {
  for (const [key, value] of Object.entries(colors)) {
    document.documentElement.style.setProperty(`--color-${key}`, value);
  }
}

export function clearCustomThemeColors() {
  for (const v of COLOR_VARS) {
    document.documentElement.style.removeProperty(`--color-${v}`);
  }
}
