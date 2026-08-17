/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#12141A',
        panel: '#1B1F29',
        rule: '#30364A',
        parchment: '#E8E1D0',
        muted: '#9098AC',
        brass: '#C89B3C',
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
        sans: ['"IBM Plex Sans"', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
};