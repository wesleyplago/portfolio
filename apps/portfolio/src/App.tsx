import { NavLink, Route, Routes } from 'react-router-dom';
import { profile } from './content/profile';
import { Home } from './pages/Home';
import { PayOpsPage } from './pages/PayOpsPage';
import { RagPage } from './pages/RagPage';
import { NotFound } from './pages/NotFound';

export default function App() {
  return (
    <div className="shell">
      <header className="nav">
        <NavLink to="/" className="nav-brand">
          <span className="nav-mark">{profile.name.charAt(0)}</span>
          {profile.handle}
        </NavLink>
        <nav className="nav-links">
          <NavLink to="/" end>Início</NavLink>
          <NavLink to="/projetos/payops">PayOps ao vivo</NavLink>
          <NavLink to="/projetos/rag">RAG ao vivo</NavLink>
          {profile.links.map((l) => (
            <a key={l.href} href={l.href} target="_blank" rel="noreferrer">
              {l.label} ↗
            </a>
          ))}
        </nav>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/projetos/payops" element={<PayOpsPage />} />
          <Route path="/projetos/rag" element={<RagPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <footer className="footer">
        Portfólio em React + TypeScript. O PayOps e o RAG são microfrontends separados, carregados em runtime via
        Module Federation.
      </footer>
    </div>
  );
}
