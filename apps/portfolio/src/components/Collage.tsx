import { useEffect, useState } from 'react';

const reducedMotionQuery = '(prefers-reduced-motion: reduce)';

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => window.matchMedia(reducedMotionQuery).matches);
  useEffect(() => {
    const mq = window.matchMedia(reducedMotionQuery);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return reduced;
}

/**
 * Capturas sobrepostas dos apps. Mostra um conjunto por vez e avança a cada `intervalMs`.
 * Todos os conjuntos ficam no DOM (os de fora do primeiro com loading="lazy") para a troca não piscar.
 * Com prefers-reduced-motion: reduce, fica no primeiro conjunto e não mostra o botão de pausa.
 */
export function Collage({ sets, intervalMs = 2800 }: { sets: string[][]; intervalMs?: number }) {
  const reduced = useReducedMotion();
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const moving = !reduced && !paused && sets.length > 1;

  useEffect(() => {
    if (!moving) return;
    const id = window.setInterval(() => setActive((i) => (i + 1) % sets.length), intervalMs);
    return () => window.clearInterval(id);
  }, [moving, intervalMs, sets.length]);

  return (
    <div className="collage" data-set={reduced ? 0 : active}>
      {sets.map((set, i) => (
        <div key={i} className="collage-set" data-active={(reduced ? 0 : active) === i} aria-hidden="true">
          {set.map((src) => (
            <img key={src} src={src} alt="" loading={i === 0 ? 'eager' : 'lazy'} decoding="async" />
          ))}
        </div>
      ))}
      {!reduced && (
        <button type="button" className="collage-toggle" onClick={() => setPaused((p) => !p)}>
          {paused ? 'Retomar animação' : 'Pausar animação'}
        </button>
      )}
    </div>
  );
}
