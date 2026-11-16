/**
 * Valores padrão = credenciais de demo do docker-compose do payops-agent.
 * As duas chaves ficam no browser só porque esta é uma demo local em que você
 * faz os dois papéis (operador e aprovador). Em produção, o canal humano
 * ficaria em outra aplicação, atrás de SSO/MFA, e o agente nunca o veria.
 */
export const config = {
  apiUrl: import.meta.env.VITE_PAYOPS_API_URL ?? 'http://127.0.0.1:3000',
  agentKey: import.meta.env.VITE_PAYOPS_AGENT_KEY ?? 'compose-agent-key-change-me',
  approverKey: import.meta.env.VITE_PAYOPS_APPROVER_KEY ?? 'compose-approver-secret-change-me',
  jaegerUrl: import.meta.env.VITE_JAEGER_URL ?? 'http://127.0.0.1:16686',
};
