/** Camiseta desenhada em SVG: a cor é a da variante e a estampa é a do produto. */
const luminance = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
};

function Artwork({ kind, ink }: { kind: string; ink: string }) {
  const s = { fill: 'none', stroke: ink, strokeWidth: 2.2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  switch (kind) {
    case 'waves':
      return (
        <g {...s}>
          {[52, 60, 68].map((y) => (
            <path key={y} d={`M44 ${y} q4 -5 8 0 t8 0 t8 0 t8 0 t8 0`} />
          ))}
        </g>
      );
    case 'pine':
      return (
        <g {...s}>
          <path d="M60 46 l-11 30 h22 z" />
          <path d="M55 60 h10 M53 67 h14" />
          <path d="M60 76 v6" />
        </g>
      );
    case 'ridge':
      return (
        <g {...s}>
          <path d="M42 76 l10 -16 l6 8 l8 -14 l12 22" />
          <path d="M42 80 h36" />
        </g>
      );
    case 'lighthouse':
      return (
        <g {...s}>
          <path d="M56 80 l2 -26 h4 l2 26 z" />
          <path d="M57 54 l3 -5 l3 5" />
          <path d="M65 51 l13 -5 M65 53 l13 4" />
        </g>
      );
    case 'contour':
      return (
        <g {...s}>
          <ellipse cx="60" cy="64" rx="16" ry="11" />
          <ellipse cx="61" cy="63" rx="10" ry="6.5" />
          <ellipse cx="62" cy="62" rx="4" ry="2.5" />
        </g>
      );
    default:
      return (
        <g>
          <circle cx="72" cy="44" r="5" fill="none" stroke={ink} strokeWidth="1.8" />
          <path d="M70 41.5 v5 h4" fill="none" stroke={ink} strokeWidth="1.8" strokeLinecap="round" />
        </g>
      );
  }
}

export function TeeArt({ color, artwork, label }: { color: string; artwork: string; label: string }) {
  const ink = luminance(color) > 0.55 ? '#1d2b30' : '#f3f2ee';
  return (
    <svg viewBox="0 0 120 120" role="img" aria-label={label} className="lc-art">
      <path
        d="M38 14 L22 22 L8 40 L22 50 L30 44 L30 106 L90 106 L90 44 L98 50 L112 40 L98 22 L82 14 C78 22 70 26 60 26 C50 26 42 22 38 14 Z"
        fill={color}
        stroke="rgba(0,0,0,.18)"
        strokeWidth="1"
      />
      <Artwork kind={artwork} ink={ink} />
    </svg>
  );
}
