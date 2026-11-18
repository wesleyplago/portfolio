import { brands, tokensCss } from '@portfolio/brands';

/**
 * CSS isolado do microfrontend: tudo fica sob `.vt`, e o <style> é renderizado
 * pelo próprio componente. Nada vaza para o portfólio.
 */
export const css = `
${tokensCss(brands.vitrine, '.vt', 'vt')}
.vt {
  /* Aliases dos nomes antigos, para não reescrever o CSS inteiro. */
  --vt-panel: var(--vt-surface);
  --vt-text: var(--vt-ink);
  --vt-accent-soft: color-mix(in srgb, var(--vt-accent) 8%, var(--vt-bg));
  --vt-ok-soft: color-mix(in srgb, var(--vt-ok) 14%, var(--vt-bg));
  /* cores das lojas: marcas de terceiros, ficam como estão */
  --vt-shopee: #c2410c;
  --vt-shopee-soft: #fff1e8;
  --vt-ml: #8a6d00;
  --vt-ml-soft: #fff8d6;
  color: var(--vt-text);
  background: var(--vt-bg);
  font: 14px/1.5 var(--vt-font-text);
  border-radius: var(--vt-radius-lg);
  padding: 20px;
  box-sizing: border-box;
}
/* Backoffice: área de trabalho clara, com tabelas densas. */
.vt .vt-bo { --vt-bg: #ffffff; --vt-surface: #f4f4f4;
  --vt-panel: var(--vt-surface);
  --vt-accent-soft: color-mix(in srgb, var(--vt-accent) 8%, var(--vt-bg));
  --vt-ok-soft: color-mix(in srgb, var(--vt-ok) 14%, var(--vt-bg));
  background: var(--vt-bg); border-radius: var(--vt-radius-md); padding: 16px; }
.vt .vt-bo th, .vt .vt-bo td { padding: 6px 10px; }
.vt *, .vt *::before, .vt *::after { box-sizing: inherit; }
.vt h2, .vt h3 { margin: 0; font-family: var(--vt-font-display); font-weight: 600; letter-spacing: -0.01em; }
.vt h2 { font-size: 16px; }
.vt h3 { font-size: 14.5px; line-height: 1.35; }
.vt p { margin: 0; }
.vt button, .vt input, .vt select, .vt textarea { font: inherit; }
.vt button { color: inherit; }
.vt input {
  width: 100%; padding: 8px 10px; border: 1px solid var(--vt-muted); border-radius: var(--vt-radius-sm); background: var(--vt-bg); color: var(--vt-text);
}
.vt :focus-visible { outline: 2px solid var(--vt-accent); outline-offset: 2px; }
.vt label { font-size: 12.5px; color: var(--vt-muted); font-weight: 500; }
.vt code { font-family: var(--vt-font-mono); font-size: 12.5px; background: var(--vt-accent-soft); padding: 1px 5px; border-radius: var(--vt-radius-sm); }

.vt-top { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 20px; }
.vt-tabs { display: inline-flex; padding: 3px; border: 1px solid var(--vt-border); border-radius: var(--vt-radius-md); background: var(--vt-panel); }
.vt-tabs button { border: 0; background: none; padding: 6px 16px; border-radius: var(--vt-radius-sm); cursor: pointer; font-weight: 500; color: var(--vt-muted); }
.vt-tabs button[aria-selected="true"] { background: var(--vt-accent); color: var(--vt-on-accent); }
.vt-mode { font-size: 12px; padding: 3px 10px; border-radius: 999px; background: var(--vt-accent-soft); color: var(--vt-accent); }
.vt-mode.live { background: var(--vt-ok-soft); color: var(--vt-ok); }

.vt-section { display: grid; gap: 16px; }
.vt-empty { color: var(--vt-muted); padding: 12px 0; }
.vt-error { color: var(--vt-bad); font-size: 13px; }
.vt-hint { color: var(--vt-muted); font-size: 12.5px; }

.vt-filters { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; }
.vt-filters input { flex: 1 1 240px; width: auto; }
.vt-chips { display: flex; gap: 6px; flex-wrap: wrap; }
.vt-chips button { border: 1px solid var(--vt-muted); background: var(--vt-panel); padding: 5px 12px; border-radius: 999px; cursor: pointer; }
.vt-chips button[aria-pressed="true"] { border-color: var(--vt-accent); color: var(--vt-accent); background: var(--vt-accent-soft); }

.vt-grid { list-style: none; margin: 0; padding: 0; display: grid; gap: 14px; grid-template-columns: repeat(auto-fill, minmax(210px, 1fr)); }
.vt-card { display: flex; flex-direction: column; border: 1px solid var(--vt-border); border-radius: var(--vt-radius-md); background: var(--vt-panel); overflow: hidden; }
.vt-thumb { aspect-ratio: 4 / 3; display: grid; place-items: center; font-size: 12px; color: var(--vt-muted); }
.vt-thumb.shopee { background: var(--vt-shopee-soft); }
.vt-thumb.mercadolivre { background: var(--vt-ml-soft); }
.vt-thumb img { width: 100%; height: 100%; object-fit: cover; }
.vt-card-body { display: flex; flex-direction: column; gap: 8px; padding: 12px; flex: 1; }
.vt-store { align-self: flex-start; font-size: 11px; font-weight: 600; padding: 1px 8px; border-radius: 999px; }
.vt-store.shopee { color: var(--vt-shopee); background: var(--vt-shopee-soft); }
.vt-store.mercadolivre { color: var(--vt-ml); background: var(--vt-ml-soft); }
.vt-price { display: flex; flex-wrap: wrap; align-items: baseline; gap: 6px; margin-top: auto; font-variant-numeric: tabular-nums; }
.vt-price s { color: var(--vt-muted); font-size: 12.5px; }
.vt-price strong { font-family: var(--vt-font-display); font-size: 20px; font-weight: 600; }
.vt-price em { font-style: normal; font-size: 12px; color: var(--vt-ok); font-weight: 600; }
.vt-buy { display: block; text-align: center; padding: 8px 12px; border-radius: var(--vt-radius-sm); background: var(--vt-accent); color: var(--vt-on-accent); text-decoration: none; font-weight: 600; }
.vt-buy:hover { filter: brightness(1.08); }
.vt-disclosure { font-size: 12px; color: var(--vt-muted); }

.vt-panel { display: grid; gap: 8px; align-content: start; padding: 16px; border: 1px solid var(--vt-border); border-radius: var(--vt-radius-md); background: var(--vt-panel); min-width: 0; }
.vt-login { justify-items: center; padding: 24px 0; }
.vt-login .vt-panel { width: min(360px, 100%); }
.vt-primary { margin-top: 6px; padding: 9px 14px; border: 0; border-radius: var(--vt-radius-sm); background: var(--vt-accent); color: var(--vt-on-accent) !important; font-weight: 600; cursor: pointer; }
.vt-primary:disabled { opacity: .55; cursor: not-allowed; }
.vt-ghost { border: 1px solid var(--vt-accent); background: none; color: var(--vt-accent) !important; font-weight: 600; padding: 5px 12px; border-radius: var(--vt-radius-sm); cursor: pointer; }
.vt-ghost:hover { background: var(--vt-accent-soft); }
.vt-bar { display: flex; justify-content: space-between; align-items: center; gap: 12px; }

.vt-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; }
.vt-stats div { display: grid; gap: 2px; padding: 12px 14px; border: 1px solid var(--vt-border); border-radius: var(--vt-radius-md); background: var(--vt-panel); }
.vt-stats span { font-size: 12px; color: var(--vt-muted); }
.vt-stats strong { font-family: var(--vt-font-display); font-size: 22px; font-weight: 600; font-variant-numeric: tabular-nums; }

.vt-table-wrap { overflow-x: auto; }
.vt table { width: 100%; border-collapse: collapse; font-size: 13.5px; }
.vt th, .vt td { text-align: left; padding: 8px 10px; border-bottom: 1px solid var(--vt-border); white-space: nowrap; }
.vt td:first-child { white-space: normal; min-width: 180px; }
.vt th { font-size: 12px; color: var(--vt-muted); font-weight: 600; }
.vt .num { text-align: right; font-variant-numeric: tabular-nums; }
.vt-status { display: inline-block; padding: 2px 10px; border-radius: 999px; font-size: 12px; font-weight: 600; }
.vt-sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
.vt-status.published { background: var(--vt-ok-soft); color: var(--vt-ok); }
.vt-status.draft { background: var(--vt-accent-soft); color: var(--vt-muted); }
@media (prefers-reduced-motion: no-preference) { .vt-buy, .vt-ghost { transition: background-color .15s, filter .15s; } }

.vt-forms { display: grid; gap: 16px; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); }
@media (max-width: 520px) { .vt { padding: 14px; } }
`;
