# DOMINO CHAIN — Pipeline UE5 MetaHuman

## Arquitectura completa (clon de @octopvstotheparty)

```
┌─────────────────────────────────────────────────────────────┐
│                    SERVIDOR AWS GPU                          │
│                  (g4dn.xlarge - NVIDIA T4)                   │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Unreal Engine 5.4                       │  │
│  │                                                      │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐          │  │
│  │  │MetaHuman │  │MetaHuman │  │MetaHuman │  ...5x   │  │
│  │  │dominoking│  │cadena_   │  │retomaster│          │  │
│  │  │   _bot   │  │  queen   │  │   _ai    │          │  │
│  │  └────┬─────┘  └────┬─────┘  └────┬─────┘          │  │
│  │       │              │              │                │  │
│  │  ┌────▼──────────────▼──────────────▼─────────────┐ │  │
│  │  │           Pixel Streaming Plugin               │ │  │
│  │  │         (WebRTC - H264 - 1080x1920)            │ │  │
│  │  └────────────────────┬────────────────────────────┘ │  │
│  └───────────────────────┼──────────────────────────────┘  │
│                          │                                  │
│  ┌───────────────────────▼──────────────────────────────┐  │
│  │         Pixel Streaming Bridge (Node.js)             │  │
│  │  - Servidor de señalización WebRTC                   │  │
│  │  - API de comandos (hablar, bailar, reaccionar)      │  │
│  │  - Servidor TTS (OpenAI → WAV → lip-sync)            │  │
│  └───────────────────────┬──────────────────────────────┘  │
└──────────────────────────┼──────────────────────────────────┘
                           │ WebRTC + Socket.IO
          ┌────────────────┼────────────────┐
          │                │                │
┌─────────▼──────┐  ┌──────▼──────┐  ┌─────▼────────┐
│  DOMINO App    │  │  Bot Engine │  │  MetaHuman   │
│  (Vercel)      │  │  (Railway)  │  │  Creator     │
│                │  │             │  │  (Web)       │
│ LiveViewerPage │  │ aiBotEngine │  │              │
│ PixelStreaming │  │ bot_speak   │  │ 5 avatares   │
│ BotComponent   │  │ gift events │  │ fotorrealistas│
└────────────────┘  └─────────────┘  └──────────────┘
```

## Tecnología exacta de @octopvstotheparty replicada

| Octopvs | DOMINO |
|---------|--------|
| MetaHuman Creator (Epic) | MetaHuman Creator (Epic) ✅ |
| Unreal Engine 5 | Unreal Engine 5 ✅ |
| Animaciones Mixamo | Animaciones Mixamo ✅ |
| Lip-sync MetaHuman Animator | Lip-sync MetaHuman Animator ✅ |
| Voz humana real | OpenAI TTS (voz HD) ✅ |
| Pixel Streaming → OBS → TikTok | Pixel Streaming → WebRTC → DOMINO ✅ |
| Rokoko mocap (físico) | Animaciones procedurales en UE5 ✅ |

## Requisitos previos

### Cuentas necesarias
- [ ] **Epic Games**: https://www.epicgames.com/id/register
- [ ] **AWS**: https://aws.amazon.com/es/free/
- [ ] **Mixamo** (Adobe): https://www.mixamo.com (gratis)
- [ ] **MetaHuman Creator**: https://metahuman.unrealengine.com (gratis)

### Credenciales necesarias
- AWS Access Key ID + Secret Access Key
- OpenAI API Key (ya configurada en Railway)

## Instalación paso a paso

### PASO 1: Configurar AWS CLI
```bash
# Instalar AWS CLI
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip && sudo ./aws/install

# Configurar con tus credenciales
aws configure
# AWS Access Key ID: [tu key]
# AWS Secret Access Key: [tu secret]
# Default region: eu-west-1
# Default output format: json
```

### PASO 2: Solicitar límite de instancias GPU
```
1. Ve a: https://console.aws.amazon.com/servicequotas/home/services/ec2/quotas
2. Busca: "Running On-Demand G and VT instances"
3. Solicita: mínimo 4 vCPUs
4. Espera aprobación (24-48 horas)
```

### PASO 3: Crear el servidor GPU
```bash
# Ejecutar el script de deploy
bash /home/ubuntu/domino-ue5/aws/deploy-aws.sh
```

### PASO 4: Conectar al servidor por RDP
```
1. Abre "Conexión a Escritorio Remoto" en Windows
   O en Mac: Microsoft Remote Desktop
2. Servidor: [IP del servidor]
3. Usuario: Administrator
4. Contraseña: [la que generó el script]
```

### PASO 5: Instalar UE5 en el servidor
```powershell
# En el servidor Windows, abrir PowerShell como Administrador:
C:\DOMINO\install-ue5-complete.ps1

# Esto instala:
# - Epic Games Launcher
# - Unreal Engine 5.4
# - MetaHuman Plugin
# - Pixel Streaming Plugin
# - Servidor TTS (Python + OpenAI)
# - Servidor de señalización WebRTC

# TIEMPO: 2-3 horas (descarga de 100GB+)
```

### PASO 6: Crear los 5 MetaHumans
```
1. Ve a: https://metahuman.unrealengine.com
2. Crea los 5 avatares con estas configuraciones:

   Bot 1 - dominoking_bot:
   - Género: Masculino
   - Etnia: Latino
   - Edad: 30-35 años
   - Cabello: Negro corto
   - Ojos: Marrón oscuro
   - Estilo: Urban casual

   Bot 2 - cadena_queen:
   - Género: Femenino
   - Etnia: Latina
   - Edad: 25-28 años
   - Cabello: Castaño oscuro
   - Ojos: Verde
   - Estilo: Sporty chic

   Bot 3 - retomaster_ai:
   - Género: Masculino
   - Etnia: Afrolatino
   - Edad: 28-32 años
   - Cabello: Negro corto
   - Ojos: Marrón oscuro
   - Estilo: Streetwear

   Bot 4 - viralbot_domino:
   - Género: Femenino
   - Etnia: Asiático/mixto
   - Edad: 22-26 años
   - Cabello: Azul teñido
   - Ojos: Azul
   - Estilo: Kawaii urban

   Bot 5 - chainbreaker_ai:
   - Género: Masculino
   - Etnia: Europeo
   - Edad: 32-38 años
   - Cabello: Oscuro con canas
   - Ojos: Gris
   - Estilo: Dark elegant

3. Exportar cada MetaHuman a UE5
```

### PASO 7: Importar animaciones de Mixamo
```
1. Ve a: https://www.mixamo.com
2. Descarga estas animaciones en FBX para UE5:
   - Idle (Neutral, Confident, Thinking, Playful, Menacing)
   - Talking (Excited, Energetic, Explaining, Cute, Dramatic)
   - Celebrating (Victory, Jump, Fist Pump, Spin, Arms Wide)
   - Dancing (Hip Hop, Salsa, Breaking, K-Pop, Contemporary)
3. Importar en UE5 y aplicar a cada MetaHuman
```

### PASO 8: Iniciar los bots
```batch
# En el servidor Windows:
C:\DOMINO\start_domino_bots.bat

# Esto inicia:
# - Servidor TTS (puerto 3000)
# - Servidor de señalización Pixel Streaming (puerto 8888)
# - UE5 con los 5 MetaHumans (renderizado headless)
# - Bridge API (puerto 8080)
```

### PASO 9: Conectar con DOMINO frontend
```bash
# En Vercel, añadir variable de entorno:
VITE_PIXEL_STREAMING_URL=http://[IP_DEL_SERVIDOR]:8080

# Hacer redeploy en Vercel
```

## Costes mensuales estimados

| Concepto | Coste/mes |
|----------|-----------|
| AWS g4dn.xlarge (24/7) | ~$526 |
| EBS 500GB gp3 | ~$50 |
| Transferencia de datos | ~$50-100 |
| OpenAI TTS (voz HD) | ~$20-50 |
| **TOTAL** | **~$646-726/mes** |

## Estructura de archivos

```
domino-ue5/
├── aws/
│   ├── create-gpu-vm.yaml      # CloudFormation template
│   ├── deploy-aws.sh           # Script de deploy automático
│   └── server-info.txt         # Info del servidor (generado)
├── scripts/
│   ├── install-ue5-complete.ps1 # Instalación UE5 en Windows
│   └── setup-metahumans.py     # Configuración de los 5 MetaHumans
├── pixel-streaming/
│   ├── domino-pixel-bridge.js  # Bridge WebRTC ↔ DOMINO
│   └── PixelStreamingBot.tsx   # Componente React para el stream
├── voice-tts/
│   └── tts_server.py           # Servidor TTS con OpenAI
└── README.md                   # Este archivo
```
