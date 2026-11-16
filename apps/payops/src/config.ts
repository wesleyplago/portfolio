/**
 * Sem valores padrão de propósito: o microfrontend não sabe onde fica o backend
 * a menos que alguém declare. Sem API declarada (ou fora do ar na subida), ele
 * usa o mock em memória de @portfolio/payops-contracts.
 *
 * As chaves só existem no modo real e ficam no browser porque esta é uma demo
 * em que você faz os dois papéis. Em produção, o canal humano seria outra
 * aplicação, atrás de SSO/MFA, e o agente nunca o veria.
 */
const clean = (v: string | undefined) => (v && v.trim() ? v.trim() : undefined);

export const config = {
  apiUrl: clean(import.meta.env.VITE_PAYOPS_API_URL),
  agentKey: clean(import.meta.env.VITE_PAYOPS_AGENT_KEY),
  approverKey: clean(import.meta.env.VITE_PAYOPS_APPROVER_KEY),
  jaegerUrl: clean(import.meta.env.VITE_JAEGER_URL),
  /** Quanto esperar pelo /readyz na subida antes de cair para o mock. */
  probeTimeoutMs: 2_500,
};
