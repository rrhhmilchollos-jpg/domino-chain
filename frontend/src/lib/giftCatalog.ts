// DOMINO CHAIN — Catálogo completo de regalos (clon TikTok)
// Tipos: 'normal' | 'interactive' | 'fullscreen'
// interactive = animación en pantalla del espectador
// fullscreen  = toma toda la pantalla del live (León, Universo, etc.)

export interface GiftDef {
  id: string;
  name: string;
  emoji: string;
  coins: number;
  points: number;
  type: 'normal' | 'interactive' | 'fullscreen';
  image: string;           // ruta en /gifts/
  sound: string;           // ruta en /sounds/
  animation: string;       // clase CSS o nombre de animación
  color: string;           // color dominante para el glow
  description: string;
  category: 'basic' | 'cute' | 'luxury' | 'domino' | 'special';
  comboMultiplier?: number; // para combo x2, x5, x10
}

export const GIFT_CATALOG_FULL: GiftDef[] = [
  // ─── BÁSICOS (baratos) ───────────────────────────────────────────────────
  {
    id: 'heart',
    name: 'Corazón',
    emoji: '❤️',
    coins: 1,
    points: 2,
    type: 'normal',
    image: '/gifts/gift_heart.png',
    sound: '/sounds/gift_heart.mp3',
    animation: 'anim-heart-float',
    color: '#FF4D6D',
    description: 'Un corazón lleno de amor',
    category: 'basic',
  },
  {
    id: 'fire',
    name: 'Fuego',
    emoji: '🔥',
    coins: 5,
    points: 10,
    type: 'normal',
    image: '/gifts/gift_fire.png',
    sound: '/sounds/gift_fire.mp3',
    animation: 'anim-fire-rise',
    color: '#FF6B35',
    description: '¡Esto está en llamas!',
    category: 'basic',
  },
  {
    id: 'star',
    name: 'Estrella',
    emoji: '⭐',
    coins: 10,
    points: 20,
    type: 'normal',
    image: '/gifts/gift_star.png',
    sound: '/sounds/gift_star.mp3',
    animation: 'anim-star-spin',
    color: '#FFD700',
    description: 'Eres una estrella',
    category: 'basic',
  },
  {
    id: 'confetti',
    name: 'Confeti',
    emoji: '🎉',
    coins: 15,
    points: 30,
    type: 'interactive',
    image: '/gifts/gift_confetti.png',
    sound: '/sounds/gift_confetti.mp3',
    animation: 'anim-confetti-burst',
    color: '#FF69B4',
    description: '¡A celebrar!',
    category: 'basic',
  },
  {
    id: 'panda',
    name: 'Panda',
    emoji: '🐼',
    coins: 20,
    points: 40,
    type: 'interactive',
    image: '/gifts/gift_panda.png',
    sound: '/sounds/gift_panda.mp3',
    animation: 'anim-panda-bounce',
    color: '#4A4A4A',
    description: 'Un panda adorable',
    category: 'cute',
  },
  // ─── DOMINO ESPECIALES ────────────────────────────────────────────────────
  {
    id: 'domino',
    name: 'Dominó',
    emoji: '🎲',
    coins: 25,
    points: 50,
    type: 'interactive',
    image: '/gifts/gift_domino.png',
    sound: '/sounds/gift_domino.mp3',
    animation: 'anim-domino-fall',
    color: '#00F5FF',
    description: 'La pieza clave de la cadena',
    category: 'domino',
    comboMultiplier: 2,
  },
  {
    id: 'chain',
    name: 'Cadena',
    emoji: '⛓️',
    coins: 50,
    points: 100,
    type: 'interactive',
    image: '/gifts/gift_domino.png',
    sound: '/sounds/gift_chain.mp3',
    animation: 'anim-chain-wave',
    color: '#FFD700',
    description: 'La cadena que nos une',
    category: 'domino',
    comboMultiplier: 3,
  },
  // ─── CUTE / ANIMALES ─────────────────────────────────────────────────────
  {
    id: 'mermaid',
    name: 'Sirena',
    emoji: '🧜‍♀️',
    coins: 80,
    points: 160,
    type: 'interactive',
    image: '/gifts/gift_mermaid.png',
    sound: '/sounds/gift_mermaid.mp3',
    animation: 'anim-mermaid-swim',
    color: '#00CED1',
    description: 'Una sirena mágica',
    category: 'cute',
  },
  // ─── LUXURY ──────────────────────────────────────────────────────────────
  {
    id: 'money_gun',
    name: 'Pistola de dinero',
    emoji: '💰',
    coins: 100,
    points: 200,
    type: 'interactive',
    image: '/gifts/gift_money_gun.png',
    sound: '/sounds/gift_money_gun.mp3',
    animation: 'anim-money-rain',
    color: '#00C853',
    description: '¡Lluvia de dinero!',
    category: 'luxury',
  },
  {
    id: 'airplane',
    name: 'Avión privado',
    emoji: '✈️',
    coins: 200,
    points: 400,
    type: 'interactive',
    image: '/gifts/gift_airplane.png',
    sound: '/sounds/gift_airplane.mp3',
    animation: 'anim-airplane-fly',
    color: '#C0C0C0',
    description: 'Viaja en primera clase',
    category: 'luxury',
  },
  {
    id: 'diamond',
    name: 'Diamante',
    emoji: '💎',
    coins: 500,
    points: 1000,
    type: 'interactive',
    image: '/gifts/gift_diamond.png',
    sound: '/sounds/gift_diamond.mp3',
    animation: 'anim-diamond-sparkle',
    color: '#B9F2FF',
    description: 'Puro lujo y elegancia',
    category: 'luxury',
  },
  {
    id: 'crown',
    name: 'Corona Real',
    emoji: '👑',
    coins: 800,
    points: 1600,
    type: 'interactive',
    image: '/gifts/gift_crown.png',
    sound: '/sounds/gift_crown.mp3',
    animation: 'anim-crown-descend',
    color: '#FFD700',
    description: 'Eres la realeza',
    category: 'luxury',
  },
  // ─── FULLSCREEN (interactivos que toman toda la pantalla) ─────────────────
  {
    id: 'lion',
    name: 'León',
    emoji: '🦁',
    coins: 1000,
    points: 2500,
    type: 'fullscreen',
    image: '/gifts/gift_lion.png',
    sound: '/sounds/gift_lion.mp3',
    animation: 'anim-lion-roar',
    color: '#FF8C00',
    description: 'El rey de la jungla ruge por ti',
    category: 'special',
    comboMultiplier: 5,
  },
  {
    id: 'galaxy',
    name: 'Galaxia',
    emoji: '🌌',
    coins: 2000,
    points: 5000,
    type: 'fullscreen',
    image: '/gifts/gift_galaxy.png',
    sound: '/sounds/gift_galaxy.mp3',
    animation: 'anim-galaxy-swirl',
    color: '#7B2FBE',
    description: 'Una galaxia entera para ti',
    category: 'special',
    comboMultiplier: 5,
  },
  {
    id: 'universe',
    name: 'Universo',
    emoji: '🌠',
    coins: 5000,
    points: 15000,
    type: 'fullscreen',
    image: '/gifts/gift_universe.png',
    sound: '/sounds/gift_universe.mp3',
    animation: 'anim-universe-explode',
    color: '#0A0A2E',
    description: 'El regalo más épico del universo',
    category: 'special',
    comboMultiplier: 10,
  },
];

// Mapa rápido por ID
export const GIFT_BY_ID: Record<string, GiftDef> = Object.fromEntries(
  GIFT_CATALOG_FULL.map(g => [g.id, g])
);

// Categorías para el panel de regalos
export const GIFT_CATEGORIES = [
  { id: 'all',    label: 'Todos',    emoji: '🎁' },
  { id: 'basic',  label: 'Básicos',  emoji: '⭐' },
  { id: 'cute',   label: 'Cute',     emoji: '🐼' },
  { id: 'domino', label: 'Dominó',   emoji: '🎲' },
  { id: 'luxury', label: 'Lujo',     emoji: '💎' },
  { id: 'special',label: 'Especial', emoji: '🦁' },
];
