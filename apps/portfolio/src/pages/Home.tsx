import { Link } from 'react-router-dom';
import { profile } from '../content/profile';
import { projects } from '../content/projects';

export function Home() {
  return (
    <>
      <section className="hero">
        <p className="eyebrow">Olá, eu sou o {profile.name}</p>
        <h1>{profile.headline}</h1>
        <p className="lead">{profile.summary}</p>
        <div className="hero-actions">
          <Link to="/projetos/payops" className="btn primary">
            Usar o PayOps ao vivo
          </Link>
          <a href={`https://github.com/${profile.handle}`} className="btn" target="_blank" rel="noreferrer">
            Ver código no GitHub
          </a>
        </div>
        <ul className="chips">
          {profile.focus.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
      </section>

      <section className="section">
        <h2>Projetos</h2>
        <div className="projects">
          {projects.map((p) => (
            <article key={p.slug} className="project">
              <header>
                <h3>{p.name}</h3>
                <p className="tagline">{p.tagline}</p>
              </header>
              <p>{p.description}</p>
              <ul className="highlights">
                {p.highlights.map((h) => (
                  <li key={h}>{h}</li>
                ))}
              </ul>
              <ul className="stack">
                {p.stack.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
              <footer>
                <Link to={p.demoPath} className="btn primary">
                  Abrir a demo
                </Link>
                {p.repo && (
                  <a href={p.repo} className="btn" target="_blank" rel="noreferrer">
                    Repositório ↗
                  </a>
                )}
              </footer>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
