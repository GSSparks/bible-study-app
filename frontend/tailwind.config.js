/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink:        'rgb(var(--color-ink) / <alpha-value>)',
        panel:      'rgb(var(--color-panel) / <alpha-value>)',
        rule:       'rgb(var(--color-rule) / <alpha-value>)',
        parchment:  'rgb(var(--color-parchment) / <alpha-value>)',
        muted:      'rgb(var(--color-muted) / <alpha-value>)',
        brass:      'rgb(var(--color-brass) / <alpha-value>)',
        verdigris:  'rgb(var(--color-verdigris) / <alpha-value>)',
        page:       'rgb(var(--color-page) / <alpha-value>)',
        pageText:   'rgb(var(--color-page-text) / <alpha-value>)',
        pageMuted:  'rgb(var(--color-page-muted) / <alpha-value>)',
        pageAccent: 'rgb(var(--color-page-accent) / <alpha-value>)',
        pageBorder: 'rgb(var(--color-page-border) / <alpha-value>)',
      },
      fontFamily: {
        display: ['Inter', 'system-ui', 'sans-serif'],
        heading: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        ui:      ['Inter', 'system-ui', 'sans-serif'],
        sans:    ['Inter', 'system-ui', 'sans-serif'],
        mono:    ['"IBM Plex Mono"', 'monospace'],
      },
      // Sub-xs sizes for UI chrome and labels — keep all sizing decisions here,
      // not scattered as arbitrary text-[Npx] classes in component files.
      fontSize: {
        nano:  ['0.5625rem', { lineHeight: '1rem' }],   // 9px  — map chrome, tiny indicators
        micro: ['0.625rem',  { lineHeight: '1rem' }],   // 10px — metadata, timestamps, range labels
        label: ['0.6875rem', { lineHeight: '1rem' }],   // 11px — uppercase section headers
        fine:  ['0.9375rem', { lineHeight: '1.5rem' }], // 15px — document body prose
      },
    },
  },
  plugins: [],
};