import { Link } from 'react-router-dom';
import { brandVars } from '../brand-vars';
import type { Project } from '../content/projects';
import { frameAspect, frameShot } from '../content/shots';

/** Uma tela por projeto, nas cores da marca do app (a fonte é a do host: a home não baixa fontes dos apps). */
export function ProjectBand({ project: p }: { project: Project }) {
  return (
    <section id={p.slug} className="band" style={brandVars(p.brand)} aria-labelledby={`${p.slug}-name`}>
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
