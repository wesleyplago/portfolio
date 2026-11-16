// Tipos dos módulos carregados em runtime via Module Federation.
declare module 'payops/App' {
  import type { ComponentType } from 'react';
  const PayOpsApp: ComponentType;
  export default PayOpsApp;
}
