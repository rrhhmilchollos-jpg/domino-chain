import React, { useState, useEffect, useRef, useCallback } from 'react';
import GiftPanel, { GiftAnimationOverlay, useGiftAnimations } from '../components/GiftPanel';
import '../styles/gifts.css';
import { Link } from 'wouter';
import { Eye, X, Gift, Send, Volume2, VolumeX, Share2, UserPlus, Check, XCircle, Swords, Users } from 'lucide-react';
import { Room, RoomEvent, Track } from 'livekit-client';
import { cn, useAuth, Av, FollowButton, API, uploadToCloudinary, shareLink, Toast, useKeyboardOffset, LiveStream } from '../lib/shared';
import { GIFT_BY_ID } from '../lib/giftCatalog';
import { useLiveSocket } from '../lib/useSocket';

type ConnState = 'idle' | 'connecting' | 'connected' | 'error' | 'unavailable' | 'blocked';
type EndSummary = { totalUniqueViewers: number; peakViewerCount: number; totalGiftsReceived: number; durationSeconds: number; recordingUrl: string | null; liveId: string } | null;
type ChatMsg = { user: string; userId?: string; text: string; type?: string };
type JoinRequest = { _id: string; fromUserId: { _id: string; username: string; avatarUrl: string; flag: string }; message: string };
type FloatMsg = { id: number; text: string; emoji: string };

// ─── Frases NPC que el bot "dice" en voz alta ─────────────────────────────
const NPC_PHRASES = [
  '¡Hola a todos! Bienvenidos al directo 🎲',
  '¿Quién se atreve a aceptar el reto? 🔥',
  '¡La cadena sigue! ¡Únete a DOMINO! ⛓️',
  '¡Esto está que arde! 🚀',
  '¡Gracias por estar aquí! ❤️',
  '¡Vamos vamos vamos! 💪',
  '¿Quién es el próximo en la cadena? 🎯',
  '¡El mejor directo de hoy! 👑',
  '¡Increíble! ¡Sigue así! ⭐',
  '¡La cadena no para! ⛓️🔥',
  '¡Manda un regalo si te gusta! 🎁',
  '¡Somos los mejores! 🏆',
  '¡Únete al reto ahora! 🎲',
  '¡Qué nivel tan alto! 🔥🔥',
  '¡Esto va a ser viral! 🚀🚀',
];

// ─── Reacciones a regalos ─────────────────────────────────────────────────
const GIFT_VOICE_REACTIONS: Record<string, string[]> = {
  heart:     ['¡Gracias por el corazón! Te quiero ❤️', '¡Amor puro! ❤️❤️'],
  fire:      ['¡FUEGO! ¡Esto está ardiendo! 🔥🔥🔥', '¡Gracias por el fuego! 🔥'],
  star:      ['¡Gracias por la estrella! Eres brillante ⭐', '¡Una estrella para el mejor! ⭐⭐'],
  domino:    ['¡Gracias por el dominó! Eres un crack 🎲', '¡Dominó para el mejor! 🎲🎲'],
  chain:     ['¡CADENA! ¡La cadena sigue! ⛓️⛓️', '¡Gracias por la cadena! ⛓️'],
  crown:     ['¡CORONA REAL! ¡Eres el rey! 👑👑👑', '¡Gracias por la corona! 👑'],
  diamond:   ['¡DIAMANTE! ¡Eres increíble! 💎💎💎', '¡Gracias! ¡Eres un diamante! 💎'],
};

// ─── TTS Web Speech API ───────────────────────────────────────────────────
function speakNPC(text: string, muted: boolean) {
  if (muted) return;
  try {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text.replace(/[🎲🔥⛓️❤️⭐🎁👑💎🚀💪🎯🏆]/g, ''));
    utt.lang = 'es-ES';
    utt.rate = 1.05;
    utt.pitch = 1.1;
    utt.volume = 0.85;
    // Intentar usar una voz en español
    const voices = window.speechSynthesis.getVoices();
    const esVoice = voices.find(v => v.lang.startsWith('es')) || voices[0];
    if (esVoice) utt.voice = esVoice;
    window.speechSynthesis.speak(utt);
  } catch { /* silencioso */ }
}

export default function LiveViewerPage({ id }: { id: string }) {
  const { user, token, refreshUser } = useAuth();
  const [live, setLive] = useState<LiveStream | null>(null);
  const [liveLoading, setLiveLoading] = useState(true);
  const [msgs, setMsgs] = useState<ChatMsg[]>([{user:'Sistema',text:'¡Bienvenido! 🎲',type:'system'}]);
  const [input, setInput] = useState('');
  const [showGifts, setShowGifts] = useState(false);
  const [giftAnim, setGiftAnim] = useState<string|null>(null);
  const { events: giftEvents, addGiftAnim, removeAnim } = useGiftAnimations();
  const [viewers, setViewers] = useState(0);
  const [sending, setSending] = useState(false);
  const [insufficientCoins, setInsufficientCoins] = useState(false);
  const [connState, setConnState] = useState<ConnState>('idle');
  const [muted, setMuted] = useState(false); // ← bots: desmutear por defecto para TTS
  const [endSummary, setEndSummary] = useState<EndSummary>(null);
  const [ending, setEnding] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [blockingUserId, setBlockingUserId] = useState<string|null>(null);
  const [toast, setToast] = useState<string|null>(null);
  const [camError, setCamError] = useState(false);
  const [giftTarget, setGiftTarget] = useState<'host'|'opponent'>('host');
  const [hostProfile, setHostProfile] = useState<any>(null);

  // Estado NPC Bot
  const [npcPhrase, setNpcPhrase] = useState('¡Bienvenido al directo! 🎲');
  const [npcAnimation, setNpcAnimation] = useState<'idle'|'talking'|'excited'|'dancing'>('idle');
  const [npcGiftReaction, setNpcGiftReaction] = useState<string|null>(null);
  const npcPhraseRef = useRef(0);

  // Solicitudes de unirse (solo visible para el host)
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [showRequests, setShowRequests] = useState(false);
  // Estado de solicitud propia (espectador)
  const [requestSent, setRequestSent] = useState(false);
  const [requestStatus, setRequestStatus] = useState<'none'|'pending'|'accepted'|'rejected'>('none');
  // Panel de invitar a batalla desde dentro
  const [showBattleInvite, setShowBattleInvite] = useState(false);
  // Mensajes flotantes que el host lanza a todos los espectadores
  const [floatMsgs, setFloatMsgs] = useState<FloatMsg[]>([]);
  const [floatInput, setFloatInput] = useState('');
  const [showFloatPanel, setShowFloatPanel] = useState(false);
  const floatCounterRef = useRef(0);
  const FLOAT_PRESETS = ['🔥','❤️','😍','👏','💯','🎉','🤩','💪','✨','🎲'];

  const kbOffset = useKeyboardOffset();
  const chatRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const opponentVideoRef = useRef<HTMLVideoElement>(null);
  const roomRef = useRef<Room | null>(null);
  const mrRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const localBlobRef = useRef<Blob | null>(null);

  const isBot = !!live?.userId?.isBot;

  // ─── Cargar live ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    setLiveLoading(true);
    fetch(`${API}/api/lives`)
      .then(r => r.ok ? r.json() : [])
      .then((list: LiveStream[]) => {
        const found = Array.isArray(list) ? list.find(l => l._id === id) : null;
        setLive(found || null);
      })
      .catch(() => setLive(null))
      .finally(() => setLiveLoading(false));
  }, [id]);

  // Refrescar live cada 4s
  useEffect(() => {
    if (!id) return;
    const interval = setInterval(() => {
      fetch(`${API}/api/lives`)
        .then(r => r.ok ? r.json() : [])
        .then((list: LiveStream[]) => {
          const found = Array.isArray(list) ? list.find(l => l._id === id) : null;
          if (found) { setLive(found); setViewers(found.viewerCount || 0); }
        })
        .catch(() => {});
    }, 4000);
    return () => clearInterval(interval);
  }, [id]);

  // Perfil del host
  useEffect(() => {
    if (!live?.userId?._id) return;
    fetch(`${API}/api/users/${live.userId._id}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    }).then(r => r.ok ? r.json() : null).then(setHostProfile).catch(() => {});
  }, [live?.userId?._id, token]);

  useEffect(() => { if (live) setViewers(live.viewerCount || 0); }, [live]);

  // ─── NPC Bot: frases automáticas + TTS ───────────────────────────────────
  useEffect(() => {
    if (!isBot) return;
    // Frase inicial
    const initialPhrase = NPC_PHRASES[0];
    setNpcPhrase(initialPhrase);
    setNpcAnimation('talking');
    speakNPC(initialPhrase, muted);
    setTimeout(() => setNpcAnimation('idle'), 3000);

    // Ciclo de frases cada 12s
    const interval = setInterval(() => {
      const idx = (++npcPhraseRef.current) % NPC_PHRASES.length;
      const phrase = NPC_PHRASES[idx];
      setNpcPhrase(phrase);
      setNpcAnimation('talking');
      speakNPC(phrase, muted);
      setTimeout(() => setNpcAnimation('idle'), 3500);
    }, 12000);

    return () => clearInterval(interval);
  }, [isBot]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Scroll chat ─────────────────────────────────────────────────────────
  useEffect(() => { if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight; }, [msgs]);

  const isOwner = !!user && !!live && live.userId?._id === user._id;
  const isOpponent = !!user && !!live && !!live.battleOpponentId && live.battleOpponentId._id === user._id;
  const isParticipant = isOwner || isOpponent;

  // Polling de solicitudes (solo host, cada 5s)
  useEffect(() => {
    if (!isOwner || !token || !live?._id) return;
    const fetchRequests = () => {
      fetch(`${API}/api/lives/${live._id}/requests`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.ok ? r.json() : [])
        .then(setJoinRequests)
        .catch(() => {});
    };
    fetchRequests();
    const interval = setInterval(fetchRequests, 5000);
    return () => clearInterval(interval);
  }, [isOwner, token, live?._id]);

  // Polling estado de solicitud propia (espectador)
  useEffect(() => {
    if (isOwner || !token || !live?._id || requestStatus === 'accepted') return;
    if (requestStatus !== 'pending') return;
    const interval = setInterval(async () => {
      try {
        const r = await fetch(`${API}/api/notifications?limit=5`, { headers: { Authorization: `Bearer ${token}` } });
        const notifs = await r.json();
        if (Array.isArray(notifs)) {
          const accepted = notifs.find((n:any) => n.type === 'join_accepted' && n.liveId === live._id);
          const rejected = notifs.find((n:any) => n.type === 'join_rejected' && n.liveId === live._id);
          if (accepted) { setRequestStatus('accepted'); setToast('✅ El host te aceptó — ¡activa tu cámara!'); setTimeout(()=>setToast(null),4000); }
          if (rejected) { setRequestStatus('rejected'); setToast('❌ El host no aceptó tu solicitud'); setTimeout(()=>setToast(null),4000); }
        }
      } catch {}
    }, 3000);
    return () => clearInterval(interval);
  }, [isOwner, token, live?._id, requestStatus]);

  const startLocalRecording = (stream: MediaStream) => {
    if (!isOwner) return;
    chunksRef.current = [];
    const mimeOptions = ['video/mp4;codecs=avc1,mp4a.40.2','video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm','video/mp4'];
    const mime = mimeOptions.find(t => { try { return MediaRecorder.isTypeSupported(t); } catch { return false; } }) || '';
    try {
      const mr = new MediaRecorder(stream, mime ? { mimeType: mime, audioBitsPerSecond: 128000, videoBitsPerSecond: 2500000 } : {});
      mr.ondataavailable = e => { if (e.data && e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => { localBlobRef.current = new Blob(chunksRef.current, { type: mime || 'video/webm' }); };
      mr.start(1000);
      mrRef.current = mr;
    } catch (e) { console.warn('No se pudo iniciar grabación local:', e); }
  };

  const stopLocalRecording = (): Promise<Blob | null> => {
    return new Promise(resolve => {
      if (!mrRef.current || mrRef.current.state === 'inactive') { resolve(localBlobRef.current); return; }
      mrRef.current.onstop = () => {
        localBlobRef.current = new Blob(chunksRef.current, { type: 'video/webm' });
        resolve(localBlobRef.current);
      };
      mrRef.current.stop();
    });
  };

  // ─── Conexión LiveKit (solo para usuarios reales, no bots) ────────────────
  useEffect(() => {
    if (!live?._id || !token || isBot) return; // ← bots no necesitan LiveKit
    let cancelled = false;
    setConnState('connecting');
    setCamError(false);

    (async () => {
      let lkToken: string | null = null;
      let livekitUrl: string | null = null;
      try {
        const r = await fetch(`${API}/api/lives/${live._id}/join`, {
          method: 'POST', headers: { Authorization: `Bearer ${token}` }
        });
        const d = await r.json();
        if (r.status === 403 && d.error === 'blocked') { if (!cancelled) setConnState('blocked'); return; }
        if (r.ok && d.token && d.livekitUrl) { lkToken = d.token; livekitUrl = d.livekitUrl; }
      } catch { }

      if (cancelled) return;
      if (!lkToken || !livekitUrl) { setConnState('unavailable'); return; }

      const room = new Room();
      roomRef.current = room;

      const hostId = live.userId?._id;
      const attachTrack = (track: any, participant: any) => {
        try {
          if (!participant || !participant.identity) return;
          if (track.kind !== Track.Kind.Video && track.kind !== Track.Kind.Audio) return;
          const isHost = participant.identity === hostId;
          const target = isHost ? videoRef.current : opponentVideoRef.current;
          if (target) {
            track.attach(target);
            target.play().catch(() => {});
          }
        } catch (e) {
          console.warn('attachTrack error (safe):', e);
        }
      };

      room.on(RoomEvent.TrackSubscribed, (track, _publication, participant) => {
        if (!participant?.identity) {
          setTimeout(() => attachTrack(track, participant), 500);
        } else {
          attachTrack(track, participant);
        }
      });

      const attachExistingTracks = () => {
        room.remoteParticipants.forEach((participant) => {
          participant.trackPublications.forEach((pub: any) => {
            if (pub.track && pub.isSubscribed) {
              attachTrack(pub.track, participant);
            }
          });
        });
      };

      room.on(RoomEvent.Disconnected, () => {
        if (cancelled) return;
        if (!isOwner && token) {
          fetch(`${API}/api/lives/${live._id}/join`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } })
            .then(r => r.json().then(d => ({ status: r.status, d })))
            .then(({ status, d }) => {
              if (cancelled) return;
              if (status === 403 && d.error === 'blocked') setConnState('blocked');
              else setConnState('unavailable');
            })
            .catch(() => { if (!cancelled) setConnState('unavailable'); });
        } else { setConnState('unavailable'); }
      });

      const updateViewerCount = () => setViewers(Math.max(0, room.numParticipants - (isOwner ? 0 : 1)));
      room.on(RoomEvent.ParticipantConnected, updateViewerCount);
      room.on(RoomEvent.ParticipantDisconnected, updateViewerCount);

      const decoder = new TextDecoder();
      room.on(RoomEvent.DataReceived, (payload) => {
        try {
          const msg = JSON.parse(decoder.decode(payload));
          if (msg.type === 'float') {
            const fid = ++floatCounterRef.current;
            setFloatMsgs(m => [...m, { id: fid, text: msg.text, emoji: msg.emoji || '' }]);
            setTimeout(() => setFloatMsgs(m => m.filter(x => x.id !== fid)), 4000);
          } else {
            setMsgs(m => [...m, msg]);
          }
        } catch { }
      });

      try {
        await room.connect(livekitUrl, lkToken);
        if (cancelled) { room.disconnect(); return; }

        attachExistingTracks();
        setTimeout(attachExistingTracks, 1000);

        if (isParticipant) {
          const myRef = isOwner ? videoRef : opponentVideoRef;
          try {
            const camPub = await room.localParticipant.setCameraEnabled(true);
            if (camPub?.track && myRef.current) camPub.track.attach(myRef.current);
            await room.localParticipant.setMicrophoneEnabled(true);
          } catch { if (!cancelled) setCamError(true); }

          if (isOwner) {
            try {
              const videoEl = videoRef.current as any;
              const captureStream: MediaStream = videoEl?.captureStream?.(30) || videoEl?.mozCaptureStream?.();
              if (captureStream) startLocalRecording(captureStream);
            } catch (e) { console.warn('captureStream no disponible:', e); }
          }
        }

        setConnState('connected');
        updateViewerCount();
      } catch { if (!cancelled) setConnState('error'); }
    })();

    return () => {
      cancelled = true;
      roomRef.current?.disconnect();
      roomRef.current = null;
      if (!isOwner && token) {
        fetch(`${API}/api/lives/${live._id}/leave`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live?._id, token, isOwner, isOpponent, isBot]);

  const encoder = new TextEncoder();
  const broadcast = (msg: ChatMsg) => {
    try { roomRef.current?.localParticipant.publishData(encoder.encode(JSON.stringify(msg)), { reliable: true }); } catch { }
  };

  // Socket.IO para chat en tiempo real (funciona aunque no haya LiveKit)
  const { sendMessage: socketSendMsg, sendFloat: socketSendFloat } = useLiveSocket(live?._id || '', {
    onMessage: (msg: ChatMsg) => setMsgs(m => {
      if (msg.userId && user && msg.userId === user._id) return m;
      return [...m, msg];
    }),
    onGift: (data: any) => {
      const giftDef = GIFT_BY_ID[data.giftType || data.type || ''];
      const giftName = giftDef?.name || data.name || 'regalo';
      const giftEmoji = giftDef?.emoji || data.emoji || '🎁';
      addGiftAnim(data.giftType || data.type || 'heart', data.fromUser || 'Alguien', 1);
      const msg: ChatMsg = { user: data.fromUser || 'Alguien', text: `envió ${giftEmoji} ${giftName}!`, type: 'gift' };
      setMsgs(m => [...m, msg]);

      // ─── Reacción NPC al regalo ─────────────────────────────────────────
      if (isBot) {
        const giftType = data.giftType || data.type || 'heart';
        const reactions = GIFT_VOICE_REACTIONS[giftType] || ['¡Gracias por el regalo! ❤️'];
        const reaction = reactions[Math.floor(Math.random() * reactions.length)];
        setNpcPhrase(reaction);
        setNpcAnimation('excited');
        setNpcGiftReaction(giftEmoji);
        speakNPC(reaction, muted);
        // Añadir al chat como mensaje del bot
        setMsgs(m => [...m, { user: live?.userId?.username || 'Bot', text: reaction, type: 'bot' }]);
        setTimeout(() => { setNpcAnimation('idle'); setNpcGiftReaction(null); }, 4000);
      }
    },
    onFloat: (data: any) => {
      const fid = ++floatCounterRef.current;
      setFloatMsgs(m => [...m, { id: fid, text: data.text, emoji: data.emoji || '' }]);
      setTimeout(() => setFloatMsgs(m => m.filter(x => x.id !== fid)), 4000);
    },
    onEnded: () => {
      setConnState('unavailable');
    },
    onViewerCount: (count: number) => setViewers(count),
  });

  const sendFloatMsg = (text: string, emoji: string = '') => {
    if (!isOwner || !text.trim()) return;
    const msg = { type: 'float', text: text.trim(), emoji };
    try { roomRef.current?.localParticipant.publishData(encoder.encode(JSON.stringify(msg)), { reliable: true }); } catch { }
    socketSendFloat({ text: text.trim(), emoji, user: user?.username || 'Host' });
    const fid = ++floatCounterRef.current;
    setFloatMsgs(m => [...m, { id: fid, text: text.trim(), emoji }]);
    setTimeout(() => setFloatMsgs(m => m.filter(x => x.id !== fid)), 4000);
    setFloatInput('');
    setShowFloatPanel(false);
  };

  const requestJoin = async () => {
    if (!token || !live?._id) return;
    try {
      const r = await fetch(`${API}/api/lives/${live._id}/request`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}` }
      });
      if (r.ok) {
        setRequestStatus('pending');
        setToast('Solicitud enviada — espera la respuesta del host');
        setTimeout(() => setToast(null), 3000);
      } else {
        const d = await r.json();
        setToast(d.error || 'Error al enviar solicitud');
        setTimeout(() => setToast(null), 3000);
      }
    } catch { }
  };

  const acceptRequest = async (req: JoinRequest) => {
    if (!token || !live?._id) return;
    try {
      await fetch(`${API}/api/lives/${live._id}/request/${req.fromUserId._id}/accept`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}` }
      });
      setJoinRequests(prev => prev.filter(r => r._id !== req._id));
      const sysMsg: ChatMsg = { user: 'Sistema', text: `@${req.fromUserId.username} se unió al directo`, type: 'system' };
      setMsgs(m => [...m, sysMsg]);
      broadcast(sysMsg);
    } catch { }
  };

  const rejectRequest = async (req: JoinRequest) => {
    if (!token || !live?._id) return;
    try {
      await fetch(`${API}/api/lives/${live._id}/request/${req.fromUserId._id}/reject`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}` }
      });
      setJoinRequests(prev => prev.filter(r => r._id !== req._id));
    } catch { }
  };

  const blockUser = async (targetUserId: string, targetUsername: string) => {
    if (!token || !isOwner || blockingUserId) return;
    if (!window.confirm(`¿Bloquear a @${targetUsername} de este directo?`)) return;
    setBlockingUserId(targetUserId);
    try {
      const r = await fetch(`${API}/api/lives/${id}/block`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: targetUserId })
      });
      if (r.ok) {
        const sysMsg: ChatMsg = { user: 'Sistema', text: `@${targetUsername} ha sido bloqueado`, type: 'system' };
        setMsgs(m => [...m, sysMsg]);
        broadcast(sysMsg);
      }
    } finally { setBlockingUserId(null); }
  };

  const doShare = async () => {
    const url = `${window.location.origin}/live/${id}`;
    const result = await shareLink(`DOMINO — Live de @${live?.userId?.username}`, url, live?.title);
    if (result === 'copied') { setToast('Enlace copiado'); setTimeout(() => setToast(null), 2000); }
  };

  const endLive = async () => {
    if (!token || !window.confirm('¿Terminar el directo para todos?')) return;
    setEnding(true);
    try {
      const blob = await stopLocalRecording();
      const r = await fetch(`${API}/api/lives/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      const d = await r.json();
      roomRef.current?.disconnect();
      let recordingUrl: string | null = d.recordingUrl || null;
      if (blob && blob.size > 10000) {
        try {
          setPublishing(true);
          const result = await uploadToCloudinary(blob, pct => setUploadProgress(pct));
          recordingUrl = result.videoUrl;
          await fetch(`${API}/api/lives/${d.liveId || id}/recording`, {
            method: 'PATCH', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ recordingUrl })
          }).catch(() => {});
        } catch (e) { console.warn('No se pudo subir la grabación:', e); }
        finally { setPublishing(false); }
      }
      if (r.ok) setEndSummary({ ...d.summary, recordingUrl, liveId: d.liveId || id });
      else setEndSummary({ totalUniqueViewers: 0, peakViewerCount: 0, totalGiftsReceived: 0, durationSeconds: 0, recordingUrl, liveId: id });
    } finally { setEnding(false); }
  };

  const publishAsVideo = async () => {
    if (!token || !endSummary) return;
    setPublishing(true);
    try {
      if (endSummary.recordingUrl) {
        const r = await fetch(`${API}/api/lives/${endSummary.liveId}/publish-as-video`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
        if (r.ok) { setPublished(true); return; }
      }
      if (localBlobRef.current) {
        setUploadProgress(0);
        const result = await uploadToCloudinary(localBlobRef.current, pct => setUploadProgress(pct));
        const r = await fetch(`${API}/api/videos`, {
          method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ videoUrl: result.videoUrl, thumbnailUrl: result.thumbnailUrl, challengeId: null, geoCoordinates: { lat: 0, lng: 0 }, nominatedUserIds: [] })
        });
        if (r.ok) setPublished(true);
      }
    } finally { setPublishing(false); }
  };

  const sendMsg = () => {
    if (!input.trim() || !user) return;
    const msg: ChatMsg = { user: user.username, userId: user._id, text: input };
    setMsgs(m => [...m, msg]);
    broadcast(msg);
    socketSendMsg({ user: user.username, userId: user._id, avatarUrl: user.avatarUrl, text: input });
    setInput('');
  };

  const sendGift = async (type: string) => {
    if (!token || !user) return;
    const g = GIFT_BY_ID[type] || { coins: 0, name: type, emoji: '🎁' };
    if ((user.coins || 0) < g.coins) { setInsufficientCoins(true); setTimeout(() => setInsufficientCoins(false), 3000); setShowGifts(false); return; }
    setSending(true);
    try {
      const r = await fetch(`${API}/api/coins/gift`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ liveId: id, giftType: type, quantity: 1, target: live?.isBattle ? giftTarget : 'host' }) });
      if (r.ok) {
        setGiftAnim(`${g.emoji} ${g.name}`); setTimeout(() => setGiftAnim(null), 3000);
        const msg: ChatMsg = { user: user.username, userId: user._id, text: `envió ${g.emoji} ${g.name}!`, type: 'gift' };
        setMsgs(m => [...m, msg]); broadcast(msg); await refreshUser();
      } else if (r.status === 400) { setInsufficientCoins(true); setTimeout(() => setInsufficientCoins(false), 3000); }
    } finally { setSending(false); setShowGifts(false); }
  };

  if (liveLoading) return <div className="min-h-screen flex items-center justify-center" style={{paddingTop:'80px',background:'#0b0b12'}}><div className="text-center"><div className="text-4xl mb-3 animate-pulse">📡</div><p className="text-gray-400 text-sm">Cargando directo...</p></div></div>;
  if (!live) return <div className="min-h-screen flex items-center justify-center" style={{paddingTop:'80px',background:'#0b0b12'}}><div className="text-center"><div className="text-5xl mb-4">📡</div><p className="text-white font-bold mb-2">Live no encontrado</p><Link href="/live" className="text-sm font-semibold" style={{color:'#00F5FF'}}>Ver otros</Link></div></div>;

  if (endSummary) return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{paddingTop:'80px',background:'#0b0b12'}}>
      <div className="w-full max-w-sm text-center">
        <div className="text-5xl mb-3">🎬</div>
        <h1 className="text-2xl font-black text-white mb-1">Directo terminado</h1>
        <p className="text-gray-400 text-sm mb-6">Resumen de tu live</p>
        <div className="grid grid-cols-3 gap-2 mb-6">
          <div className="rounded-xl p-3 border" style={{background:'#13131f',borderColor:'#1e1e2a'}}><div className="text-xl font-black text-white">{endSummary.totalUniqueViewers}</div><div className="text-[10px] text-gray-500 mt-0.5">Espectadores</div></div>
          <div className="rounded-xl p-3 border" style={{background:'#13131f',borderColor:'#1e1e2a'}}><div className="text-xl font-black text-white">{endSummary.peakViewerCount}</div><div className="text-[10px] text-gray-500 mt-0.5">Pico</div></div>
          <div className="rounded-xl p-3 border" style={{background:'#13131f',borderColor:'#1e1e2a'}}><div className="text-xl font-black text-white">{endSummary.totalGiftsReceived}</div><div className="text-[10px] text-gray-500 mt-0.5">Regalos</div></div>
        </div>
        {published ? <div className="mb-4 p-3 rounded-xl text-sm font-bold text-white" style={{background:'rgba(0,245,255,0.15)',border:'1px solid #00F5FF'}}>✅ Publicado en el feed</div>
        : publishing ? <div className="mb-4"><p className="text-sm text-gray-400 mb-2">Subiendo... {uploadProgress}%</p><div className="h-2 rounded-full overflow-hidden" style={{background:'#1e1e2a'}}><div className="h-full rounded-full transition-all" style={{width:`${uploadProgress}%`,background:'linear-gradient(90deg,#00F5FF,#7c3aed)'}}/></div></div>
        : <button onClick={publishAsVideo} className="w-full mb-3 py-3 rounded-xl font-bold text-black flex items-center justify-center gap-2" style={{background:'linear-gradient(135deg,#00F5FF,#7c3aed)'}}>📤 Publicar en el feed</button>}
        <Link href="/dashboard" className="block w-full py-3 rounded-xl font-bold text-white border" style={{borderColor:'#2a2a3a'}}>Ir a mi perfil</Link>
      </div>
    </div>
  );

  // ─── Render principal ─────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0" style={{paddingTop:'56px',background:'#000'}}>
      <div className="relative w-full h-full">

        {/* ═══════════════════════════════════════════════════════════════
            MODO BOT NPC — Avatar fotorrealista animado a pantalla completa
            Siempre visible para bots (no depende de LiveKit)
        ═══════════════════════════════════════════════════════════════ */}
        {isBot ? (
          <div className="absolute inset-0 overflow-hidden">
            {/* Fondo degradado */}
            <div className="absolute inset-0" style={{background:'linear-gradient(180deg,#0a0a1a 0%,#1a0a2e 40%,#0d0d1d 100%)'}}/>

            {/* Partículas de fondo */}
            <div className="absolute inset-0 pointer-events-none" style={{
              backgroundImage:'radial-gradient(circle at 15% 40%, rgba(0,245,255,0.08) 0%, transparent 45%), radial-gradient(circle at 85% 20%, rgba(255,0,127,0.08) 0%, transparent 45%), radial-gradient(circle at 50% 80%, rgba(124,58,237,0.06) 0%, transparent 40%)',
            }}/>

            {/* Avatar NPC a pantalla completa */}
            {live.userId?.avatarUrl && (
              <img
                src={live.userId.avatarUrl}
                alt={live.userId.username}
                className="absolute inset-0 w-full h-full object-cover object-top"
                style={{
                  filter: 'brightness(0.85) contrast(1.15) saturate(1.2)',
                  animation: npcAnimation === 'talking'
                    ? 'npcTalk 0.15s steps(2) infinite'
                    : npcAnimation === 'excited'
                    ? 'npcExcited 0.3s ease-in-out infinite'
                    : npcAnimation === 'dancing'
                    ? 'npcDance 0.5s ease-in-out infinite'
                    : 'npcIdle 4s ease-in-out infinite',
                  transformOrigin: 'bottom center',
                }}
              />
            )}

            {/* Overlay degradado inferior para legibilidad del chat */}
            <div className="absolute inset-0" style={{background:'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.3) 35%, rgba(0,0,0,0.05) 60%, transparent 80%)'}}/>

            {/* Efecto glitch sutil */}
            <div className="absolute inset-0 pointer-events-none" style={{
              animation:'npcGlitch 10s steps(1) infinite',
              opacity:0.08,
              backgroundImage:'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,245,255,0.4) 3px, rgba(0,245,255,0.4) 4px)',
            }}/>

            {/* Efecto de scanlines */}
            <div className="absolute inset-0 pointer-events-none" style={{
              backgroundImage:'repeating-linear-gradient(0deg, rgba(0,0,0,0.03) 0px, rgba(0,0,0,0.03) 1px, transparent 1px, transparent 2px)',
              backgroundSize:'100% 2px',
            }}/>

            {/* Badge BOT IA EN DIRECTO */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-1.5 rounded-full z-10" style={{background:'rgba(0,0,0,0.7)',border:'1px solid rgba(0,245,255,0.6)',backdropFilter:'blur(12px)'}}>
              <div className="w-2 h-2 rounded-full animate-pulse" style={{background:'#00F5FF'}}/>
              <span className="text-xs font-black tracking-wider" style={{color:'#00F5FF'}}>🤖 BOT IA EN DIRECTO</span>
            </div>

            {/* Reacción a regalo — emoji grande flotante */}
            {npcGiftReaction && (
              <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none" style={{animation:'giftPop 0.5s cubic-bezier(0.175,0.885,0.32,1.275)'}}>
                <div className="text-8xl drop-shadow-2xl">{npcGiftReaction}</div>
              </div>
            )}

            {/* Burbuja de frase NPC — boca del bot */}
            <div className="absolute z-10" style={{bottom:'42%',left:'50%',transform:'translateX(-50%)',maxWidth:'85%',minWidth:'200px'}}>
              <div
                className="relative px-4 py-2.5 rounded-2xl text-center"
                style={{
                  background:'rgba(0,0,0,0.75)',
                  border:`1px solid ${npcAnimation==='excited'?'rgba(255,0,127,0.7)':'rgba(0,245,255,0.4)'}`,
                  backdropFilter:'blur(12px)',
                  boxShadow: npcAnimation==='excited' ? '0 0 20px rgba(255,0,127,0.4)' : '0 0 15px rgba(0,245,255,0.2)',
                  animation: npcAnimation==='talking' ? 'phrasePop 0.3s ease-out' : 'none',
                }}
              >
                {/* Indicador de habla animado */}
                {npcAnimation === 'talking' && (
                  <div className="flex items-center justify-center gap-1 mb-1">
                    {[0,1,2].map(i => (
                      <div key={i} className="w-1.5 h-1.5 rounded-full" style={{background:'#00F5FF',animation:`soundBar 0.6s ease-in-out ${i*0.15}s infinite`}}/>
                    ))}
                  </div>
                )}
                <p className="text-white text-sm font-bold leading-tight">{npcPhrase}</p>
              </div>
              {/* Triángulo apuntando hacia arriba (hacia el avatar) */}
              <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-0 h-0" style={{borderLeft:'8px solid transparent',borderRight:'8px solid transparent',borderBottom:`8px solid rgba(0,245,255,0.4)`}}/>
            </div>

            {/* Nombre del bot y título del live */}
            <div className="absolute z-10" style={{bottom:'36%',left:0,right:0,textAlign:'center'}}>
              <p className="text-white font-black text-lg drop-shadow-lg">@{live.userId?.username}</p>
              <p className="text-gray-300 text-xs mt-0.5 px-8 drop-shadow line-clamp-1">{live.title}</p>
            </div>

            {/* Botón de volumen/TTS */}
            <button
              onClick={() => {
                setMuted(m => {
                  if (!m) window.speechSynthesis?.cancel();
                  return !m;
                });
              }}
              className="absolute z-20 p-2.5 rounded-full"
              style={{top:'52px',right:'8px',background:'rgba(0,0,0,0.6)',border:'1px solid rgba(255,255,255,0.2)'}}
            >
              {muted ? <VolumeX size={18} className="text-white"/> : <Volume2 size={18} style={{color:'#00F5FF'}}/>}
            </button>

            {/* CSS Animations */}
            <style>{`
              @keyframes npcIdle {
                0%,100%{transform:scale(1) translateY(0)}
                25%{transform:scale(1.005) translateY(-2px)}
                75%{transform:scale(0.998) translateY(1px)}
              }
              @keyframes npcTalk {
                0%{transform:scale(1)}
                50%{transform:scale(1.008) translateY(-1px)}
                100%{transform:scale(1)}
              }
              @keyframes npcExcited {
                0%,100%{transform:scale(1) rotate(0deg)}
                25%{transform:scale(1.02) rotate(-0.5deg)}
                75%{transform:scale(1.02) rotate(0.5deg)}
              }
              @keyframes npcDance {
                0%,100%{transform:scale(1) rotate(0deg) translateY(0)}
                25%{transform:scale(1.01) rotate(-1deg) translateY(-3px)}
                75%{transform:scale(1.01) rotate(1deg) translateY(-3px)}
              }
              @keyframes npcGlitch {
                0%,88%,100%{opacity:0}
                89%{opacity:0.08;transform:translateX(-2px)}
                91%{opacity:0;transform:translateX(0)}
                93%{opacity:0.06;transform:translateX(2px)}
                95%{opacity:0}
              }
              @keyframes soundBar {
                0%,100%{height:4px;opacity:0.5}
                50%{height:10px;opacity:1}
              }
              @keyframes phrasePop {
                0%{transform:scale(0.8);opacity:0}
                100%{transform:scale(1);opacity:1}
              }
              @keyframes giftPop {
                0%{transform:translate(-50%,-50%) scale(0);opacity:0}
                60%{transform:translate(-50%,-50%) scale(1.3);opacity:1}
                100%{transform:translate(-50%,-50%) scale(1);opacity:1}
              }
            `}</style>
          </div>
        ) : (
          /* ═══════════════════════════════════════════════════════════════
              MODO USUARIO REAL — LiveKit stream
          ═══════════════════════════════════════════════════════════════ */
          <>
            {/* Pantalla dividida para batalla */}
            {live.battleOpponentId ? (
              <div className="absolute inset-0 flex flex-col" style={{visibility:connState==='connected'?'visible':'hidden',opacity:connState==='connected'?1:0}}>
                <div className="relative flex-1 overflow-hidden">
                  <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" autoPlay playsInline muted={isOwner?true:muted}/>
                  <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-full text-xs font-bold text-white" style={{background:'rgba(0,0,0,0.5)'}}>@{live.userId?.username}</div>
                </div>
                <div className="flex-shrink-0 h-0.5 w-full" style={{background: live.isBattle ? '#FF007F' : '#00F5FF'}}/>
                <div className="relative flex-1 overflow-hidden">
                  <video ref={opponentVideoRef} className="absolute inset-0 w-full h-full object-cover" autoPlay playsInline muted={isOpponent?true:muted}/>
                  <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-full text-xs font-bold text-white" style={{background:'rgba(0,0,0,0.5)'}}>@{live.battleOpponentId?.username}</div>
                  {live.isBattle && <div className="absolute top-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-black text-white" style={{background:'#FF007F'}}>VS ⚔️</div>}
                </div>
              </div>
            ) : (
              <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" autoPlay playsInline muted={isOwner||muted} style={{visibility:connState==='connected'?'visible':'hidden',opacity:connState==='connected'?1:0}}/>
            )}

            {/* Placeholder usuario real mientras conecta */}
            {connState !== 'connected' && (
              <div className="absolute inset-0 flex items-center justify-center" style={{background:'#1a1a2e'}}>
                <div className="text-center px-4">
                  <Av u={live.userId} s={100}/>
                  <p className="text-white font-bold mt-4 text-lg">@{live.userId?.username}</p>
                  <p className="text-gray-400 text-sm mt-1 mb-4">{live.title}</p>
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-3" style={{background:'rgba(255,0,127,0.2)',border:'1px solid #FF007F'}}>
                    <div className="w-2 h-2 rounded-full animate-pulse" style={{background:'#FF007F'}}/>
                    <span className="text-white text-sm font-bold">EN DIRECTO</span>
                  </div>
                  <p className="text-gray-500 text-xs">
                    {connState==='connecting'?'Conectando...':connState==='blocked'?'🚫 Has sido bloqueado':connState==='unavailable'?(isOwner?'Inicia el streaming':'Esperando al streamer...'):'No se pudo conectar'}
                  </p>
                  {!token && <p className="text-yellow-400 text-xs mt-2"><Link href="/auth" style={{color:'#00F5FF'}}>Inicia sesión</Link> para ver el directo</p>}
                </div>
              </div>
            )}

            {/* Botón mute para usuarios reales */}
            {connState==='connected' && !isOwner && (
              <button onClick={() => setMuted(m => !m)} className="absolute z-10 p-2.5 rounded-full" style={{top:'52px',right:'8px',background:'rgba(0,0,0,0.55)'}}>
                {muted ? <VolumeX size={18} className="text-white"/> : <Volume2 size={18} className="text-white"/>}
              </button>
            )}
          </>
        )}

        {/* Gradiente inferior para legibilidad */}
        <div className="absolute inset-x-0 bottom-0 h-2/5 pointer-events-none" style={{background:'linear-gradient(to top,rgba(0,0,0,0.75) 0%,transparent 100%)'}}/>

        {/* ─── Top bar ────────────────────────────────────────────────── */}
        <div className="absolute top-2 left-2 right-2 flex items-center justify-between z-10 gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <div className="flex items-center gap-1.5 pl-1 pr-2.5 py-1 rounded-full" style={{background:'rgba(0,0,0,0.55)'}}>
              <Av u={live.userId} s={24}/>
              <span className="text-white text-xs font-bold">@{live.userId?.username}</span>
              {isBot && <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full" style={{background:'rgba(0,245,255,0.25)',color:'#00F5FF'}}>IA</span>}
            </div>
            {!isOwner && <FollowButton userId={live.userId?._id} initialIsFollowing={!!hostProfile?.isFollowing} compact/>}
            <div className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold text-white" style={{background:'#FF007F'}}>
              <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"/>LIVE
            </div>
            <div className="flex items-center gap-1 px-2 py-1 rounded-full text-xs text-white" style={{background:'rgba(0,0,0,0.55)'}}>
              <Eye size={10}/>{Math.max(0,viewers)}
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {isOwner && joinRequests.length > 0 && (
              <button onClick={() => setShowRequests(s => !s)} className="relative p-1.5 rounded-full" style={{background:'rgba(0,245,255,0.2)',border:'1px solid #00F5FF'}}>
                <Users size={16} className="text-white"/>
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[9px] font-black text-black flex items-center justify-center" style={{background:'#00F5FF'}}>{joinRequests.length}</span>
              </button>
            )}
            {isOwner && connState === 'connected' && live.battleOpponentId && !live.isBattle && (
              <button onClick={async () => {
                if (!token || !live._id || !live.battleOpponentId) return;
                const r = await fetch(`${API}/api/lives/${live._id}/battle/invite`, {
                  method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                  body: JSON.stringify({ userId: live.battleOpponentId._id })
                });
                if (r.ok) { setToast('⚔️ ¡Reto de batalla enviado!'); setTimeout(()=>setToast(null),3000); }
              }} className="flex items-center gap-1 px-2 py-1.5 rounded-full text-xs font-bold text-white" style={{background:'linear-gradient(135deg,#FF007F,#7c3aed)'}}>
                <Swords size={13}/>⚔️ Batalla
              </button>
            )}
            {isOwner && connState === 'connected' && !live.battleOpponentId && (
              <button onClick={() => setShowBattleInvite(s => !s)} className="p-1.5 rounded-full" style={{background:'rgba(255,0,127,0.2)',border:'1px solid #FF007F'}}>
                <Swords size={16} className="text-white"/>
              </button>
            )}
            {!isOwner && !isOpponent && connState === 'connected' && requestStatus === 'none' && !isBot && (
              <button onClick={requestJoin} className="flex items-center gap-1 px-2 py-1.5 rounded-full text-xs font-bold text-white" style={{background:'rgba(0,245,255,0.2)',border:'1px solid #00F5FF'}}>
                <UserPlus size={13}/>Unirse
              </button>
            )}
            {!isOwner && requestStatus === 'pending' && (
              <div className="px-2 py-1.5 rounded-full text-xs font-bold text-gray-300" style={{background:'rgba(0,0,0,0.5)'}}>Esperando...</div>
            )}
            {isOwner ? (
              <button onClick={endLive} disabled={ending} className="p-1.5 rounded-full flex-shrink-0 disabled:opacity-50" style={{background:'rgba(255,0,127,0.7)'}}><X size={16} className="text-white"/></button>
            ) : (
              <Link href="/live" className="p-1.5 rounded-full flex-shrink-0" style={{background:'rgba(0,0,0,0.6)'}}><X size={16} className="text-white"/></Link>
            )}
          </div>
        </div>

        {/* Marcador batalla */}
        {live.isBattle && (() => {
          const h = live.battleScore?.host || 0, o = live.battleScore?.opponent || 0, total = h + o;
          const hostPct = total > 0 ? Math.round((h/total)*100) : 50;
          return (
            <div className="absolute top-12 left-2 right-2 z-10">
              <div className="relative h-7 rounded-full overflow-hidden flex" style={{background:'#1a1a2e'}}>
                <button onClick={()=>setGiftTarget('host')} className="h-full flex items-center justify-start pl-2.5 transition-all" style={{width:`${hostPct}%`,minWidth:'10%',background:'linear-gradient(90deg,#FF007F,#FF6FB5)',boxShadow:giftTarget==='host'?'inset 0 0 0 2px #fff':'none'}}>
                  <span className="text-white text-xs font-black">{h}</span>
                </button>
                <button onClick={()=>live.battleOpponentId&&setGiftTarget('opponent')} disabled={!live.battleOpponentId} className="h-full flex-1 flex items-center justify-end pr-2.5 transition-all" style={{background:'linear-gradient(90deg,#7c3aed,#3b82f6)',boxShadow:giftTarget==='opponent'?'inset 0 0 0 2px #fff':'none'}}>
                  <span className="text-white text-xs font-black">{o}</span>
                </button>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none"><span className="text-white text-[10px] font-black px-1.5 py-0.5 rounded" style={{background:'rgba(0,0,0,0.45)'}}>VS</span></div>
              </div>
              <div className="flex items-center justify-between mt-1 px-0.5">
                <span className="text-white text-[11px] font-bold truncate max-w-[46%]">@{live.userId?.username}</span>
                <span className="text-white text-[11px] font-bold truncate max-w-[46%] text-right">{live.battleOpponentId?`@${live.battleOpponentId.username}`:'Esperando rival...'}</span>
              </div>
            </div>
          );
        })()}

        {/* Panel solicitudes de unirse */}
        {showRequests && isOwner && joinRequests.length > 0 && (
          <div className="absolute top-14 right-2 z-20 rounded-2xl p-3 w-72" style={{background:'#13131f',border:'1px solid #1e1e2a'}}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-white font-bold text-sm">Solicitudes ({joinRequests.length})</h3>
              <button onClick={()=>setShowRequests(false)}><X size={14} className="text-gray-400"/></button>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {joinRequests.map(req => (
                <div key={req._id} className="flex items-center gap-2 p-2 rounded-xl" style={{background:'rgba(255,255,255,0.05)'}}>
                  <Av u={req.fromUserId} s={32}/>
                  <span className="text-white text-xs font-semibold flex-1 truncate">@{req.fromUserId.username}</span>
                  <button onClick={()=>acceptRequest(req)} className="p-1.5 rounded-full" style={{background:'rgba(0,245,255,0.2)'}}><Check size={14} className="text-[#00F5FF]"/></button>
                  <button onClick={()=>rejectRequest(req)} className="p-1.5 rounded-full" style={{background:'rgba(255,0,127,0.2)'}}><XCircle size={14} className="text-[#FF007F]"/></button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Panel invitar a batalla */}
        {showBattleInvite && isOwner && (
          <div className="absolute top-14 right-2 z-20 rounded-2xl p-3 w-72" style={{background:'#13131f',border:'1px solid #1e1e2a'}}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-white font-bold text-sm">⚔️ Retar a batalla</h3>
              <button onClick={()=>setShowBattleInvite(false)}><X size={14} className="text-gray-400"/></button>
            </div>
            {live.battleOpponentId ? (
              <p className="text-gray-400 text-xs text-center py-2">Ya hay un rival en la batalla</p>
            ) : (
              <p className="text-gray-400 text-xs text-center py-2">Pide a alguien que solicite unirse y acéptalo para iniciar la batalla</p>
            )}
          </div>
        )}

        {/* Error cámara */}
        {camError && isParticipant && (
          <div className="absolute top-20 left-2 right-2 z-20 px-4 py-3 rounded-xl text-center" style={{background:'rgba(255,0,127,0.92)'}}>
            <p className="text-white text-sm font-bold">No se pudo activar tu cámara o micrófono</p>
            <p className="text-white text-xs mt-0.5">Revisa los permisos y vuelve a entrar</p>
          </div>
        )}

        {/* Animaciones de regalos */}
        <GiftAnimationOverlay events={giftEvents} onDone={removeAnim} />
        {giftAnim && <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center animate-bounce z-20"><div className="text-5xl mb-2">{giftAnim.split(' ')[0]}</div><p className="text-white font-bold">{giftAnim}</p></div>}
        <Toast message={toast}/>
        {insufficientCoins && <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20 px-6 py-4 rounded-2xl text-center" style={{background:'rgba(255,0,127,0.9)'}}><p className="text-white font-bold">¡Monedas insuficientes!</p><Link href="/coins" className="text-xs text-white underline mt-1 block">Comprar →</Link></div>}

        {/* Mensajes flotantes */}
        <style>{`
          @keyframes floatUp {
            0%   { opacity: 0; transform: translate(-50%, 20px) scale(0.7); }
            15%  { opacity: 1; transform: translate(-50%, 0px) scale(1.05); }
            80%  { opacity: 1; transform: translate(-50%, -30px) scale(1); }
            100% { opacity: 0; transform: translate(-50%, -60px) scale(0.9); }
          }
        `}</style>
        <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden">
          {floatMsgs.map((fm) => (
            <div key={fm.id} className="absolute left-1/2" style={{top:`${25+(fm.id%4)*10}%`,animation:'floatUp 4s ease-out forwards'}}>
              {fm.emoji && <div className="text-4xl mb-1 text-center">{fm.emoji}</div>}
              <div className="px-4 py-2 rounded-2xl font-black text-white text-lg text-center whitespace-nowrap" style={{background:'linear-gradient(135deg,rgba(255,0,127,0.92),rgba(124,58,237,0.92))',boxShadow:'0 0 24px rgba(255,0,127,0.6)',backdropFilter:'blur(8px)'}}>{fm.text}</div>
            </div>
          ))}
        </div>

        {/* Panel mensajes flotantes — solo el host */}
        {isOwner && showFloatPanel && connState === 'connected' && (
          <div className="absolute bottom-24 left-2 right-2 z-30 rounded-2xl p-4" style={{background:'#13131f',border:'1px solid #FF007F',boxShadow:'0 0 20px rgba(255,0,127,0.3)'}}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-white text-sm">✨ Enviar mensaje flotante</h3>
              <button onClick={()=>setShowFloatPanel(false)}><X size={16} className="text-gray-400"/></button>
            </div>
            <div className="flex gap-2 mb-3 flex-wrap">
              {FLOAT_PRESETS.map(emoji => (
                <button key={emoji} onClick={()=>sendFloatMsg(emoji, emoji)} className="text-2xl p-1.5 rounded-xl hover:bg-white/10 transition-colors">{emoji}</button>
              ))}
            </div>
            <div className="flex gap-2">
              <input value={floatInput} onChange={e=>setFloatInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&sendFloatMsg(floatInput)} placeholder="Escribe tu mensaje flotante..." className="flex-1 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-400 focus:outline-none" style={{background:'#0b0b12',border:'1px solid #2a2a3a'}} maxLength={40}/>
              <button onClick={()=>sendFloatMsg(floatInput)} disabled={!floatInput.trim()} className="px-4 py-2.5 rounded-xl font-bold text-white disabled:opacity-40" style={{background:'linear-gradient(135deg,#FF007F,#7c3aed)'}}><Send size={16}/></button>
            </div>
          </div>
        )}

        {/* GiftPanel */}
        {showGifts && live && (
          <GiftPanel
            liveId={live._id}
            hostId={live.userId?._id || ''}
            onClose={() => setShowGifts(false)}
            onGiftSent={(gift, qty) => {
              addGiftAnim(gift.id, user?.username || 'Tú', qty);
              const msg: ChatMsg = { user: user?.username || 'Tú', userId: user?._id, text: `envió ${gift.emoji} ${gift.name}!`, type: 'gift' };
              setMsgs(m => [...m, msg]);
            }}
            target={giftTarget}
            opponentId={live.battleOpponentId?._id}
          />
        )}

        {/* Chat y controles */}
        <div className="absolute inset-x-0 bottom-0 z-10 pb-3" style={{transform:kbOffset?`translateY(-${kbOffset}px)`:undefined,transition:'transform 0.15s ease-out'}}>
          <div ref={chatRef} className="overflow-y-auto px-3 space-y-1.5 mb-2" style={{maxHeight:'32vh',WebkitMaskImage:'linear-gradient(to top, black 70%, transparent 100%)',maskImage:'linear-gradient(to top, black 70%, transparent 100%)'}}>
            {msgs.map((m,i) => (
              <div key={i} className={cn('text-xs',m.type==='system'?'text-gray-300':'')}>
                {m.type==='gift' ? <span className="px-2 py-1 rounded-full font-bold inline-block" style={{background:'rgba(255,0,127,0.25)',color:'#FF6FB5'}}>🎁 {m.user} {m.text}</span>
                : m.type==='system' ? <span className="px-2 py-0.5 rounded-full inline-block" style={{background:'rgba(0,0,0,0.4)'}}>{m.text}</span>
                : m.type==='bot' ? <span className="px-2 py-1 rounded-full font-bold inline-block" style={{background:'rgba(0,245,255,0.15)',color:'#00F5FF'}}>🤖 {m.user}: {m.text}</span>
                : <span className="px-2 py-0.5 rounded-full inline-block" style={{background:'rgba(0,0,0,0.4)'}}>
                    <span className="font-bold" style={{color:'#00F5FF'}}>{m.user} </span>
                    <span className="text-gray-100">{m.text}</span>
                    {isOwner && m.userId && m.userId !== user?._id && (
                      <button onClick={()=>blockUser(m.userId!,m.user)} disabled={!!blockingUserId} className="ml-1.5 opacity-40 hover:opacity-100 disabled:opacity-20" title={`Bloquear a @${m.user}`}>🚫</button>
                    )}
                  </span>
                }
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 px-3">
            {user && <div className="flex items-center gap-1 px-2 py-1.5 rounded-full text-xs font-bold flex-shrink-0" style={{background:'rgba(0,0,0,0.55)',color:'#FFD700'}}>🪙 {(user.coins||0).toLocaleString()}</div>}
            {user ? (
              <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&sendMsg()} placeholder="Escribe algo..." className="flex-1 min-w-0 rounded-full px-4 py-2.5 text-sm text-white placeholder-gray-300 focus:outline-none" style={{background:'rgba(255,255,255,0.12)',backdropFilter:'blur(8px)'}}/>
            ) : (
              <Link href="/auth" className="flex-1 rounded-full px-4 py-2.5 text-sm text-gray-200 text-center" style={{background:'rgba(255,255,255,0.12)'}}>Inicia sesión para chatear</Link>
            )}
            {user && <button onClick={sendMsg} className="p-2.5 rounded-full flex-shrink-0" style={{background:'rgba(255,255,255,0.15)'}}><Send size={16} className="text-white"/></button>}
            {user && !isParticipant && <button onClick={()=>sendGift('domino')} disabled={sending} className="p-2.5 rounded-full flex-shrink-0 disabled:opacity-50 text-lg" style={{background:'rgba(255,255,255,0.15)'}}>🎲</button>}
            {user && !isParticipant && <button onClick={()=>setShowGifts(true)} disabled={sending} className="p-2.5 rounded-full flex-shrink-0 disabled:opacity-50" style={{background:'linear-gradient(135deg,#FF007F,#7c3aed)'}}><Gift size={18} className="text-white"/></button>}
            {isOwner && connState === 'connected' && (
              <button onClick={()=>setShowFloatPanel(s=>!s)} className="p-2.5 rounded-full flex-shrink-0 text-lg" style={{background: showFloatPanel ? 'linear-gradient(135deg,#FF007F,#7c3aed)' : 'rgba(255,255,255,0.15)'}} title="Mensaje flotante">✨</button>
            )}
            <button onClick={doShare} className="p-2.5 rounded-full flex-shrink-0" style={{background:'rgba(255,255,255,0.15)'}}><Share2 size={18} className="text-white"/></button>
          </div>
        </div>
      </div>
    </div>
  );
}
