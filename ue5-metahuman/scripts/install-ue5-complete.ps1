# ============================================================
# DOMINO CHAIN - Script de instalación completa UE5 + MetaHuman
# Ejecutar en la VM GPU de AWS como Administrador
# ============================================================

param(
    [string]$EpicUsername = "",
    [string]$EpicPassword = "",
    [string]$OpenAIKey = "",
    [string]$DominoBackendURL = "https://domino-chain-production.up.railway.app"
)

$ErrorActionPreference = "Stop"
$LogFile = "C:\DOMINO\install_log.txt"

function Log {
    param([string]$Message)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    "$timestamp - $Message" | Tee-Object -FilePath $LogFile -Append
}

Log "=== DOMINO CHAIN UE5 Installation Started ==="

# ============================================================
# FASE 1: Verificar GPU NVIDIA
# ============================================================
Log "Verificando GPU NVIDIA..."
$gpu = Get-WmiObject Win32_VideoController | Where-Object { $_.Name -like "*NVIDIA*" }
if (-not $gpu) {
    Log "ERROR: No se detectó GPU NVIDIA. Verifica que la instancia es g4dn.xlarge"
    exit 1
}
Log "GPU detectada: $($gpu.Name)"

# ============================================================
# FASE 2: Instalar Epic Games Launcher y UE5
# ============================================================
Log "Descargando Epic Games Launcher..."

# Usar ue4cli para instalación headless
pip install ue4cli

# Descargar UE5 precompilado (binarios oficiales de Epic)
# UE5.4.4 - última versión estable con MetaHuman
$UE5_VERSION = "5.4.4"
$UE5_INSTALL_PATH = "C:\Program Files\Epic Games\UE_5.4"

if (-not (Test-Path $UE5_INSTALL_PATH)) {
    Log "Instalando Unreal Engine $UE5_VERSION..."
    
    # Método: Epic Games Launcher CLI (eci)
    $launcherMSI = "C:\DOMINO\EpicGamesLauncher.msi"
    if (Test-Path $launcherMSI) {
        Log "Instalando Epic Games Launcher..."
        Start-Process msiexec.exe -ArgumentList "/i `"$launcherMSI`" /quiet /norestart" -Wait
        Log "Epic Games Launcher instalado"
    }
    
    # Alternativa: Descargar UE5 directamente desde GitHub (versión de código fuente)
    Log "Clonando UE5 desde GitHub (requiere acceso de Epic Games)..."
    
    # Configurar git con credenciales de Epic
    git config --global user.email "domino@chain.app"
    git config --global user.name "DOMINO Bot"
    
    # Clonar UE5 (requiere que la cuenta Epic esté vinculada a GitHub)
    # Esto descarga ~100GB - puede tardar 2-3 horas
    $UE5_REPO = "https://${EpicUsername}:${EpicPassword}@github.com/EpicGames/UnrealEngine.git"
    
    Log "NOTA: La descarga de UE5 puede tardar 2-3 horas (100GB+)"
    Log "Iniciando descarga en background..."
    
    Start-Process git -ArgumentList "clone --depth=1 --branch 5.4 $UE5_REPO C:\DOMINO\UnrealEngine" -NoNewWindow
    
} else {
    Log "UE5 ya instalado en $UE5_INSTALL_PATH"
}

# ============================================================
# FASE 3: Instalar dependencias de Python para TTS
# ============================================================
Log "Instalando dependencias de Python para TTS..."
pip install openai requests websockets asyncio aiohttp flask

# ============================================================
# FASE 4: Configurar servidor de señalización Pixel Streaming
# ============================================================
Log "Configurando servidor de señalización Pixel Streaming..."

$signalingDir = "C:\DOMINO\PixelStreaming\SignalingServer"
New-Item -ItemType Directory -Force -Path $signalingDir

# Descargar el servidor de señalización oficial de Epic
$signalingUrl = "https://github.com/EpicGames/PixelStreamingInfrastructure/archive/refs/heads/UE5.4.zip"
Invoke-WebRequest -Uri $signalingUrl -OutFile "C:\DOMINO\PixelStreaming\signaling.zip"
Expand-Archive -Path "C:\DOMINO\PixelStreaming\signaling.zip" -DestinationPath "C:\DOMINO\PixelStreaming\" -Force

# Instalar dependencias del servidor de señalización
$signalingExtracted = "C:\DOMINO\PixelStreaming\PixelStreamingInfrastructure-UE5.4"
if (Test-Path $signalingExtracted) {
    Set-Location "$signalingExtracted\Signaling\platform_scripts\cmd"
    npm install
    Log "Servidor de señalización configurado"
}

# ============================================================
# FASE 5: Crear servidor API de voz TTS
# ============================================================
Log "Creando servidor API de voz TTS..."

$voiceServerScript = @"
#!/usr/bin/env python3
"""
DOMINO CHAIN - Servidor de Voz TTS para MetaHuman
Recibe texto del bot engine y genera audio WAV para lip-sync
"""
import os
import asyncio
import json
import wave
import struct
from pathlib import Path
from flask import Flask, request, jsonify, send_file
from openai import OpenAI
import tempfile
import threading

app = Flask(__name__)
client = OpenAI(api_key="$OpenAIKey")

# Voces asignadas a cada bot
BOT_VOICES = {
    "dominoking_bot": "onyx",      # Voz masculina profunda
    "cadena_queen": "nova",         # Voz femenina energética
    "retomaster_ai": "echo",        # Voz masculina clara
    "viralbot_domino": "shimmer",   # Voz femenina suave
    "chainbreaker_ai": "fable",     # Voz masculina dramática
}

@app.route('/tts', methods=['POST'])
def text_to_speech():
    data = request.json
    text = data.get('text', '')
    bot_username = data.get('bot', 'dominoking_bot')
    
    voice = BOT_VOICES.get(bot_username, 'nova')
    
    # Generar audio con OpenAI TTS
    response = client.audio.speech.create(
        model="tts-1-hd",
        voice=voice,
        input=text,
        response_format="wav"
    )
    
    # Guardar en archivo temporal
    with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as f:
        f.write(response.content)
        temp_path = f.name
    
    return send_file(temp_path, mimetype='audio/wav')

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "ok", "service": "DOMINO TTS Server"})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=3000, debug=False)
"@

$voiceServerScript | Out-File -FilePath "C:\DOMINO\VoiceTTS\tts_server.py" -Encoding UTF8
Log "Servidor TTS creado"

# ============================================================
# FASE 6: Crear el proyecto UE5 base para MetaHuman
# ============================================================
Log "Preparando configuración del proyecto UE5..."

$ue5ProjectConfig = @"
{
  "FileVersion": 3,
  "EngineAssociation": "5.4",
  "Category": "",
  "Description": "DOMINO CHAIN - MetaHuman Live Streaming",
  "Modules": [
    {
      "Name": "DominoMetaHuman",
      "Type": "Runtime",
      "LoadingPhase": "Default"
    }
  ],
  "Plugins": [
    {
      "Name": "MetaHuman",
      "Enabled": true
    },
    {
      "Name": "PixelStreaming",
      "Enabled": true
    },
    {
      "Name": "PixelStreamingPlayer",
      "Enabled": true
    },
    {
      "Name": "LiveLink",
      "Enabled": true
    },
    {
      "Name": "OdinOnlineSubsystem",
      "Enabled": false
    }
  ]
}
"@

New-Item -ItemType Directory -Force -Path "C:\DOMINO\UE5Project"
$ue5ProjectConfig | Out-File -FilePath "C:\DOMINO\UE5Project\DominoMetaHuman.uproject" -Encoding UTF8
Log "Configuración del proyecto UE5 creada"

# ============================================================
# FASE 7: Script de inicio del bot (ejecutar UE5 + TTS server)
# ============================================================
$startScript = @"
@echo off
echo Iniciando DOMINO CHAIN MetaHuman Bot Server...

REM Iniciar servidor TTS
start "DOMINO TTS Server" python C:\DOMINO\VoiceTTS\tts_server.py

REM Esperar 3 segundos
timeout /t 3

REM Iniciar servidor de señalización Pixel Streaming
start "Pixel Streaming Signaling" cmd /c "cd C:\DOMINO\PixelStreaming\PixelStreamingInfrastructure-UE5.4\Signaling\platform_scripts\cmd && node cirrus.js --HttpPort 80 --StreamerPort 8888 --SFUPort 8889"

REM Esperar 5 segundos
timeout /t 5

REM Iniciar UE5 con Pixel Streaming habilitado
"C:\Program Files\Epic Games\UE_5.4\Engine\Binaries\Win64\UnrealEditor.exe" ^
  "C:\DOMINO\UE5Project\DominoMetaHuman.uproject" ^
  -game ^
  -PixelStreamingIP=localhost ^
  -PixelStreamingPort=8888 ^
  -RenderOffScreen ^
  -Unattended ^
  -NoSplash ^
  -ResX=1920 ^
  -ResY=1080 ^
  -ForceRes

echo Todos los servicios iniciados.
"@

$startScript | Out-File -FilePath "C:\DOMINO\start_domino_bots.bat" -Encoding ASCII

# Crear servicio de Windows para inicio automático
$taskAction = New-ScheduledTaskAction -Execute "C:\DOMINO\start_domino_bots.bat"
$taskTrigger = New-ScheduledTaskTrigger -AtStartup
$taskSettings = New-ScheduledTaskSettingsSet -RunOnlyIfNetworkAvailable -StartWhenAvailable
Register-ScheduledTask -TaskName "DOMINO-MetaHuman-Bots" -Action $taskAction -Trigger $taskTrigger -Settings $taskSettings -RunLevel Highest -Force

Log "=== Fase 1-7 completada ==="
Log "SIGUIENTE PASO: Esperar a que UE5 termine de compilar (~2-3 horas)"
Log "Luego ejecutar: C:\DOMINO\setup_metahumans.ps1"
