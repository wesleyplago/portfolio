import type { CSSProperties } from 'react';
import { accentHover, brands, type BrandId } from '@portfolio/brands';

/** Cores e canto da marca de um app como variáveis --brand-*, só na subárvore (banda da home, página do projeto). A fonte continua a do host. */
export function brandVars(brandId: BrandId): CSSProperties {
  const b = brands[brandId];
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
