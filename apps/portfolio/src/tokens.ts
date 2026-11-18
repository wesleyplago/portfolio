import { brands, tokensCss } from '@portfolio/brands';

export function injectHostTokens(): void {
  const style = document.createElement('style');
  style.dataset.hostTokens = '';
  style.textContent = tokensCss(brands.host, ':root', 'h');
  document.head.prepend(style);
}
