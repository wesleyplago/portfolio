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
 * Cada conjunto só monta as imagens quando fica ativo ou é o próximo da fila (e depois fica montado),
 * então a primeira tela baixa só o conjunto 0 e o seguinte, e a troca não pisca.
 * Com prefers-reduced-motion: reduce, fica no primeiro conjunto, só ele é montado e não há botão de pausa.
 */
export function Collage({ sets, intervalMs = 2800 }: { sets: string[][]; intervalMs?: number }) {
  const reduced = useReducedMotion();
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const moving = !reduced && !paused && sets.length > 1;
  const [seen, setSeen] = useState<ReadonlySet<number>>(() => new Set([0]));
  const next = (active + 1) % sets.length;

  useEffect(() => {
    if (reduced) return;
    const wanted = moving ? [active, next] : [active];
    setSeen((prev) => (wanted.every((i) => prev.has(i)) ? prev : new Set([...prev, ...wanted])));
  }, [reduced, moving, active, next]);

  useEffect(() => {
    if (!moving) return;
    const id = window.setInterval(() => setActive((i) => (i + 1) % sets.length), intervalMs);
    return () => window.clearInterval(id);
  }, [moving, intervalMs, sets.length]);

  return (
    <div className="collage" data-set={reduced ? 0 : active}>
      {sets.map((set, i) => (
        <div key={i} className="collage-set" data-active={(reduced ? 0 : active) === i} aria-hidden="true">
          {(i === 0 || (!reduced && seen.has(i))) &&
            set.map((src) => (
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
