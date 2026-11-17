/**
 * Tokens visuais da marca Lagoski, compartilhados pelos quatro microfrontends.
 * Cada remote aplica sob a sua própria classe (`.lgk-catalog`, ...), então nada
 * vaza para o portfólio nem entre remotes. As cores por contexto são as mesmas
 * da página de arquitetura.
 */
export const lagoskiTokens = (scope: string) => `
${scope} {
  --lg-bg: #f5f7f6;
  --lg-surface: #ffffff;
  --lg-ink: #13262b;
  --lg-muted: #566a6e;
  --lg-line: #d9e1df;
  --lg-lake: #145566;
  --lg-lake-strong: #0f4554;
  --lg-lake-soft: #e3eff1;
  --lg-ok: #1d7a4c;
  --lg-warn: #8a5600;
  --lg-bad: #b4232c;
  --lg-catalog: #0f766e; --lg-catalog-soft: #dff2f0;
  --lg-ordering: #4338ca; --lg-ordering-soft: #e6e8fb;
  --lg-inventory: #8a3f0a; --lg-inventory-soft: #fcefd8;
  --lg-payment: #be185d; --lg-payment-soft: #fbe3ea;
  --lg-fulfillment: #166534; --lg-fulfillment-soft: #e2f3e5;
  --lg-notification: #6b5b8a; --lg-notification-soft: #ece8f3;
  --lg-radius: 12px;
  --lg-mono: ui-monospace, SFMono-Regular, Menlo, monospace;
  color: var(--lg-ink);
  font: 14px/1.5 ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  -webkit-font-smoothing: antialiased;
}
@media (prefers-color-scheme: dark) {
  ${scope} {
    --lg-bg: #0e1517;
    --lg-surface: #142024;
    --lg-ink: #e4eef0;
    --lg-muted: #93a8ad;
    --lg-line: #26363a;
    --lg-lake: #6cc3d5;
    --lg-lake-strong: #1b6f82;
    --lg-lake-soft: #16343c;
    --lg-ok: #5fd39a;
    --lg-warn: #f2b94b;
    --lg-bad: #ff8a8f;
    --lg-catalog: #5eead4; --lg-catalog-soft: #0f2f2c;
    --lg-ordering: #a5b4fc; --lg-ordering-soft: #1e2150;
    --lg-inventory: #fbbf24; --lg-inventory-soft: #362710;
    --lg-payment: #f9a8d4; --lg-payment-soft: #3a1526;
    --lg-fulfillment: #86efac; --lg-fulfillment-soft: #122e1b;
    --lg-notification: #c4b5fd; --lg-notification-soft: #282336;
  }
}
${scope} *, ${scope} *::before, ${scope} *::after { box-sizing: border-box; }
${scope} h2, ${scope} h3, ${scope} h4 { margin: 0; letter-spacing: -0.01em; line-height: 1.25; color: var(--lg-ink); }
${scope} p { margin: 0; }
${scope} code { font-family: var(--lg-mono); font-size: 12px; background: var(--lg-lake-soft); color: var(--lg-ink); padding: 1px 5px; border-radius: 5px; }
${scope} button { font: inherit; cursor: pointer; }
${scope} button:focus-visible, ${scope} a:focus-visible, ${scope} input:focus-visible, ${scope} select:focus-visible { outline: 2px solid var(--lg-lake); outline-offset: 2px; }
${scope} .lg-panel { background: var(--lg-surface); border: 1px solid var(--lg-line); border-radius: var(--lg-radius); padding: 16px; }
${scope} .lg-head { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; flex-wrap: wrap; margin-bottom: 12px; }
${scope} .lg-head h3 { font-size: 16px; }
${scope} .lg-owner { font: 11px var(--lg-mono); color: var(--lg-muted); letter-spacing: .04em; text-transform: uppercase; }
${scope} .lg-btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; border: 1px solid var(--lg-line); background: var(--lg-surface); color: var(--lg-ink); border-radius: 9px; padding: 8px 12px; font-weight: 500; }
${scope} .lg-btn:hover:not(:disabled) { border-color: var(--lg-lake); }
${scope} .lg-btn:disabled { opacity: .55; cursor: not-allowed; }
${scope} .lg-btn.primary { background: var(--lg-lake-strong); border-color: var(--lg-lake-strong); color: #fff; }
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
${scope} .lg-ctx { display: inline-block; font: 11px var(--lg-mono); color: var(--c); background: var(--c-soft); border-radius: 5px; padding: 1px 6px; white-space: nowrap; }
@media (prefers-reduced-motion: reduce) { ${scope} * { transition: none !important; animation: none !important; } }
`;
