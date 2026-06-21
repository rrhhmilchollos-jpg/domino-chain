import { useState, useEffect, useRef } from 'react';
import { Link } from 'wouter';
import { Eye, X, Gift, Send } from 'lucide-react';
import { cn, useAuth, useApi, Av, GIFT_CATALOG, API, LiveStream } from '../lib/shared';

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
  const chatRef = useRef<HTMLDivElement>(null);
  const live = Array.isArray(lives)?lives.find((l:LiveStream)=>l._id===id):null;
  useEffect(()=>{if(live)setViewers(live.viewerCount||0);},[live]);
  useEffect(()=>{const t=setInterval(()=>setViewers(v=>Math.max(0,v+Math.floor(Math.random()*3-1))),5000);return()=>clearInterval(t);},[]);
  useEffect(()=>{if(chatRef.current)chatRef.current.scrollTop=chatRef.current.scrollHeight;},[msgs]);
  const sendMsg=()=>{if(!input.trim()||!user)return;setMsgs(m=>[...m,{user:user.username,text:input}]);setInput('');};
  const sendGift=async(type:string)=>{
    if(!token||!user)return;
    const g=GIFT_CATALOG[type];
    if((user.coins||0)<g.coins){setInsufficientCoins(true);setTimeout(()=>setInsufficientCoins(false),3000);setShowGifts(false);return;}
    setSending(true);
    try{
      const r=await fetch(`${API}/api/coins/gift`,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({liveId:id,giftType:type,quantity:1})});
      const d=await r.json();
      if(r.ok){setGiftAnim(`${g.emoji} ${g.name}`);setTimeout(()=>setGiftAnim(null),3000);setMsgs(m=>[...m,{user:user.username,text:`envió ${g.emoji} ${g.name}!`,type:'gift'}]);await refreshUser();}
      else if(r.status===400){setInsufficientCoins(true);setTimeout(()=>setInsufficientCoins(false),3000);}
    }finally{setSending(false);setShowGifts(false);}
  };
  if(!live)return<div className="min-h-screen flex items-center justify-center" style={{paddingTop:'80px',background:'#0b0b12'}}><div className="text-center"><div className="text-5xl mb-4">📡</div><p className="text-white font-bold mb-2">Live no encontrado</p><Link href="/live" className="text-sm font-semibold" style={{color:'#00F5FF'}}>Ver otros</Link></div></div>;
  return (
    <div className="fixed inset-0 flex" style={{paddingTop:'56px',background:'#000'}}>
      <div className="relative flex-1">
        <div className="absolute inset-0 flex items-center justify-center" style={{background:'#1a1a2e'}}><div className="text-center"><Av u={live.userId} s={120}/><p className="text-white font-bold mt-4 text-xl">@{live.userId?.username}</p><p className="text-gray-400 text-sm mt-1">{live.title}</p><div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full" style={{background:'rgba(255,0,127,0.2)',border:'1px solid #FF007F'}}><div className="w-2 h-2 rounded-full animate-pulse" style={{background:'#FF007F'}}/><span className="text-white text-sm font-bold">EN DIRECTO</span></div><p className="text-gray-500 text-xs mt-2">Conecta LiveKit para stream real</p></div></div>
        <div className="absolute top-2 left-2 right-2 flex items-center justify-between z-10">
          <div className="flex items-center gap-2"><div className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold text-white" style={{background:'#FF007F'}}><div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"/>LIVE</div><div className="flex items-center gap-1 px-2 py-1 rounded-full text-xs text-white" style={{background:'rgba(0,0,0,0.6)'}}><Eye size={10}/>{Math.max(0,viewers)}</div></div>
          <Link href="/live" className="p-1.5 rounded-full" style={{background:'rgba(0,0,0,0.6)'}}><X size={16} className="text-white"/></Link>
        </div>
        {live.isBattle&&<div className="absolute top-12 left-2 right-2 flex items-center gap-2 z-10"><div className="flex-1 text-center py-1 rounded-lg" style={{background:'rgba(255,0,127,0.3)',border:'1px solid #FF007F'}}><p className="text-white text-xs font-bold">{live.userId?.username}</p><p className="text-white text-xl font-black">{live.battleScore?.host||0}</p></div><div className="text-white font-black">VS</div><div className="flex-1 text-center py-1 rounded-lg" style={{background:'rgba(124,58,237,0.3)',border:'1px solid #7c3aed'}}><p className="text-white text-xs font-bold">Rival</p><p className="text-white text-xl font-black">{live.battleScore?.opponent||0}</p></div></div>}
        {giftAnim&&<div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center animate-bounce z-20"><div className="text-5xl mb-2">{giftAnim.split(' ')[0]}</div><p className="text-white font-bold">{giftAnim}</p></div>}
        {insufficientCoins&&<div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20 px-6 py-4 rounded-2xl text-center" style={{background:'rgba(255,0,127,0.9)'}}><p className="text-white font-bold">¡Monedas insuficientes!</p><Link href="/coins" className="text-xs text-white underline mt-1 block">Comprar monedas →</Link></div>}
        <div className="absolute bottom-4 left-2 flex items-center gap-2 z-10">
          <button onClick={()=>setShowGifts(true)} disabled={sending} className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-bold text-white disabled:opacity-50" style={{background:'linear-gradient(135deg,#FF007F,#7c3aed)'}}><Gift size={16}/>Regalar</button>
          {user&&<div className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold" style={{background:'rgba(0,0,0,0.6)',color:'#FFD700'}}>🪙 {(user.coins||0).toLocaleString()}</div>}
        </div>
        {showGifts&&(
          <div className="absolute bottom-16 left-2 z-20 rounded-2xl p-4 w-80" style={{background:'#13131f',border:'1px solid #1e1e2a'}}>
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
      </div>
      <div className="w-72 flex flex-col" style={{background:'#13131f',borderLeft:'1px solid #1e1e2a'}}>
        <div className="p-3 border-b flex items-center gap-2" style={{borderColor:'#1e1e2a'}}><Av u={live.userId} s={28}/><div><p className="text-white text-xs font-bold">@{live.userId?.username}</p><p className="text-gray-400 text-xs truncate">{live.title}</p></div></div>
        <div ref={chatRef} className="flex-1 overflow-y-auto p-3 space-y-2">
          {msgs.map((m,i)=>(
            <div key={i} className={cn('text-xs',m.type==='system'?'text-center text-gray-500':m.type==='gift'?'text-center':'')}>
              {m.type==='gift'?<span className="px-2 py-1 rounded-full font-bold" style={{background:'rgba(255,0,127,0.2)',color:'#FF007F'}}>🎁 {m.user} {m.text}</span>:m.type==='system'?<span>{m.text}</span>:<span><span className="font-bold" style={{color:'#00F5FF'}}>{m.user}: </span><span className="text-gray-300">{m.text}</span></span>}
            </div>
          ))}
        </div>
        {user&&<div className="p-3 border-t flex gap-2" style={{borderColor:'#1e1e2a'}}><input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&sendMsg()} placeholder="Escribe algo..." className="flex-1 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none" style={{background:'#0b0b12',border:'1px solid #2a2a3a'}}/><button onClick={sendMsg} className="p-2 rounded-xl" style={{background:'#00F5FF'}}><Send size={14} className="text-black"/></button></div>}
      </div>
    </div>
  );
}
