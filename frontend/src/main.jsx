import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import './styles/index.css';

// Restore cached theme and fonts synchronously before first render to prevent flash
try {
  const t = localStorage.getItem('scriptorium-theme');
  if (t) document.documentElement.setAttribute('data-theme', t);
  // Restore custom theme colors if the saved theme is a custom one
  const customThemesRaw = localStorage.getItem('scriptorium-custom-themes');
  if (customThemesRaw && t) {
    const customThemes = JSON.parse(customThemesRaw);
    const ct = customThemes.find((c) => c.id === t);
    if (ct?.colors) {
      for (const [k, v] of Object.entries(ct.colors)) {
        document.documentElement.style.setProperty(`--color-${k}`, v);
      }
      document.documentElement.removeAttribute('data-theme');
    }
  }
  const df = localStorage.getItem('scriptorium-display-font');
  if (df) document.documentElement.style.setProperty('--font-display', df);
  const uf = localStorage.getItem('scriptorium-ui-font');
  if (uf) {
    document.documentElement.style.setProperty('--font-ui', uf);
    document.documentElement.style.setProperty('--font-heading', uf);
  }
} catch {}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
