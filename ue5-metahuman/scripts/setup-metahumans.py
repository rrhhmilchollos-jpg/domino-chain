#!/usr/bin/env python3
"""
DOMINO CHAIN - Configuración de los 5 MetaHumans
Crea y configura los avatares fotorrealistas para cada bot
usando la API de MetaHuman Creator y el SDK de UE5
"""

import json
import os
import requests
import time

# ============================================================
# CONFIGURACIÓN DE LOS 5 BOTS DE DOMINO
# ============================================================
DOMINO_BOTS = [
    {
        "username": "dominoking_bot",
        "display_name": "Domino King",
        "personality": "Carismático, líder, voz profunda y autoritaria. Habla con confianza sobre retos de dominó.",
        "voice": "onyx",  # OpenAI TTS - masculino profundo
        "metahuman_preset": "Alejandro",  # MetaHuman masculino latino
        "appearance": {
            "gender": "male",
            "age": "30-35",
            "ethnicity": "latino",
            "hair_color": "black",
            "eye_color": "brown",
            "style": "casual_urban"
        },
        "animations": {
            "idle": "MM_Idle_Neutral",
            "talking": "MM_Talk_Excited",
            "excited": "MM_Celebrate_Victory",
            "dancing": "MM_Dance_HipHop"
        },
        "phrases": [
            "¡Bienvenidos al reino del dominó! Soy el rey y hoy vamos a romper récords.",
            "¿Quién se atreve a desafiarme? ¡El dominó no miente!",
            "Cada ficha tiene su momento. ¿Estás listo para el tuyo?",
            "¡La cadena crece! ¡Únete y sé parte de la historia!"
        ]
    },
    {
        "username": "cadena_queen",
        "display_name": "Cadena Queen",
        "personality": "Enérgica, divertida, competitiva. Habla rápido y con mucha emoción.",
        "voice": "nova",  # OpenAI TTS - femenino energético
        "metahuman_preset": "Sofia",  # MetaHuman femenino
        "appearance": {
            "gender": "female",
            "age": "25-28",
            "ethnicity": "latina",
            "hair_color": "dark_brown",
            "eye_color": "green",
            "style": "sporty_chic"
        },
        "animations": {
            "idle": "MF_Idle_Confident",
            "talking": "MF_Talk_Energetic",
            "excited": "MF_Celebrate_Jump",
            "dancing": "MF_Dance_Salsa"
        },
        "phrases": [
            "¡Hola a todos! La reina de la cadena está aquí y lista para dominar.",
            "¿Alguien quiere competir? ¡Yo acepto todos los retos!",
            "Las fichas no se rinden, ¡y yo tampoco!",
            "¡Esto es DOMINO y aquí mando yo! 👑"
        ]
    },
    {
        "username": "retomaster_ai",
        "display_name": "Reto Master",
        "personality": "Serio, estratégico, inteligente. Habla con precisión y da consejos tácticos.",
        "voice": "echo",  # OpenAI TTS - masculino claro
        "metahuman_preset": "Marcus",  # MetaHuman masculino
        "appearance": {
            "gender": "male",
            "age": "28-32",
            "ethnicity": "afrolatino",
            "hair_color": "black_short",
            "eye_color": "dark_brown",
            "style": "streetwear"
        },
        "animations": {
            "idle": "MM_Idle_Thinking",
            "talking": "MM_Talk_Explaining",
            "excited": "MM_Celebrate_Fist",
            "dancing": "MM_Dance_Breaking"
        },
        "phrases": [
            "El dominó es estrategia pura. Cada movimiento cuenta.",
            "Analiza, planifica, ejecuta. Así se gana en DOMINO.",
            "¿Crees que puedes superarme? Acepto el reto.",
            "La cadena perfecta no es suerte, es habilidad."
        ]
    },
    {
        "username": "viralbot_domino",
        "display_name": "Viral Domino",
        "personality": "Viral, trendy, usa mucho slang. Habla como influencer de TikTok.",
        "voice": "shimmer",  # OpenAI TTS - femenino suave
        "metahuman_preset": "Yuki",  # MetaHuman asiático/mixto
        "appearance": {
            "gender": "female",
            "age": "22-26",
            "ethnicity": "asian_mixed",
            "hair_color": "blue_dyed",
            "eye_color": "blue",
            "style": "kawaii_urban"
        },
        "animations": {
            "idle": "MF_Idle_Playful",
            "talking": "MF_Talk_Cute",
            "excited": "MF_Celebrate_Spin",
            "dancing": "MF_Dance_Kpop"
        },
        "phrases": [
            "¡Omg esto es tan viral! ¡El dominó más trendy del momento!",
            "¡No te pierdas esto! ¡Sigue la cadena y hazte famoso!",
            "¡Bestie! ¡Únete al reto más viral de DOMINO!",
            "¡Esto va a explotar! ¡Comparte y haz que todos lo vean!"
        ]
    },
    {
        "username": "chainbreaker_ai",
        "display_name": "Chain Breaker",
        "personality": "Misterioso, dramático, épico. Habla como villano carismático.",
        "voice": "fable",  # OpenAI TTS - masculino dramático
        "metahuman_preset": "Viktor",  # MetaHuman europeo
        "appearance": {
            "gender": "male",
            "age": "32-38",
            "ethnicity": "european",
            "hair_color": "dark_silver",
            "eye_color": "gray",
            "style": "dark_elegant"
        },
        "animations": {
            "idle": "MM_Idle_Menacing",
            "talking": "MM_Talk_Dramatic",
            "excited": "MM_Celebrate_Arms",
            "dancing": "MM_Dance_Contemporary"
        },
        "phrases": [
            "Las cadenas están hechas para romperse... o para fortalecerse.",
            "Nadie ha podido detenerme. ¿Serás tú el primero?",
            "El dominó es mi arte. Y yo soy el maestro.",
            "¡La cadena se rompe cuando yo lo digo!"
        ]
    }
]

def create_metahuman_config():
    """Genera los archivos de configuración para cada MetaHuman en UE5"""
    
    output_dir = "C:\\DOMINO\\MetaHumans"
    os.makedirs(output_dir, exist_ok=True)
    
    for bot in DOMINO_BOTS:
        print(f"Configurando MetaHuman para {bot['username']}...")
        
        # Crear configuración JSON del bot
        config = {
            "bot_id": bot["username"],
            "display_name": bot["display_name"],
            "personality": bot["personality"],
            "voice_id": bot["voice"],
            "metahuman_preset": bot["metahuman_preset"],
            "appearance": bot["appearance"],
            "animations": bot["animations"],
            "phrases": bot["phrases"],
            "ue5_config": {
                "blueprint_class": f"BP_MetaHuman_{bot['username']}",
                "pixel_streaming_id": bot["username"],
                "tts_endpoint": f"http://localhost:3000/tts",
                "socket_room": f"live_{bot['username']}",
                "background_scene": "DominoLiveStudio",
                "lighting_preset": "NeonStudio",
                "camera_angles": [
                    {"name": "face_close", "fov": 35, "position": "front_close"},
                    {"name": "bust_shot", "fov": 50, "position": "front_medium"},
                    {"name": "wide_shot", "fov": 70, "position": "front_wide"}
                ]
            }
        }
        
        config_file = os.path.join(output_dir, f"{bot['username']}_config.json")
        with open(config_file, 'w', encoding='utf-8') as f:
            json.dump(config, f, indent=2, ensure_ascii=False)
        
        print(f"  ✅ Config guardada: {config_file}")
    
    print("\n✅ Todos los MetaHumans configurados")
    return DOMINO_BOTS

def download_mixamo_animations():
    """
    Descarga animaciones de Mixamo para los MetaHumans
    Las animaciones de Mixamo son gratuitas con cuenta de Adobe
    """
    print("\nAnimaciones necesarias de Mixamo:")
    print("URL: https://www.mixamo.com/#/?type=Motion%2CMotionPack")
    print("\nAnimaciones requeridas para cada bot:")
    
    animations_needed = [
        "Idle (Neutral)",
        "Idle (Confident)",
        "Idle (Thinking)",
        "Idle (Playful)",
        "Idle (Menacing)",
        "Talking (Excited)",
        "Talking (Energetic)",
        "Talking (Explaining)",
        "Talking (Cute)",
        "Talking (Dramatic)",
        "Celebrating (Victory)",
        "Celebrating (Jump)",
        "Celebrating (Fist Pump)",
        "Celebrating (Spin)",
        "Celebrating (Arms Wide)",
        "Dancing (Hip Hop)",
        "Dancing (Salsa)",
        "Dancing (Breaking)",
        "Dancing (K-Pop)",
        "Dancing (Contemporary)"
    ]
    
    for anim in animations_needed:
        print(f"  - {anim}")
    
    print("\nNOTA: Descargar en formato FBX para UE5 (T-Pose, 30fps)")

def setup_ue5_pixel_streaming_config():
    """Configura el Pixel Streaming para transmitir múltiples bots"""
    
    config = {
        "pixel_streaming": {
            "version": "UE5.4",
            "signaling_server": {
                "host": "0.0.0.0",
                "http_port": 80,
                "https_port": 443,
                "streamer_port": 8888,
                "sfu_port": 8889
            },
            "bots": {}
        }
    }
    
    # Cada bot tiene su propio stream en un puerto diferente
    base_port = 8890
    for i, bot in enumerate(DOMINO_BOTS):
        config["pixel_streaming"]["bots"][bot["username"]] = {
            "stream_id": bot["username"],
            "port": base_port + i,
            "resolution": "1080x1920",  # Vertical para móvil
            "fps": 30,
            "bitrate": 5000,  # 5 Mbps
            "codec": "H264"
        }
    
    config_file = "C:\\DOMINO\\PixelStreaming\\multi_bot_config.json"
    with open(config_file, 'w') as f:
        json.dump(config, f, indent=2)
    
    print(f"✅ Configuración Pixel Streaming guardada: {config_file}")
    return config

if __name__ == "__main__":
    print("=" * 60)
    print("DOMINO CHAIN - Configuración MetaHumans")
    print("=" * 60)
    
    create_metahuman_config()
    download_mixamo_animations()
    setup_ue5_pixel_streaming_config()
    
    print("\n" + "=" * 60)
    print("PRÓXIMOS PASOS:")
    print("1. Abrir MetaHuman Creator: https://metahuman.unrealengine.com")
    print("2. Crear 5 avatares con las configuraciones de appearance arriba")
    print("3. Exportar cada MetaHuman a UE5")
    print("4. Importar animaciones de Mixamo")
    print("5. Ejecutar: C:\\DOMINO\\start_domino_bots.bat")
    print("=" * 60)
