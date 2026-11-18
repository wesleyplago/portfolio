import { Collage } from '../components/Collage';
import { ProjectBand } from '../components/ProjectBand';
import { profile } from '../content/profile';
import { projects } from '../content/projects';
import { cropShot, frameShot } from '../content/shots';

// Ordem das bandas na home (o menu segue a ordem de projects.ts).
const order = ['payops', 'lagoski', 'rag', 'vitrine'];
const bands = order.map((slug) => projects.find((p) => p.slug === slug)!);

// Cada conjunto da colagem: a tela inteira de um app ao fundo e recortes dos outros três por cima.
const shots = bands.map((p) => p.shot);
const collageSets = shots.map((base) => [frameShot(base), ...shots.filter((s) => s !== base).map(cropShot)]);

const nameOf = (slug: string) => projects.find((p) => p.slug === slug)!.name;

export function Home() {
  const { linkedin, email } = profile.contact;
  return (
    <>
      <section className="hero">
        <div className="hero-title">
          <h1>{profile.headline}</h1>
          <p className="hero-fact">{profile.fact}</p>
        </div>
        <Collage sets={collageSets} />
        <div className="hero-cta">
          <a href="#payops" className="btn primary">
            Ver os projetos
          </a>
        </div>
      </section>

      {bands.map((p) => (
        <ProjectBand key={p.slug} project={p} />
      ))}

      <section id="sobre" className="about">
        <h2>Como eu trabalho</h2>
        <ul className="principles">
          {profile.principles.map((pr) => (
            <li key={pr.title}>
              <h3>{pr.title}</h3>
              <p>{pr.proof}</p>
              <a href={`#${pr.slug}`}>Ver no {nameOf(pr.slug)}</a>
            </li>
          ))}
        </ul>
      </section>

      <section id="contato" className="contact">
        <h2>Vamos conversar sobre o seu time de pagamentos</h2>
        <div className="contact-actions">
          {linkedin && (
            <a href={linkedin} className="btn primary" target="_blank" rel="noreferrer">
              Falar no LinkedIn ↗
            </a>
          )}
          {email && (
            <a href={`mailto:${email}`} className="btn">
              Mandar e-mail
            </a>
          )}
          {!linkedin && !email && (
            <a href={`https://github.com/${profile.handle}`} className="btn" target="_blank" rel="noreferrer">
              Ver o GitHub ↗
            </a>
          )}
        </div>
      </section>
    </>
  );
}
