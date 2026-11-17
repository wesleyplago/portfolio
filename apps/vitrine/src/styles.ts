/**
 * CSS isolado do microfrontend: tudo fica sob `.vt`, e o <style> é renderizado
 * pelo próprio componente. Nada vaza para o portfólio.
 */
export const css = `
.vt {
  --vt-bg: #fbfbfd;
  --vt-panel: #ffffff;
  --vt-border: #e4e7ee;
  --vt-text: #14161c;
  --vt-muted: #5c6475;
  --vt-accent: #2a5bd7;
  /* fundo de botão com texto branco: o azul claro do tema escuro daria só 2,9:1 */
  --vt-accent-strong: #2a5bd7;
  --vt-accent-soft: #eaf0ff;
  --vt-shopee: #c2410c;
  --vt-shopee-soft: #fff1e8;
  --vt-ml: #8a6d00;
  --vt-ml-soft: #fff8d6;
  --vt-ok: #1f7a4c;
  --vt-ok-soft: #e6f5ec;
  --vt-bad: #b42318;
  color: var(--vt-text);
  background: var(--vt-bg);
  font: 14px/1.5 ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  border: 1px solid var(--vt-border);
  border-radius: 16px;
  padding: 20px;
  box-sizing: border-box;
}
@media (prefers-color-scheme: dark) {
  .vt {
    --vt-bg: #0d1017; --vt-panel: #141924; --vt-border: #252d3d; --vt-text: #e8ecf4; --vt-muted: #97a1b5;
    --vt-accent: #6f95ff; --vt-accent-strong: #3b63d9; --vt-accent-soft: #1b2440; --vt-shopee: #ff9a62; --vt-shopee-soft: #3a2116;
    --vt-ml: #f2d24b; --vt-ml-soft: #332b0c; --vt-ok: #6fd3a0; --vt-ok-soft: #13301f; --vt-bad: #ff8a80;
  }
}
.vt *, .vt *::before, .vt *::after { box-sizing: inherit; }
.vt h2, .vt h3 { margin: 0; font-weight: 600; letter-spacing: -0.01em; }
.vt h2 { font-size: 16px; }
.vt h3 { font-size: 14.5px; line-height: 1.35; }
.vt p { margin: 0; }
.vt button, .vt input { font: inherit; color: inherit; }
.vt input {
  width: 100%; padding: 8px 10px; border: 1px solid var(--vt-border); border-radius: 8px; background: var(--vt-panel);
}
.vt input:focus-visible, .vt button:focus-visible, .vt a:focus-visible { outline: 2px solid var(--vt-accent); outline-offset: 2px; }
.vt label { font-size: 12.5px; color: var(--vt-muted); font-weight: 500; }
.vt code { font-family: ui-monospace, Menlo, monospace; font-size: 12.5px; background: var(--vt-accent-soft); padding: 1px 5px; border-radius: 4px; }

.vt-top { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 20px; }
.vt-tabs { display: inline-flex; padding: 3px; border: 1px solid var(--vt-border); border-radius: 10px; background: var(--vt-panel); }
.vt-tabs button { border: 0; background: none; padding: 6px 16px; border-radius: 7px; cursor: pointer; font-weight: 500; color: var(--vt-muted); }
.vt-tabs button[aria-selected="true"] { background: var(--vt-accent-strong); color: #fff; }
.vt-mode { font-size: 12px; padding: 3px 10px; border-radius: 999px; background: var(--vt-accent-soft); color: var(--vt-accent); }
.vt-mode.live { background: var(--vt-ok-soft); color: var(--vt-ok); }

.vt-section { display: grid; gap: 16px; }
.vt-empty { color: var(--vt-muted); padding: 12px 0; }
.vt-error { color: var(--vt-bad); font-size: 13px; }
.vt-hint { color: var(--vt-muted); font-size: 12.5px; }

.vt-filters { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; }
.vt-filters input { flex: 1 1 240px; width: auto; }
.vt-chips { display: flex; gap: 6px; flex-wrap: wrap; }
.vt-chips button { border: 1px solid var(--vt-border); background: var(--vt-panel); padding: 5px 12px; border-radius: 999px; cursor: pointer; }
.vt-chips button[aria-pressed="true"] { border-color: var(--vt-accent); color: var(--vt-accent); background: var(--vt-accent-soft); }

.vt-grid { list-style: none; margin: 0; padding: 0; display: grid; gap: 14px; grid-template-columns: repeat(auto-fill, minmax(210px, 1fr)); }
.vt-card { display: flex; flex-direction: column; border: 1px solid var(--vt-border); border-radius: 12px; background: var(--vt-panel); overflow: hidden; }
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
.vt-price strong { font-size: 18px; }
.vt-price em { font-style: normal; font-size: 12px; color: var(--vt-ok); font-weight: 600; }
.vt-buy { display: block; text-align: center; padding: 8px 12px; border-radius: 8px; background: var(--vt-accent-strong); color: #fff; text-decoration: none; font-weight: 600; }
.vt-buy:hover { filter: brightness(1.08); }
.vt-disclosure { font-size: 12px; color: var(--vt-muted); }

.vt-panel { display: grid; gap: 8px; align-content: start; padding: 16px; border: 1px solid var(--vt-border); border-radius: 12px; background: var(--vt-panel); min-width: 0; }
.vt-login { justify-items: center; padding: 24px 0; }
.vt-login .vt-panel { width: min(360px, 100%); }
.vt-primary { margin-top: 6px; padding: 9px 14px; border: 0; border-radius: 8px; background: var(--vt-accent-strong); color: #fff !important; font-weight: 600; cursor: pointer; }
.vt-primary:disabled { opacity: .55; cursor: not-allowed; }
.vt-ghost { border: 1px solid var(--vt-border); background: none; padding: 5px 12px; border-radius: 8px; cursor: pointer; }
.vt-bar { display: flex; justify-content: space-between; align-items: center; gap: 12px; }

.vt-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; }
.vt-stats div { display: grid; gap: 2px; padding: 12px 14px; border: 1px solid var(--vt-border); border-radius: 12px; background: var(--vt-panel); }
.vt-stats span { font-size: 12px; color: var(--vt-muted); }
.vt-stats strong { font-size: 20px; font-variant-numeric: tabular-nums; }

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

.vt-forms { display: grid; gap: 16px; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); }
@media (max-width: 520px) { .vt { padding: 14px; } }
`;
