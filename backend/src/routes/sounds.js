const express = require('express');
const router = express.Router();

// Catálogo de sonidos para añadir música a los videos, al estilo TikTok.
// IMPORTANTE: estas son pistas reales con licencia CC0 (dominio público),
// obtenidas de freepd.com vía el repositorio público
// github.com/SoundSafari/CC0-1.0-Music — NO son canciones de artistas con
// derechos de autor (eso requeriría acuerdos de licencia comerciales como
// los que tiene TikTok con las discográficas, que no es algo que se pueda
// "instalar" en el código). Se sirven directamente desde
// raw.githubusercontent.com, que permite CORS, así que no hace falta
// volver a subirlas a Cloudinary.
const BASE = 'https://raw.githubusercontent.com/SoundSafari/CC0-1.0-Music/main/freepd.com/';

const SOUND_LIBRARY = [
  { id: 'city-run',         title: 'City Run',           mood: 'Enérgica',     duration: 37,  audioUrl: BASE + 'City%20Run.mp3' },
  { id: 'battle-ready',     title: 'Battle Ready',        mood: 'Épica',        duration: 78,  audioUrl: BASE + 'Battle%20Ready.mp3' },
  { id: 'backbeat',         title: 'Backbeat',            mood: 'Rítmica',      duration: 46,  audioUrl: BASE + 'Backbeat.mp3' },
  { id: 'elevate-inspirate',title: 'Elevate Inspirate',   mood: 'Inspiradora',  duration: 64,  audioUrl: BASE + 'Elevate%20Inspirate.mp3' },
  { id: 'busybody',         title: 'Busybody',            mood: 'Divertida',    duration: 86,  audioUrl: BASE + 'Busybody.mp3' },
  { id: 'new-hero-in-town', title: 'New Hero in Town',    mood: 'Heroica',      duration: 57,  audioUrl: BASE + 'New%20Hero%20in%20Town.mp3' },
  { id: 'think-about-it',   title: 'Think About It',      mood: 'Tranquila',    duration: 120, audioUrl: BASE + 'Think%20About%20It.mp3' },
  { id: 'forest-frolic',    title: 'Forest Frolic Loop',  mood: 'Alegre',       duration: 37,  audioUrl: BASE + 'Forest%20Frolic%20Loop.mp3' },
];

const ATTRIBUTION = 'CC0 · Dominio público · freepd.com';

// GET /api/sounds — catálogo completo para el selector de música
router.get('/', (req, res) => {
  res.json(SOUND_LIBRARY.map(s => ({ ...s, attribution: ATTRIBUTION })));
});

// GET /api/sounds/:id — un sonido concreto (usado al validar/publicar un video)
router.get('/:id', (req, res) => {
  const sound = SOUND_LIBRARY.find(s => s.id === req.params.id);
  if (!sound) return res.status(404).json({ error: 'Sonido no encontrado' });
  res.json({ ...sound, attribution: ATTRIBUTION });
});

module.exports = router;
module.exports.SOUND_LIBRARY = SOUND_LIBRARY;
