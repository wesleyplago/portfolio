/**
 * CSS isolado do microfrontend: tudo fica sob `.rag`, e o <style> é renderizado
 * pelo próprio componente. O host não precisa saber de nenhum arquivo .css do
 * remote, e os estilos não vazam para o portfólio.
 */
export const css = `
.rag {
  --rg-bg: #0b0f17;
  --rg-panel: #121826;
  --rg-panel-2: #182033;
  --rg-border: #243049;
  --rg-text: #e6ebf5;
  --rg-muted: #8b97ad;
  --rg-accent: #22c3a6;
  --rg-ok: #2fbf71;
  --rg-warn: #f0b429;
  --rg-bad: #ef5b5b;
  --rg-radius: 12px;
  color: var(--rg-text);
  background: var(--rg-bg);
  font: 14px/1.5 ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  border-radius: 16px;
  padding: 20px;
  box-sizing: border-box;
}
.rag *, .rag *::before, .rag *::after { box-sizing: inherit; }
.rag h2, .rag h3, .rag h4 { margin: 0; font-weight: 600; letter-spacing: -0.01em; }
.rag h2 { font-size: 18px; }
.rag h3 { font-size: 15px; }
.rag h4 { font-size: 13px; color: var(--rg-muted); text-transform: uppercase; letter-spacing: .06em; }
.rag a { color: var(--rg-accent); text-decoration: none; }
.rag a:hover { text-decoration: underline; }
.rag code, .rag .mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; }
.rag mark { background: rgba(34, 195, 166, .22); color: var(--rg-text); border-radius: 3px; padding: 0 2px; }

.rag .rg-top { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin-bottom: 16px; }
.rag .rg-brand { display: flex; align-items: center; gap: 10px; }
.rag .rg-logo { width: 32px; height: 32px; border-radius: 9px; background: linear-gradient(135deg, var(--rg-accent), #4f8cff); display: grid; place-items: center; font-weight: 700; color: #04130f; }
.rag .rg-sub { color: var(--rg-muted); font-size: 12px; }
.rag .rg-status { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }

.rag .rg-tabs { display: flex; gap: 4px; background: var(--rg-panel-2); padding: 4px; border-radius: 10px; margin-bottom: 16px; }
.rag .rg-tab { flex: 1; border: 0; background: transparent; color: var(--rg-muted); padding: 8px 10px; border-radius: 8px; cursor: pointer; font: inherit; white-space: nowrap; }
.rag .rg-tab[aria-selected="true"] { background: var(--rg-panel); color: var(--rg-text); box-shadow: 0 1px 0 var(--rg-border); }

.rag .rg-grid { display: grid; grid-template-columns: minmax(0, 1.6fr) minmax(0, 1fr); gap: 16px; }
.rag .rg-col { display: flex; flex-direction: column; gap: 16px; min-width: 0; }
@media (max-width: 900px) { .rag .rg-grid { grid-template-columns: 1fr; } }

.rag .rg-card { background: var(--rg-panel); border: 1px solid var(--rg-border); border-radius: var(--rg-radius); padding: 16px; min-width: 0; }
.rag .rg-card-head { display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-bottom: 12px; flex-wrap: wrap; }
.rag .rg-meta { display: flex; gap: 6px; flex-wrap: wrap; }

.rag form { display: flex; flex-direction: column; gap: 12px; }
.rag label { display: flex; flex-direction: column; gap: 6px; font-size: 12px; color: var(--rg-muted); }
.rag label.rg-inline { flex-direction: row; align-items: center; gap: 8px; }
.rag input, .rag select, .rag textarea {
  background: var(--rg-bg); color: var(--rg-text); border: 1px solid var(--rg-border); border-radius: 8px;
  padding: 9px 11px; font: inherit; font-size: 14px; outline: none;
}
.rag textarea { width: 100%; resize: vertical; min-height: 72px; }
.rag select { width: auto; }
.rag input:focus, .rag select:focus, .rag textarea:focus { border-color: var(--rg-accent); }
.rag .rg-err { color: var(--rg-bad); font-size: 12px; }
.rag .rg-hint { color: var(--rg-muted); font-size: 12px; }

.rag .rg-btn { border: 1px solid var(--rg-border); background: var(--rg-panel-2); color: var(--rg-text); padding: 9px 14px; border-radius: 8px; cursor: pointer; font: inherit; font-weight: 500; display: inline-flex; align-items: center; gap: 8px; }
.rag .rg-btn:hover:not(:disabled) { border-color: var(--rg-accent); }
.rag .rg-btn:disabled { opacity: .5; cursor: not-allowed; }
.rag .rg-btn.primary { background: var(--rg-accent); border-color: var(--rg-accent); color: #04130f; }
.rag .rg-btn.small { padding: 4px 10px; font-size: 12px; }
.rag .rg-actions { display: flex; gap: 10px; align-items: center; justify-content: space-between; flex-wrap: wrap; }

.rag .rg-examples { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; margin-top: 12px; }
.rag .rg-chip { border: 1px solid var(--rg-border); background: var(--rg-panel-2); color: var(--rg-text); padding: 4px 10px; border-radius: 999px; cursor: pointer; font: inherit; font-size: 12px; }
.rag .rg-chip:hover:not(:disabled) { border-color: var(--rg-accent); }

.rag .rg-pill { display: inline-flex; align-items: center; gap: 6px; padding: 2px 9px; border-radius: 999px; font-size: 12px; border: 1px solid var(--rg-border); background: var(--rg-panel-2); color: var(--rg-muted); white-space: nowrap; }
.rag .rg-pill.ok { color: var(--rg-ok); border-color: #1f5c3b; }
.rag .rg-pill.bad { color: var(--rg-bad); border-color: #6b2b2b; }
.rag .rg-pill.warn { color: var(--rg-warn); border-color: #6b5320; }
.rag .rg-dot { width: 7px; height: 7px; border-radius: 50%; background: currentColor; }

.rag .rg-empty { color: var(--rg-muted); text-align: center; padding: 18px 8px; font-size: 13px; display: flex; gap: 8px; justify-content: center; align-items: center; }
.rag .rg-list { display: flex; flex-direction: column; gap: 10px; }

.rag .rg-hit { border: 1px solid var(--rg-border); border-radius: 10px; padding: 12px; background: var(--rg-panel-2); display: flex; flex-direction: column; gap: 8px; }
.rag .rg-hit-head { display: flex; gap: 10px; align-items: flex-start; }
.rag .rg-rank { font-weight: 700; color: var(--rg-accent); min-width: 26px; }
.rag .rg-hit-title { display: flex; flex-direction: column; gap: 2px; flex: 1; min-width: 0; }
.rag .rg-hit-title .rg-sub { overflow-wrap: anywhere; }
.rag .rg-text { margin: 0; font-size: 13px; white-space: pre-wrap; overflow-wrap: anywhere; }
.rag .rg-hit-foot { display: flex; justify-content: space-between; align-items: center; gap: 8px; flex-wrap: wrap; }

.rag .rg-abstain { border: 1px solid #6b5320; background: #1c1810; color: #f3dca2; border-radius: 10px; padding: 12px; font-size: 13px; }

.rag .rg-history { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
.rag .rg-history-item { width: 100%; text-align: left; border: 1px solid var(--rg-border); background: var(--rg-panel-2); color: var(--rg-text); border-radius: 8px; padding: 8px 10px; cursor: pointer; font: inherit; display: flex; flex-direction: column; gap: 2px; }
.rag .rg-history-item:hover { border-color: var(--rg-accent); }
.rag .rg-history-q { font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.rag .rg-table-wrap { overflow-x: auto; }
.rag .rg-table { width: 100%; border-collapse: collapse; font-size: 13px; font-variant-numeric: tabular-nums; }
.rag .rg-table th { text-align: left; color: var(--rg-muted); font-weight: 500; font-size: 12px; padding: 6px 8px; border-bottom: 1px solid var(--rg-border); white-space: nowrap; }
.rag .rg-table td { padding: 7px 8px; border-bottom: 1px solid var(--rg-border); white-space: nowrap; }
.rag .rg-cell-bar { display: flex; align-items: center; gap: 8px; }
.rag .rg-bar { width: 80px; height: 6px; background: var(--rg-panel-2); border-radius: 999px; overflow: hidden; }
.rag .rg-bar span { display: block; height: 100%; background: var(--rg-accent); border-radius: 999px; }

.rag .rg-spinner { width: 12px; height: 12px; border: 2px solid currentColor; border-right-color: transparent; border-radius: 50%; animation: rg-spin .8s linear infinite; display: inline-block; }
@keyframes rg-spin { to { transform: rotate(360deg); } }

.rag .rg-banner { border-radius: 10px; padding: 10px 12px; font-size: 13px; border: 1px solid; }
.rag .rg-banner.bad { border-color: #6b2b2b; background: #2a1414; color: #ffb4b4; }
.rag .rg-banner.info { border-color: var(--rg-border); background: var(--rg-panel-2); color: var(--rg-muted); }
.rag ul.rg-steps { margin: 0; padding-left: 18px; display: grid; gap: 4px; }
`;
