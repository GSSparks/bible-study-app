/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Sampled directly from the app-UI mockup (not eyeballed) —
        // navy/gold rebrand per the mockup images. verdigris and the
        // light "page" reading-surface colors below are deliberately
        // untouched: the mockup didn't show an equivalent for either,
        // and both are functional accents rather than part of the core
        // brand identity the mockup was actually showing.
        ink: '#0D1B29',
        panel: '#1A2634',
        rule: '#2D3745',
        parchment: '#F5F4F1',
        muted: '#8B8F98',
        brass: '#E8A441',
        verdigris: '#3F7168',
        // Reading surfaces (ReaderPane, DictionaryPane) use this lighter
        // "open page" palette instead of the dark app-chrome colors above
        // — makes red-letter text and other accent colors read the way
        // they would on an actual printed page, rather than looking odd
        // against a near-black background.
        page: '#EDE6D3',
        pageText: '#2B2620',
        pageMuted: '#6B6152',
        pageAccent: '#96721C',
        pageBorder: '#CFC3A3',
      },
      fontFamily: {
        display: ['"Source Serif 4"', 'Georgia', 'serif'],
        ui:      ['"IBM Plex Sans"', 'system-ui', 'sans-serif'],
        sans:    ['"IBM Plex Sans"', 'system-ui', 'sans-serif'],
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