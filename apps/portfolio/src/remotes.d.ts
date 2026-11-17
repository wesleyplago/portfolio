// Tipos dos módulos carregados em runtime via Module Federation.
declare module 'payops/App' {
  import type { ComponentType } from 'react';
  const PayOpsApp: ComponentType;
  export default PayOpsApp;
}

declare module 'rag/App' {
  import type { ComponentType } from 'react';
  const RagApp: ComponentType;
  export default RagApp;
}

declare module 'vitrine/App' {
  import type { ComponentType } from 'react';
  const VitrineApp: ComponentType;
  export default VitrineApp;
}

declare module 'lagoskiCatalog/App' {
  import type { ComponentType } from 'react';
  const LagoskiCatalogApp: ComponentType;
  export default LagoskiCatalogApp;
}

declare module 'lagoskiCheckout/App' {
  import type { ComponentType } from 'react';
  const LagoskiCheckoutApp: ComponentType;
  export default LagoskiCheckoutApp;
}

declare module 'lagoskiOrders/App' {
  import type { ComponentType } from 'react';
  const LagoskiOrdersApp: ComponentType;
  export default LagoskiOrdersApp;
}

declare module 'lagoskiInspector/App' {
  import type { ComponentType } from 'react';
  const LagoskiInspectorApp: ComponentType;
  export default LagoskiInspectorApp;
}
