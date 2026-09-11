import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import {J6Showcase} from './components/J6Showcase.tsx';
import './index.css';

// Vitrine das versões do ícone J6, acessível em /?j6-showcase para conferência
// visual sem interferir na rota principal do app.
const isShowcase = new URLSearchParams(window.location.search).has('j6-showcase');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isShowcase ? <J6Showcase /> : <App />}
  </StrictMode>,
);
