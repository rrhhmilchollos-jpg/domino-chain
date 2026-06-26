/**
 * DOMINO CHAIN - Pixel Streaming Bridge
 * Conecta el Pixel Streaming de UE5 con el frontend de DOMINO
 * y el bot engine de Socket.IO
 * 
 * Arquitectura:
 * UE5 (MetaHuman) → Pixel Streaming → WebRTC → Este servidor → Frontend DOMINO
 * Bot Engine (Socket.IO) → Este servidor → UE5 (comandos de animación)
 */

const express = require('express');
const http = require('http');
const https = require('https');
const { Server } = require('socket.io');
const { createProxyMiddleware } = require('http-proxy-middleware');
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

// ============================================================
// CONFIGURACIÓN DE LOS 5 BOTS
// ============================================================
const BOTS = {
  'dominoking_bot':   { port: 8890, streamId: 'dominoking_bot' },
  'cadena_queen':     { port: 8891, streamId: 'cadena_queen' },
  'retomaster_ai':    { port: 8892, streamId: 'retomaster_ai' },
  'viralbot_domino':  { port: 8893, streamId: 'viralbot_domino' },
  'chainbreaker_ai':  { port: 8894, streamId: 'chainbreaker_ai' }
};

// Conexiones WebSocket activas a cada instancia de UE5
const ue5Connections = {};

// ============================================================
// CORS y headers
// ============================================================
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

app.use(express.json());

// ============================================================
// ENDPOINT: Obtener URL de stream para un bot
// ============================================================
app.get('/stream/:botUsername', (req, res) => {
  const { botUsername } = req.params;
  const bot = BOTS[botUsername];
  
  if (!bot) {
    return res.status(404).json({ error: 'Bot no encontrado' });
  }
  
  const serverIP = process.env.SERVER_IP || 'localhost';
  
  res.json({
    botUsername,
    streamUrl: `ws://${serverIP}:${bot.port}`,
    webrtcConfig: {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    },
    pixelStreamingConfig: {
      // Configuración para el cliente Pixel Streaming de UE5
      signalingServer: `ws://${serverIP}:${bot.port}`,
      autoPlayVideo: true,
      autoConnect: true,
      startVideoMuted: false,
      hoveringMouse: false,
      matchViewportRes: true,
      controlScheme: 0, // Locked mouse
      suppressBrowserKeys: true,
      fakeMouseWithTouches: true // Para móvil
    }
  });
});

// ============================================================
// ENDPOINT: Enviar comando al bot (hablar, bailar, reaccionar)
// ============================================================
app.post('/command/:botUsername', async (req, res) => {
  const { botUsername } = req.params;
  const { command, text, animation, duration } = req.body;
  
  const bot = BOTS[botUsername];
  if (!bot) {
    return res.status(404).json({ error: 'Bot no encontrado' });
  }
  
  // Comandos soportados:
  // - speak: hacer que el bot hable con TTS
  // - animate: cambiar animación
  // - camera: cambiar ángulo de cámara
  // - gift_reaction: reacción a regalo
  
  const ue5Command = {
    type: command,
    payload: { text, animation, duration }
  };
  
  // Enviar comando a UE5 via WebSocket
  if (ue5Connections[botUsername]) {
    ue5Connections[botUsername].send(JSON.stringify(ue5Command));
    res.json({ success: true, command: ue5Command });
  } else {
    res.status(503).json({ error: 'Bot UE5 no conectado', botUsername });
  }
});

// ============================================================
// SOCKET.IO: Recibir eventos del bot engine de DOMINO
// ============================================================
io.on('connection', (socket) => {
  console.log(`Cliente conectado: ${socket.id}`);
  
  // UE5 se conecta aquí para recibir comandos
  socket.on('ue5_register', (data) => {
    const { botUsername } = data;
    console.log(`UE5 registrado para bot: ${botUsername}`);
    ue5Connections[botUsername] = socket;
    socket.botUsername = botUsername;
  });
  
  // Bot engine emite bot_speak → enviamos a UE5
  socket.on('bot_speak', (data) => {
    const { botUsername, text, animation } = data;
    
    // 1. Generar audio TTS
    generateTTS(botUsername, text).then(audioUrl => {
      // 2. Enviar a UE5 para lip-sync
      if (ue5Connections[botUsername]) {
        ue5Connections[botUsername].emit('speak', {
          text,
          audioUrl,
          animation: animation || 'talking',
          lipsync: true
        });
      }
    });
  });
  
  // Reacción a regalo
  socket.on('gift_received', (data) => {
    const { botUsername, giftType, senderName } = data;
    
    const giftPhrases = {
      heart: `¡Gracias ${senderName} por el corazón! ¡Te quiero!`,
      fire: `¡${senderName} está en llamas! ¡Gracias!`,
      crown: `¡${senderName} me ha coronado! ¡Eres el mejor!`,
      diamond: `¡Un diamante de ${senderName}! ¡Increíble!`,
      domino: `¡${senderName} me manda una ficha de dominó! ¡Épico!`
    };
    
    const phrase = giftPhrases[giftType] || `¡Gracias ${senderName}!`;
    
    if (ue5Connections[botUsername]) {
      ue5Connections[botUsername].emit('gift_reaction', {
        giftType,
        text: phrase,
        animation: 'excited',
        duration: 5000
      });
    }
  });
  
  socket.on('disconnect', () => {
    if (socket.botUsername) {
      delete ue5Connections[socket.botUsername];
      console.log(`UE5 desconectado: ${socket.botUsername}`);
    }
  });
});

// ============================================================
// FUNCIÓN: Generar TTS con OpenAI
// ============================================================
async function generateTTS(botUsername, text) {
  try {
    const response = await fetch('http://localhost:3000/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bot: botUsername, text })
    });
    
    if (response.ok) {
      // Guardar el audio y devolver la URL
      const audioBuffer = await response.arrayBuffer();
      const audioPath = path.join(__dirname, 'audio', `${botUsername}_${Date.now()}.wav`);
      fs.mkdirSync(path.dirname(audioPath), { recursive: true });
      fs.writeFileSync(audioPath, Buffer.from(audioBuffer));
      
      const serverIP = process.env.SERVER_IP || 'localhost';
      return `http://${serverIP}:8080/audio/${path.basename(audioPath)}`;
    }
  } catch (err) {
    console.error('Error TTS:', err);
  }
  return null;
}

// Servir archivos de audio
app.use('/audio', express.static(path.join(__dirname, 'audio')));

// ============================================================
// HEALTH CHECK
// ============================================================
app.get('/health', (req, res) => {
  const connectedBots = Object.keys(ue5Connections);
  res.json({
    status: 'ok',
    service: 'DOMINO Pixel Streaming Bridge',
    connectedBots,
    totalBots: Object.keys(BOTS).length
  });
});

// ============================================================
// INICIAR SERVIDOR
// ============================================================
const PORT = process.env.PORT || 8080;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`DOMINO Pixel Streaming Bridge corriendo en puerto ${PORT}`);
  console.log(`Bots configurados: ${Object.keys(BOTS).join(', ')}`);
});

module.exports = { app, io };
