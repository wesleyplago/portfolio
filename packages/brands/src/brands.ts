export type BrandId = 'host' | 'payops' | 'rag' | 'vitrine' | 'lagoski' | 'lagoski-inspector';

export type Palette = {
  bg: string;
  surface: string;
  ink: string;
  muted: string;
  border: string;
  accent: string;
  onAccent: string;
  ok: string;
  warn: string;
  bad: string;
};

export type Brand = {
  id: BrandId;
  name: string;
  mode: 'light' | 'dark';
  color: Palette;
  dark?: Palette;
  font: { display: string; text: string; mono: string };
  radius: { sm: string; md: string; lg: string };
};

const sans = (family: string, ...alt: string[]) => [family, ...alt].map((f) => `"${f}"`).join(', ') + ', ui-sans-serif, system-ui, sans-serif';
const serif = (family: string) => `"${family}", ui-serif, Georgia, serif`;
const mono = (family: string, ...alt: string[]) => [family, ...alt].map((f) => `"${f}"`).join(', ') + ', ui-monospace, SFMono-Regular, Menlo, monospace';
const systemMono = 'ui-monospace, SFMono-Regular, Menlo, monospace';

const sharp = { sm: '2px', md: '4px', lg: '6px' };
const soft = { sm: '6px', md: '10px', lg: '16px' };

export const brands: Record<BrandId, Brand> = {
  host: {
    id: 'host',
    name: 'Host',
    mode: 'light',
    color: {
      bg: '#eef0f3', surface: '#e2e5ea', ink: '#0b0c0e', muted: '#4b5260', border: '#cdd2da',
      accent: '#1f2de6', onAccent: '#ffffff', ok: '#186a42', warn: '#8a5600', bad: '#b42318',
    },
    dark: {
      bg: '#0a0d14', surface: '#131824', ink: '#e9edf3', muted: '#97a1b5', border: '#252d3d',
      accent: '#7d8aff', onAccent: '#0a0d14', ok: '#5fd39a', warn: '#f2b94b', bad: '#ff8a8f',
    },
    // Os pacotes @fontsource-variable declaram "Host Grotesk Variable" e "JetBrains Mono Variable".
    font: {
      display: sans('Host Grotesk Variable', 'Host Grotesk'),
      text: sans('Host Grotesk Variable', 'Host Grotesk'),
      mono: mono('JetBrains Mono Variable', 'JetBrains Mono'),
    },
    radius: sharp,
  },
  payops: {
    id: 'payops',
    name: 'PayOps',
    mode: 'light',
    color: {
      bg: '#f7f9fa', surface: '#ecf0f2', ink: '#1f3038', muted: '#52656d', border: '#d3dbdf',
      accent: '#0d7480', onAccent: '#ffffff', ok: '#1d7a4c', warn: '#8a5600', bad: '#b42318',
    },
    font: { display: sans('Chivo'), text: sans('Chivo'), mono: mono('Chivo Mono') },
    radius: sharp,
  },
  rag: {
    id: 'rag',
    name: 'RAG',
    mode: 'dark',
    color: {
      bg: '#18191b', surface: '#222427', ink: '#eff0f1', muted: '#a1a6ad', border: '#34373c',
      accent: '#ff4a1f', onAccent: '#18191b', ok: '#4cc38a', warn: '#f0b429', bad: '#ff7a8a',
    },
    font: { display: sans('Funnel Display'), text: sans('Funnel Sans'), mono: mono('DM Mono') },
    radius: sharp,
  },
  vitrine: {
    id: 'vitrine',
    name: 'Vitrine',
    mode: 'light',
    color: {
      bg: '#e2e2e2', surface: '#d6d6d6', ink: '#7d0c14', muted: '#5a4446', border: '#c4c4c4',
      accent: '#7d0c14', onAccent: '#ffffff', ok: '#1a5c38', warn: '#6e4a00', bad: '#a3121c',
    },
    font: { display: serif('Zilla Slab'), text: sans('Rethink Sans'), mono: systemMono },
    radius: soft,
  },
  lagoski: {
    id: 'lagoski',
    name: 'Lagoski',
    mode: 'light',
    color: {
      bg: '#e5e1d8', surface: '#dad5ca', ink: '#2a1d17', muted: '#5e5148', border: '#c9c2b5',
      accent: '#3b6131', onAccent: '#ffffff', ok: '#1a5c38', warn: '#7d4e00', bad: '#9e2a1f',
    },
    font: { display: serif('Newsreader'), text: sans('Hanken Grotesk'), mono: mono('JetBrains Mono') },
    radius: soft,
  },
  'lagoski-inspector': {
    id: 'lagoski-inspector',
    name: 'Lagoski Inspector',
    mode: 'dark',
    color: {
      bg: '#1c1411', surface: '#261c18', ink: '#f1ebe4', muted: '#b3a69a', border: '#3a2d27',
      accent: '#a8d98a', onAccent: '#1c1411', ok: '#7fd6a0', warn: '#f2b94b', bad: '#ff8a7a',
    },
    font: { display: sans('Hanken Grotesk'), text: sans('Hanken Grotesk'), mono: mono('JetBrains Mono') },
    radius: soft,
  },
};
