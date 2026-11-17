import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

// Modo standalone: o mesmo componente que o portfólio carrega via Module Federation.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: 20 }}>
      <App />
    </div>
  </StrictMode>,
);
