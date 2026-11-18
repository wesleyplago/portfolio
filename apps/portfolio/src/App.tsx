import { NavLink, Route, Routes } from 'react-router-dom';
import { profile } from './content/profile';
import { ProjectsMenu } from './components/ProjectsMenu';
import { Home } from './pages/Home';
import { PayOpsPage } from './pages/PayOpsPage';
import { RagPage } from './pages/RagPage';
import { VitrinePage } from './pages/VitrinePage';
import { LagoskiPage } from './pages/LagoskiPage';
import { NotFound } from './pages/NotFound';

export default function App() {
  return (
    <div className="shell">
      <header className="nav">
        <NavLink to="/" className="nav-brand">
          <span className="nav-mark" aria-hidden="true">{profile.name.charAt(0)}</span>
          {profile.handle}
        </NavLink>
        <nav className="nav-links">
          <ProjectsMenu />
          <a href={`${import.meta.env.BASE_URL}#sobre`}>Sobre</a>
          <a href={`${import.meta.env.BASE_URL}#contato`}>Contato</a>
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
          <Route path="/projetos/vitrine" element={<VitrinePage />} />
          <Route path="/projetos/lagoski" element={<LagoskiPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <footer className="footer">
        Feito em React e TypeScript. Cada demo é um microfrontend carregado em runtime.
      </footer>
    </div>
  );
}
