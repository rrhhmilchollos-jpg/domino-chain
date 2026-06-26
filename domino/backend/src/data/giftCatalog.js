// DOMINO CHAIN — Catálogo de regalos backend
// Sincronizado con el frontend giftCatalog.ts

const GIFT_CATALOG_BACKEND = {
  heart:      { name: 'Corazón',          emoji: '❤️',  coins: 1,    points: 2,     type: 'normal'      },
  fire:       { name: 'Fuego',            emoji: '🔥',  coins: 5,    points: 10,    type: 'normal'      },
  star:       { name: 'Estrella',         emoji: '⭐',  coins: 10,   points: 20,    type: 'normal'      },
  confetti:   { name: 'Confeti',          emoji: '🎉',  coins: 15,   points: 30,    type: 'interactive' },
  panda:      { name: 'Panda',            emoji: '🐼',  coins: 20,   points: 40,    type: 'interactive' },
  domino:     { name: 'Dominó',           emoji: '🎲',  coins: 25,   points: 50,    type: 'interactive' },
  chain:      { name: 'Cadena',           emoji: '⛓️',  coins: 50,   points: 100,   type: 'interactive' },
  mermaid:    { name: 'Sirena',           emoji: '🧜‍♀️', coins: 80,   points: 160,   type: 'interactive' },
  money_gun:  { name: 'Pistola de dinero',emoji: '💰',  coins: 100,  points: 200,   type: 'interactive' },
  airplane:   { name: 'Avión privado',    emoji: '✈️',  coins: 200,  points: 400,   type: 'interactive' },
  diamond:    { name: 'Diamante',         emoji: '💎',  coins: 500,  points: 1000,  type: 'interactive' },
  crown:      { name: 'Corona Real',      emoji: '👑',  coins: 800,  points: 1600,  type: 'interactive' },
  lion:       { name: 'León',             emoji: '🦁',  coins: 1000, points: 2500,  type: 'fullscreen'  },
  galaxy:     { name: 'Galaxia',          emoji: '🌌',  coins: 2000, points: 5000,  type: 'fullscreen'  },
  universe:   { name: 'Universo',         emoji: '🌠',  coins: 5000, points: 15000, type: 'fullscreen'  },
};

module.exports = GIFT_CATALOG_BACKEND;
