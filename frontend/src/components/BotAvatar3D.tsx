/**
 * BotAvatar3D — Avatar 3D interactivo para lives de bots en DOMINO CHAIN
 *
 * Tecnología:
 * - React Three Fiber (@react-three/fiber) para renderizado 3D en el navegador
 * - Three.js para geometría, materiales y animaciones procedurales
 * - Web Audio API para lip-sync en tiempo real (análisis de frecuencias del TTS)
 * - Web Speech API (SpeechSynthesis) para voz en español
 * - Animaciones procedurales: idle (respiración), talking (gestos), excited, dancing
 *
 * Equivalente a la tecnología VTuber/Live2D que usa @lospulpusdeoctopvs en TikTok
 */

import React, { useRef, useEffect, useState, useCallback, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, useTexture, Html } from '@react-three/drei';
import * as THREE from 'three';

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface BotAvatar3DProps {
  avatarImageUrl: string;   // URL de la imagen fotorrealista del bot (Cloudinary)
  botUsername: string;
  phrase: string;           // Frase actual que el bot está diciendo
  animation: 'idle' | 'talking' | 'excited' | 'dancing';
  muted: boolean;
  onSpeakEnd?: () => void;
}

// ─── Constantes de animación ──────────────────────────────────────────────────
const ANIM_CONFIGS = {
  idle:    { headBob: 0.003, bodySwing: 0.002, breathScale: 0.004, speed: 0.8 },
  talking: { headBob: 0.012, bodySwing: 0.015, breathScale: 0.008, speed: 1.6 },
  excited: { headBob: 0.025, bodySwing: 0.035, breathScale: 0.015, speed: 2.5 },
  dancing: { headBob: 0.04,  bodySwing: 0.06,  breathScale: 0.02,  speed: 3.2 },
};

// ─── Componente de escena 3D con el avatar ────────────────────────────────────
function AvatarScene({
  avatarImageUrl,
  animation,
  audioAnalyser,
  phrase,
}: {
  avatarImageUrl: string;
  animation: 'idle' | 'talking' | 'excited' | 'dancing';
  audioAnalyser: React.MutableRefObject<AnalyserNode | null>;
  phrase: string;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const headRef = useRef<THREE.Group<THREE.Object3DEventMap>>(null);
  const bodyRef = useRef<THREE.Group<THREE.Object3DEventMap>>(null);
  const leftArmRef = useRef<THREE.Mesh>(null);
  const rightArmRef = useRef<THREE.Mesh>(null);
  const mouthRef = useRef<THREE.Mesh>(null);
  const timeRef = useRef(0);
  const lipRef = useRef(0);
  const freqDataRef = useRef<Uint8Array<ArrayBuffer>>(new Uint8Array(128) as Uint8Array<ArrayBuffer>);

  // Cargar textura del avatar
  const texture = useTexture(avatarImageUrl);
  texture.colorSpace = THREE.SRGBColorSpace;

  const { viewport } = useThree();
  const aspect = viewport.width / viewport.height;

  useFrame((_, delta) => {
    timeRef.current += delta;
    const t = timeRef.current;
    const cfg = ANIM_CONFIGS[animation];

    // ─── Lip-sync con Web Audio API ──────────────────────────────────────
    let mouthOpen = 0;
    if (audioAnalyser.current) {
      audioAnalyser.current.getByteFrequencyData(freqDataRef.current);
      // Frecuencias de voz humana: 300-3000 Hz → índices 4-40 en array de 128
      const voiceFreqs = freqDataRef.current.slice(4, 40);
      const avg = voiceFreqs.reduce((a, b) => a + b, 0) / voiceFreqs.length;
      mouthOpen = Math.min(avg / 128, 1);
    } else if (animation === 'talking' || animation === 'excited') {
      // Simulación de lip-sync cuando no hay audio real
      mouthOpen = Math.abs(Math.sin(t * 8)) * 0.6 + Math.abs(Math.sin(t * 13)) * 0.3;
    }
    lipRef.current = THREE.MathUtils.lerp(lipRef.current, mouthOpen, 0.3);

    // ─── Animación de la boca ─────────────────────────────────────────────
    if (mouthRef.current) {
      mouthRef.current.scale.y = 0.3 + lipRef.current * 1.8;
      mouthRef.current.scale.x = 1 + lipRef.current * 0.4;
      (mouthRef.current.material as THREE.MeshBasicMaterial).color.setHSL(
        0, 0.8, 0.25 + lipRef.current * 0.15
      );
    }

    // ─── Animación de la cabeza ───────────────────────────────────────────
    if (headRef.current) {
      headRef.current.rotation.y = Math.sin(t * cfg.speed * 0.7) * cfg.headBob * 8;
      headRef.current.rotation.z = Math.sin(t * cfg.speed * 0.5) * cfg.headBob * 4;
      headRef.current.rotation.x = Math.sin(t * cfg.speed * 0.3) * cfg.headBob * 3 - 0.05;
      // Nod al hablar
      if (animation === 'talking' || animation === 'excited') {
        headRef.current.rotation.x += Math.sin(t * cfg.speed * 2) * 0.04;
      }
    }

    // ─── Animación del cuerpo ─────────────────────────────────────────────
    if (bodyRef.current) {
      bodyRef.current.rotation.z = Math.sin(t * cfg.speed * 0.6) * cfg.bodySwing;
      bodyRef.current.position.y = Math.sin(t * cfg.speed * 0.8) * cfg.breathScale * 0.5;
      if (animation === 'dancing') {
        bodyRef.current.rotation.y = Math.sin(t * cfg.speed * 0.5) * 0.15;
        bodyRef.current.position.x = Math.sin(t * cfg.speed * 0.7) * 0.03;
      }
    }

    // ─── Animación de los brazos ──────────────────────────────────────────
    if (leftArmRef.current) {
      const baseAngle = animation === 'talking' ? -0.6 : animation === 'excited' ? -0.9 : -0.3;
      leftArmRef.current.rotation.z = baseAngle + Math.sin(t * cfg.speed * 1.2) * cfg.bodySwing * 6;
      leftArmRef.current.rotation.x = Math.sin(t * cfg.speed * 0.9) * 0.1;
      if (animation === 'dancing') {
        leftArmRef.current.rotation.z = -0.8 + Math.sin(t * cfg.speed * 1.5) * 0.4;
      }
    }
    if (rightArmRef.current) {
      const baseAngle = animation === 'talking' ? 0.6 : animation === 'excited' ? 0.9 : 0.3;
      rightArmRef.current.rotation.z = baseAngle + Math.sin(t * cfg.speed * 1.2 + Math.PI) * cfg.bodySwing * 6;
      rightArmRef.current.rotation.x = Math.sin(t * cfg.speed * 0.9 + 0.5) * 0.1;
      if (animation === 'dancing') {
        rightArmRef.current.rotation.z = 0.8 + Math.sin(t * cfg.speed * 1.5 + Math.PI) * 0.4;
      }
    }

    // ─── Escala de respiración del cuerpo ────────────────────────────────
    if (meshRef.current) {
      const breathe = 1 + Math.sin(t * cfg.speed * 0.5) * cfg.breathScale;
      meshRef.current.scale.y = breathe;
      meshRef.current.scale.x = 1 + Math.sin(t * cfg.speed * 0.5 + Math.PI) * cfg.breathScale * 0.3;
    }
  });

  // Dimensiones del plano de fondo (ocupa toda la pantalla)
  const bgW = viewport.width;
  const bgH = viewport.height;

  return (
    <>
      {/* ─── Fondo: imagen fotorrealista del bot ─────────────────────────── */}
      <mesh position={[0, 0, -0.5]}>
        <planeGeometry args={[bgW, bgH]} />
        <meshBasicMaterial map={texture} />
      </mesh>

      {/* ─── Cuerpo del avatar (grupo animado) ───────────────────────────── */}
      <group ref={bodyRef} position={[0, -0.8, 0.1]}>
        {/* Torso */}
        <mesh ref={meshRef} position={[0, 0, 0]}>
          <cylinderGeometry args={[0.28, 0.32, 0.7, 16]} />
          <meshStandardMaterial color="#1a1a2e" roughness={0.7} metalness={0.1} transparent opacity={0.0} />
        </mesh>

        {/* Cabeza */}
        <group ref={headRef as React.RefObject<THREE.Group<THREE.Object3DEventMap>>} position={[0, 0.65, 0]}>
          {/* Boca animada */}
          <mesh ref={mouthRef} position={[0, -0.08, 0.18]}>
            <circleGeometry args={[0.06, 16]} />
            <meshBasicMaterial color="#8B0000" />  
          </mesh>
        </group>

        {/* Brazo izquierdo */}
        <mesh ref={leftArmRef} position={[-0.38, 0.1, 0]}>
          <capsuleGeometry args={[0.07, 0.35, 4, 8]} />
          <meshStandardMaterial color="#1a1a2e" transparent opacity={0.0} />
        </mesh>

        {/* Brazo derecho */}
        <mesh ref={rightArmRef} position={[0.38, 0.1, 0]}>
          <capsuleGeometry args={[0.07, 0.35, 4, 8]} />
          <meshStandardMaterial color="#1a1a2e" transparent opacity={0.0} />
        </mesh>
      </group>

      {/* ─── Iluminación ─────────────────────────────────────────────────── */}
      <ambientLight intensity={0.6} />
      <directionalLight position={[2, 4, 2]} intensity={1.2} castShadow />
      <pointLight position={[-2, 2, 1]} intensity={0.4} color="#00ffff" />
      <pointLight position={[2, -1, 1]} intensity={0.3} color="#ff00ff" />
    </>
  );
}

// ─── Overlay 2D con efectos de stream en vivo ─────────────────────────────────
function LiveStreamOverlay({
  phrase,
  animation,
  botUsername,
  giftEmoji,
}: {
  phrase: string;
  animation: string;
  botUsername: string;
  giftEmoji?: string | null;
}) {
  const [particles, setParticles] = useState<{ id: number; x: number; emoji: string; speed: number }[]>([]);
  const [bars] = useState(() => Array.from({ length: 14 }, (_, i) => i));

  // Partículas flotantes
  useEffect(() => {
    const emojis = ['🎲', '⛓️', '🔥', '⭐', '💎', '🚀', '✨', '🎯'];
    const interval = setInterval(() => {
      setParticles(prev => {
        const newP = {
          id: Date.now(),
          x: Math.random() * 90 + 5,
          emoji: emojis[Math.floor(Math.random() * emojis.length)],
          speed: Math.random() * 3 + 2,
        };
        return [...prev.slice(-8), newP];
      });
    }, 800);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{
      position: 'absolute', inset: 0, pointerEvents: 'none',
      overflow: 'hidden', zIndex: 10,
    }}>
      {/* Vignette pulsante */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.55) 100%)',
        animation: animation === 'talking' || animation === 'excited'
          ? 'npcVignettePulse 1.5s ease-in-out infinite' : 'none',
      }} />

      {/* Scanlines */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.03) 4px)',
        pointerEvents: 'none',
      }} />

      {/* Barras de audio */}
      <div style={{
        position: 'absolute', bottom: '38%', left: '50%', transform: 'translateX(-50%)',
        display: 'flex', gap: 3, alignItems: 'flex-end', height: 40,
      }}>
        {bars.map(i => (
          <div key={i} style={{
            width: 4, borderRadius: 2,
            background: animation === 'talking' || animation === 'excited'
              ? `hsl(${180 + i * 8}, 100%, 60%)` : 'rgba(0,255,255,0.3)',
            height: animation === 'talking' || animation === 'excited'
              ? `${Math.random() * 28 + 8}px` : '4px',
            transition: 'height 0.1s ease',
            animation: animation === 'talking' || animation === 'excited'
              ? `npcBar${(i % 4) + 1} ${0.3 + i * 0.05}s ease-in-out infinite alternate` : 'none',
          }} />
        ))}
      </div>

      {/* Burbuja de frase */}
      {phrase && (
        <div style={{
          position: 'absolute', bottom: '44%', left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)',
          border: '1px solid rgba(0,255,255,0.4)', borderRadius: 16,
          padding: '10px 18px', maxWidth: '80%', textAlign: 'center',
          color: '#fff', fontSize: 15, fontWeight: 600,
          boxShadow: '0 0 20px rgba(0,255,255,0.2)',
          animation: 'npcPhraseIn 0.3s ease-out',
        }}>
          {phrase}
        </div>
      )}

      {/* Regalo gigante */}
      {giftEmoji && (
        <div style={{
          position: 'absolute', top: '30%', left: '50%', transform: 'translateX(-50%)',
          fontSize: 80, animation: 'npcGiftBounce 0.6s ease-out',
          filter: 'drop-shadow(0 0 20px gold)',
        }}>
          {giftEmoji}
        </div>
      )}

      {/* Partículas flotantes */}
      {particles.map(p => (
        <div key={p.id} style={{
          position: 'absolute', bottom: 0, left: `${p.x}%`,
          fontSize: 18, animation: `npcFloat ${p.speed}s ease-out forwards`,
          pointerEvents: 'none',
        }}>
          {p.emoji}
        </div>
      ))}

      {/* Estilos CSS */}
      <style>{`
        @keyframes npcVignettePulse {
          0%,100% { opacity:0.7; }
          50% { opacity:1; }
        }
        @keyframes npcBar1 { from{height:6px} to{height:32px} }
        @keyframes npcBar2 { from{height:10px} to{height:26px} }
        @keyframes npcBar3 { from{height:4px} to{height:38px} }
        @keyframes npcBar4 { from{height:8px} to{height:22px} }
        @keyframes npcFloat {
          0% { transform:translateY(0) scale(1); opacity:1; }
          100% { transform:translateY(-200px) scale(0.5); opacity:0; }
        }
        @keyframes npcPhraseIn {
          from { opacity:0; transform:translateX(-50%) translateY(10px); }
          to { opacity:1; transform:translateX(-50%) translateY(0); }
        }
        @keyframes npcGiftBounce {
          0% { transform:translateX(-50%) scale(0) rotate(-20deg); opacity:0; }
          60% { transform:translateX(-50%) scale(1.3) rotate(5deg); opacity:1; }
          100% { transform:translateX(-50%) scale(1) rotate(0deg); opacity:1; }
        }
      `}</style>
    </div>
  );
}

// ─── Componente principal exportado ──────────────────────────────────────────
export default function BotAvatar3D({
  avatarImageUrl,
  botUsername,
  phrase,
  animation,
  muted,
  onSpeakEnd,
}: BotAvatar3DProps) {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const synthRef = useRef<SpeechSynthesisUtterance | null>(null);
  const [giftEmoji, setGiftEmoji] = useState<string | null>(null);
  const [currentPhrase, setCurrentPhrase] = useState(phrase);
  const prevPhraseRef = useRef('');

  // ─── TTS con Web Speech API + Web Audio API para lip-sync ────────────────
  const speak = useCallback((text: string) => {
    if (muted || !text || text === prevPhraseRef.current) return;
    prevPhraseRef.current = text;

    try {
      window.speechSynthesis.cancel();

      // Crear AudioContext para análisis de frecuencias
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        analyserRef.current = audioCtxRef.current.createAnalyser();
        analyserRef.current.fftSize = 256;
        analyserRef.current.smoothingTimeConstant = 0.8;
      }

      const utt = new SpeechSynthesisUtterance(
        text.replace(/[🎲🔥⛓️❤️⭐🎁👑💎🚀💪🎯🏆🎉🎊✨]/g, '')
      );
      utt.lang = 'es-ES';
      utt.rate = 1.05;
      utt.pitch = 1.1;
      utt.volume = 0.9;

      // Voz en español
      const voices = window.speechSynthesis.getVoices();
      const esVoice = voices.find(v => v.lang.startsWith('es') && v.localService)
        || voices.find(v => v.lang.startsWith('es'))
        || voices[0];
      if (esVoice) utt.voice = esVoice;

      utt.onend = () => {
        analyserRef.current = null;
        onSpeakEnd?.();
      };

      synthRef.current = utt;
      window.speechSynthesis.speak(utt);
    } catch { /* silencioso */ }
  }, [muted, onSpeakEnd]);

  // Hablar cuando cambia la frase
  useEffect(() => {
    if (phrase && phrase !== currentPhrase) {
      setCurrentPhrase(phrase);
      speak(phrase);
    }
  }, [phrase, speak]); // eslint-disable-line react-hooks/exhaustive-deps

  // Hablar frase inicial
  useEffect(() => {
    if (phrase) {
      setCurrentPhrase(phrase);
      const timer = setTimeout(() => speak(phrase), 800);
      return () => clearTimeout(timer);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Limpiar al desmontar
  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
      audioCtxRef.current?.close();
    };
  }, []);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* ─── Canvas 3D ───────────────────────────────────────────────────── */}
      <Canvas
        camera={{ position: [0, 0.2, 2.8], fov: 35 }}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
        gl={{ antialias: true, alpha: false }}
      >
        <Suspense fallback={null}>
          <AvatarScene
            avatarImageUrl={avatarImageUrl}
            animation={animation}
            audioAnalyser={analyserRef}
            phrase={currentPhrase}
          />
        </Suspense>
      </Canvas>

      {/* ─── Overlay 2D con efectos de stream ────────────────────────────── */}
      <LiveStreamOverlay
        phrase={currentPhrase}
        animation={animation}
        botUsername={botUsername}
        giftEmoji={giftEmoji}
      />
    </div>
  );
}
