import { createContext, use, type CSSProperties, type ReactNode } from 'react';
import { brands } from '@portfolio/brands';
import type { Project } from '../content/projects';

const ProjectContext = createContext<Project | null>(null);

function useProject(): Project {
  const project = use(ProjectContext);
  if (!project) throw new Error('ProjectPage.* precisa estar dentro de <ProjectPage>');
  return project;
}

/** Cores da marca do app, só nesta subárvore. A fonte continua a do host: a capa não baixa as fontes dos remotes. */
function brandVars(project: Project): CSSProperties {
  const b = brands[project.brand];
  return {
    '--brand-bg': b.color.bg,
    '--brand-surface': b.color.surface,
    '--brand-ink': b.color.ink,
    '--brand-muted': b.color.muted,
    '--brand-border': b.color.border,
    '--brand-accent': b.color.accent,
    '--brand-on-accent': b.color.onAccent,
  } as CSSProperties;
}

/**
 * Página de projeto por composição: o consumidor escolhe e ordena as partes
 * (Cover, Guide, Demo, Inside) e todas leem o mesmo Project pelo contexto.
 */
export function ProjectPage({ project, children }: { project: Project; children: ReactNode }) {
  return (
    <ProjectContext value={project}>
      <article className="project-page" style={brandVars(project)}>
        {children}
      </article>
    </ProjectContext>
  );
}

/** `children` recebe ações extras da capa (ex.: "Arquitetura" no Lagoski). */
function Cover({ children }: { children?: ReactNode }) {
  const p = useProject();
  return (
    <header className="cover">
      <div className="cover-text">
        <h1>{p.name}</h1>
        <p className="cover-tagline">{p.tagline}</p>
        <div className="cover-actions">
          <a href="#demo" className="cover-btn primary">
            Abrir a demo
          </a>
          {p.repo && (
            <a href={p.repo} className="cover-btn" target="_blank" rel="noreferrer">
              Ver o código ↗
            </a>
          )}
          {children}
        </div>
      </div>
      <p className="cover-metric">
        <strong>{p.metric.value}</strong>
        <span>{p.metric.label}</span>
      </p>
    </header>
  );
}

function Guide() {
  const { guide } = useProject();
  return (
    <ol className="guide">
      {guide.map((step) => (
        <li key={step}>{step}</li>
      ))}
    </ol>
  );
}

function Demo({ children }: { children: ReactNode }) {
  return (
    <section id="demo" className="demo" aria-label="Demo">
      <span className="demo-badge">Modo demo</span>
      {children}
    </section>
  );
}

function Inside() {
  const p = useProject();
  return (
    <section className="inside">
      <h2>O que tem por dentro</h2>
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
    </section>
  );
}

ProjectPage.Cover = Cover;
ProjectPage.Guide = Guide;
ProjectPage.Demo = Demo;
ProjectPage.Inside = Inside;
