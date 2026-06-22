require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/domino';

// Seed users data
const SEED_USERS = [
  { username: 'carlos_madrid', email: 'carlos@test.com', country: 'España', city: 'Madrid', flag: '🇪🇸', bio: 'Creando cadenas desde Madrid 🎲', impactPoints: 4500, currentStreak: 12 },
  { username: 'lucia_bcn', email: 'lucia@test.com', country: 'España', city: 'Barcelona', flag: '🇪🇸', bio: 'Barcelona siempre en movimiento ⚡', impactPoints: 3200, currentStreak: 8 },
  { username: 'yuki_tokyo', email: 'yuki@test.com', country: 'Japón', city: 'Tokio', flag: '🇯🇵', bio: '東京からDOMINOへ 🎯', impactPoints: 6700, currentStreak: 21 },
  { username: 'maria_mx', email: 'maria@test.com', country: 'México', city: 'Ciudad de México', flag: '🇲🇽', bio: 'CDMX representando 🌮', impactPoints: 2800, currentStreak: 5 },
  { username: 'ahmed_paris', email: 'ahmed@test.com', country: 'Francia', city: 'París', flag: '🇫🇷', bio: 'La vie est un domino 🗼', impactPoints: 5100, currentStreak: 15 },
  { username: 'sofia_baires', email: 'sofia@test.com', country: 'Argentina', city: 'Buenos Aires', flag: '🇦🇷', bio: 'Porteña y orgullosa 💙', impactPoints: 1900, currentStreak: 3 },
  { username: 'jake_nyc', email: 'jake@test.com', country: 'Estados Unidos', city: 'Nueva York', flag: '🇺🇸', bio: 'NYC chain reaction 🗽', impactPoints: 8200, currentStreak: 30 },
  { username: 'ana_london', email: 'ana@test.com', country: 'Reino Unido', city: 'Londres', flag: '🇬🇧', bio: 'London calling 🎸', impactPoints: 3600, currentStreak: 9 },
  { username: 'pablo_col', email: 'pablo@test.com', country: 'Colombia', city: 'Bogotá', flag: '🇨🇴', bio: 'Colombia es pasión 🌺', impactPoints: 2100, currentStreak: 6 },
  { username: 'hana_brasil', email: 'hana@test.com', country: 'Brasil', city: 'São Paulo', flag: '🇧🇷', bio: 'Brasil no ritmo do DOMINO 🎵', impactPoints: 4800, currentStreak: 14 },
  { username: 'marco_roma', email: 'marco@test.com', country: 'Italia', city: 'Roma', flag: '🇮🇹', bio: 'Roma caput mundi 🏛️', impactPoints: 3900, currentStreak: 11 },
  { username: 'nina_berlin', email: 'nina@test.com', country: 'Alemania', city: 'Berlín', flag: '🇩🇪', bio: 'Berlín is always open 🎪', impactPoints: 5500, currentStreak: 17 },
  { username: 'leo_porto', email: 'leo@test.com', country: 'Portugal', city: 'Oporto', flag: '🇵🇹', bio: 'Porto, cidade invicta ⚡', impactPoints: 1700, currentStreak: 4 },
  { username: 'rina_osaka', email: 'rina@test.com', country: 'Japón', city: 'Osaka', flag: '🇯🇵', bio: '大阪から愛を込めて 💫', impactPoints: 6100, currentStreak: 19 },
  { username: 'diego_sevilla', email: 'diego@test.com', country: 'España', city: 'Sevilla', flag: '🇪🇸', bio: 'Sevilla en el corazón ❤️', impactPoints: 2400, currentStreak: 7 },
  { username: 'emma_lyon', email: 'emma@test.com', country: 'Francia', city: 'Lyon', flag: '🇫🇷', bio: 'Lyon, capitale de la gastronomie 🍷', impactPoints: 3100, currentStreak: 10 },
  { username: 'tomas_bsas', email: 'tomas@test.com', country: 'Argentina', city: 'Córdoba', flag: '🇦🇷', bio: 'Cordobés de pura cepa 🌾', impactPoints: 1400, currentStreak: 2 },
  { username: 'mia_chicago', email: 'mia@test.com', country: 'Estados Unidos', city: 'Chicago', flag: '🇺🇸', bio: 'Windy City vibes 🌬️', impactPoints: 4200, currentStreak: 13 },
  { username: 'kai_munich', email: 'kai@test.com', country: 'Alemania', city: 'Múnich', flag: '🇩🇪', bio: 'Bayern forever 🍺', impactPoints: 2900, currentStreak: 8 },
  { username: 'isla_glasgow', email: 'isla@test.com', country: 'Reino Unido', city: 'Glasgow', flag: '🇬🇧', bio: 'Scottish vibes 🏴󠁧󠁢󠁳󠁣󠁴󠁿', impactPoints: 1600, currentStreak: 3 }
];

const SEED_CHALLENGES = [
  { title: '30 Segundos de Bondad', description: 'Graba un acto espontáneo de amabilidad hacia un desconocido.', category: 'Kindness', globalCounter: 14782 },
  { title: 'Arte en 15 Segundos', description: 'Muestra tu talento creativo en solo 15 segundos.', category: 'Creativity', globalCounter: 8934 },
  { title: 'Eco Warrior', description: 'Haz algo positivo por el medio ambiente y grábalo.', category: 'Eco', globalCounter: 5621 }
];

const VIDEO_THUMBNAILS = [
  'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=400&h=700&fit=crop',
  'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400&h=700&fit=crop',
  'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=700&fit=crop',
  'https://images.unsplash.com/photo-1511988617509-a57c8a288659?w=400&h=700&fit=crop',
  'https://images.unsplash.com/photo-1501854140801-50d01698950b?w=400&h=700&fit=crop',
  'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=400&h=700&fit=crop',
  'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=700&fit=crop',
  'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=400&h=700&fit=crop',
];

const GEO_COORDS = [
  { lat: 40.4168, lng: -3.7038 }, { lat: 41.3879, lng: 2.16992 },
  { lat: 35.6762, lng: 139.6503 }, { lat: 19.4326, lng: -99.1332 },
  { lat: 48.8566, lng: 2.3522 }, { lat: -34.6037, lng: -58.3816 },
  { lat: 40.7128, lng: -74.006 }, { lat: 51.5074, lng: -0.1278 },
  { lat: 4.7110, lng: -74.0721 }, { lat: -23.5505, lng: -46.6333 },
  { lat: 41.9028, lng: 12.4964 }, { lat: 52.5200, lng: 13.4050 },
  { lat: 41.1579, lng: -8.6291 }, { lat: 34.6937, lng: 135.5023 },
  { lat: 37.3891, lng: -5.9845 }, { lat: 45.7640, lng: 4.8357 },
  { lat: -31.4135, lng: -64.1811 }, { lat: 41.8781, lng: -87.6298 },
  { lat: 48.1351, lng: 11.5820 }, { lat: 55.8642, lng: -4.2518 }
];

async function seed() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB conectado');

    // Importar modelos
    const User = require('./models/User');
    const Video = require('./models/Video');
    const Challenge = require('./models/Challenge');
    const Notification = require('./models/Notification');

    // Limpiar datos seed anteriores
    await User.deleteMany({ isSeedAccount: true });
    console.log('🗑️ Seed users anteriores eliminados');

    // Crear challenges si no existen
    for (const ch of SEED_CHALLENGES) {
      const exists = await Challenge.findOne({ title: ch.title });
      if (!exists) {
        await Challenge.create({ ...ch, expiresAt: new Date(Date.now() + 24 * 3600000 * 7), status: 'active' });
        console.log(`✅ Challenge creado: ${ch.title}`);
      }
    }

    const challenge = await Challenge.findOne({ status: 'active' });

    // Crear usuarios seed
    const hashedPwd = await bcrypt.hash('test123456', 12);
    const createdUsers = [];

    for (const u of SEED_USERS) {
      const user = await User.create({
        ...u,
        password: hashedPwd,
        coins: Math.floor(Math.random() * 500),
        isActive: true,
        isSeedAccount: true,
        avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.username}`
      });
      createdUsers.push(user);
      console.log(`👤 Usuario creado: @${u.username}`);
    }

    // Crear relaciones de seguimiento aleatorias
    for (const user of createdUsers) {
      const others = createdUsers.filter(u => u._id.toString() !== user._id.toString());
      const toFollow = others.slice(0, Math.floor(Math.random() * 8) + 3);
      for (const follow of toFollow) {
        await User.findByIdAndUpdate(user._id, { $addToSet: { following: follow._id } });
        await User.findByIdAndUpdate(follow._id, { $addToSet: { followers: user._id } });
      }
    }
    console.log('👥 Relaciones de seguimiento creadas');

    // Crear videos seed
    if (challenge) {
      const videos = [];
      for (let i = 0; i < createdUsers.length; i++) {
        const user = createdUsers[i];
        const geo = GEO_COORDS[i];
        const thumbnail = VIDEO_THUMBNAILS[i % VIDEO_THUMBNAILS.length];

        // Cada usuario crea 1-3 videos
        const numVideos = Math.floor(Math.random() * 3) + 1;
        for (let v = 0; v < numVideos; v++) {
          const video = await Video.create({
            challengeId: challenge._id,
            userId: user._id,
            videoUrl: '',
            thumbnailUrl: thumbnail,
            geoCoordinates: { lat: geo.lat + (Math.random() - 0.5) * 0.1, lng: geo.lng + (Math.random() - 0.5) * 0.1 },
            nominatedUsers: createdUsers.slice(0, 3).map(u => u._id),
            chainDepth: Math.floor(Math.random() * 5),
            likes: createdUsers.slice(0, Math.floor(Math.random() * 10)).map(u => u._id),
            isPublished: true
          });
          if (!video.rootVideoId) await Video.findByIdAndUpdate(video._id, { rootVideoId: video._id });
          videos.push(video);
        }
      }
      console.log(`🎬 ${videos.length} videos seed creados`);

      // Guardar algunos videos en perfiles
      for (const user of createdUsers) {
        const randomVideos = videos.slice(0, Math.floor(Math.random() * 5));
        await User.findByIdAndUpdate(user._id, { savedVideos: randomVideos.map(v => v._id) });
      }

      // Crear notificaciones seed
      for (const user of createdUsers.slice(0, 5)) {
        await Notification.create({
          userId: user._id,
          type: 'nomination',
          fromUserId: createdUsers[Math.floor(Math.random() * createdUsers.length)]._id,
          message: `${createdUsers[0].username} te ha nominado para continuar la cadena DOMINO 🎲`
        });
      }
      console.log('🔔 Notificaciones seed creadas');
    }

    // Actualizar puntos de impacto de los challenges
    await Challenge.updateMany({}, { $inc: { globalCounter: Math.floor(Math.random() * 100) } });

    console.log('\n🎉 SEED COMPLETADO');
    console.log('═══════════════════════════════');
    console.log('20 usuarios de prueba creados:');
    SEED_USERS.forEach(u => console.log(`  @${u.username} / ${u.email} / pass: test123456`));
    console.log('═══════════════════════════════');

    await mongoose.disconnect();
    process.exit(0);
  } catch(e) {
    console.error('❌ Error en seed:', e);
    process.exit(1);
  }
}

seed();
