/**
 * CSS isolado do microfrontend: tudo fica sob `.payops`, e o <style> é
 * renderizado pelo próprio componente. Assim o host não precisa saber de
 * nenhum arquivo .css do remote, e os estilos não vazam para o portfólio.
 */
export const css = `
.payops {
  --po-bg: #0b0f17;
  --po-panel: #121826;
  --po-panel-2: #182033;
  --po-border: #243049;
  --po-text: #e6ebf5;
  --po-muted: #8b97ad;
  --po-accent: #4f8cff;
  --po-ok: #2fbf71;
  --po-warn: #f0b429;
  --po-bad: #ef5b5b;
  --po-radius: 12px;
  color: var(--po-text);
  background: var(--po-bg);
  font: 14px/1.5 ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  border-radius: 16px;
  padding: 20px;
  box-sizing: border-box;
}
.payops *, .payops *::before, .payops *::after { box-sizing: inherit; }
.payops h2, .payops h3, .payops h4 { margin: 0; font-weight: 600; letter-spacing: -0.01em; }
.payops h2 { font-size: 18px; }
.payops h3 { font-size: 15px; }
.payops h4 { font-size: 13px; color: var(--po-muted); text-transform: uppercase; letter-spacing: .06em; }
.payops a { color: var(--po-accent); text-decoration: none; }
.payops a:hover { text-decoration: underline; }
.payops code, .payops .mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; }

.payops .po-top { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin-bottom: 16px; }
.payops .po-brand { display: flex; align-items: center; gap: 10px; }
.payops .po-logo { width: 32px; height: 32px; border-radius: 9px; background: linear-gradient(135deg, var(--po-accent), #8b5cf6); display: grid; place-items: center; font-weight: 700; }
.payops .po-sub { color: var(--po-muted); font-size: 12px; }
.payops .po-status { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }

.payops .po-grid { display: grid; grid-template-columns: minmax(0, 1.25fr) minmax(0, 1fr); gap: 16px; }
.payops .po-col { display: flex; flex-direction: column; gap: 16px; min-width: 0; }
@media (max-width: 900px) { .payops .po-grid { grid-template-columns: 1fr; } }

.payops .po-card { background: var(--po-panel); border: 1px solid var(--po-border); border-radius: var(--po-radius); padding: 16px; min-width: 0; }
.payops .po-card-head { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; margin-bottom: 12px; }
.payops .po-card.human { border-color: #6b5320; background: linear-gradient(180deg, #1c1810, var(--po-panel)); }

.payops .po-tabs { display: flex; gap: 4px; background: var(--po-panel-2); padding: 4px; border-radius: 10px; margin-bottom: 14px; flex-wrap: wrap; }
.payops .po-tab { flex: 1; border: 0; background: transparent; color: var(--po-muted); padding: 8px 10px; border-radius: 8px; cursor: pointer; font: inherit; white-space: nowrap; }
.payops .po-tab[aria-selected="true"] { background: var(--po-panel); color: var(--po-text); box-shadow: 0 1px 0 var(--po-border); }

.payops form { display: flex; flex-direction: column; gap: 12px; }
.payops .po-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
@media (max-width: 560px) { .payops .po-row { grid-template-columns: 1fr; } }
.payops label { display: flex; flex-direction: column; gap: 6px; font-size: 12px; color: var(--po-muted); }
.payops input, .payops select, .payops textarea {
  background: var(--po-bg); color: var(--po-text); border: 1px solid var(--po-border); border-radius: 8px;
  padding: 9px 11px; font: inherit; font-size: 14px; outline: none; width: 100%;
}
.payops textarea { min-height: 110px; resize: vertical; }
.payops input:focus, .payops select:focus, .payops textarea:focus { border-color: var(--po-accent); }
.payops .po-err { color: var(--po-bad); font-size: 12px; min-height: 0; }
.payops .po-hint { color: var(--po-muted); font-size: 12px; }

.payops .po-btn { border: 1px solid var(--po-border); background: var(--po-panel-2); color: var(--po-text); padding: 9px 14px; border-radius: 8px; cursor: pointer; font: inherit; font-weight: 500; }
.payops .po-btn:hover:not(:disabled) { border-color: var(--po-accent); }
.payops .po-btn:disabled { opacity: .5; cursor: not-allowed; }
.payops .po-btn.primary { background: var(--po-accent); border-color: var(--po-accent); color: white; }
.payops .po-btn.ok { background: var(--po-ok); border-color: var(--po-ok); color: #06210f; }
.payops .po-btn.bad { background: transparent; border-color: var(--po-bad); color: var(--po-bad); }
.payops .po-btn.small { padding: 4px 10px; font-size: 12px; }
.payops .po-actions { display: flex; gap: 8px; flex-wrap: wrap; }

.payops .po-pill { display: inline-flex; align-items: center; gap: 6px; padding: 2px 9px; border-radius: 999px; font-size: 12px; border: 1px solid var(--po-border); background: var(--po-panel-2); color: var(--po-muted); white-space: nowrap; }
.payops .po-pill.ok { color: var(--po-ok); border-color: #1f5c3b; }
.payops .po-pill.bad { color: var(--po-bad); border-color: #6b2b2b; }
.payops .po-pill.warn { color: var(--po-warn); border-color: #6b5320; }
.payops .po-dot { width: 7px; height: 7px; border-radius: 50%; background: currentColor; }

.payops .po-empty { color: var(--po-muted); text-align: center; padding: 18px 8px; font-size: 13px; }
.payops .po-list { display: flex; flex-direction: column; gap: 10px; }

.payops .po-approval { border: 1px solid #6b5320; border-radius: 10px; padding: 12px; background: #15120c; display: flex; flex-direction: column; gap: 8px; }
.payops .po-approval-amount { font-size: 20px; font-weight: 600; }
.payops .po-kv { display: grid; grid-template-columns: auto 1fr; gap: 2px 10px; font-size: 12px; }
.payops .po-kv dt { color: var(--po-muted); }
.payops .po-kv dd { margin: 0; overflow-wrap: anywhere; }
.payops .po-countdown { font-size: 12px; color: var(--po-warn); }

.payops .po-balance { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
.payops .po-balance-item { background: var(--po-panel-2); border-radius: 10px; padding: 10px 12px; }
.payops .po-balance-item b { display: block; font-size: 16px; margin-top: 2px; }

.payops .po-entry { border: 1px solid var(--po-border); border-radius: 10px; padding: 12px; background: var(--po-panel-2); display: flex; flex-direction: column; gap: 8px; }
.payops .po-entry-head { display: flex; justify-content: space-between; align-items: center; gap: 8px; flex-wrap: wrap; }
.payops .po-chain { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; color: var(--po-muted); font-size: 12px; }
.payops .po-answer { font-size: 13px; }
.payops .po-spinner { width: 12px; height: 12px; border: 2px solid currentColor; border-right-color: transparent; border-radius: 50%; animation: po-spin .8s linear infinite; display: inline-block; }
@keyframes po-spin { to { transform: rotate(360deg); } }
.payops details summary { cursor: pointer; color: var(--po-muted); font-size: 12px; }
.payops pre { background: var(--po-bg); border: 1px solid var(--po-border); border-radius: 8px; padding: 10px; overflow: auto; max-height: 240px; margin: 6px 0 0; font-size: 12px; }

.payops .po-banner { border-radius: 10px; padding: 10px 12px; font-size: 13px; border: 1px solid; }
.payops .po-banner.bad { border-color: #6b2b2b; background: #2a1414; color: #ffb4b4; }
.payops .po-banner.info { border-color: var(--po-border); background: var(--po-panel-2); color: var(--po-muted); }
`;
