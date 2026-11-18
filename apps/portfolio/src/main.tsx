import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import '@fontsource-variable/host-grotesk';
import '@fontsource-variable/jetbrains-mono';
import App from './App';
import { injectHostTokens } from './tokens';
import './styles.css';

injectHostTokens();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
