import { useState, useEffect, useRef } from 'react';
import { Link } from 'wouter';
import { Eye, X, Gift, Send, Volume2, VolumeX } from 'lucide-react';
import { Room, RoomEvent, Track } from 'livekit-client';
import { cn, useAuth, useApi, Av, GIFT_CATALOG, API, LiveStream, readHostLiveToken } from '../lib/shared';

type ConnState = 'idle' | 'connecting' | 'connected' | 'error' | 'unavailable';

export default function LiveViewerPage({ id }: { id: string }) {
  const { user, token, refreshUser } = useAuth();
  const { data: lives } = useApi('/api/lives', [id]);
  const [msgs, setMsgs] = useState<{user:string;text:string;type?:string}[]>([{user:'Sistema',text:'¡Bienvenido! 🎲',type:'system'}]);
  const [input, setInput] = useState('');
  const [showGifts, setShowGifts] = useState(false);
  const [giftAnim, setGiftAnim] = useState<string|null>(null);
  const [viewers, setViewers] = useState(0);
  const [sending, setSending] = useState(false);
  const [insufficientCoins, setInsufficientCoins] = useState(false);
  const [connState, setConnState] = useState<ConnState>('idle');
  const [muted, setMuted] = useState(true);
  const chatRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const roomRef = useRef<Room | null>(null);
  const live = Array.isArray(lives)?lives.find((l:LiveStream)=>l._id===id):null;
  const isOwner = !!user && !!live && live.userId?._id === user._id;
  useEffect(()=>{if(live)setViewers(live.viewerCount||0);},[live]);
  useEffect(()=>{const t=setInterval(()=>setViewers(v=>Math.max(0,v+Math.floor(Math.random()*3-1))),5000);return()=>clearInterval(t);},[]);
  useEffect(()=>{if(chatRef.current)chatRef.current.scrollTop=chatRef.current.scrollHeight;},[msgs]);

  // ===== Conexión real a LiveKit: el host publica cámara/mic, el espectador se suscribe =====
  useEffect(() => {
    if (!live?._id) return;
    let cancelled = false;
    setConnState('connecting');

    (async () => {
      let lkToken: string | null = null;
      let livekitUrl: string | null = null;

      if (isOwner) {
        const stored = readHostLiveToken(live._id);
        if (stored) { lkToken = stored.token; livekitUrl = stored.livekitUrl; }
      }
      if (!lkToken && token) {
        try {
          const r = await fetch(`${API}/api/lives/${live._id}/join`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
          const d = await r.json();
          if (r.ok && d.token && d.livekitUrl && !d.livekitUrl.includes('your-livekit-server')) {
            lkToken = d.token; livekitUrl = d.livekitUrl;
          }
        } catch { /* sin conexión a la API: nos quedamos en 'unavailable' */ }
      }

      if (cancelled) return;
      if (!lkToken || !livekitUrl) { setConnState('unavailable'); return; }

      const room = new Room();
      roomRef.current = room;

      // BUG CRÍTICO arreglado: antes solo se adjuntaba la pista de Vídeo.
      // El micrófono del streamer SÍ se publicaba (setMicrophoneEnabled),
      // pero como aquí se ignoraba el track de Audio, ningún espectador
      // llegaba a escucharlo nunca.
      room.on(RoomEvent.TrackSubscribed, (track) => {
        if ((track.kind === Track.Kind.Video || track.kind === Track.Kind.Audio) && videoRef.current) {
          track.attach(videoRef.current);
        }
      });
      room.on(RoomEvent.Disconnected, () => { if (!cancelled) setConnState('unavailable'); });

      // Chat real por el canal de datos de LiveKit: antes sendMsg() solo
      // tocaba el estado local de React, así que un mensaje nunca salía
      // del navegador de quien lo escribía. Ahora se emite a la sala y
      // todos (incluido el streamer) lo reciben aquí.
      const decoder = new TextDecoder();
      room.on(RoomEvent.DataReceived, (payload) => {
        try {
          const msg = JSON.parse(decoder.decode(payload));
          setMsgs(m => [...m, msg]);
        } catch { /* paquete no reconocido, se ignora */ }
      });

      try {
        await room.connect(livekitUrl, lkToken);
        if (cancelled) { room.disconnect(); return; }
        if (isOwner) {
          const camPub = await room.localParticipant.setCameraEnabled(true);
          if (camPub?.track && videoRef.current) camPub.track.attach(videoRef.current);
          await room.localParticipant.setMicrophoneEnabled(true);
        }
        setConnState('connected');
      } catch {
        if (!cancelled) setConnState('error');
      }
    })();

    return () => {
      cancelled = true;
      roomRef.current?.disconnect();
      roomRef.current = null;
      if (!isOwner && token) fetch(`${API}/api/lives/${live._id}/leave`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live?._id, isOwner]);

  const encoder = new TextEncoder();
  const broadcast = (msg: {user:string;text:string;type?:string}) => {
    try { roomRef.current?.localParticipant.publishData(encoder.encode(JSON.stringify(msg)), { reliable: true }); } catch { /* sala no conectada todavía */ }
  };
  const sendMsg=()=>{
    if(!input.trim()||!user)return;
    const msg = {user:user.username,text:input};
    setMsgs(m=>[...m,msg]); // eco local instantáneo para quien lo envía
    broadcast(msg);
    setInput('');
  };
  const sendGift=async(type:string)=>{
    if(!token||!user)return;
    const g=GIFT_CATALOG[type];
    if((user.coins||0)<g.coins){setInsufficientCoins(true);setTimeout(()=>setInsufficientCoins(false),3000);setShowGifts(false);return;}
    setSending(true);
    try{
      const r=await fetch(`${API}/api/coins/gift`,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({liveId:id,giftType:type,quantity:1})});
      const d=await r.json();
      if(r.ok){setGiftAnim(`${g.emoji} ${g.name}`);setTimeout(()=>setGiftAnim(null),3000);const msg={user:user.username,text:`envió ${g.emoji} ${g.name}!`,type:'gift'};setMsgs(m=>[...m,msg]);broadcast(msg);await refreshUser();}
      else if(r.status===400){setInsufficientCoins(true);setTimeout(()=>setInsufficientCoins(false),3000);}
    }finally{setSending(false);setShowGifts(false);}
  };
  if(!live)return<div className="min-h-screen flex items-center justify-center" style={{paddingTop:'80px',background:'#0b0b12'}}><div className="text-center"><div className="text-5xl mb-4">📡</div><p className="text-white font-bold mb-2">Live no encontrado</p><Link href="/live" className="text-sm font-semibold" style={{color:'#00F5FF'}}>Ver otros</Link></div></div>;
  return (
    <div className="fixed inset-0" style={{paddingTop:'56px',background:'#000'}}>
      <div className="relative w-full h-full">
        <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" autoPlay playsInline muted={isOwner||muted} style={{display:connState==='connected'?'block':'none'}}/>
        {connState!=='connected'&&(
          <div className="absolute inset-0 flex items-center justify-center" style={{background:'#1a1a2e'}}><div className="text-center"><Av u={live.userId} s={120}/><p className="text-white font-bold mt-4 text-xl">@{live.userId?.username}</p><p className="text-gray-400 text-sm mt-1">{live.title}</p><div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full" style={{background:'rgba(255,0,127,0.2)',border:'1px solid #FF007F'}}><div className="w-2 h-2 rounded-full animate-pulse" style={{background:'#FF007F'}}/><span className="text-white text-sm font-bold">EN DIRECTO</span></div><p className="text-gray-500 text-xs mt-2">{connState==='connecting'?'Conectando con el directo...':connState==='unavailable'?(isOwner?'El streaming todavía no está configurado en el servidor':'Esperando a que el streamer se conecte...'):'No se pudo conectar al directo'}</p></div></div>
        )}
        {/* Degradado inferior para que el chat se lea bien sobre cualquier vídeo, igual que TikTok */}
        <div className="absolute inset-x-0 bottom-0 h-2/5 pointer-events-none" style={{background:'linear-gradient(to top,rgba(0,0,0,0.75) 0%,transparent 100%)'}}/>

        {/* Identidad del streamer + LIVE + espectadores (siempre visible, también con el vídeo ya cargado) */}
        <div className="absolute top-2 left-2 right-2 flex items-center justify-between z-10 gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <div className="flex items-center gap-1.5 pl-1 pr-2.5 py-1 rounded-full" style={{background:'rgba(0,0,0,0.55)'}}><Av u={live.userId} s={24}/><span className="text-white text-xs font-bold">@{live.userId?.username}</span></div>
            <div className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold text-white" style={{background:'#FF007F'}}><div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"/>LIVE</div>
            <div className="flex items-center gap-1 px-2 py-1 rounded-full text-xs text-white" style={{background:'rgba(0,0,0,0.55)'}}><Eye size={10}/>{Math.max(0,viewers)}</div>
          </div>
          <Link href="/live" className="p-1.5 rounded-full flex-shrink-0" style={{background:'rgba(0,0,0,0.6)'}}><X size={16} className="text-white"/></Link>
        </div>

        {connState==='connected'&&!isOwner&&(
          <button onClick={()=>setMuted(m=>!m)} className="absolute z-10 p-2.5 rounded-full" style={{top:'52px',right:'8px',background:'rgba(0,0,0,0.55)'}}>{muted?<VolumeX size={18} className="text-white"/>:<Volume2 size={18} className="text-white"/>}</button>
        )}
        {live.isBattle&&<div className="absolute top-12 left-2 right-2 flex items-center gap-2 z-10"><div className="flex-1 text-center py-1 rounded-lg" style={{background:'rgba(255,0,127,0.3)',border:'1px solid #FF007F'}}><p className="text-white text-xs font-bold">{live.userId?.username}</p><p className="text-white text-xl font-black">{live.battleScore?.host||0}</p></div><div className="text-white font-black">VS</div><div className="flex-1 text-center py-1 rounded-lg" style={{background:'rgba(124,58,237,0.3)',border:'1px solid #7c3aed'}}><p className="text-white text-xs font-bold">Rival</p><p className="text-white text-xl font-black">{live.battleScore?.opponent||0}</p></div></div>}
        {giftAnim&&<div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center animate-bounce z-20"><div className="text-5xl mb-2">{giftAnim.split(' ')[0]}</div><p className="text-white font-bold">{giftAnim}</p></div>}
        {insufficientCoins&&<div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20 px-6 py-4 rounded-2xl text-center" style={{background:'rgba(255,0,127,0.9)'}}><p className="text-white font-bold">¡Monedas insuficientes!</p><Link href="/coins" className="text-xs text-white underline mt-1 block">Comprar monedas →</Link></div>}

        {showGifts&&(
          <div className="absolute bottom-20 left-2 right-2 sm:right-auto sm:w-80 z-20 rounded-2xl p-4" style={{background:'#13131f',border:'1px solid #1e1e2a'}}>
            <div className="flex items-center justify-between mb-3"><h3 className="font-bold text-white text-sm">Enviar Regalo</h3><button onClick={()=>setShowGifts(false)}><X size={16} className="text-gray-400"/></button></div>
            <div className="flex items-center gap-2 mb-3 px-2 py-1.5 rounded-lg" style={{background:'rgba(0,245,255,0.1)'}}><span className="text-sm">🪙</span><span className="text-sm font-bold text-white">{(user?.coins||0).toLocaleString()} monedas</span><Link href="/coins" className="ml-auto text-xs font-semibold" style={{color:'#00F5FF'}}>+ Comprar</Link></div>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(GIFT_CATALOG).map(([k,g])=>(
                <button key={k} onClick={()=>sendGift(k)} disabled={sending||(user?.coins||0)<g.coins} className="flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-white/10 border border-transparent hover:border-[#FF007F] transition-colors disabled:opacity-40">
                  <span className="text-2xl">{g.emoji}</span><span className="text-white text-xs font-bold">{g.name}</span><span className="text-yellow-400 text-xs">{g.coins}🪙</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Chat + barra de comentario superpuestos abajo, sobre el vídeo — igual que TikTok */}
        <div className="absolute inset-x-0 bottom-0 z-10 pb-3">
          <div ref={chatRef} className="overflow-y-auto px-3 space-y-1.5 mb-2" style={{maxHeight:'32vh',WebkitMaskImage:'linear-gradient(to top, black 70%, transparent 100%)',maskImage:'linear-gradient(to top, black 70%, transparent 100%)'}}>
            {msgs.map((m,i)=>(
              <div key={i} className={cn('text-xs',m.type==='system'?'text-gray-300':m.type==='gift'?'':'')}>
                {m.type==='gift'?<span className="px-2 py-1 rounded-full font-bold inline-block" style={{background:'rgba(255,0,127,0.25)',color:'#FF6FB5'}}>🎁 {m.user} {m.text}</span>:m.type==='system'?<span className="px-2 py-0.5 rounded-full inline-block" style={{background:'rgba(0,0,0,0.4)'}}>{m.text}</span>:<span className="px-2 py-0.5 rounded-full inline-block" style={{background:'rgba(0,0,0,0.4)'}}><span className="font-bold" style={{color:'#00F5FF'}}>{m.user} </span><span className="text-gray-100">{m.text}</span></span>}
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 px-3">
            {user&&<div className="flex items-center gap-1 px-2 py-1.5 rounded-full text-xs font-bold flex-shrink-0" style={{background:'rgba(0,0,0,0.55)',color:'#FFD700'}}>🪙 {(user.coins||0).toLocaleString()}</div>}
            {user?(
              <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&sendMsg()} placeholder="Escribe algo..." className="flex-1 min-w-0 rounded-full px-4 py-2.5 text-sm text-white placeholder-gray-300 focus:outline-none" style={{background:'rgba(255,255,255,0.12)',backdropFilter:'blur(8px)'}}/>
            ):(
              <Link href="/auth" className="flex-1 rounded-full px-4 py-2.5 text-sm text-gray-200 text-center" style={{background:'rgba(255,255,255,0.12)'}}>Inicia sesión para chatear</Link>
            )}
            {user&&<button onClick={sendMsg} className="p-2.5 rounded-full flex-shrink-0" style={{background:'rgba(255,255,255,0.15)'}}><Send size={16} className="text-white"/></button>}
            <button onClick={()=>setShowGifts(true)} disabled={sending} className="p-2.5 rounded-full flex-shrink-0 disabled:opacity-50" style={{background:'linear-gradient(135deg,#FF007F,#7c3aed)'}}><Gift size={18} className="text-white"/></button>
          </div>
        </div>
      </div>
    </div>
  );
}
