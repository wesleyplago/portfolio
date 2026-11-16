/// <reference types="vite/client" />
interface ImportMetaEnv {
  readonly VITE_PAYOPS_API_URL?: string;
  readonly VITE_PAYOPS_AGENT_KEY?: string;
  readonly VITE_PAYOPS_APPROVER_KEY?: string;
  readonly VITE_JAEGER_URL?: string;
}
