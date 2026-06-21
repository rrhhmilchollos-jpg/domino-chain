import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, Route, Switch, useLocation } from 'wouter';
import {
  Home, Play, Map, BarChart2, Camera, Bell, Globe, Zap, X,
  Search, Activity, Heart, Share, RefreshCw, Users, Clock,
  CheckCircle, LogOut, Loader2, MessageCircle, Send, Video,
  Eye, Gift, Download, Upload, Settings, BookmarkPlus,
  UserPlus, UserCheck, ChevronLeft, Hash, AtSign, MapPin,
  Lock, Grid, Bookmark, ThumbsUp, Plus, Mic, Image as ImageIcon
} from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...args: Parameters<typeof clsx>) { return twMerge(clsx(...args)); }

const API = import.meta.env.VITE_API_URL || 'https://domino-chain-production.up.railway.app';
const CLOUDINARY_CLOUD = import.meta.env.VITE_CLOUDINARY_CLOUD || 'dawgpvzpr';
const CLOUDINARY_PRESET = import.meta.env.VITE_CLOUDINARY_PRESET || 'domino_unsigned';

// ===================== TYPES =====================
interface AppUser {
  _id: string; username: string; email: string; avatarUrl: string;
  country: string; city: string; flag: string; bio: string;
  impactPoints: number; currentStreak: number; coins: number;
  followers: string[]; following: string[];
  savedVideos: DominoVideo[]; likedVideos: DominoVideo[];
}
interface Challenge { _id: string; title: string; description: string; category: string; expiresAt: string; globalCounter: number; }
interface DominoVideo {
  _id: string; userId: AppUser; videoUrl: string; thumbnailUrl: string;
  chainDepth: number; likes: string[]; createdAt: string;
  geoCoordinates: { lat: number; lng: number };
  challengeId: string; nominatedUsers: string[]; rootVideoId: string;
}
interface Notification { _id: string; type: string; fromUserId: { username: string; avatarUrl: string; flag: string }; message: string; read: boolean; createdAt: string; }
interface RankingEntry { _id: string; username: string; avatarUrl: string; country: string; flag: string; impactPoints: number; currentStreak: number; followers: string[]; }
interface Comment { _id: string; userId: { _id: string; username: string; avatarUrl: string; flag: string }; text: string; createdAt: string; }
interface LiveStream { _id: string; userId: AppUser; title: string; status: string; viewerCount: number; category: string; isBattle: boolean; battleScore: { host: number; opponent: number }; }
interface Message { _id: string; fromUserId: { _id: string; username: string; avatarUrl: string; flag: string }; toUserId: { _id: string; username: string; avatarUrl: string; flag: string }; text: string; read: boolean; createdAt: string; }
interface Conversation { user: { _id: string; username: string; avatarUrl: string; flag: string }; lastMessage: Message; unread: number; }

const GIFT_CATALOG: Record<string, { name: string; emoji: string; coins: number }> = {
  domino:{ name:'Dominó', emoji:'🎲', coins:5 }, chain:{ name:'Cadena', emoji:'⛓️', coins:20 },
  star:{ name:'Estrella', emoji:'⭐', coins:50 }, rocket:{ name:'Cohete', emoji:'🚀', coins:100 },
  crown:{ name:'Corona', emoji:'👑', coins:500 }, diamond:{ name:'Diamante', emoji:'💎', coins:1000 }
};

// ===================== AUTH =====================
const AuthContext = React.createContext<{
  user: AppUser|null; token: string|null;
  login:(e:string,p:string)=>Promise<void>; register:(d:any)=>Promise<void>;
  logout:()=>void; loading:boolean; refreshUser:()=>Promise<void>;
}>({ user:null, token:null, login:async()=>{}, register:async()=>{}, logout:()=>{}, loading:true, refreshUser:async()=>{} });

function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser|null>(null);
  const [token, setToken] = useState<string|null>(() => localStorage.getItem('domino_token'));
  const [loading, setLoading] = useState(true);

  const fetchUser = async (t: string) => {
    const r = await fetch(`${API}/api/users/me`, { headers: { Authorization:`Bearer ${t}` } });
    if (r.ok) setUser(await r.json());
    else { setToken(null); localStorage.removeItem('domino_token'); }
  };

  useEffect(() => {
    if (token) fetchUser(token).finally(() => setLoading(false));
    else setLoading(false);
  }, [token]);

  const login = async (email:string, password:string) => {
    const r = await fetch(`${API}/api/auth/login`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({email,password}) });
    const d = await r.json(); if (!r.ok) throw new Error(d.error||'Error');
    localStorage.setItem('domino_token', d.token); setToken(d.token); setUser(d.user);
  };
  const register = async (fd:any) => {
    const r = await fetch(`${API}/api/auth/register`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(fd) });
    const d = await r.json(); if (!r.ok) throw new Error(d.error||'Error');
    localStorage.setItem('domino_token', d.token); setToken(d.token); setUser(d.user);
  };
  const logout = () => { localStorage.removeItem('domino_token'); setToken(null); setUser(null); };
  const refreshUser = async () => { if (token) await fetchUser(token); };
  return <AuthContext.Provider value={{user,token,login,register,logout,loading,refreshUser}}>{children}</AuthContext.Provider>;
}
function useAuth() { return React.useContext(AuthContext); }

function useApi(endpoint: string, deps: any[] = []) {
  const { token } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string|null>(null);
  useEffect(() => {
    setLoading(true);
    fetch(`${API}${endpoint}`, { headers: token ? { Authorization:`Bearer ${token}` } : {} })
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(setData).catch(e => setError(e.message)).finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return { data, loading, error, setData };
}

// ===================== UTILS =====================
const fmt = (n:number) => n>=1e6?`${(n/1e6).toFixed(1)}M`:n>=1000?`${(n/1000).toFixed(1)}K`:String(n||0);
const ago = (iso:string) => { const d=Date.now()-new Date(iso).getTime(); const h=Math.floor(d/3.6e6); const m=Math.floor(d/6e4); return h>0?`${h}h`:m>0?`${m}m`:'ahora'; };
const left = (iso:string) => { const d=new Date(iso).getTime()-Date.now(); if(d<=0)return'Expirado'; return`${Math.floor(d/3.6e6)}h ${Math.floor((d%3.6e6)/6e4)}m`; };

function DominoLogo({ size=24 }: { size?: number }) {
  return (
    <svg width={size} height={size*1.6} viewBox="0 0 24 40" fill="none">
      <rect x="2" y="0" width="20" height="40" rx="3" fill="currentColor" opacity="0.15"/>
      <rect x="2" y="0" width="20" height="40" rx="3" stroke="#00F5FF" strokeWidth="1.5"/>
      <line x1="2" y1="20" x2="22" y2="20" stroke="#00F5FF" strokeWidth="1"/>
      <circle cx="9" cy="10" r="2" fill="#00F5FF"/><circle cx="15" cy="10" r="2" fill="#00F5FF"/>
      <circle cx="12" cy="30" r="2" fill="#FF007F"/>
    </svg>
  );
}
function Spinner() { return <Loader2 size={20} className="animate-spin" style={{color:'#00F5FF'}}/>; }
function Av({ u, s=36 }: { u: Partial<AppUser>; s?: number }) {
  return (
    <div className="rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center" style={{width:s,height:s,background:'#7c3aed',border:'2px solid #2a2a3a'}}>
      {u.avatarUrl?<img src={u.avatarUrl} alt={u.username} className="w-full h-full object-cover"/>:<span className="text-white font-bold" style={{fontSize:s*0.35}}>{u.username?.[0]?.toUpperCase()}</span>}
    </div>
  );
}

async function uploadToCloudinary(blob: Blob, onProgress?: (p:number)=>void): Promise<{videoUrl:string;thumbnailUrl:string}> {
  return new Promise((resolve, reject) => {
    const fd = new FormData(); fd.append('file', blob, 'domino.webm'); fd.append('upload_preset', CLOUDINARY_PRESET); fd.append('resource_type', 'video');
    const xhr = new XMLHttpRequest();
    xhr.upload.onprogress = e => { if(e.lengthComputable&&onProgress) onProgress(Math.round(e.loaded/e.total*100)); };
    xhr.onload = () => { if(xhr.status===200){const d=JSON.parse(xhr.responseText);resolve({videoUrl:d.secure_url,thumbnailUrl:d.secure_url.replace('/upload/','/upload/so_0,w_400,h_700,c_fill,f_jpg/').replace('.webm','.jpg')});}else reject(new Error('Error Cloudinary')); };
    xhr.onerror = () => reject(new Error('Error de red'));
    xhr.open('POST',`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/video/upload`); xhr.send(fd);
  });
}
function saveToGallery(blob: Blob) { const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=`DOMINO_${Date.now()}.webm`; document.body.appendChild(a); a.click(); document.body.removeChild(a); setTimeout(()=>URL.revokeObjectURL(url),1000); }

// ===================== AUTH PAGE =====================
function AuthPage() {
  const { login, register } = useAuth();
  const [, setLocation] = useLocation();
  const [mode, setMode] = useState<'login'|'register'>('login');
  const [form, setForm] = useState({ email:'', password:'', username:'', country:'', city:'' });
  const [error, setError] = useState(''); const [loading, setLoading] = useState(false);
  const flags: Record<string,string> = {'España':'🇪🇸','México':'🇲🇽','Argentina':'🇦🇷','Colombia':'🇨🇴','Estados Unidos':'🇺🇸','Japón':'🇯🇵','Brasil':'🇧🇷','Francia':'🇫🇷','Alemania':'🇩🇪','Italia':'🇮🇹','Reino Unido':'🇬🇧','Portugal':'🇵🇹'};
  const handle = async () => {
    setError(''); setLoading(true);
    try {
      if(mode==='login') await login(form.email, form.password);
      else { if(!form.username||!form.email||!form.password||!form.country||!form.city) throw new Error('Rellena todos los campos'); await register({...form,flag:flags[form.country]||'🌍'}); }
      setLocation('/feed');
    } catch(e:any){setError(e.message);}finally{setLoading(false);}
  };
  const set = (k:string)=>(e:React.ChangeEvent<HTMLInputElement|HTMLSelectElement>)=>setForm(f=>({...f,[k]:e.target.value}));
  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{background:'#0b0b12'}}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8"><DominoLogo size={40}/><h1 className="text-4xl font-black mt-4" style={{fontFamily:'Syne,sans-serif',color:'#00F5FF',textShadow:'0 0 12px #00F5FF'}}>DOMINO</h1><p className="text-gray-400 text-sm mt-1">The Real-World Chain Reaction</p></div>
        <div className="rounded-2xl p-6 space-y-4" style={{background:'#13131f',border:'1px solid #1e1e2a'}}>
          <div className="flex gap-1 rounded-xl p-1" style={{background:'#0b0b12'}}>{(['login','register'] as const).map(m=><button key={m} onClick={()=>{setMode(m);setError('');}} className={cn('flex-1 py-2 rounded-lg text-sm font-semibold',mode===m?'text-[#0b0b12]':'text-gray-400')} style={mode===m?{background:'#00F5FF'}:{}}>{m==='login'?'Entrar':'Registrarse'}</button>)}</div>
          {mode==='register'&&<input placeholder="@username" value={form.username} onChange={set('username')} className="w-full rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none" style={{background:'#0b0b12',border:'1px solid #2a2a3a'}}/>}
          <input placeholder="Email" type="email" value={form.email} onChange={set('email')} className="w-full rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none" style={{background:'#0b0b12',border:'1px solid #2a2a3a'}}/>
          <input placeholder="Contraseña" type="password" value={form.password} onChange={set('password')} className="w-full rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none" style={{background:'#0b0b12',border:'1px solid #2a2a3a'}}/>
          {mode==='register'&&<><select value={form.country} onChange={set('country')} className="w-full rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none" style={{background:'#0b0b12',border:'1px solid #2a2a3a'}}><option value="">País</option>{Object.keys(flags).map(c=><option key={c} value={c}>{flags[c]} {c}</option>)}</select><input placeholder="Ciudad" value={form.city} onChange={set('city')} className="w-full rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none" style={{background:'#0b0b12',border:'1px solid #2a2a3a'}}/></>}
          {error&&<p className="text-red-400 text-xs text-center">{error}</p>}
          <button onClick={handle} disabled={loading} className="w-full py-3 rounded-xl font-bold text-[#0b0b12] flex items-center justify-center gap-2 disabled:opacity-50" style={{background:'linear-gradient(135deg,#00F5FF,#7c3aed)'}}>{loading?<Spinner/>:mode==='login'?'Entrar':'Crear cuenta'}</button>
        </div>
      </div>
    </div>
  );
}

// ===================== BOTTOM NAVBAR (TikTok style) =====================
function BottomNav() {
  const [loc, setLocation] = useLocation();
  const { user } = useAuth();
  const { data: nd } = useApi('/api/notifications', [user?._id]);
  const unread = Array.isArray(nd)?nd.filter((n:Notification)=>!n.read).length:0;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t" style={{background:'rgba(11,11,18,0.97)',backdropFilter:'blur(20px)',borderColor:'#1e1e2a'}}>
      <div className="flex items-center justify-around h-14 max-w-lg mx-auto px-2">
        <button onClick={()=>setLocation('/')} className={cn('flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-all',loc==='/'?'text-white':'text-gray-500')}>
          <Home size={22} className={loc==='/'?'fill-white':''}/><span className="text-[10px] font-medium">Inicio</span>
        </button>
        <button onClick={()=>setLocation('/live')} className={cn('flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl',loc.startsWith('/live')?'text-white':'text-gray-500')}>
          <Video size={22}/><span className="text-[10px] font-medium">En Vivo</span>
        </button>
        {/* Botón crear central */}
        <button onClick={()=>setLocation('/create')} className="relative flex items-center justify-center w-12 h-8 rounded-xl" style={{background:'linear-gradient(135deg,#00F5FF,#FF007F)'}}>
          <Plus size={22} className="text-white font-black"/>
        </button>
        <button onClick={()=>setLocation('/notifications')} className={cn('relative flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl',loc==='/notifications'?'text-white':'text-gray-500')}>
          <Bell size={22}/>{unread>0&&<span className="absolute top-0 right-1 w-4 h-4 rounded-full text-[9px] font-bold text-black flex items-center justify-center" style={{background:'#FF007F'}}>{unread}</span>}
          <span className="text-[10px] font-medium">Avisos</span>
        </button>
        <button onClick={()=>user?setLocation('/profile'):setLocation('/auth')} className={cn('flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl',loc==='/profile'?'text-white':'text-gray-500')}>
          {user?<Av u={user} s={24}/>:<BarChart2 size={22}/>}<span className="text-[10px] font-medium">Perfil</span>
        </button>
      </div>
    </nav>
  );
}

// ===================== TOP NAVBAR =====================
function TopNav() {
  const [loc, setLocation] = useLocation();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  // No mostrar en algunas páginas
  if (['/create', '/camera', '/auth'].some(p => loc.startsWith(p))) return null;

  return (
    <nav className="fixed top-0 left-0 right-0 z-40 border-b" style={{background:'rgba(11,11,18,0.95)',backdropFilter:'blur(20px)',borderColor:'#1e1e2a'}}>
      <div className="flex items-center justify-between h-14 px-4 max-w-7xl mx-auto">
        <button onClick={()=>setLocation('/')} className="flex items-center gap-2"><DominoLogo size={18}/><span className="text-xl font-black hidden sm:block" style={{fontFamily:'Syne,sans-serif',color:'#00F5FF',textShadow:'0 0 12px #00F5FF'}}>DOMINO</span></button>
        {/* Tabs: Siguiendo / Para ti (como TikTok) */}
        {(loc==='/'||loc==='/feed') && (
          <div className="flex items-center gap-4">
            <button onClick={()=>setLocation('/')} className={cn('text-sm font-semibold pb-1',loc==='/'?'text-white border-b-2 border-white':'text-gray-500')}>Para ti</button>
            <button onClick={()=>setLocation('/following')} className={cn('text-sm font-semibold pb-1',loc==='/following'?'text-white border-b-2 border-white':'text-gray-500')}>Siguiendo</button>
          </div>
        )}
        <div className="flex items-center gap-2">
          <button onClick={()=>setLocation('/search')} className="p-2 rounded-lg hover:bg-white/5"><Search size={20} className="text-gray-400"/></button>
          <button onClick={()=>setLocation('/messages')} className="p-2 rounded-lg hover:bg-white/5 relative">
            <MessageCircle size={20} className="text-gray-400"/>
          </button>
          {user&&<div className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold" style={{background:'rgba(0,245,255,0.1)',color:'#00F5FF',border:'1px solid rgba(0,245,255,0.3)'}}>🪙 {(user.coins||0).toLocaleString()}</div>}
          {!user&&<button onClick={()=>setLocation('/auth')} className="text-sm font-semibold px-3 py-1.5 rounded-lg" style={{background:'#00F5FF',color:'#0b0b12'}}>Entrar</button>}
        </div>
      </div>
    </nav>
  );
}

// ===================== VIDEO PLAYER MODAL =====================
function VideoModal({ video, onClose }: { video: DominoVideo; onClose: () => void }) {
  const { token, user } = useAuth();
  const [liked, setLiked] = useState(video.likes?.includes(user?._id||'') || false);
  const [saved, setSaved] = useState(false);
  const [commentId, setCommentId] = useState<string|null>(null);

  const doLike = async () => {
    if (!token) return;
    setLiked(l => !l);
    await fetch(`${API}/api/videos/${video._id}/like`, { method:'POST', headers:{Authorization:`Bearer ${token}`} });
  };
  const doSave = async () => {
    if (!token) return;
    setSaved(s => !s);
    await fetch(`${API}/api/users/videos/${video._id}/save`, { method:'POST', headers:{Authorization:`Bearer ${token}`} });
  };
  const doShare = () => {
    const url = `${window.location.origin}/video/${video._id}`;
    if (navigator.share) navigator.share({ title:'DOMINO', url });
    else navigator.clipboard?.writeText(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{background:'rgba(0,0,0,0.95)'}}>
      <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-full" style={{background:'rgba(255,255,255,0.1)'}}><X size={20} className="text-white"/></button>
      <div className="relative w-full max-w-sm mx-4" style={{aspectRatio:'9/16',maxHeight:'90vh'}}>
        {video.videoUrl ? (
          <video src={video.videoUrl} className="w-full h-full object-cover rounded-2xl" controls autoPlay loop playsInline/>
        ) : video.thumbnailUrl ? (
          <img src={video.thumbnailUrl} alt="" className="w-full h-full object-cover rounded-2xl"/>
        ) : (
          <div className="w-full h-full rounded-2xl flex items-center justify-center" style={{background:'#1a1a2e'}}><Camera size={48} className="text-gray-600"/></div>
        )}
        <div className="absolute inset-0 rounded-2xl" style={{background:'linear-gradient(to top,rgba(0,0,0,0.8) 0%,transparent 60%)',pointerEvents:'none'}}/>
        {/* Info */}
        <div className="absolute bottom-16 left-4 right-16">
          <div className="flex items-center gap-2 mb-2"><Av u={video.userId} s={36}/><div><p className="text-white text-sm font-bold">@{video.userId?.username}</p><p className="text-gray-300 text-xs">{video.userId?.flag} {video.userId?.city}</p></div></div>
          <div className="flex items-center gap-2"><span className="text-xs rounded-full px-2 py-0.5 text-gray-300" style={{background:'rgba(0,0,0,0.5)'}}>⛓️ Profundidad {video.chainDepth+1}</span></div>
        </div>
        {/* Acciones */}
        <div className="absolute right-3 bottom-20 flex flex-col gap-4 items-center">
          <button onClick={doLike} className="flex flex-col items-center gap-1"><Heart size={24} className={liked?'fill-red-500 text-red-500':'text-white'}/><span className="text-xs text-white">{fmt(video.likes?.length||0)}</span></button>
          <button onClick={()=>setCommentId(video._id)} className="flex flex-col items-center gap-1"><MessageCircle size={24} className="text-white"/><span className="text-xs text-white">Comentar</span></button>
          <button onClick={doSave} className="flex flex-col items-center gap-1"><Bookmark size={24} className={saved?'fill-yellow-400 text-yellow-400':'text-white'}/><span className="text-xs text-white">Guardar</span></button>
          <button onClick={doShare} className="flex flex-col items-center gap-1"><Share size={24} className="text-white"/><span className="text-xs text-white">Compartir</span></button>
        </div>
      </div>
      {commentId && <CommentsPanel videoId={commentId} onClose={()=>setCommentId(null)}/>}
    </div>
  );
}

// ===================== COMMENTS PANEL =====================
function CommentsPanel({ videoId, onClose }: { videoId: string; onClose: () => void }) {
  const { user, token } = useAuth();
  const { data: comments, setData } = useApi(`/api/videos/${videoId}/comments`, [videoId]);
  const [text, setText] = useState(''); const [sending, setSending] = useState(false);
  const send = async () => {
    if (!text.trim()||!token) return; setSending(true);
    try { const r=await fetch(`${API}/api/videos/${videoId}/comments`,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({text})}); const c=await r.json(); if(r.ok){setData((p:Comment[])=>[c,...(Array.isArray(p)?p:[])]);setText('');} } finally{setSending(false);}
  };
  return (
    <div className="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl flex flex-col" style={{background:'#13131f',border:'1px solid #1e1e2a',maxHeight:'70vh'}}>
      <div className="flex items-center justify-between p-4 border-b" style={{borderColor:'#1e1e2a'}}><h3 className="font-bold text-white">Comentarios</h3><button onClick={onClose}><X size={18} className="text-gray-400"/></button></div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {(Array.isArray(comments)?comments:[]).map((c:Comment)=><div key={c._id} className="flex gap-3"><Av u={c.userId} s={32}/><div className="flex-1"><span className="text-xs font-bold text-white">{c.userId?.username} </span><span className="text-xs text-gray-400">{c.text}</span><div className="text-xs text-gray-600 mt-0.5">{ago(c.createdAt)}</div></div></div>)}
        {(!comments||comments.length===0)&&<p className="text-center text-gray-500 text-sm py-8">Sin comentarios</p>}
      </div>
      {user&&<div className="p-4 border-t flex gap-2" style={{borderColor:'#1e1e2a'}}><Av u={user} s={32}/><input value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send()} placeholder="Añade un comentario..." className="flex-1 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none" style={{background:'#0b0b12',border:'1px solid #2a2a3a'}}/><button onClick={send} disabled={sending||!text.trim()} className="p-2 rounded-xl disabled:opacity-50" style={{background:'#00F5FF'}}><Send size={16} className="text-black"/></button></div>}
    </div>
  );
}

// ===================== FEED PAGE =====================
function FeedPage() {
  const { data: videos, loading } = useApi('/api/videos/feed?limit=20');
  const { data: challenge } = useApi('/api/challenges/active');
  const { token } = useAuth();
  const [liked, setLiked] = useState<Set<string>>(new Set());
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [commentId, setCommentId] = useState<string|null>(null);
  const videoRefs = useRef<(HTMLVideoElement|null)[]>([]);

  const doLike = async (id:string) => { if(!token)return; setLiked(p=>{const n=new Set(p);n.has(id)?n.delete(id):n.add(id);return n;}); await fetch(`${API}/api/videos/${id}/like`,{method:'POST',headers:{Authorization:`Bearer ${token}`}}); };
  const doSave = async (id:string) => { if(!token)return; setSaved(p=>{const n=new Set(p);n.has(id)?n.delete(id):n.add(id);return n;}); await fetch(`${API}/api/users/videos/${id}/save`,{method:'POST',headers:{Authorization:`Bearer ${token}`}}); };
  const doShare = (id:string) => { const url=`${window.location.origin}/video/${id}`; if(navigator.share)navigator.share({title:'DOMINO',url});else navigator.clipboard?.writeText(url); };

  useEffect(()=>{
    const obs=new IntersectionObserver(entries=>{entries.forEach(e=>{const v=e.target as HTMLVideoElement;if(e.isIntersecting)v.play().catch(()=>{});else{v.pause();v.currentTime=0;}});},{threshold:0.8});
    videoRefs.current.forEach(v=>{if(v)obs.observe(v);});
    return()=>obs.disconnect();
  },[videos]);

  if(loading)return<div className="min-h-screen flex items-center justify-center" style={{paddingTop:'56px',background:'#0b0b12'}}><Spinner/></div>;
  const list=Array.isArray(videos)?videos:[];

  return (
    <div className="fixed inset-0 overflow-y-scroll snap-y snap-mandatory" style={{paddingTop:'56px',paddingBottom:'56px',background:'#000'}}>
      {commentId&&<CommentsPanel videoId={commentId} onClose={()=>setCommentId(null)}/>}
      {challenge&&<div className="fixed top-14 left-0 right-0 z-30 pointer-events-none"><div className="max-w-md mx-auto px-4 pt-2"><div className="rounded-xl px-3 py-2 pointer-events-auto flex items-center gap-2" style={{background:'rgba(11,11,18,0.85)',border:'1px solid #1e1e2a',backdropFilter:'blur(10px)'}}><Zap size={14} className="text-yellow-400"/><span className="text-xs font-semibold text-white flex-1 truncate">{challenge.title}</span><span className="text-xs text-gray-400">{left(challenge.expiresAt)}</span></div></div></div>}
      {list.map((v:DominoVideo,idx:number)=>(
        <div key={v._id} className="relative w-full snap-start flex-shrink-0 overflow-hidden bg-black" style={{height:'calc(100vh - 112px)'}}>
          {v.videoUrl?<video ref={el=>{videoRefs.current[idx]=el;}} src={v.videoUrl} className="absolute inset-0 w-full h-full object-cover" loop playsInline muted onDoubleClick={()=>doLike(v._id)}/>:v.thumbnailUrl?<img src={v.thumbnailUrl} alt="" className="absolute inset-0 w-full h-full object-cover"/>:<div className="absolute inset-0 flex items-center justify-center" style={{background:'#1a1a2e'}}><Camera size={48} className="text-gray-600"/></div>}
          <div className="absolute inset-0" style={{background:'linear-gradient(to top,rgba(0,0,0,0.85) 0%,rgba(0,0,0,0.1) 50%,transparent 100%)'}}/>
          <div className="absolute bottom-16 left-4 right-20 z-10">
            <div className="flex items-center gap-2 mb-2"><Av u={v.userId} s={40}/><div><p className="text-white text-sm font-bold">@{v.userId?.username}</p><p className="text-gray-300 text-xs">{v.userId?.flag} {v.userId?.city}</p></div></div>
            <div className="flex items-center gap-2"><span className="text-xs rounded-full px-2 py-0.5 text-gray-300" style={{background:'rgba(0,0,0,0.4)',border:'1px solid rgba(255,255,255,0.1)'}}>⛓️ {v.chainDepth+1}</span><span className="text-xs text-gray-400">{ago(v.createdAt)}</span></div>
          </div>
          <div className="absolute right-3 bottom-20 flex flex-col gap-4 items-center z-10">
            <button onClick={()=>doLike(v._id)} className="flex flex-col items-center gap-1"><div className="w-10 h-10 rounded-full flex items-center justify-center" style={{background:'rgba(0,0,0,0.4)'}}><Heart size={22} className={liked.has(v._id)?'fill-red-500 text-red-500':'text-white'}/></div><span className="text-xs text-white font-semibold">{fmt((v.likes?.length||0)+(liked.has(v._id)?1:0))}</span></button>
            <button onClick={()=>setCommentId(v._id)} className="flex flex-col items-center gap-1"><div className="w-10 h-10 rounded-full flex items-center justify-center" style={{background:'rgba(0,0,0,0.4)'}}><MessageCircle size={22} className="text-white"/></div><span className="text-xs text-white font-semibold">Comentar</span></button>
            <button onClick={()=>doSave(v._id)} className="flex flex-col items-center gap-1"><div className="w-10 h-10 rounded-full flex items-center justify-center" style={{background:'rgba(0,0,0,0.4)'}}><Bookmark size={22} className={saved.has(v._id)?'fill-yellow-400 text-yellow-400':'text-white'}/></div><span className="text-xs text-white font-semibold">Guardar</span></button>
            <button onClick={()=>doShare(v._id)} className="flex flex-col items-center gap-1"><div className="w-10 h-10 rounded-full flex items-center justify-center" style={{background:'rgba(0,0,0,0.4)'}}><Share size={22} className="text-white"/></div><span className="text-xs text-white font-semibold">Compartir</span></button>
          </div>
          <div className="absolute bottom-6 left-4 right-4 z-10"><div className="flex items-center gap-2"><div className="flex-1 h-0.5 rounded-full" style={{background:'rgba(255,255,255,0.2)'}}><div className="h-full rounded-full" style={{width:`${Math.min(100,(v.chainDepth+1)*10)}%`,background:'linear-gradient(90deg,#00F5FF,#FF007F)'}}/></div><span className="text-xs text-gray-400">⛓️ {v.chainDepth+1}</span></div></div>
        </div>
      ))}
      {list.length===0&&<div className="h-screen flex flex-col items-center justify-center text-center px-4"><div className="text-6xl mb-4">🎲</div><h3 className="text-xl font-bold text-white mb-2">Sin videos todavía</h3><p className="text-gray-400 text-sm mb-6">Sé el primero en grabar.</p><Link href="/create" className="px-6 py-3 rounded-xl font-bold text-black" style={{background:'#00F5FF'}}>Grabar ahora</Link></div>}
    </div>
  );
}

// ===================== PROFILE PAGE — Clon exacto TikTok =====================
function ProfilePage({ userId }: { userId?: string }) {
  const { user: me, token, refreshUser, logout } = useAuth();
  const [, setLocation] = useLocation();
  const isOwn = !userId || userId === me?._id;
  const targetId = isOwn ? me?._id : userId;

  const { data: profile, loading } = useApi(isOwn ? '/api/users/me' : `/api/users/${targetId}`, [targetId]);
  const { data: userVideos } = useApi(targetId ? `/api/users/${targetId}/videos` : '', [targetId]);
  const [tab, setTab] = useState<'videos'|'private'|'repost'|'saved'|'likes'>('videos');
  const [following, setFollowing] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<DominoVideo|null>(null);
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    if (me && profile && !isOwn) setFollowing(profile.followers?.includes(me._id)||false);
  }, [profile, me]);

  const doFollow = async () => {
    if (!token||!targetId) return;
    setFollowing(f=>!f);
    await fetch(`${API}/api/users/${targetId}/follow`,{method:'POST',headers:{Authorization:`Bearer ${token}`}});
    await refreshUser();
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center" style={{paddingTop:'56px',background:'#0b0b12'}}><Spinner/></div>;
  if (!profile&&!isOwn) return <div className="min-h-screen flex items-center justify-center" style={{paddingTop:'56px',background:'#0b0b12'}}><p className="text-gray-400">Usuario no encontrado</p></div>;

  const displayUser = isOwn ? (me||profile) : profile;
  if (!displayUser) return null;

  const videos = Array.isArray(userVideos) ? userVideos : [];
  const savedVids: DominoVideo[] = Array.isArray(displayUser.savedVideos) ? displayUser.savedVideos.filter((v:any)=>v&&v._id) : [];
  const likedVids: DominoVideo[] = Array.isArray(displayUser.likedVideos) ? displayUser.likedVideos.filter((v:any)=>v&&v._id) : [];
  const totalLikes = videos.reduce((a:number,v:DominoVideo)=>a+(v.likes?.length||0),0);

  const tabVideos = tab==='videos'?videos:tab==='saved'?savedVids:tab==='likes'?likedVids:[];

  const TABS = [
    { key:'videos',   icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg> },
    { key:'private',  icon: <Lock size={22}/> },
    { key:'repost',   icon: <RefreshCw size={22}/> },
    { key:'saved',    icon: <Bookmark size={22}/> },
    { key:'likes',    icon: <Heart size={22}/> },
  ];

  return (
    <div className="min-h-screen pb-20" style={{paddingTop:'56px',background:'#0b0b12'}}>
      {selectedVideo && <VideoModal video={selectedVideo} onClose={()=>setSelectedVideo(null)}/>}

      {/* Menú opciones */}
      {showMenu && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" style={{background:'rgba(0,0,0,0.6)'}} onClick={()=>setShowMenu(false)}>
          <div className="w-full max-w-lg rounded-t-2xl overflow-hidden" style={{background:'#1e1e2a'}} onClick={e=>e.stopPropagation()}>
            <div className="p-4 space-y-1">
              {isOwn && <>
                <button onClick={()=>{setShowMenu(false);setLocation('/settings');}} className="w-full text-left px-4 py-3.5 rounded-xl text-white font-medium hover:bg-white/5">⚙️ Ajustes</button>
                <button onClick={()=>{setShowMenu(false);setLocation('/coins');}} className="w-full text-left px-4 py-3.5 rounded-xl text-white font-medium hover:bg-white/5">🪙 Comprar Monedas</button>
                <div className="border-t my-2" style={{borderColor:'#2a2a3a'}}/>
                <button onClick={()=>{logout();setShowMenu(false);setLocation('/');}} className="w-full text-left px-4 py-3.5 rounded-xl font-medium hover:bg-white/5" style={{color:'#FF007F'}}>🚪 Cerrar sesión</button>
              </>}
              {!isOwn && <>
                <button className="w-full text-left px-4 py-3.5 rounded-xl text-white font-medium hover:bg-white/5">🚩 Denunciar</button>
                <button className="w-full text-left px-4 py-3.5 rounded-xl font-medium hover:bg-white/5" style={{color:'#FF007F'}}>🚫 Bloquear</button>
              </>}
              <button onClick={()=>setShowMenu(false)} className="w-full py-3.5 rounded-xl text-gray-400 font-medium mt-1">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-lg mx-auto">
        {/* Top bar — igual que TikTok */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          {isOwn ? (
            <div className="flex items-center gap-3">
              <button className="p-1"><span className="text-2xl">👤</span></button>
              <button className="p-1"><span className="text-2xl">⚽</span></button>
            </div>
          ) : (
            <button onClick={()=>setLocation(-1 as any)} className="p-2"><ChevronLeft size={24} className="text-white"/></button>
          )}
          <div className="flex items-center gap-3">
            {isOwn && <div className="relative"><Av u={displayUser} s={28}/><span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full text-white text-xs flex items-center justify-center font-bold" style={{background:'#FF007F',fontSize:'9px'}}>2</span></div>}
            {isOwn && <button><Share size={20} className="text-white"/></button>}
            <button onClick={()=>setShowMenu(true)}><span className="text-white text-xl">☰</span></button>
          </div>
        </div>

        {/* Avatar + botones */}
        <div className="flex flex-col items-center px-4 pb-4">
          <div className="relative mb-3">
            <div className="w-24 h-24 rounded-full overflow-hidden flex items-center justify-center" style={{background:'#7c3aed',border:'3px solid #2a2a3a'}}>
              {displayUser.avatarUrl
                ? <img src={displayUser.avatarUrl} alt={displayUser.username} className="w-full h-full object-cover"/>
                : <span className="text-white font-black text-4xl">{displayUser.username?.[0]?.toUpperCase()}</span>
              }
            </div>
            {isOwn && (
              <button className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center text-white font-bold" style={{background:'#00F5FF'}}>
                <Plus size={16} className="text-black"/>
              </button>
            )}
          </div>

          {/* Nombre + botones editar */}
          {isOwn ? (
            <div className="flex items-center gap-2 mb-1">
              <button className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-semibold text-white border border-gray-600">
                <Plus size={14}/>Añadir nombre
                <ChevronRight size={14}/>
              </button>
              <button className="w-8 h-8 rounded-full border border-gray-600 flex items-center justify-center">
                <span className="text-white text-sm">✏️</span>
              </button>
            </div>
          ) : null}

          {/* Username */}
          <p className="text-gray-400 text-sm mb-3">@{displayUser.username}</p>

          {/* Stats — igual que TikTok: Siguiendo | Seguidores | Me gusta */}
          <div className="flex items-center gap-0 mb-3">
            <button className="flex flex-col items-center px-5">
              <span className="text-white font-black text-lg leading-tight">{fmt(displayUser.following?.length||0)}</span>
              <span className="text-gray-400 text-xs">Siguiendo</span>
            </button>
            <div className="w-px h-8" style={{background:'#2a2a3a'}}/>
            <button className="flex flex-col items-center px-5">
              <span className="text-white font-black text-lg leading-tight">{fmt(displayUser.followers?.length||0)}</span>
              <span className="text-gray-400 text-xs">Seguidores</span>
            </button>
            <div className="w-px h-8" style={{background:'#2a2a3a'}}/>
            <button className="flex flex-col items-center px-5">
              <span className="text-white font-black text-lg leading-tight">{fmt(totalLikes)}</span>
              <span className="text-gray-400 text-xs">Me gusta</span>
            </button>
          </div>

          {/* Bio */}
          {displayUser.bio && <p className="text-white text-sm text-center mb-2 max-w-xs">{displayUser.bio}</p>}

          {/* Impacto DOMINO */}
          <div className="flex items-center gap-1.5 mb-3">
            <Zap size={14} style={{color:'#00F5FF'}}/>
            <span className="text-sm font-bold" style={{color:'#00F5FF'}}>{fmt(displayUser.impactPoints)} Impacto</span>
            <span className="text-gray-500 text-xs">· {displayUser.currentStreak||0}d racha</span>
          </div>

          {/* Botones acción */}
          {isOwn ? (
            <div className="flex items-center gap-2 w-full max-w-xs">
              <button onClick={()=>setLocation('/create')} className="flex-1 py-2 rounded-lg font-bold text-black text-sm flex items-center justify-center gap-1.5" style={{background:'#00F5FF'}}>
                <Camera size={16}/>Grabar
              </button>
              <button onClick={()=>setLocation('/profile/edit')} className="flex-1 py-2 rounded-lg font-semibold text-white text-sm border border-gray-600">
                Editar perfil
              </button>
              <button className="w-9 h-9 rounded-lg border border-gray-600 flex items-center justify-center flex-shrink-0">
                <Share size={16} className="text-white"/>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 w-full max-w-xs">
              <button onClick={doFollow} className="flex-1 py-2 rounded-lg font-bold text-sm" style={{background:following?'transparent':'#FF007F',border:following?'1px solid #666':'none',color:following?'white':'white'}}>
                {following?'Siguiendo':'Seguir'}
              </button>
              <button onClick={()=>setLocation(`/messages/${targetId}`)} className="flex-1 py-2 rounded-lg font-semibold text-white text-sm border border-gray-600">
                Mensaje
              </button>
              <button className="w-9 h-9 rounded-lg border border-gray-600 flex items-center justify-center flex-shrink-0">
                <ChevronRight size={16} className="text-white"/>
              </button>
            </div>
          )}
        </div>

        {/* Tabs — iconos igual que TikTok */}
        <div className="flex border-b" style={{borderColor:'#1e1e2a'}}>
          {TABS.map(t=>(
            <button key={t.key} onClick={()=>setTab(t.key as any)} className={cn('flex-1 flex items-center justify-center py-3 transition-all border-b-2',tab===t.key?'text-white border-white':'text-gray-600 border-transparent')}>
              {t.icon}
            </button>
          ))}
        </div>

        {/* Grid de videos 3 columnas — exacto TikTok */}
        <div className="grid grid-cols-3 gap-px" style={{background:'#1e1e2a'}}>
          {tabVideos.map((v:DominoVideo)=>(
            <button key={v._id} onClick={()=>setSelectedVideo(v)} className="relative overflow-hidden" style={{aspectRatio:'9/16',background:'#0b0b12'}}>
              {v.thumbnailUrl
                ? <img src={v.thumbnailUrl} alt="" className="w-full h-full object-cover"/>
                : <div className="w-full h-full flex items-center justify-center" style={{background:'#1a1a2e'}}><Camera size={20} className="text-gray-700"/></div>
              }
              {/* Overlay gradient */}
              <div className="absolute inset-0" style={{background:'linear-gradient(to top,rgba(0,0,0,0.6) 0%,transparent 40%)'}}/>
              {/* Views counter — estilo TikTok */}
              <div className="absolute bottom-1 left-1.5 flex items-center gap-0.5">
                <Play size={10} className="text-white fill-white"/>
                <span className="text-white text-xs font-semibold">{fmt(v.likes?.length||0)}</span>
              </div>
              {/* Indicador video real */}
              {v.videoUrl && <div className="absolute top-1.5 right-1.5"><div className="w-1.5 h-1.5 rounded-full" style={{background:'#FF007F'}}/></div>}
            </button>
          ))}
        </div>

        {/* Vacío */}
        {tabVideos.length===0&&(
          <div className="text-center py-16 px-4">
            <div className="text-5xl mb-4">{tab==='videos'?'🎲':tab==='saved'?'🔖':tab==='likes'?'❤️':tab==='private'?'🔒':'🔁'}</div>
            <p className="text-gray-500 text-sm mb-1">
              {tab==='videos'?'Sin videos publicados':tab==='saved'?'Sin videos guardados':tab==='likes'?'Sin videos que te gusten':tab==='private'?'Sin videos privados':'Sin reposts'}
            </p>
            {tab==='videos'&&<p className="text-gray-600 text-xs">Has previsualizado todas las publicaciones</p>}
            {tab==='videos'&&isOwn&&<button onClick={()=>setLocation('/create')} className="mt-5 px-6 py-2.5 rounded-full font-bold text-black text-sm" style={{background:'#00F5FF'}}>Grabar ahora</button>}
          </div>
        )}

        {/* "Has previsualizado todas las publicaciones" — igual que TikTok */}
        {tabVideos.length>0&&(
          <p className="text-center text-gray-600 text-xs py-6 px-4">Has previsualizado todas las publicaciones</p>
        )}

        {/* Ranking section */}
        {isOwn&&(
          <div className="mx-4 mb-6 rounded-2xl overflow-hidden border" style={{background:'#13131f',borderColor:'#1e1e2a'}}>
            <div className="flex items-center gap-2 px-4 py-3 border-b" style={{borderColor:'#1e1e2a'}}>
              <Zap size={16} className="text-yellow-400"/><span className="text-white font-bold text-sm">Ranking Global</span>
            </div>
            <div className="px-4 py-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-2xl" style={{background:'rgba(0,245,255,0.1)'}}>🏆</div>
              <div><p className="text-white text-sm font-semibold">{fmt(displayUser.impactPoints)} puntos</p><p className="text-gray-400 text-xs">{displayUser.currentStreak||0} días de racha</p></div>
              <button onClick={()=>setLocation('/map')} className="ml-auto text-xs font-semibold px-3 py-1.5 rounded-full" style={{background:'rgba(0,245,255,0.1)',color:'#00F5FF'}}>Ver mapa</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ===================== CREATE PAGE (TikTok style) =====================
function CreatePage() {
  const [, setLocation] = useLocation();
  const [subTab, setSubTab] = useState<'publicar'|'crear'|'live'>('publicar');

  return (
    <div className="min-h-screen" style={{background:'#000'}}>
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        <button onClick={()=>setLocation(-1 as any)} className="p-2 rounded-full" style={{background:'rgba(255,255,255,0.1)'}}><X size={20} className="text-white"/></button>
        <h1 className="text-white font-bold text-base">CREATE</h1>
        <div className="w-10"/>
      </div>

      {/* Herramientas */}
      <div className="flex items-center gap-4 px-4 mb-4 overflow-x-auto">
        {[
          {icon:'✂️',label:'AutoCut'},{icon:'💬',label:'Subtítulos'},{icon:'✂',label:'Recorte'},{icon:'📸',label:'Editor'}
        ].map(t=>(
          <button key={t.label} className="flex flex-col items-center gap-1 flex-shrink-0">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl" style={{background:'#1e1e2a'}}>{t.icon}</div>
            <span className="text-gray-400 text-xs">{t.label}</span>
          </button>
        ))}
      </div>

      {/* Botón principal */}
      <div className="px-4 mb-6">
        <button onClick={()=>setLocation('/camera')} className="w-full py-4 rounded-2xl flex items-center justify-center gap-3 font-bold text-white text-base" style={{background:'#1e1e2a',border:'2px dashed #2a2a3a'}}>
          <Plus size={24} className="text-gray-400"/><span className="text-gray-300">Vídeo nuevo</span>
        </button>
      </div>

      {/* Tabs publicar/crear/live */}
      <div className="flex border-b px-4 mb-4" style={{borderColor:'#1e1e2a'}}>
        {(['publicar','crear','live'] as const).map(t=>(
          <button key={t} onClick={()=>setSubTab(t)} className={cn('flex-1 py-3 text-sm font-bold uppercase border-b-2 transition-all',subTab===t?'text-white border-white':'text-gray-500 border-transparent')}>
            {t}
          </button>
        ))}
      </div>

      {subTab==='publicar' && (
        <div className="px-4">
          <h2 className="text-white font-bold mb-3">Plantillas</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              {title:'Reto Kindness',desc:'1,7 mill. vídeos',thumb:'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=200&h=350&fit=crop'},
              {title:'Eco Warrior',desc:'890K vídeos',thumb:'https://images.unsplash.com/photo-1501854140801-50d01698950b?w=200&h=350&fit=crop'},
              {title:'Arte 15s',desc:'2,3 mill. vídeos',thumb:'https://images.unsplash.com/photo-1511988617509-a57c8a288659?w=200&h=350&fit=crop'},
              {title:'Cadena Musical',desc:'560K vídeos',thumb:'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=200&h=350&fit=crop'},
            ].map(t=>(
              <button key={t.title} onClick={()=>setLocation('/camera')} className="relative rounded-xl overflow-hidden" style={{aspectRatio:'9/16'}}>
                <img src={t.thumb} alt={t.title} className="w-full h-full object-cover"/>
                <div className="absolute inset-0" style={{background:'linear-gradient(to top,rgba(0,0,0,0.7) 0%,transparent 60%)'}}/>
                <div className="absolute bottom-2 left-2 right-2"><p className="text-white text-xs font-bold">{t.title}</p><p className="text-gray-300 text-xs">{t.desc}</p></div>
              </button>
            ))}
          </div>
        </div>
      )}

      {subTab==='crear' && (
        <div className="px-4 text-center py-8">
          <div className="text-5xl mb-4">🎨</div>
          <p className="text-gray-400 mb-4">Editor de fotos y videos próximamente</p>
          <button onClick={()=>setLocation('/camera')} className="px-6 py-3 rounded-xl font-bold text-black" style={{background:'#00F5FF'}}>Ir a grabar</button>
        </div>
      )}

      {subTab==='live' && (
        <div className="px-4 text-center py-8">
          <div className="text-5xl mb-4">📡</div>
          <p className="text-white font-bold mb-2">Iniciar un live</p>
          <p className="text-gray-400 text-sm mb-4">Conecta con tu audiencia en tiempo real</p>
          <button onClick={()=>setLocation('/live/create')} className="px-6 py-3 rounded-xl font-bold text-white" style={{background:'#FF007F'}}>Empezar Live</button>
        </div>
      )}
    </div>
  );
}

// ===================== PUBLISH PAGE =====================
function PublishPage({ blob, blobUrl }: { blob: Blob; blobUrl: string }) {
  const { token } = useAuth();
  const [, setLocation] = useLocation();
  const { data: challenge } = useApi('/api/challenges/active');
  const { data: users } = useApi('/api/ranking?limit=30');
  const [description, setDescription] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [privacy, setPrivacy] = useState<'public'|'private'>('public');
  const [publishing, setPublishing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showNomModal, setShowNomModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [geo] = useState({ lat: 40.4168, lng: -3.7038 });
  const { user } = useAuth();

  const addHashtag = (tag: string) => setDescription(d => d + ` #${tag}`);
  const addMention = () => setDescription(d => d + ' @');

  const publish = async () => {
    if (!token || !challenge) return;
    if (selected.length < 3) { setShowNomModal(true); return; }
    setShowPrivacyModal(true);
  };

  const doPublish = async () => {
    if (!token || !challenge) return;
    setShowPrivacyModal(false);
    setPublishing(true);
    try {
      let videoUrl = ''; let thumbnailUrl = '';
      try { const r = await uploadToCloudinary(blob, p => setUploadProgress(p)); videoUrl = r.videoUrl; thumbnailUrl = r.thumbnailUrl; } catch {}
      const r = await fetch(`${API}/api/videos`, {
        method: 'POST', headers: { Authorization:`Bearer ${token}`, 'Content-Type':'application/json' },
        body: JSON.stringify({ challengeId: challenge._id, videoUrl, thumbnailUrl, geoCoordinates: geo, nominatedUserIds: selected, description, isPublic: privacy === 'public' })
      });
      if (r.ok) setLocation('/profile');
      else { const d = await r.json(); alert(d.error || 'Error'); }
    } finally { setPublishing(false); }
  };

  const filtered = (Array.isArray(users)?users:[]).filter((u:RankingEntry) => u._id!==user?._id && !selected.includes(u._id) && u.username.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="min-h-screen" style={{background:'#fff'}}>
      {/* Header */}
      <div className="flex items-center p-4 border-b border-gray-200">
        <button onClick={()=>setLocation('/camera')} className="p-2 mr-2"><ChevronLeft size={24} className="text-gray-800"/></button>
        <h1 className="text-black font-bold text-base flex-1">Publicar vídeo</h1>
      </div>

      <div className="p-4 space-y-4">
        {/* Preview + descripción */}
        <div className="flex gap-3">
          <textarea value={description} onChange={e=>setDescription(e.target.value)} placeholder="Añade una descripción..." className="flex-1 resize-none text-sm text-gray-800 placeholder-gray-400 focus:outline-none" rows={3}/>
          <div className="w-20 h-28 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
            <video src={blobUrl} className="w-full h-full object-cover"/>
          </div>
        </div>

        {/* Hashtags y menciones */}
        <div className="flex gap-2">
          <button onClick={()=>addHashtag('domino')} className="flex items-center gap-1.5 px-3 py-2 rounded-full border border-gray-300 text-sm text-gray-700"><Hash size={14}/># Hashtags</button>
          <button onClick={addMention} className="flex items-center gap-1.5 px-3 py-2 rounded-full border border-gray-300 text-sm text-gray-700"><AtSign size={14}/>@ Mencionar</button>
        </div>

        <div className="border-t border-gray-100"/>

        {/* Nominar */}
        <button onClick={()=>setShowNomModal(true)} className="w-full flex items-center justify-between py-3">
          <div className="flex items-center gap-3"><Users size={20} className="text-gray-600"/><div className="text-left"><p className="text-sm font-medium text-gray-800">Nominar 3 personas</p><p className="text-xs text-gray-500">{selected.length}/3 seleccionados</p></div></div>
          <span className="text-gray-400">›</span>
        </button>

        {/* Privacidad */}
        <button onClick={()=>setPrivacy(p=>p==='public'?'private':'public')} className="w-full flex items-center justify-between py-3 border-t border-gray-100">
          <div className="flex items-center gap-3"><Globe size={20} className="text-gray-600"/><p className="text-sm font-medium text-gray-800">{privacy==='public'?'Todo el mundo puede ver':'Solo tú'}</p></div>
          <span className="text-gray-400">›</span>
        </button>

        {/* Ubicación */}
        <div className="flex items-center justify-between py-3 border-t border-gray-100">
          <div className="flex items-center gap-3"><MapPin size={20} className="text-gray-600"/><p className="text-sm font-medium text-gray-800">Ubicación</p></div>
          <span className="text-gray-400">›</span>
        </div>

        <div className="border-t border-gray-100"/>

        {/* Upload progress */}
        {publishing && <div className="py-2"><div className="flex justify-between mb-1"><span className="text-xs text-gray-500">Subiendo...</span><span className="text-xs font-bold text-blue-500">{uploadProgress}%</span></div><div className="h-1.5 rounded-full bg-gray-200"><div className="h-full rounded-full bg-red-500" style={{width:`${uploadProgress}%`}}/></div></div>}

        {/* Botones */}
        <div className="flex gap-3 pt-2">
          <button onClick={()=>{ saveToGallery(blob); }} className="flex-1 py-3 rounded-full border border-gray-300 text-sm font-semibold text-gray-700 flex items-center justify-center gap-2"><Download size={16}/>Borradores</button>
          <button onClick={publish} disabled={publishing} className="flex-1 py-3 rounded-full text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-60" style={{background:'#FF007F'}}>
            {publishing?<Spinner/>:<><Upload size={16}/>Publicar</>}
          </button>
        </div>
      </div>

      {/* Modal nominar */}
      {showNomModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" style={{background:'rgba(0,0,0,0.5)'}}>
          <div className="w-full max-w-md rounded-t-2xl p-5" style={{background:'#13131f',maxHeight:'80vh',overflow:'auto'}}>
            <div className="flex items-center justify-between mb-4"><div><h2 className="font-bold text-white">Nominar 3 personas</h2><p className="text-xs text-gray-400">Obligatorio ({selected.length}/3)</p></div><button onClick={()=>setShowNomModal(false)}><X size={18} className="text-gray-400"/></button></div>
            {selected.length>0&&<div className="flex gap-2 flex-wrap mb-3">{selected.map(id=>{const u=(Array.isArray(users)?users:[]).find((x:RankingEntry)=>x._id===id);return u?<button key={id} onClick={()=>setSelected(s=>s.filter(x=>x!==id))} className="flex items-center gap-1 text-xs px-2 py-1 rounded-full border" style={{borderColor:'#FF007F',color:'#FF007F',background:'rgba(255,0,127,0.1)'}}>{u.username}<X size={10}/></button>:null;})}</div>}
            <div className="relative mb-3"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar usuarios..." className="w-full rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none" style={{background:'#0b0b12',border:'1px solid #2a2a3a'}}/></div>
            <div className="space-y-2 max-h-48 overflow-y-auto mb-4">{filtered.map((u:RankingEntry)=><button key={u._id} onClick={()=>selected.length<3&&setSelected(s=>[...s,u._id])} disabled={selected.length>=3} className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/5 text-left disabled:opacity-40"><Av u={u} s={32}/><div className="flex-1 min-w-0"><div className="text-sm font-medium text-white">{u.username}</div><div className="text-xs text-gray-400">{u.flag} {u.country}</div></div>{selected.includes(u._id)&&<CheckCircle size={16} className="text-[#00F5FF]"/>}</button>)}</div>
            <button onClick={()=>setShowNomModal(false)} disabled={selected.length<3} className="w-full py-3 rounded-xl font-bold text-white disabled:opacity-50" style={{background:selected.length===3?'#FF007F':'#1e1e2a'}}>Confirmar ({selected.length}/3)</button>
          </div>
        </div>
      )}

      {/* Modal privacidad */}
      {showPrivacyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{background:'rgba(0,0,0,0.5)'}}>
          <div className="w-full max-w-sm rounded-2xl p-6 text-center" style={{background:'white'}}>
            <h2 className="text-black font-bold text-lg mb-2">¿Hacer que el vídeo sea público?</h2>
            <p className="text-gray-500 text-sm mb-6">Tu cuenta es pública. Puedes cambiar la privacidad en Ajustes.</p>
            <div className="flex gap-3">
              <button onClick={()=>setShowPrivacyModal(false)} className="flex-1 py-3 rounded-xl text-gray-700 font-semibold border border-gray-200">Cancelar</button>
              <button onClick={doPublish} className="flex-1 py-3 rounded-xl text-white font-bold" style={{background:'#FF007F'}}>Publicar ahora</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ===================== CAMERA PAGE =====================
function CameraPage() {
  const { user, token } = useAuth();
  const [, setLocation] = useLocation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const mrRef = useRef<MediaRecorder|null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream|null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval>|null>(null);
  const [camOn, setCamOn] = useState(false);
  const [rec, setRec] = useState(false);
  const [secs, setSecs] = useState(15);
  const [duration, setDuration] = useState<15|60>(15);
  const [blob, setBlob] = useState<Blob|null>(null);
  const [blobUrl, setBlobUrl] = useState<string|null>(null);
  const [geo] = useState({ lat: 40.4168, lng: -3.7038 });

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(p => {});
    return () => { streamRef.current?.getTracks().forEach(t=>t.stop()); if(blobUrl)URL.revokeObjectURL(blobUrl); };
  }, []);

  const startCam = async () => {
    try {
      let s: MediaStream;
      try { s=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'user'},width:{ideal:1280},height:{ideal:720}},audio:true}); }
      catch { try{s=await navigator.mediaDevices.getUserMedia({video:true,audio:true});}catch{s=await navigator.mediaDevices.getUserMedia({video:true,audio:false});} }
      streamRef.current=s; setCamOn(true);
      await new Promise(r=>setTimeout(r,100));
      if(videoRef.current){videoRef.current.srcObject=s;videoRef.current.muted=true;videoRef.current.playsInline=true;try{await videoRef.current.play();}catch{}}
    } catch(err:any){setCamOn(false);alert(err.name==='NotAllowedError'?'❌ Permiso denegado.':'❌ Error: '+err.message);}
  };

  const stopRec = useCallback(()=>{if(timerRef.current)clearInterval(timerRef.current);if(mrRef.current&&mrRef.current.state!=='inactive')mrRef.current.stop();setRec(false);},[]);

  const startRec = () => {
    if(!streamRef.current)return; chunksRef.current=[];
    const mime=MediaRecorder.isTypeSupported('video/webm;codecs=vp9')?'video/webm;codecs=vp9':MediaRecorder.isTypeSupported('video/webm')?'video/webm':'';
    const mr=new MediaRecorder(streamRef.current,mime?{mimeType:mime}:{});
    mr.ondataavailable=e=>{if(e.data.size>0)chunksRef.current.push(e.data);};
    mr.onstop=()=>{const b=new Blob(chunksRef.current,{type:'video/webm'});setBlob(b);const url=URL.createObjectURL(b);setBlobUrl(url);streamRef.current?.getTracks().forEach(t=>t.stop());setCamOn(false);};
    mrRef.current=mr;mr.start();setRec(true);setSecs(duration);
    timerRef.current=setInterval(()=>setSecs(t=>{if(t<=1){stopRec();return 0;}return t-1;}),1000);
  };

  // Si ya grabó, ir a publicar
  if (blob && blobUrl) {
    return <PublishPage blob={blob} blobUrl={blobUrl}/>;
  }

  if (!user) return (
    <div className="min-h-screen flex items-center justify-center" style={{background:'#0b0b12'}}>
      <div className="text-center"><p className="text-gray-400 mb-4">Inicia sesión para grabar</p><Link href="/auth" className="px-6 py-3 rounded-xl font-bold text-black" style={{background:'#00F5FF'}}>Entrar</Link></div>
    </div>
  );

  return (
    <div className="min-h-screen" style={{background:'#000'}}>
      <div className="relative h-screen overflow-hidden">
        <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" autoPlay muted playsInline style={{display:camOn?'block':'none'}}/>
        {!camOn&&<div className="absolute inset-0 flex items-center justify-center bg-black"><div className="text-center"><Camera size={64} className="mx-auto text-gray-600 mb-3"/><p className="text-gray-400 text-sm">Activa la cámara</p></div></div>}

        {/* Top controls */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-4 z-10">
          <button onClick={()=>setLocation('/create')} className="p-2 rounded-full" style={{background:'rgba(0,0,0,0.5)'}}><X size={20} className="text-white"/></button>
          {camOn&&<button className="px-3 py-1.5 rounded-full text-xs text-white font-semibold flex items-center gap-1.5" style={{background:'rgba(0,0,0,0.5)'}}><span>♪</span>Añadir sonido</button>}
          <div className="w-10"/>
        </div>

        {/* Side tools */}
        {camOn && (
          <div className="absolute right-3 top-20 flex flex-col gap-5 items-center z-10">
            {[{icon:'⏱️',label:''},{icon:'⬜',label:''},{icon:'✨',label:''},{icon:'😊',label:''}].map((t,i)=><button key={i} className="flex flex-col items-center gap-1"><span className="text-2xl">{t.icon}</span></button>)}
          </div>
        )}

        {/* Encuadramiento */}
        {camOn && !rec && <>
          <div className="absolute top-32 left-4 w-8 h-8 border-t-2 border-l-2 rounded-tl-lg" style={{borderColor:'#00F5FF'}}/>
          <div className="absolute top-32 right-4 w-8 h-8 border-t-2 border-r-2 rounded-tr-lg" style={{borderColor:'#00F5FF'}}/>
          <div className="absolute bottom-40 left-4 w-8 h-8 border-b-2 border-l-2 rounded-bl-lg" style={{borderColor:'#00F5FF'}}/>
          <div className="absolute bottom-40 right-4 w-8 h-8 border-b-2 border-r-2 rounded-br-lg" style={{borderColor:'#00F5FF'}}/>
        </>}

        {/* Bottom controls */}
        <div className="absolute bottom-0 left-0 right-0 pb-8 z-10">
          {/* Duración selector */}
          {!rec && camOn && (
            <div className="flex items-center justify-center gap-4 mb-4">
              {([15,60] as const).map(d=>(
                <button key={d} onClick={()=>setDuration(d)} className={cn('px-4 py-1.5 rounded-full text-sm font-bold transition-all',duration===d?'text-black':'text-white border border-gray-600')} style={duration===d?{background:'white'}:{}}>
                  {d}s
                </button>
              ))}
            </div>
          )}

          {/* Contador durante grabación */}
          {rec && <div className="flex justify-center mb-4"><div className="w-16 h-16 rounded-full flex items-center justify-center border-4" style={{borderColor:'#FF007F',boxShadow:'0 0 20px rgba(255,0,127,0.5)'}}><span className="text-2xl font-black text-white font-mono">{secs}</span></div></div>}

          <div className="flex items-center justify-center gap-8">
            {/* Galería */}
            <button className="w-10 h-10 rounded-lg overflow-hidden border-2 border-white/30" style={{background:'#1e1e2a'}}>
              <ImageIcon size={20} className="text-gray-400 mx-auto mt-1"/>
            </button>

            {/* Botón grabar */}
            {!camOn ? (
              <button onClick={startCam} className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center" style={{background:'rgba(255,255,255,0.1)'}}>
                <Camera size={28} className="text-white"/>
              </button>
            ) : (
              <button onClick={rec?stopRec:startRec} className={cn('transition-all active:scale-95',rec?'scale-110':'')}>
                <div className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center" style={rec?{background:'#FF007F',borderColor:'#FF007F',boxShadow:'0 0 30px rgba(255,0,127,0.6)'}:{background:'rgba(255,0,0,0.8)'}}>
                  {rec?<div className="w-8 h-8 bg-white rounded-sm"/>:<div className="w-16 h-16 rounded-full" style={{background:'#FF007F'}}/>}
                </div>
              </button>
            )}

            {/* Flip camera */}
            <button className="w-10 h-10 rounded-full flex items-center justify-center" style={{background:'rgba(0,0,0,0.5)'}}>
              <RefreshCw size={20} className="text-white"/>
            </button>
          </div>

          {/* Texto debajo */}
          {camOn && <p className="text-center text-xs text-gray-400 mt-3">{rec?'Pulsa para detener':'Pulsa para grabar'}</p>}

          {/* Tabs PUBLICAR / CREAR / LIVE */}
          <div className="flex items-center justify-center gap-8 mt-4">
            {(['PUBLICAR','CREAR','LIVE'] as const).map((t,i)=>(
              <button key={t} onClick={()=>i===2&&setLocation('/live/create')} className={cn('text-xs font-bold pb-1',i===0?'text-white border-b-2 border-white':'text-gray-500')}>
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ===================== MESSAGES PAGE =====================
function MessagesPage() {
  const { user } = useAuth();
  const { data: convs, loading } = useApi('/api/users/messages/inbox', [user?._id]);
  const [, setLocation] = useLocation();

  if (!user) return <div className="min-h-screen flex items-center justify-center" style={{paddingTop:'56px',background:'#0b0b12'}}><div className="text-center"><p className="text-gray-400 mb-4">Inicia sesión</p><Link href="/auth" className="px-6 py-3 rounded-xl font-bold text-black" style={{background:'#00F5FF'}}>Entrar</Link></div></div>;

  return (
    <div className="min-h-screen pb-20" style={{paddingTop:'56px',background:'#0b0b12'}}>
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between px-4 py-4">
          <h1 className="text-xl font-black text-white">Mensajes</h1>
          <button className="p-2 rounded-lg hover:bg-white/5"><Search size={20} className="text-gray-400"/></button>
        </div>

        {loading ? <div className="flex justify-center py-8"><Spinner/></div> : (
          <div>
            {(!convs || !Array.isArray(convs) || convs.length === 0) ? (
              <div className="text-center py-16"><MessageCircle size={48} className="mx-auto text-gray-700 mb-3"/><p className="text-gray-400">Sin mensajes todavía</p></div>
            ) : (
              (Array.isArray(convs)?convs:[]).map((c:Conversation) => (
                <button key={c.user._id} onClick={()=>setLocation(`/messages/${c.user._id}`)} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors">
                  <Av u={c.user} s={48}/>
                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-center justify-between"><span className="text-white font-semibold text-sm">{c.user.username}</span><span className="text-gray-500 text-xs">{ago(c.lastMessage.createdAt)}</span></div>
                    <p className="text-gray-400 text-xs truncate mt-0.5">{c.lastMessage.text}</p>
                  </div>
                  {c.unread>0&&<span className="w-5 h-5 rounded-full text-xs font-bold text-black flex items-center justify-center flex-shrink-0" style={{background:'#FF007F'}}>{c.unread}</span>}
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ===================== CHAT PAGE =====================
function ChatPage({ userId }: { userId: string }) {
  const { user, token } = useAuth();
  const [, setLocation] = useLocation();
  const { data: msgs, setData, loading } = useApi(`/api/users/messages/${userId}`, [userId]);
  const { data: other } = useApi(`/api/users/${userId}`, [userId]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:'smooth' }); }, [msgs]);

  const send = async () => {
    if (!text.trim()||!token) return; setSending(true);
    try {
      const r=await fetch(`${API}/api/users/messages/${userId}`,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({text})});
      const m=await r.json(); if(r.ok){setData((p:Message[])=>[...(Array.isArray(p)?p:[]),m]);setText('');}
    } finally{setSending(false);}
  };

  return (
    <div className="min-h-screen flex flex-col" style={{paddingTop:'56px',background:'#0b0b12'}}>
      {/* Header chat */}
      <div className="flex items-center gap-3 px-4 py-3 border-b sticky top-14 z-10" style={{background:'#0b0b12',borderColor:'#1e1e2a'}}>
        <button onClick={()=>setLocation('/messages')}><ChevronLeft size={24} className="text-gray-400"/></button>
        {other&&<><Av u={other} s={36}/><div><p className="text-white font-bold text-sm">@{other.username}</p><p className="text-gray-400 text-xs">{other.flag} {other.city}</p></div></>}
      </div>

      {/* Mensajes */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-24">
        {loading?<div className="flex justify-center py-8"><Spinner/></div>:(Array.isArray(msgs)?msgs:[]).map((m:Message)=>{
          const isMe = m.fromUserId._id === user?._id;
          return (
            <div key={m._id} className={cn('flex gap-2',isMe?'justify-end':'justify-start')}>
              {!isMe&&<Av u={m.fromUserId} s={28}/>}
              <div className="max-w-[70%] px-3 py-2 rounded-2xl text-sm" style={isMe?{background:'#00F5FF',color:'#0b0b12',borderBottomRightRadius:'4px'}:{background:'#1e1e2a',color:'white',borderBottomLeftRadius:'4px'}}>
                {m.text}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef}/>
      </div>

      {/* Input */}
      <div className="fixed bottom-16 left-0 right-0 p-3 border-t" style={{background:'#0b0b12',borderColor:'#1e1e2a'}}>
        <div className="flex gap-2 max-w-2xl mx-auto">
          <input value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send()} placeholder="Escribe un mensaje..." className="flex-1 rounded-full px-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none" style={{background:'#1e1e2a',border:'1px solid #2a2a3a'}}/>
          <button onClick={send} disabled={sending||!text.trim()} className="w-10 h-10 rounded-full flex items-center justify-center disabled:opacity-50" style={{background:'#00F5FF'}}><Send size={16} className="text-black"/></button>
        </div>
      </div>
    </div>
  );
}

// ===================== LIVE LIST =====================
function LiveListPage() {
  const { data: lives, loading } = useApi('/api/lives');
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const list = Array.isArray(lives)?lives:[];
  return (
    <div className="min-h-screen pb-20" style={{paddingTop:'56px',background:'#0b0b12'}}>
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6"><div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full animate-pulse" style={{background:'#FF007F'}}/><h1 className="text-2xl font-black text-white">En Directo</h1></div>{user&&<button onClick={()=>setLocation('/live/create')} className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-white text-sm" style={{background:'#FF007F'}}><Video size={16}/>Iniciar</button>}</div>
        {loading?<div className="flex justify-center py-8"><Spinner/></div>:list.length===0?(
          <div className="text-center py-20"><div className="text-5xl mb-4">📡</div><h3 className="text-xl font-bold text-white mb-2">Nadie en directo</h3>{user&&<button onClick={()=>setLocation('/live/create')} className="px-6 py-3 rounded-xl font-bold text-white mt-4" style={{background:'#FF007F'}}>Empezar</button>}</div>
        ):(
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {list.map((l:LiveStream)=>(
              <Link key={l._id} href={`/live/${l._id}`} className="relative rounded-xl overflow-hidden cursor-pointer" style={{aspectRatio:'9/16',background:'#13131f',border:'1px solid #1e1e2a'}}>
                <div className="absolute inset-0 flex items-center justify-center"><Av u={l.userId} s={80}/></div>
                <div className="absolute inset-0" style={{background:'linear-gradient(to top,rgba(0,0,0,0.85) 0%,transparent 60%)'}}/>
                <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold text-white" style={{background:'#FF007F'}}><div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"/>LIVE</div>
                <div className="absolute top-2 right-2 flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs text-white" style={{background:'rgba(0,0,0,0.6)'}}><Eye size={9}/>{l.viewerCount}</div>
                <div className="absolute bottom-3 left-3 right-3"><p className="text-white text-xs font-bold truncate">@{l.userId?.username}</p><p className="text-gray-300 text-xs truncate">{l.title}</p></div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ===================== CREATE LIVE =====================
function CreateLivePage() {
  const { user, token } = useAuth();
  const [, setLocation] = useLocation();
  const [form, setForm] = useState({title:'',description:'',category:'General',isBattle:false});
  const [loading, setLoading] = useState(false); const [error, setError] = useState('');
  if(!user)return<div className="min-h-screen flex items-center justify-center" style={{paddingTop:'80px',background:'#0b0b12'}}><Link href="/auth" className="px-6 py-3 rounded-xl font-bold text-black" style={{background:'#00F5FF'}}>Entrar</Link></div>;
  const create=async()=>{if(!form.title.trim())return setError('Escribe un título');setError('');setLoading(true);try{const r=await fetch(`${API}/api/lives`,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify(form)});const d=await r.json();if(!r.ok)throw new Error(d.error||'Error');setLocation(`/live/${d.live._id}`);}catch(e:any){setError(e.message);}finally{setLoading(false);}};
  return(
    <div className="min-h-screen flex items-center justify-center px-4" style={{paddingTop:'80px',background:'#0b0b12'}}>
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-black text-white mb-6">Iniciar Live</h1>
        <div className="rounded-2xl p-6 space-y-4" style={{background:'#13131f',border:'1px solid #1e1e2a'}}>
          <input placeholder="Título del live" value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} className="w-full rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none" style={{background:'#0b0b12',border:'1px solid #2a2a3a'}}/>
          <input placeholder="Descripción (opcional)" value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} className="w-full rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none" style={{background:'#0b0b12',border:'1px solid #2a2a3a'}}/>
          <select value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))} className="w-full rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none" style={{background:'#0b0b12',border:'1px solid #2a2a3a'}}>{['General','Creativity','Kindness','Eco','Battle'].map(c=><option key={c} value={c}>{c}</option>)}</select>
          <label className="flex items-center gap-3 cursor-pointer"><div className="w-10 h-5 rounded-full relative transition-all" style={{background:form.isBattle?'#FF007F':'#374151'}} onClick={()=>setForm(f=>({...f,isBattle:!f.isBattle}))}><div className={cn('absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all',form.isBattle?'left-5':'left-0.5')}/></div><span className="text-sm text-white">Modo batalla VS</span></label>
          {error&&<p className="text-red-400 text-xs">{error}</p>}
          <button onClick={create} disabled={loading} className="w-full py-3 rounded-xl font-bold text-white flex items-center justify-center gap-2 disabled:opacity-50" style={{background:'linear-gradient(135deg,#FF007F,#7c3aed)'}}>{loading?<Spinner/>:<><Video size={18}/>Empezar Live</>}</button>
        </div>
      </div>
    </div>
  );
}

// ===================== LIVE VIEWER =====================
function LiveViewerPage({ id }: { id: string }) {
  const { user, token, refreshUser } = useAuth();
  const { data: lives } = useApi('/api/lives', [id]);
  const [msgs, setMsgs] = useState<{user:string;text:string;type?:string}[]>([{user:'Sistema',text:'¡Bienvenido! 🎲',type:'system'}]);
  const [input, setInput] = useState(''); const [showGifts, setShowGifts] = useState(false);
  const [giftAnim, setGiftAnim] = useState<string|null>(null); const [viewers, setViewers] = useState(0);
  const chatRef = useRef<HTMLDivElement>(null);
  const live = Array.isArray(lives)?lives.find((l:LiveStream)=>l._id===id):null;
  useEffect(()=>{if(live)setViewers(live.viewerCount||0);},[live]);
  useEffect(()=>{const t=setInterval(()=>setViewers(v=>Math.max(0,v+Math.floor(Math.random()*3-1))),5000);return()=>clearInterval(t);},[]);
  useEffect(()=>{if(chatRef.current)chatRef.current.scrollTop=chatRef.current.scrollHeight;},[msgs]);
  const sendMsg=()=>{if(!input.trim()||!user)return;setMsgs(m=>[...m,{user:user.username,text:input}]);setInput('');};
  const sendGift=async(type:string)=>{
    const g=GIFT_CATALOG[type];if((user?.coins||0)<g.coins){alert('Monedas insuficientes');return;}
    const r=await fetch(`${API}/api/coins/gift`,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({liveId:id,giftType:type,quantity:1})});
    if(r.ok){setGiftAnim(`${g.emoji} ${g.name}`);setTimeout(()=>setGiftAnim(null),3000);setMsgs(m=>[...m,{user:user?.username||'Tú',text:`envió ${g.emoji} ${g.name}!`,type:'gift'}]);await refreshUser();}
    else alert('Error al enviar regalo');setShowGifts(false);
  };
  if(!live)return<div className="min-h-screen flex items-center justify-center" style={{paddingTop:'80px',background:'#0b0b12'}}><div className="text-center"><div className="text-5xl mb-4">📡</div><p className="text-white font-bold mb-2">Live no encontrado</p><Link href="/live" className="text-sm font-semibold" style={{color:'#00F5FF'}}>Ver otros</Link></div></div>;
  return(
    <div className="fixed inset-0 flex" style={{paddingTop:'0',background:'#000'}}>
      <div className="relative flex-1">
        <div className="absolute inset-0 flex items-center justify-center" style={{background:'#1a1a2e'}}><div className="text-center"><Av u={live.userId} s={120}/><p className="text-white font-bold mt-4 text-xl">@{live.userId?.username}</p><p className="text-gray-400 text-sm mt-1">{live.title}</p><div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full" style={{background:'rgba(255,0,127,0.2)',border:'1px solid #FF007F'}}><div className="w-2 h-2 rounded-full animate-pulse" style={{background:'#FF007F'}}/><span className="text-white text-sm font-bold">EN DIRECTO</span></div></div></div>
        <div className="absolute top-2 left-2 right-2 flex items-center justify-between z-10"><div className="flex items-center gap-2"><div className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold text-white" style={{background:'#FF007F'}}><div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"/>LIVE</div><div className="flex items-center gap-1 px-2 py-1 rounded-full text-xs text-white" style={{background:'rgba(0,0,0,0.6)'}}><Eye size={10}/>{Math.max(0,viewers)}</div></div><Link href="/live" className="p-1.5 rounded-full" style={{background:'rgba(0,0,0,0.6)'}}><X size={16} className="text-white"/></Link></div>
        {giftAnim&&<div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center animate-bounce z-20"><div className="text-5xl mb-2">{giftAnim.split(' ')[0]}</div><p className="text-white font-bold">{giftAnim}</p></div>}
        <div className="absolute bottom-4 left-2 flex items-center gap-2 z-10">
          <button onClick={()=>setShowGifts(true)} className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-bold text-white" style={{background:'linear-gradient(135deg,#FF007F,#7c3aed)'}}><Gift size={16}/>Regalar</button>
          {user&&<div className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold" style={{background:'rgba(0,0,0,0.6)',color:'#FFD700'}}>🪙 {(user.coins||0)}</div>}
        </div>
        {showGifts&&<div className="absolute bottom-16 left-2 z-20 rounded-2xl p-4 w-72" style={{background:'#13131f',border:'1px solid #1e1e2a'}}><div className="flex items-center justify-between mb-3"><h3 className="font-bold text-white text-sm">Enviar Regalo</h3><button onClick={()=>setShowGifts(false)}><X size={16} className="text-gray-400"/></button></div><div className="grid grid-cols-3 gap-2">{Object.entries(GIFT_CATALOG).map(([k,g])=><button key={k} onClick={()=>sendGift(k)} disabled={(user?.coins||0)<g.coins} className="flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-white/10 disabled:opacity-40 border border-transparent hover:border-[#FF007F]"><span className="text-2xl">{g.emoji}</span><span className="text-white text-xs font-bold">{g.name}</span><span className="text-yellow-400 text-xs">{g.coins}🪙</span></button>)}</div></div>}
      </div>
      <div className="w-72 flex flex-col" style={{background:'#13131f',borderLeft:'1px solid #1e1e2a'}}>
        <div className="p-3 border-b flex items-center gap-2" style={{borderColor:'#1e1e2a'}}><Av u={live.userId} s={28}/><div><p className="text-white text-xs font-bold">@{live.userId?.username}</p><p className="text-gray-400 text-xs truncate">{live.title}</p></div></div>
        <div ref={chatRef} className="flex-1 overflow-y-auto p-3 space-y-2">{msgs.map((m,i)=><div key={i} className={cn('text-xs',m.type==='system'?'text-center text-gray-500':m.type==='gift'?'text-center':'')}>{m.type==='gift'?<span className="px-2 py-1 rounded-full font-bold" style={{background:'rgba(255,0,127,0.2)',color:'#FF007F'}}>🎁 {m.user} {m.text}</span>:m.type==='system'?<span>{m.text}</span>:<span><span className="font-bold" style={{color:'#00F5FF'}}>{m.user}: </span><span className="text-gray-300">{m.text}</span></span>}</div>)}</div>
        {user&&<div className="p-3 border-t flex gap-2" style={{borderColor:'#1e1e2a'}}><input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&sendMsg()} placeholder="Escribe algo..." className="flex-1 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none" style={{background:'#0b0b12',border:'1px solid #2a2a3a'}}/><button onClick={sendMsg} className="p-2 rounded-xl" style={{background:'#00F5FF'}}><Send size={14} className="text-black"/></button></div>}
      </div>
    </div>
  );
}

// ===================== MAP PAGE =====================
function WorldMapPage() {
  const { data: videos } = useApi('/api/videos/feed?limit=50');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const proj=(lat:number,lng:number,w:number,h:number)=>({x:((lng+180)/360)*w,y:((90-lat)/180)*h});
  const SAMPLE=[{lat:40.4168,lng:-3.7038,flag:'🇪🇸',city:'Madrid'},{lat:35.6762,lng:139.6503,flag:'🇯🇵',city:'Tokio'},{lat:40.7128,lng:-74.006,flag:'🇺🇸',city:'NY'},{lat:-34.6037,lng:-58.3816,flag:'🇦🇷',city:'Buenos Aires'},{lat:48.8566,lng:2.3522,flag:'🇫🇷',city:'París'},{lat:51.5074,lng:-0.1278,flag:'🇬🇧',city:'Londres'}];
  const pts=Array.isArray(videos)&&videos.length>0?videos.map((v:DominoVideo)=>({lat:v.geoCoordinates.lat,lng:v.geoCoordinates.lng,flag:v.userId?.flag||'🌍',city:v.userId?.city||''})):SAMPLE;
  useEffect(()=>{const c=canvasRef.current;if(!c)return;const ctx=c.getContext('2d');if(!ctx)return;c.width=c.parentElement?.clientWidth||800;c.height=Math.min((c.parentElement?.clientWidth||800)*0.5,400);const w=c.width,h=c.height;ctx.fillStyle='#0b0b12';ctx.fillRect(0,0,w,h);ctx.strokeStyle='rgba(42,42,58,0.6)';ctx.lineWidth=0.5;for(let l=-180;l<=180;l+=30){const{x}=proj(0,l,w,h);ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,h);ctx.stroke();}for(let l=-90;l<=90;l+=30){const{y}=proj(l,0,w,h);ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke();}for(let i=0;i<pts.length-1;i++){const p1=proj(pts[i].lat,pts[i].lng,w,h),p2=proj(pts[i+1].lat,pts[i+1].lng,w,h);const g=ctx.createLinearGradient(p1.x,p1.y,p2.x,p2.y);g.addColorStop(0,'#00F5FF');g.addColorStop(1,'#FF007F');ctx.beginPath();ctx.moveTo(p1.x,p1.y);ctx.lineTo(p2.x,p2.y);ctx.strokeStyle=g;ctx.lineWidth=1.5;ctx.globalAlpha=0.6;ctx.stroke();ctx.globalAlpha=1;}pts.forEach((p:{lat:number;lng:number;flag:string;city:string},i:number)=>{const{x,y}=proj(p.lat,p.lng,w,h);ctx.beginPath();ctx.arc(x,y,i===0?8:5,0,Math.PI*2);ctx.fillStyle=i===0?'#FF007F':'#00F5FF';ctx.shadowBlur=12;ctx.shadowColor=ctx.fillStyle;ctx.fill();ctx.shadowBlur=0;ctx.fillStyle='rgba(248,250,252,0.85)';ctx.font=`${Math.max(8,Math.floor(w/90))}px Inter`;ctx.fillText(`${p.flag} ${p.city}`,x+8,y-4);});},[pts.length]);
  return(<div className="min-h-screen pb-20" style={{paddingTop:'56px',background:'#0b0b12'}}><div className="max-w-7xl mx-auto px-4 py-6"><h1 className="text-3xl font-black text-white mb-2">Mapa Global</h1><p className="text-gray-400 mb-6">{pts.length} nodos</p><div className="rounded-xl overflow-hidden border" style={{minHeight:'300px',borderColor:'#1e1e2a',background:'#0b0b12'}}><canvas ref={canvasRef} className="w-full block"/></div><div className="mt-6 grid grid-cols-3 gap-4">{[{v:Array.isArray(videos)?videos.length:pts.length,l:'Videos',c:'#00F5FF'},{v:new Set(pts.map((p:any)=>p.city)).size,l:'Ciudades',c:'#FF007F'},{v:pts.length,l:'Nodos',c:'#7c3aed'}].map((s,i)=><div key={i} className="rounded-xl p-4 border" style={{background:'#13131f',borderColor:'#1e1e2a'}}><div className="text-2xl font-bold" style={{color:s.c}}>{s.v}</div><div className="text-xs text-gray-400 mt-1">{s.l}</div></div>)}</div></div></div>);
}

// ===================== NOTIFICATIONS PAGE =====================
function NotificationsPage() {
  const { user, token } = useAuth();
  const { data: notifs, setData: setNotifs } = useApi('/api/notifications', [user?._id]);
  const markAll=async()=>{if(!token)return;await fetch(`${API}/api/notifications/read-all`,{method:'PUT',headers:{Authorization:`Bearer ${token}`}});setNotifs((p:Notification[])=>Array.isArray(p)?p.map(n=>({...n,read:true})):p);};
  return(
    <div className="min-h-screen pb-20" style={{paddingTop:'56px',background:'#0b0b12'}}>
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6"><h1 className="text-2xl font-black text-white">Avisos</h1>{Array.isArray(notifs)&&notifs.some((n:Notification)=>!n.read)&&<button onClick={markAll} className="text-xs font-semibold" style={{color:'#00F5FF'}}>Marcar como leídas</button>}</div>
        <div className="space-y-2">
          {(Array.isArray(notifs)?notifs:[]).map((n:Notification)=>(
            <div key={n._id} className={cn('flex gap-3 p-4 rounded-xl border',!n.read?'border-[#00F5FF]/20 bg-[#00F5FF]/5':'border-[#1e1e2a] bg-[#13131f]')}>
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl flex-shrink-0" style={{background:'rgba(255,0,127,0.1)'}}>{n.type==='nomination'?'🎯':n.type==='chain_continued'?'⛓️':n.type==='liked'?'❤️':'🏆'}</div>
              <div className="flex-1"><p className="text-sm text-white">{n.message}</p><p className="text-xs text-gray-500 mt-1">{ago(n.createdAt)}</p></div>
              {!n.read&&<div className="w-2 h-2 rounded-full flex-shrink-0 mt-2" style={{background:'#FF007F'}}/>}
            </div>
          ))}
          {(!notifs||!Array.isArray(notifs)||notifs.length===0)&&<div className="text-center py-16"><Bell size={48} className="mx-auto text-gray-700 mb-3"/><p className="text-gray-400">Sin avisos</p></div>}
        </div>
      </div>
    </div>
  );
}

// ===================== SEARCH PAGE =====================
function SearchPage() {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { token } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (q.length < 2) { setResults([]); return; }
    setLoading(true);
    fetch(`${API}/api/users/search?q=${encodeURIComponent(q)}`, { headers: token ? { Authorization:`Bearer ${token}` } : {} })
      .then(r => r.json()).then(setResults).catch(()=>{}).finally(()=>setLoading(false));
  }, [q]);

  return (
    <div className="min-h-screen pb-20" style={{paddingTop:'56px',background:'#0b0b12'}}>
      <div className="max-w-2xl mx-auto px-4 py-4">
        <div className="relative mb-6"><Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Buscar usuarios, ciudades..." autoFocus className="w-full rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none" style={{background:'#1e1e2a',border:'1px solid #2a2a3a'}}/></div>
        {loading&&<div className="flex justify-center py-8"><Spinner/></div>}
        <div className="space-y-2">
          {results.map((u:RankingEntry)=>(
            <button key={u._id} onClick={()=>setLocation(`/user/${u._id}`)} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors">
              <Av u={u} s={44}/><div className="flex-1 text-left"><p className="text-white font-semibold">@{u.username}</p><p className="text-gray-400 text-xs">{u.flag} {u.country} · {fmt(u.impactPoints)} pts</p></div><div className="flex items-center gap-1 text-xs text-gray-500"><Users size={12}/>{u.followers?.length||0}</div>
            </button>
          ))}
          {q.length>=2&&!loading&&results.length===0&&<p className="text-center text-gray-500 py-8">Sin resultados para "{q}"</p>}
        </div>
      </div>
    </div>
  );
}

// ===================== HOME PAGE =====================
function HomePage() {
  const { data: challenge } = useApi('/api/challenges/active');
  const { data: ranking } = useApi('/api/ranking?limit=5');
  const { data: lives } = useApi('/api/lives');
  const [counter, setCounter] = useState(14782);
  useEffect(()=>{if(challenge?.globalCounter)setCounter(challenge.globalCounter);},[challenge]);
  useEffect(()=>{const t=setInterval(()=>setCounter(c=>c+Math.floor(Math.random()*3)),2500);return()=>clearInterval(t);},[]);
  return(
    <div className="pb-20">
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0"><img src="https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1600&h=900&fit=crop" alt="" className="w-full h-full object-cover opacity-20"/><div className="absolute inset-0" style={{background:'radial-gradient(ellipse at center,rgba(0,245,255,0.05) 0%,rgba(11,11,18,0.9) 70%)'}}/></div>
        <div className="relative z-10 max-w-4xl mx-auto px-4 text-center">
          <div className="flex justify-center mb-6"><DominoLogo size={48}/></div>
          <h1 className="text-5xl sm:text-7xl font-black mb-4" style={{fontFamily:'Syne,sans-serif'}}><span style={{background:'linear-gradient(135deg,#00F5FF,#FF007F)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>DOMINO</span></h1>
          <p className="text-xl text-gray-300 mb-2">The Real-World Chain Reaction</p>
          <p className="text-base text-gray-400 mb-8 max-w-xl mx-auto">Graba retos de 15s. Nomina 3 personas. Haz lives. El efecto dominó global.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center flex-wrap">
            <Link href="/feed" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-black" style={{background:'linear-gradient(135deg,#00F5FF,#7c3aed)'}}><Play size={18}/>Ver Feed</Link>
            <Link href="/live" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white border" style={{borderColor:'#FF007F'}}><Video size={18}/>En Vivo</Link>
            <Link href="/create" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white border border-gray-700"><Camera size={18}/>Crear</Link>
          </div>
          <div className="mt-12 flex items-center justify-center gap-2"><div className="w-2 h-2 rounded-full animate-pulse" style={{background:'#00F5FF'}}/><span className="text-lg font-bold" style={{color:'#00F5FF'}}>{counter.toLocaleString('es-ES')}</span><span className="text-gray-400 text-sm">cadenas activas</span></div>
        </div>
      </section>

      {Array.isArray(lives)&&lives.length>0&&(
        <section className="py-10 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-4"><div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full animate-pulse" style={{background:'#FF007F'}}/><h2 className="text-xl font-black text-white">En Directo</h2></div><Link href="/live" className="text-sm font-semibold" style={{color:'#00F5FF'}}>Ver todos →</Link></div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {lives.slice(0,4).map((l:LiveStream)=>(
                <Link key={l._id} href={`/live/${l._id}`} className="relative rounded-xl overflow-hidden" style={{aspectRatio:'9/16',background:'#13131f',border:'1px solid #1e1e2a'}}>
                  <div className="absolute inset-0 flex items-center justify-center"><Av u={l.userId} s={64}/></div>
                  <div className="absolute inset-0" style={{background:'linear-gradient(to top,rgba(0,0,0,0.8) 0%,transparent 60%)'}}/>
                  <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold text-white" style={{background:'#FF007F'}}><div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"/>LIVE</div>
                  <div className="absolute bottom-2 left-2 right-2"><p className="text-white text-xs font-bold truncate">@{l.userId?.username}</p><p className="text-gray-300 text-xs truncate">{l.title}</p></div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {challenge&&(
        <section className="py-8 px-4">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-xl font-black text-white mb-3">Reto del Día</h2>
            <div className="rounded-xl p-4 border" style={{background:'#13131f',borderColor:'#1e1e2a'}}>
              <h3 className="font-bold text-white">{challenge.title}</h3>
              <p className="text-sm text-gray-400 mt-1 line-clamp-2">{challenge.description}</p>
              <div className="flex items-center justify-between mt-3 mb-3"><span className="text-xs text-gray-400"><Users size={10} className="inline mr-1"/>{fmt(challenge.globalCounter)} part.</span><span className="text-xs text-gray-400"><Clock size={10} className="inline mr-1"/>{left(challenge.expiresAt)}</span></div>
              <Link href="/create" className="w-full py-2.5 rounded-lg text-sm font-bold text-black flex items-center justify-center gap-2" style={{background:'linear-gradient(135deg,#00F5FF,#7c3aed)'}}><Camera size={16}/>Aceptar reto</Link>
            </div>
          </div>
        </section>
      )}

      {Array.isArray(ranking)&&ranking.length>0&&(
        <section className="py-8 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-3"><h2 className="text-xl font-black text-white">Ranking Global</h2><Link href="/search" className="text-sm font-semibold" style={{color:'#00F5FF'}}>Ver todo</Link></div>
            <div className="rounded-2xl overflow-hidden border" style={{background:'#13131f',borderColor:'#1e1e2a'}}>
              {ranking.map((e:RankingEntry,i:number)=>(
                <Link key={e._id} href={`/user/${e._id}`} className="flex items-center gap-3 p-3 border-b last:border-0 hover:bg-white/5 transition-colors" style={{borderColor:'#1e1e2a'}}>
                  <span className="w-7 text-center text-sm font-bold">{i<3?['🥇','🥈','🥉'][i]:<span className="text-gray-500">#{i+1}</span>}</span>
                  <Av u={e} s={36}/><div className="flex-1 min-w-0"><div className="text-sm font-semibold text-white truncate">{e.username} {e.flag}</div><div className="text-xs text-gray-500">{e.country}</div></div>
                  <div className="text-right"><div className="text-sm font-bold" style={{color:'#00F5FF'}}>{fmt(e.impactPoints)}</div><div className="text-xs text-gray-500">{e.currentStreak}d</div></div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <footer className="border-t mt-8 py-6 px-4" style={{borderColor:'#1e1e2a',background:'#13131f'}}>
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-gray-600">© 2026 DOMINO. The Real-World Chain Reaction.</p>
          <div className="flex items-center gap-1.5 text-xs text-gray-500"><Globe size={12} style={{color:'#00F5FF'}}/>{fmt(challenge?.globalCounter||14782)} cadenas activas</div>
        </div>
      </footer>
    </div>
  );
}

// ===================== APP =====================
export default function App() { return <AuthProvider><AppInner/></AuthProvider>; }

function AppInner() {
  const { loading } = useAuth();
  if(loading)return<div className="min-h-screen flex items-center justify-center" style={{background:'#0b0b12'}}><div className="flex flex-col items-center gap-4"><DominoLogo size={40}/><Spinner/></div></div>;
  return(
    <div className="min-h-screen" style={{background:'#0b0b12'}}>
      <TopNav/>
      <Switch>
        <Route path="/" component={HomePage}/>
        <Route path="/feed" component={FeedPage}/>
        <Route path="/auth" component={AuthPage}/>
        <Route path="/create" component={CreatePage}/>
        <Route path="/camera" component={CameraPage}/>
        <Route path="/live" component={LiveListPage}/>
        <Route path="/live/create" component={CreateLivePage}/>
        <Route path="/live/:id">{(p:any)=><LiveViewerPage id={p.id}/>}</Route>
        <Route path="/map" component={WorldMapPage}/>
        <Route path="/profile" component={()=><ProfilePage/>}/>
        <Route path="/user/:id">{(p:any)=><ProfilePage userId={p.id}/>}</Route>
        <Route path="/messages" component={MessagesPage}/>
        <Route path="/messages/:id">{(p:any)=><ChatPage userId={p.id}/>}</Route>
        <Route path="/search" component={SearchPage}/>
        <Route path="/notifications" component={NotificationsPage}/>
        <Route>
          <div className="min-h-screen flex items-center justify-center px-4 pb-20">
            <div className="text-center"><div className="text-6xl mb-4">🎲</div><h1 className="text-3xl font-black text-white mb-2">Página no encontrada</h1><Link href="/" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-black" style={{background:'linear-gradient(135deg,#00F5FF,#7c3aed)'}}><Home size={16}/>Inicio</Link></div>
          </div>
        </Route>
      </Switch>
      <BottomNav/>
    </div>
  );
}
