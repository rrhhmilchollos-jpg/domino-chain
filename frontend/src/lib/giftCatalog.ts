// DOMINO CHAIN — Catálogo completo de regalos (clon TikTok LIVE)
// 50+ regalos organizados por categorías con iconos 3D

export interface GiftDef {
  id: string;
  name: string;
  emoji: string;
  coins: number;
  points: number;
  type: 'normal' | 'interactive' | 'fullscreen';
  image: string;
  sound: string;
  animation: string;
  color: string;
  description: string;
  category: 'popular' | 'cute' | 'love' | 'domino' | 'luxury' | 'funny' | 'nature' | 'special';
  comboMultiplier?: number;
}

export const GIFT_CATALOG_FULL: GiftDef[] = [
  // ─── POPULAR ───────────────────────────────────────────────────────────────
  { id:'heart', name:'Corazón', emoji:'❤️', coins:1, points:2, type:'normal', image:'/gifts/gift_heart.png', sound:'/sounds/gift_heart.mp3', animation:'anim-heart-float', color:'#FF4D6D', description:'Un corazón lleno de amor', category:'popular' },
  { id:'fire', name:'Fuego', emoji:'🔥', coins:5, points:10, type:'normal', image:'/gifts/gift_fire.png', sound:'/sounds/gift_fire.mp3', animation:'anim-fire-rise', color:'#FF6B35', description:'¡Esto está en llamas!', category:'popular' },
  { id:'star', name:'Estrella', emoji:'⭐', coins:10, points:20, type:'normal', image:'/gifts/gift_star.png', sound:'/sounds/gift_star.mp3', animation:'anim-star-spin', color:'#FFD700', description:'Eres una estrella', category:'popular' },
  { id:'rose', name:'Rosa', emoji:'🌹', coins:15, points:30, type:'interactive', image:'/gifts/gift_rose.png', sound:'/sounds/gift_rose.mp3', animation:'anim-float-up', color:'#E91E8C', description:'Una rosa preciosa', category:'popular' },
  { id:'confetti', name:'Confeti', emoji:'🎉', coins:15, points:30, type:'interactive', image:'/gifts/gift_confetti.png', sound:'/sounds/gift_confetti.mp3', animation:'anim-confetti-burst', color:'#FF69B4', description:'¡A celebrar!', category:'popular', comboMultiplier:2 },
  { id:'microphone', name:'Micrófono', emoji:'🎤', coins:20, points:40, type:'interactive', image:'/gifts/gift_microphone.png', sound:'/sounds/gift_mic.mp3', animation:'anim-float-up', color:'#9C27B0', description:'¡Eres una estrella del pop!', category:'popular' },
  { id:'golden_coin', name:'Moneda de Oro', emoji:'🪙', coins:25, points:50, type:'interactive', image:'/gifts/gift_golden_coin.png', sound:'/sounds/gift_coin.mp3', animation:'anim-money-rain', color:'#FFD700', description:'Lluvia de monedas de oro', category:'popular' },
  { id:'shooting_star', name:'Estrella Fugaz', emoji:'🌠', coins:30, points:60, type:'interactive', image:'/gifts/gift_shooting_star.png', sound:'/sounds/gift_star.mp3', animation:'anim-airplane-fly', color:'#00BCD4', description:'Pide un deseo', category:'popular' },

  // ─── CUTE ──────────────────────────────────────────────────────────────────
  { id:'panda', name:'Panda', emoji:'🐼', coins:20, points:40, type:'interactive', image:'/gifts/gift_panda_bamboo.png', sound:'/sounds/gift_panda.mp3', animation:'anim-panda-bounce', color:'#4A4A4A', description:'Un panda adorable', category:'cute' },
  { id:'teddy_bear', name:'Oso de Peluche', emoji:'🧸', coins:35, points:70, type:'interactive', image:'/gifts/gift_teddy_bear.png', sound:'/sounds/gift_heart.mp3', animation:'anim-panda-bounce', color:'#A0522D', description:'Un osito adorable', category:'cute' },
  { id:'cat', name:'Gatito', emoji:'🐱', coins:40, points:80, type:'interactive', image:'/gifts/gift_cat.png', sound:'/sounds/gift_heart.mp3', animation:'anim-panda-bounce', color:'#FF9800', description:'¡Miau! Un gatito con corazones', category:'cute' },
  { id:'butterfly', name:'Mariposa', emoji:'🦋', coins:45, points:90, type:'interactive', image:'/gifts/gift_butterfly.png', sound:'/sounds/gift_butterfly.mp3', animation:'anim-mermaid-swim', color:'#7C4DFF', description:'Una mariposa iridiscente', category:'cute' },
  { id:'flamingo', name:'Flamenco', emoji:'🦩', coins:60, points:120, type:'interactive', image:'/gifts/gift_flamingo.png', sound:'/sounds/gift_heart.mp3', animation:'anim-float-up', color:'#FF80AB', description:'Un elegante flamenco rosa', category:'cute' },
  { id:'parrot', name:'Loro', emoji:'🦜', coins:55, points:110, type:'interactive', image:'/gifts/gift_parrot.png', sound:'/sounds/gift_heart.mp3', animation:'anim-float-up', color:'#69F0AE', description:'¡Un loro tropical colorido!', category:'cute' },
  { id:'whale', name:'Ballena', emoji:'🐋', coins:70, points:140, type:'interactive', image:'/gifts/gift_whale.png', sound:'/sounds/gift_heart.mp3', animation:'anim-mermaid-swim', color:'#2196F3', description:'Una ballena azul saltando', category:'cute' },
  { id:'donut', name:'Donut', emoji:'🍩', coins:20, points:40, type:'normal', image:'/gifts/gift_donut.png', sound:'/sounds/gift_heart.mp3', animation:'anim-star-spin', color:'#FF80AB', description:'Un donut con sprinkles', category:'cute' },
  { id:'ice_cream', name:'Helado', emoji:'🍦', coins:25, points:50, type:'normal', image:'/gifts/gift_ice_cream.png', sound:'/sounds/gift_heart.mp3', animation:'anim-float-up', color:'#F48FB1', description:'Un helado de dos bolas', category:'cute' },
  { id:'birthday_cake', name:'Tarta', emoji:'🎂', coins:80, points:160, type:'interactive', image:'/gifts/gift_birthday_cake.png', sound:'/sounds/gift_confetti.mp3', animation:'anim-confetti-burst', color:'#FF4081', description:'¡Feliz cumpleaños!', category:'cute', comboMultiplier:2 },

  // ─── LOVE ──────────────────────────────────────────────────────────────────
  { id:'flying_heart', name:'Corazón Volador', emoji:'💝', coins:30, points:60, type:'interactive', image:'/gifts/gift_flying_heart.png', sound:'/sounds/gift_heart.mp3', animation:'anim-heart-float', color:'#F44336', description:'Un corazón con alas doradas', category:'love' },
  { id:'cherry_blossom', name:'Sakura', emoji:'🌸', coins:50, points:100, type:'interactive', image:'/gifts/gift_cherry_blossom.png', sound:'/sounds/gift_heart.mp3', animation:'anim-confetti-burst', color:'#FFB7C5', description:'Flores de cerezo japonesas', category:'love' },
  { id:'lollipop', name:'Piruleta', emoji:'🍭', coins:15, points:30, type:'normal', image:'/gifts/gift_lollipop.png', sound:'/sounds/gift_heart.mp3', animation:'anim-star-spin', color:'#E91E8C', description:'Una piruleta de corazón', category:'love' },
  { id:'rainbow', name:'Arcoíris', emoji:'🌈', coins:75, points:150, type:'interactive', image:'/gifts/gift_rainbow.png', sound:'/sounds/gift_confetti.mp3', animation:'anim-airplane-fly', color:'#FF9800', description:'Un arcoíris de colores', category:'love', comboMultiplier:2 },
  { id:'angel_wings', name:'Alas de Ángel', emoji:'👼', coins:100, points:200, type:'interactive', image:'/gifts/gift_angel_wings.png', sound:'/sounds/gift_heart.mp3', animation:'anim-float-up', color:'#FFF9C4', description:'Alas doradas de ángel', category:'love', comboMultiplier:2 },

  // ─── DOMINO EXCLUSIVOS ─────────────────────────────────────────────────────
  { id:'domino', name:'Dominó', emoji:'🎲', coins:25, points:50, type:'interactive', image:'/gifts/gift_domino.png', sound:'/sounds/gift_domino.mp3', animation:'anim-domino-fall', color:'#00F5FF', description:'La pieza clave de la cadena', category:'domino', comboMultiplier:2 },
  { id:'chain', name:'Cadena', emoji:'⛓️', coins:50, points:100, type:'interactive', image:'/gifts/gift_chain.png', sound:'/sounds/gift_chain.mp3', animation:'anim-chain-wave', color:'#FFD700', description:'La cadena que nos une', category:'domino', comboMultiplier:3 },
  { id:'mermaid', name:'Sirena', emoji:'🧜‍♀️', coins:80, points:160, type:'interactive', image:'/gifts/gift_mermaid.png', sound:'/sounds/gift_mermaid.mp3', animation:'anim-mermaid-swim', color:'#00CED1', description:'Una sirena mágica', category:'domino' },
  { id:'pinwheel', name:'Molinillo', emoji:'🎡', coins:30, points:60, type:'interactive', image:'/gifts/gift_pinwheel.png', sound:'/sounds/gift_confetti.mp3', animation:'anim-star-spin', color:'#FF4081', description:'Un molinillo de colores girando', category:'domino' },
  { id:'magic_hat', name:'Sombrero Mágico', emoji:'🎩', coins:60, points:120, type:'interactive', image:'/gifts/gift_magic_hat.png', sound:'/sounds/gift_confetti.mp3', animation:'anim-confetti-burst', color:'#7C4DFF', description:'¡Un conejo sale del sombrero!', category:'domino' },
  { id:'magic_wand', name:'Varita Mágica', emoji:'🪄', coins:45, points:90, type:'interactive', image:'/gifts/gift_magic_wand.png', sound:'/sounds/gift_star.mp3', animation:'anim-confetti-burst', color:'#9C27B0', description:'Magia y chispas de colores', category:'domino' },

  // ─── LUXURY ────────────────────────────────────────────────────────────────
  { id:'money_gun', name:'Pistola de Dinero', emoji:'💸', coins:100, points:200, type:'interactive', image:'/gifts/gift_money_gun.png', sound:'/sounds/gift_money_gun.mp3', animation:'anim-money-rain', color:'#00C853', description:'¡Lluvia de billetes!', category:'luxury', comboMultiplier:3 },
  { id:'sports_car', name:'Coche Deportivo', emoji:'🏎️', coins:150, points:300, type:'interactive', image:'/gifts/gift_sports_car.png', sound:'/sounds/gift_airplane.mp3', animation:'anim-airplane-fly', color:'#F44336', description:'Un coche deportivo rojo', category:'luxury', comboMultiplier:2 },
  { id:'airplane', name:'Jet Privado', emoji:'✈️', coins:200, points:400, type:'interactive', image:'/gifts/gift_airplane.png', sound:'/sounds/gift_airplane.mp3', animation:'anim-airplane-fly', color:'#2196F3', description:'Un jet privado vuela por la pantalla', category:'luxury', comboMultiplier:3 },
  { id:'hot_air_balloon', name:'Globo Aerostático', emoji:'🎈', coins:120, points:240, type:'interactive', image:'/gifts/gift_hot_air_balloon.png', sound:'/sounds/gift_confetti.mp3', animation:'anim-float-up', color:'#FF9800', description:'Un globo aerostático colorido', category:'luxury', comboMultiplier:2 },
  { id:'castle', name:'Castillo', emoji:'🏰', coins:300, points:600, type:'interactive', image:'/gifts/gift_castle.png', sound:'/sounds/gift_crown.mp3', animation:'anim-crown-descend', color:'#E91E8C', description:'Un castillo de cuento de hadas', category:'luxury', comboMultiplier:3 },
  { id:'trophy', name:'Trofeo', emoji:'🏆', coins:250, points:500, type:'interactive', image:'/gifts/gift_trophy.png', sound:'/sounds/gift_crown.mp3', animation:'anim-crown-descend', color:'#FFD700', description:'¡Eres el campeón!', category:'luxury', comboMultiplier:3 },
  { id:'crown', name:'Corona Real', emoji:'👑', coins:800, points:1600, type:'interactive', image:'/gifts/gift_crown_gems.png', sound:'/sounds/gift_crown.mp3', animation:'anim-crown-descend', color:'#FFD700', description:'Una corona real con gemas', category:'luxury', comboMultiplier:5 },
  { id:'diamond', name:'Diamante', emoji:'💎', coins:500, points:1000, type:'interactive', image:'/gifts/gift_diamond.png', sound:'/sounds/gift_diamond.mp3', animation:'anim-diamond-sparkle', color:'#B9F2FF', description:'Puro lujo y elegancia', category:'luxury', comboMultiplier:5 },
  { id:'blue_diamond', name:'Diamante Azul', emoji:'🔷', coins:750, points:1500, type:'interactive', image:'/gifts/gift_blue_diamond.png', sound:'/sounds/gift_diamond.mp3', animation:'anim-diamond-sparkle', color:'#1565C0', description:'Un raro diamante azul', category:'luxury', comboMultiplier:5 },

  // ─── FUNNY ─────────────────────────────────────────────────────────────────
  { id:'disco_ball', name:'Bola de Disco', emoji:'🪩', coins:40, points:80, type:'interactive', image:'/gifts/gift_disco_ball.png', sound:'/sounds/gift_confetti.mp3', animation:'anim-star-spin', color:'#E040FB', description:'¡Que empiece la fiesta!', category:'funny', comboMultiplier:2 },
  { id:'horseshoe', name:'Herradura de la Suerte', emoji:'🧲', coins:35, points:70, type:'normal', image:'/gifts/gift_horseshoe.png', sound:'/sounds/gift_star.mp3', animation:'anim-float-up', color:'#FFD700', description:'¡Buena suerte!', category:'funny' },
  { id:'bell', name:'Campana', emoji:'🔔', coins:30, points:60, type:'interactive', image:'/gifts/gift_bell.png', sound:'/sounds/gift_confetti.mp3', animation:'anim-star-spin', color:'#FFD700', description:'¡Din don! Una campana dorada', category:'funny' },
  { id:'rocket', name:'Cohete', emoji:'🚀', coins:90, points:180, type:'interactive', image:'/gifts/gift_rocket.png', sound:'/sounds/gift_airplane.mp3', animation:'anim-airplane-fly', color:'#F44336', description:'¡Al infinito y más allá!', category:'funny', comboMultiplier:2 },

  // ─── NATURE ────────────────────────────────────────────────────────────────
  { id:'golden_sun', name:'Sol Dorado', emoji:'☀️', coins:55, points:110, type:'interactive', image:'/gifts/gift_golden_sun.png', sound:'/sounds/gift_star.mp3', animation:'anim-star-spin', color:'#FFD700', description:'Un sol brillante con gafas', category:'nature' },
  { id:'golden_star', name:'Estrella Dorada', emoji:'🌟', coins:65, points:130, type:'interactive', image:'/gifts/gift_golden_star.png', sound:'/sounds/gift_star.mp3', animation:'anim-star-spin', color:'#FFD700', description:'Una estrella dorada sonriente', category:'nature', comboMultiplier:2 },
  { id:'crystal_ball', name:'Bola de Cristal', emoji:'🔮', coins:150, points:300, type:'interactive', image:'/gifts/gift_crystal_ball.png', sound:'/sounds/gift_galaxy.mp3', animation:'anim-galaxy-swirl', color:'#7C4DFF', description:'Una bola de cristal con galaxia', category:'nature', comboMultiplier:3 },

  // ─── SPECIAL FULLSCREEN ────────────────────────────────────────────────────
  { id:'lion', name:'León', emoji:'🦁', coins:1000, points:2500, type:'fullscreen', image:'/gifts/gift_lion.png', sound:'/sounds/gift_lion.mp3', animation:'anim-lion-roar', color:'#FF8C00', description:'El rey de la jungla ruge por ti', category:'special', comboMultiplier:5 },
  { id:'galaxy', name:'Galaxia', emoji:'🌌', coins:2000, points:5000, type:'fullscreen', image:'/gifts/gift_galaxy.png', sound:'/sounds/gift_galaxy.mp3', animation:'anim-galaxy-swirl', color:'#7B2FBE', description:'Una galaxia entera para ti', category:'special', comboMultiplier:5 },
  { id:'universe', name:'Universo', emoji:'🌠', coins:5000, points:15000, type:'fullscreen', image:'/gifts/gift_universe.png', sound:'/sounds/gift_universe.mp3', animation:'anim-universe-explode', color:'#0A0A2E', description:'El regalo más épico del universo', category:'special', comboMultiplier:10 },
];

// Mapa rápido por ID
export const GIFT_BY_ID: Record<string, GiftDef> = Object.fromEntries(
  GIFT_CATALOG_FULL.map(g => [g.id, g])
);

// Categorías para el panel de regalos
export const GIFT_CATEGORIES = [
  { id: 'all',     label: 'Todos',      emoji: '🎁' },
  { id: 'popular', label: 'Popular',    emoji: '🔥' },
  { id: 'cute',    label: 'Cute',       emoji: '🐼' },
  { id: 'love',    label: 'Amor',       emoji: '❤️' },
  { id: 'domino',  label: 'DOMINO',     emoji: '🎲' },
  { id: 'luxury',  label: 'Lujo',       emoji: '💎' },
  { id: 'funny',   label: 'Divertido',  emoji: '🎉' },
  { id: 'nature',  label: 'Naturaleza', emoji: '🌟' },
  { id: 'special', label: 'Especial',   emoji: '🦁' },
];

// Paquetes de monedas para recargar (igual que TikTok)
export const COIN_PACKAGES = [
  { id: 'pack_70',   coins: 70,   price: 0.99,  bonus: 0,    popular: false },
  { id: 'pack_350',  coins: 350,  price: 4.99,  bonus: 0,    popular: false },
  { id: 'pack_700',  coins: 700,  price: 9.99,  bonus: 0,    popular: true  },
  { id: 'pack_1400', coins: 1400, price: 19.99, bonus: 100,  popular: false },
  { id: 'pack_3500', coins: 3500, price: 49.99, bonus: 350,  popular: false },
  { id: 'pack_7000', coins: 7000, price: 99.99, bonus: 1000, popular: false },
];
