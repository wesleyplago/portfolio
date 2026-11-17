import { brands, tokensCss } from '@portfolio/brands';

/**
 * Tokens visuais da marca Lagoski, compartilhados pelos quatro microfrontends.
 * Cada remote aplica sob a sua própria classe (`.lgk-catalog`, ...), então nada
 * vaza para o portfólio nem entre remotes. As cores por contexto são as mesmas
 * da página de arquitetura. A variante `inspector` é o painel escuro.
 */
export type LagoskiVariant = 'shop' | 'inspector';

/** Cores por bounded context: [claro, soft claro, Inspector (escuro)]. */
const contexts: Record<string, [string, string, string]> = {
  catalog: ['#0f6b62', '#d9ece8', '#5fd0c0'],
  ordering: ['#1d4f91', '#dde6f3', '#8fb8ff'],
  inventory: ['#8a3f0a', '#f3e2d2', '#f2a66b'],
  payment: ['#a3195b', '#f4dde7', '#f29bc4'],
  fulfillment: ['#3d6b1f', '#e1ebd6', '#a8d98a'],
  notification: ['#6b5a2a', '#ece5d2', '#e0c27a'],
};

export const lagoskiTokens = (scope: string, variant: LagoskiVariant = 'shop') => {
  const inspector = variant === 'inspector';
  const ctx = Object.entries(contexts)
    .map(([name, [light, soft, dark]]) =>
      inspector
        ? `--lg-${name}: ${dark}; --lg-${name}-soft: color-mix(in srgb, ${dark} 16%, var(--lg-bg));`
        : `--lg-${name}: ${light}; --lg-${name}-soft: ${soft};`,
    )
    .join('\n  ');
  return `
${tokensCss(inspector ? brands['lagoski-inspector'] : brands.lagoski, scope, 'lg')}
${scope} {
  --lg-line: var(--lg-border);
  --lg-lake: var(--lg-accent);
  --lg-lake-strong: var(--lg-accent);
  --lg-lake-soft: color-mix(in srgb, var(--lg-accent) 12%, var(--lg-bg));
  --lg-radius: var(--lg-radius-md);
  --lg-mono: var(--lg-font-mono);
  ${ctx}
  background: var(--lg-bg);
  color: var(--lg-ink);
  font: 14px/1.5 var(--lg-font-text);
  -webkit-font-smoothing: antialiased;
}
${scope} *, ${scope} *::before, ${scope} *::after { box-sizing: border-box; }
${scope} h2, ${scope} h3, ${scope} h4 { margin: 0; letter-spacing: -0.01em; line-height: 1.25; color: var(--lg-ink); font-family: var(--lg-font-display); font-weight: 600; }
${scope} p { margin: 0; }
${scope} code { font-family: var(--lg-mono); font-size: 12px; background: var(--lg-lake-soft); color: var(--lg-ink); padding: 1px 5px; border-radius: var(--lg-radius-sm); }
${scope} button, ${scope} input, ${scope} select, ${scope} textarea { font: inherit; }
${scope} button { cursor: pointer; }
${scope} button:focus-visible, ${scope} a:focus-visible, ${scope} input:focus-visible, ${scope} select:focus-visible { outline: 2px solid var(--lg-lake); outline-offset: 2px; }
${scope} .lg-panel { background: var(--lg-surface); border: 1px solid var(--lg-line); border-radius: var(--lg-radius); padding: 16px; }
${scope} .lg-head { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; flex-wrap: wrap; margin-bottom: 12px; }
${scope} .lg-head h3 { font-size: 16px; }
${scope} .lg-owner { font: 11px var(--lg-mono); color: var(--lg-muted); letter-spacing: .02em; text-transform: none; }
${scope} .lg-btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; border: 1px solid var(--lg-line); background: var(--lg-surface); color: var(--lg-ink); border-radius: var(--lg-radius-md); padding: 8px 12px; font-weight: 500; }
${scope} .lg-btn:hover:not(:disabled) { border-color: var(--lg-lake); }
${scope} .lg-btn:disabled { opacity: .55; cursor: not-allowed; }
${scope} .lg-btn.primary { background: var(--lg-lake-strong); border-color: var(--lg-lake-strong); color: var(--lg-on-accent); }
${scope} .lg-btn.small { padding: 4px 9px; font-size: 13px; }
${scope} .lg-muted { color: var(--lg-muted); }
${scope} .lg-error { color: var(--lg-bad); font-size: 13px; }
${scope} .lg-empty { color: var(--lg-muted); padding: 18px 0; text-align: center; }
${scope} .lg-pill { display: inline-flex; align-items: center; gap: 6px; border-radius: 999px; padding: 2px 10px; font-size: 12px; font-weight: 600; border: 1px solid currentColor; }
${scope} .lg-pill.ok { color: var(--lg-ok); }
${scope} .lg-pill.warn { color: var(--lg-warn); }
${scope} .lg-pill.bad { color: var(--lg-bad); }
${scope} .lg-pill.info { color: var(--lg-lake); }
${scope} .ctx-catalog { --c: var(--lg-catalog); --c-soft: var(--lg-catalog-soft); }
${scope} .ctx-ordering { --c: var(--lg-ordering); --c-soft: var(--lg-ordering-soft); }
${scope} .ctx-inventory { --c: var(--lg-inventory); --c-soft: var(--lg-inventory-soft); }
${scope} .ctx-payment { --c: var(--lg-payment); --c-soft: var(--lg-payment-soft); }
${scope} .ctx-fulfillment { --c: var(--lg-fulfillment); --c-soft: var(--lg-fulfillment-soft); }
${scope} .ctx-notification { --c: var(--lg-notification); --c-soft: var(--lg-notification-soft); }
${scope} .ctx-bff, ${scope} .ctx-unknown, ${scope} .ctx-poison { --c: var(--lg-muted); --c-soft: var(--lg-bg); }
${scope} .lg-ctx { display: inline-block; font: 11px var(--lg-mono); color: var(--c); background: var(--c-soft); border-radius: var(--lg-radius-sm); padding: 1px 6px; white-space: nowrap; }
@media (prefers-reduced-motion: reduce) { ${scope} * { transition: none !important; animation: none !important; } }
`;
};
