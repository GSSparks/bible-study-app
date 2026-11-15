import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import './styles/index.css';

// Restore cached theme synchronously before first render to prevent flash
try {
  const t = localStorage.getItem('scriptorium-theme');
  if (t) document.documentElement.setAttribute('data-theme', t);
} catch {}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
