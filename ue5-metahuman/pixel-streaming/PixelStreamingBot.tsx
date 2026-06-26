/**
 * DOMINO CHAIN - Componente Pixel Streaming Bot
 * Muestra el stream WebRTC del MetaHuman de UE5 en el frontend
 * 
 * Reemplaza el BotAvatar3D cuando el servidor UE5 está disponible
 * Con fallback automático al avatar 3D si UE5 no está disponible
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';

interface PixelStreamingBotProps {
  botUsername: string;
  botDisplayName: string;
  avatarUrl: string; // Fallback si UE5 no está disponible
  isActive: boolean;
  currentPhrase?: string;
  npcAnimation?: 'idle' | 'talking' | 'excited' | 'dancing';
  onStreamReady?: () => void;
  onStreamError?: () => void;
}

// URL del servidor Pixel Streaming Bridge (en AWS)
const PIXEL_STREAMING_SERVER = import.meta.env.VITE_PIXEL_STREAMING_URL || '';

export const PixelStreamingBot: React.FC<PixelStreamingBotProps> = ({
  botUsername,
  botDisplayName,
  avatarUrl,
  isActive,
  currentPhrase,
  npcAnimation = 'idle',
  onStreamReady,
  onStreamError
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  
  const [streamState, setStreamState] = useState<'connecting' | 'connected' | 'fallback' | 'error'>('connecting');
  const [streamConfig, setStreamConfig] = useState<any>(null);

  // ============================================================
  // Obtener configuración del stream desde el bridge
  // ============================================================
  const fetchStreamConfig = useCallback(async () => {
    if (!PIXEL_STREAMING_SERVER) {
      setStreamState('fallback');
      return;
    }
    
    try {
      const response = await fetch(`${PIXEL_STREAMING_SERVER}/stream/${botUsername}`, {
        signal: AbortSignal.timeout(5000)
      });
      
      if (!response.ok) throw new Error('Stream no disponible');
      
      const config = await response.json();
      setStreamConfig(config);
      initPixelStreaming(config);
    } catch (err) {
      console.log(`UE5 no disponible para ${botUsername}, usando fallback 3D`);
      setStreamState('fallback');
      onStreamError?.();
    }
  }, [botUsername]);

  // ============================================================
  // Inicializar WebRTC con Pixel Streaming de UE5
  // ============================================================
  const initPixelStreaming = useCallback(async (config: any) => {
    try {
      // Crear RTCPeerConnection
      const pc = new RTCPeerConnection({
        iceServers: config.webrtcConfig.iceServers
      });
      peerConnectionRef.current = pc;
      
      // Cuando llegue el stream de video del MetaHuman
      pc.ontrack = (event) => {
        if (videoRef.current && event.streams[0]) {
          videoRef.current.srcObject = event.streams[0];
          setStreamState('connected');
          onStreamReady?.();
        }
      };
      
      // Conectar al servidor de señalización de Pixel Streaming
      const ws = new WebSocket(config.streamUrl);
      wsRef.current = ws;
      
      ws.onopen = () => {
        console.log(`Pixel Streaming conectado: ${botUsername}`);
      };
      
      ws.onmessage = async (event) => {
        const msg = JSON.parse(event.data);
        
        if (msg.type === 'offer') {
          await pc.setRemoteDescription(new RTCSessionDescription(msg));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          ws.send(JSON.stringify(answer));
        } else if (msg.type === 'iceCandidate') {
          await pc.addIceCandidate(new RTCIceCandidate(msg.candidate));
        }
      };
      
      ws.onerror = () => {
        setStreamState('fallback');
        onStreamError?.();
      };
      
      // ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'iceCandidate',
            candidate: event.candidate
          }));
        }
      };
      
    } catch (err) {
      console.error('Error iniciando Pixel Streaming:', err);
      setStreamState('fallback');
      onStreamError?.();
    }
  }, [botUsername]);

  useEffect(() => {
    if (isActive) {
      fetchStreamConfig();
    }
    
    return () => {
      // Cleanup
      wsRef.current?.close();
      peerConnectionRef.current?.close();
    };
  }, [isActive, fetchStreamConfig]);

  // ============================================================
  // RENDER: Stream UE5 activo
  // ============================================================
  if (streamState === 'connected') {
    return (
      <div style={{ width: '100%', height: '100%', position: 'relative', background: '#000' }}>
        {/* Video WebRTC del MetaHuman UE5 */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={false}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover'
          }}
        />
        
        {/* Overlay de stream en vivo */}
        <div style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none'
        }}>
          {/* Badge UE5 MetaHuman */}
          <div style={{
            position: 'absolute',
            top: 16,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(0,0,0,0.7)',
            border: '1px solid rgba(0,255,200,0.5)',
            borderRadius: 20,
            padding: '6px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}>
            <div style={{
              width: 8, height: 8,
              borderRadius: '50%',
              background: '#00ffc8',
              animation: 'pulse 1s infinite'
            }} />
            <span style={{ color: '#fff', fontSize: 12, fontWeight: 700 }}>
              🤖 MetaHuman IA EN DIRECTO
            </span>
          </div>
          
          {/* Frase actual del bot */}
          {currentPhrase && (
            <div style={{
              position: 'absolute',
              bottom: 120,
              left: 16,
              right: 16,
              background: 'rgba(0,0,0,0.8)',
              borderRadius: 12,
              padding: '12px 16px',
              border: '1px solid rgba(0,255,200,0.3)'
            }}>
              <p style={{ color: '#fff', fontSize: 15, margin: 0, textAlign: 'center' }}>
                {currentPhrase}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ============================================================
  // RENDER: Conectando...
  // ============================================================
  if (streamState === 'connecting') {
    return (
      <div style={{
        width: '100%',
        height: '100%',
        background: '#0a0a0a',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16
      }}>
        <div style={{
          width: 60, height: 60,
          border: '3px solid rgba(0,255,200,0.3)',
          borderTop: '3px solid #00ffc8',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <p style={{ color: '#00ffc8', fontSize: 14 }}>
          Conectando con MetaHuman...
        </p>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>
          @{botUsername}
        </p>
      </div>
    );
  }

  // ============================================================
  // RENDER: Fallback — Avatar 3D (cuando UE5 no está disponible)
  // ============================================================
  // Cuando streamState === 'fallback', el componente padre (LiveViewerPage)
  // debe mostrar el BotAvatar3D en su lugar
  return null;
};

export default PixelStreamingBot;
