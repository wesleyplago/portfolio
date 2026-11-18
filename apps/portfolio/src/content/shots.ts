// Capturas dos apps (Task 9). Importadas pelo Vite para o caminho respeitar o BASE_URL do deploy.
const files = import.meta.glob<string>('../assets/shots/*.jpg', { eager: true, query: '?url', import: 'default' });

function shot(name: string): string {
  const url = files[`../assets/shots/${name}.jpg`];
  if (!url) throw new Error(`captura não encontrada: ${name}.jpg`);
  return url;
}

export const frameShot = (id: string) => shot(`${id}-frame`);
export const cropShot = (id: string) => shot(`${id}-crop`);

/** Proporção de cada captura -frame: 1206×800, menos a vitrine (1206×533), que cortada em 3:2 perderia as laterais. */
export const frameAspect = (id: string) => (id === 'vitrine' ? '1206 / 533' : '1206 / 800');
