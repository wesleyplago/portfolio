import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { accentHover, brands } from '@portfolio/brands';
import type { Project } from '../content/projects';
import { frameAspect, frameShot } from '../content/shots';

function bandVars(project: Project): CSSProperties {
  const b = brands[project.brand];
  return {
    '--brand-bg': b.color.bg,
    '--brand-surface': b.color.surface,
    '--brand-ink': b.color.ink,
    '--brand-muted': b.color.muted,
    '--brand-border': b.color.border,
    '--brand-accent': b.color.accent,
    '--brand-on-accent': b.color.onAccent,
    '--brand-accent-hover': accentHover(b.color.accent, b.color.onAccent),
    '--brand-radius': b.radius.md,
  } as CSSProperties;
}

/** Uma tela por projeto, nas cores da marca do app (a fonte é a do host: a home não baixa fontes dos apps). */
export function ProjectBand({ project: p }: { project: Project }) {
  return (
    <section id={p.slug} className="band" style={bandVars(p)} aria-labelledby={`${p.slug}-name`}>
      <article className="project">
        <div className="band-text">
          <h2 id={`${p.slug}-name`} className="band-name">
            <span className="band-logo" aria-hidden="true">{p.name.charAt(0).toUpperCase()}</span>
            {p.name}
          </h2>
          <p className="band-tagline">{p.tagline}</p>
          <p className="band-metric">
            <strong>{p.metric.value}</strong>
            <span>{p.metric.label}</span>
          </p>
          <div className="band-actions">
            <Link to={p.demoPath} className="btn primary">
              Abrir a demo
            </Link>
            {p.repo && (
              <a href={p.repo} className="btn" target="_blank" rel="noreferrer">
                Ver o código ↗
              </a>
            )}
          </div>
        </div>
        <div className="app-frame" style={{ aspectRatio: frameAspect(p.shot) }}>
          <img src={frameShot(p.shot)} alt={`Tela do ${p.name} em modo demo`} loading="lazy" decoding="async" />
        </div>
      </article>
    </section>
  );
}
