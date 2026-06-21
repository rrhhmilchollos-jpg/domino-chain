import React, { useState, useEffect, useRef } from 'react';
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
      else await register(form);
      setLocation('/feed');
    } catch(e:any) { setError(e.message); } finally { setLoading(false); }
  };
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4" style={{background:'#0b0b12'}}>
      <div className="w-full max-w-md space-y-8">
        <div className="text-center"><DominoLogo size={60}/><h1 className="text-4xl font-black mt-4" style={{fontFamily:'Syne,sans-serif',color:'#00F5FF',textShadow:'0 0 20px #00F5FF'}}>DOMINO</h1><p className="text-gray-400 mt-2">La red social de cadenas infinitas</p></div>
        <div className="p-8 rounded-3xl space-y-6" style={{background:'rgba(30,30,42,0.5)',border:'1px solid #2a2a3a',backdropFilter:'blur(20px)'}}>
          <div className="flex p-1 rounded-xl bg-black/40"><button onClick={()=>setMode('login')} className={cn('flex-1 py-2 text-sm font-bold rounded-lg transition-all',mode==='login'?'bg-[#00F5FF] text-black':'text-gray-400')}>Entrar</button><button onClick={()=>setMode('register')} className={cn('flex-1 py-2 text-sm font-bold rounded-lg transition-all',mode==='register'?'bg-[#00F5FF] text-black':'text-gray-400')}>Crear Cuenta</button></div>
          {error&&<div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 text-xs font-bold text-center">{error}</div>}
          <div className="space-y-4">
            {mode==='register' && (
              <>
                <div><label className="text-xs font-bold text-gray-500 uppercase ml-1">Usuario</label><input type="text" placeholder="Cómo te llamarán" className="w-full bg-black/40 border border-[#2a2a3a] rounded-xl px-4 py-3 text-white focus:border-[#00F5FF] outline-none" value={form.username} onChange={e=>setForm({...form,username:e.target.value})}/></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="text-xs font-bold text-gray-500 uppercase ml-1">País</label><select className="w-full bg-black/40 border border-[#2a2a3a] rounded-xl px-4 py-3 text-white focus:border-[#00F5FF] outline-none appearance-none" value={form.country} onChange={e=>setForm({...form,country:e.target.value})}><option value="">País</option>{Object.keys(flags).map(c=><option key={c} value={c}>{flags[c]} {c}</option>)}</select></div>
                  <div><label className="text-xs font-bold text-gray-500 uppercase ml-1">Ciudad</label><input type="text" placeholder="Ciudad" className="w-full bg-black/40 border border-[#2a2a3a] rounded-xl px-4 py-3 text-white focus:border-[#00F5FF] outline-none" value={form.city} onChange={e=>setForm({...form,city:e.target.value})}/></div>
                </div>
              </>
            )}
            <div><label className="text-xs font-bold text-gray-500 uppercase ml-1">Email</label><input type="email" placeholder="tu@email.com" className="w-full bg-black/40 border border-[#2a2a3a] rounded-xl px-4 py-3 text-white focus:border-[#00F5FF] outline-none" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></div>
            <div><label className="text-xs font-bold text-gray-500 uppercase ml-1">Contraseña</label><input type="password" placeholder="••••••••" className="w-full bg-black/40 border border-[#2a2a3a] rounded-xl px-4 py-3 text-white focus:border-[#00F5FF] outline-none" value={form.password} onChange={e=>setForm({...form,password:e.target.value})}/></div>
          </div>
          <button onClick={handle} disabled={loading} className="w-full py-4 rounded-xl font-black text-black flex items-center justify-center gap-2 disabled:opacity-50" style={{background:'linear-gradient(135deg,#00F5FF,#7c3aed)'}}>{loading?<Spinner/>:mode==='login'?'ENTRAR':'COMENZAR'}</button>
        </div>
      </div>
    </div>
  );
}

// ===================== BOTTOM NAV =====================
function BottomNav() {
  const [loc, setLocation] = useLocation();
  const { user } = useAuth();
  const { data: ntf } = useApi('/api/notifications', [user]);
  const unread = (ntf||[]).filter((n:any)=>!n.read).length;

  // No mostrar en algunas páginas
  if (['/create', '/camera', '/auth'].some(p => loc.startsWith(p))) return null;

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
        {(loc==='/'||loc==='/feed'||loc==='/following') && (
          <div className="flex items-center gap-4">
            <button onClick={()=>setLocation('/feed')} className={cn('text-sm font-semibold pb-1',loc==='/feed'||loc==='/'?'text-white border-b-2 border-white':'text-gray-500')}>Para ti</button>
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
  const { token } = useAuth();
  const [liked, setLiked] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const doLike = async () => { if(!token)return; setLiked(!liked); await fetch(`${API}/api/videos/${video._id}/like`,{method:'POST',headers:{Authorization:`Bearer ${token}`}}); };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-xl">
      <button onClick={onClose} className="absolute top-4 right-4 z-10 p-2 bg-white/10 rounded-full text-white"><X size={24}/></button>
      <div className="relative w-full max-w-lg aspect-[9/16] bg-black overflow-hidden shadow-2xl">
        <video ref={videoRef} src={video.videoUrl} className="w-full h-full object-contain" autoPlay loop playsInline controls/>
        <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
          <div className="flex items-center gap-3"><Av u={video.userId} s={44}/><div><p className="text-white font-bold">@{video.userId?.username}</p><p className="text-gray-400 text-xs">{video.userId?.flag} {video.userId?.city}</p></div></div>
          <button onClick={doLike} className={cn('p-3 rounded-full transition-all',liked?'bg-red-500 text-white':'bg-white/10 text-white')}><Heart size={24} className={liked?'fill-white':''}/></button>
        </div>
      </div>
    </div>
  );
}

// ===================== COMMENTS PANEL =====================
function CommentsPanel({ videoId, onClose }: { videoId: string; onClose: () => void }) {
  const { user, token } = useAuth();
  const { data: comments, setData } = useApi(`/api/videos/${videoId}/comments`);
  const [text, setText] = useState('');
  const send = async () => {
    if(!text.trim()||!token)return;
    const r=await fetch(`${API}/api/videos/${videoId}/comment`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({text})});
    if(r.ok){const c=await r.json();setData([c,...(comments||[])]);setText('');}
  };
  return (
    <div className="fixed inset-x-0 bottom-0 z-50 bg-[#0b0b12] rounded-t-3xl border-t border-[#1e1e2a] h-[70vh] flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-[#1e1e2a]"><h3 className="text-white font-bold">Comentarios</h3><button onClick={onClose} className="p-1 rounded-full hover:bg-white/5"><X size={20} className="text-gray-400"/></button></div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {(comments||[]).map((c:Comment)=>(
          <div key={c._id} className="flex gap-3"><Av u={c.userId} s={32}/><div><p className="text-white text-xs font-bold">@{c.userId.username} <span className="text-gray-500 font-normal ml-1">{ago(c.createdAt)}</span></p><p className="text-gray-300 text-sm mt-0.5">{c.text}</p></div></div>
        ))}
      </div>
      <div className="p-4 border-t border-[#1e1e2a] flex gap-2"><input type="text" placeholder="Añadir comentario..." className="flex-1 bg-white/5 border border-[#2a2a3a] rounded-xl px-4 py-2 text-white text-sm outline-none focus:border-[#00F5FF]" value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send()}/><button onClick={send} className="p-2 bg-[#00F5FF] rounded-xl text-black"><Send size={18}/></button></div>
    </div>
  );
}

// ===================== FEED PAGE =====================
function FeedPage({ following=false }: { following?: boolean }) {
  const { data: videos, loading } = useApi(following ? '/api/videos/feed/following?limit=20' : '/api/videos/feed?limit=20');
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

// ===================== SEARCH PAGE =====================
function SearchPage() {
  const [q, setQ] = useState('');
  const { data: results, loading } = useApi(`/api/search?q=${q}`, [q]);
  return (
    <div className="min-h-screen pt-16 px-4 pb-20" style={{background:'#0b0b12'}}>
      <div className="max-w-md mx-auto space-y-6">
        <div className="relative"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={20}/><input type="text" placeholder="Buscar usuarios o retos..." className="w-full bg-white/5 border border-[#2a2a3a] rounded-2xl pl-12 pr-4 py-4 text-white outline-none focus:border-[#00F5FF]" value={q} onChange={e=>setQ(e.target.value)}/></div>
        {loading&&<div className="flex justify-center py-10"><Spinner/></div>}
        <div className="space-y-4">
          {(results?.users||[]).map((u:AppUser)=>(
            <Link key={u._id} href={`/user/${u._id}`} className="flex items-center gap-3 p-3 rounded-2xl hover:bg-white/5 transition-all"><Av u={u} s={48}/><div><p className="text-white font-bold">@{u.username}</p><p className="text-gray-400 text-xs">{u.flag} {u.city}</p></div></Link>
          ))}
        </div>
      </div>
    </div>
  );
}

// ===================== NOTIFICATIONS =====================
function NotificationsPage() {
  const { token } = useAuth();
  const { data: ntf, loading, setData } = useApi('/api/notifications');
  useEffect(() => { if(token) fetch(`${API}/api/notifications/read`,{method:'POST',headers:{Authorization:`Bearer ${token}`}}); }, [token]);
  if(loading)return<div className="min-h-screen flex items-center justify-center pt-14"><Spinner/></div>;
  return (
    <div className="min-h-screen pt-16 px-4 pb-20" style={{background:'#0b0b12'}}>
      <div className="max-w-md mx-auto space-y-2">
        <h2 className="text-2xl font-black text-white mb-6">Avisos</h2>
        {(ntf||[]).map((n:Notification)=>(
          <div key={n._id} className="flex gap-3 p-4 rounded-2xl bg-white/5 border border-white/5"><Av u={n.fromUserId} s={40}/><div><p className="text-white text-sm"><span className="font-bold">@{n.fromUserId.username}</span> {n.message}</p><p className="text-gray-500 text-[10px] mt-1">{ago(n.createdAt)}</p></div></div>
        ))}
        {(!ntf||ntf.length===0)&&<div className="text-center py-20 text-gray-500"><Bell size={40} className="mx-auto mb-4 opacity-20"/><p>No hay avisos nuevos</p></div>}
      </div>
    </div>
  );
}

// ===================== PROFILE PAGE =====================
function ProfilePage({ userId }: { userId?: string }) {
  const { user: me, token, logout } = useAuth();
  const id = userId || me?._id;
  const { data: u, loading } = useApi(`/api/users/${id}`, [id]);
  const { data: videos } = useApi(`/api/users/${id}/videos`, [id]);
  const [tab, setTab] = useState<'videos'|'liked'|'saved'>('videos');
  const [, setLocation] = useLocation();

  if(loading)return<div className="min-h-screen flex items-center justify-center pt-14"><Spinner/></div>;
  if(!u)return null;

  const isMe = me?._id === u._id;

  return (
    <div className="min-h-screen pt-16 pb-20" style={{background:'#0b0b12'}}>
      <div className="max-w-md mx-auto px-4">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="relative"><Av u={u} s={100}/>{isMe&&<button className="absolute bottom-0 right-0 p-2 bg-[#00F5FF] rounded-full text-black border-4 border-[#0b0b12]"><Settings size={16}/></button>}</div>
          <div><h2 className="text-2xl font-black text-white">@{u.username} {u.flag}</h2><p className="text-gray-400 text-sm">{u.city}, {u.country}</p></div>
          <div className="flex gap-6"><div className="text-center"><p className="text-white font-black">{u.followers?.length||0}</p><p className="text-gray-500 text-xs uppercase font-bold">Seguidores</p></div><div className="text-center"><p className="text-white font-black">{u.following?.length||0}</p><p className="text-gray-500 text-xs uppercase font-bold">Siguiendo</p></div><div className="text-center"><p className="text-white font-black">{u.impactPoints||0}</p><p className="text-gray-500 text-xs uppercase font-bold">Impacto</p></div></div>
          <p className="text-gray-300 text-sm max-w-xs">{u.bio || 'Sin biografía todavía.'}</p>
          {isMe ? (
            <button onClick={logout} className="px-8 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white font-bold flex items-center gap-2"><LogOut size={16}/> Salir</button>
          ) : (
            <button className="px-8 py-2.5 rounded-xl bg-[#00F5FF] text-black font-bold">Seguir</button>
          )}
        </div>
        <div className="mt-10 flex border-b border-[#1e1e2a]"><button onClick={()=>setTab('videos')} className={cn('flex-1 py-3 text-sm font-bold border-b-2 transition-all',tab==='videos'?'text-[#00F5FF] border-[#00F5FF]':'text-gray-500 border-transparent')}>Videos</button><button onClick={()=>setTab('liked')} className={cn('flex-1 py-3 text-sm font-bold border-b-2 transition-all',tab==='liked'?'text-[#00F5FF] border-[#00F5FF]':'text-gray-500 border-transparent')}>Me gusta</button></div>
        <div className="grid grid-cols-3 gap-1 mt-1">
          {(videos||[]).map((v:DominoVideo)=>(
            <div key={v._id} className="aspect-[9/16] bg-white/5 relative group cursor-pointer overflow-hidden"><img src={v.thumbnailUrl} className="w-full h-full object-cover transition-transform group-hover:scale-110"/><div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white gap-1 font-bold text-xs"><Heart size={14} className="fill-white"/> {v.likes?.length||0}</div></div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ===================== CAMERA PAGE =====================
function CameraPage() {
  const [, setLocation] = useLocation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [recording, setRecording] = useState(false);
  const [stream, setStream] = useState<MediaStream|null>(null);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder|null>(null);
  const [chunks, setChunks] = useState<Blob[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: { facingMode:'user', width:720, height:1280 }, audio:true })
      .then(s => { setStream(s); if(videoRef.current) videoRef.current.srcObject=s; })
      .catch(console.error);
    return () => stream?.getTracks().forEach(t=>t.stop());
  }, []);

  const start = () => {
    if(!stream)return;
    const mr = new MediaRecorder(stream, { mimeType:'video/webm;codecs=vp8,opus' });
    const c: Blob[] = [];
    mr.ondataavailable = e => c.push(e.data);
    mr.onstop = async () => {
      const blob = new Blob(c, { type:'video/webm' });
      setUploading(true);
      try {
        const { videoUrl, thumbnailUrl } = await uploadToCloudinary(blob, setProgress);
        const { token } = JSON.parse(localStorage.getItem('domino_token')||'{}');
        await fetch(`${API}/api/videos`, { method:'POST', headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`}, body:JSON.stringify({videoUrl,thumbnailUrl}) });
        setLocation('/feed');
      } catch(e) { console.error(e); } finally { setUploading(false); }
    };
    mr.start(); setMediaRecorder(mr); setRecording(true);
  };
  const stop = () => { if(mediaRecorder) mediaRecorder.stop(); setRecording(false); };

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      <video ref={videoRef} className="flex-1 object-cover" autoPlay muted playsInline/>
      <div className="absolute top-6 left-6 right-6 flex justify-between items-center"><button onClick={()=>setLocation('/')} className="p-2 bg-black/40 rounded-full text-white"><X size={24}/></button><div className="px-3 py-1 rounded-full bg-red-500 text-white text-xs font-bold animate-pulse">{recording?'GRABANDO':'LISTO'}</div></div>
      <div className="absolute bottom-10 left-0 right-0 flex flex-col items-center gap-6">
        {uploading ? (
          <div className="w-64 space-y-2"><div className="h-1 bg-white/20 rounded-full overflow-hidden"><div className="h-full bg-[#00F5FF] transition-all" style={{width:`${progress}%`}}/></div><p className="text-white text-xs font-bold text-center">Subiendo... {progress}%</p></div>
        ) : (
          <button onClick={recording?stop:start} className={cn('w-20 h-20 rounded-full border-4 flex items-center justify-center transition-all',recording?'border-red-500 bg-red-500/20':'border-white bg-white/20')}><div className={cn('rounded-full transition-all',recording?'w-8 h-8 bg-red-500':'w-14 h-14 bg-white')}/></button>
        )}
      </div>
    </div>
  );
}

// ===================== WORLD MAP =====================
function WorldMapPage() {
  return (
    <div className="min-h-screen pt-16 flex items-center justify-center bg-[#0b0b12] text-gray-500 px-10 text-center">
      <div><Globe size={60} className="mx-auto mb-4 opacity-20"/><h2 className="text-xl font-bold text-white mb-2">Mapa de Cadenas</h2><p>Próximamente: Mira cómo se expanden las piezas de dominó por todo el mundo en tiempo real.</p></div>
    </div>
  );
}

// ===================== LIVE LIST =====================
function LiveListPage() {
  const { data: lives, loading } = useApi('/api/lives');
  const [, setLocation] = useLocation();
  return (
    <div className="min-h-screen pt-16 px-4 pb-20" style={{background:'#0b0b12'}}>
      <div className="max-w-md mx-auto space-y-6">
        <div className="flex items-center justify-between"><h2 className="text-2xl font-black text-white">En Vivo</h2><button onClick={()=>setLocation('/live/create')} className="px-4 py-2 rounded-xl bg-[#FF007F] text-white text-sm font-bold flex items-center gap-2"><Plus size={16}/> Emitir</button></div>
        <div className="grid grid-cols-2 gap-3">
          {(lives||[]).map((l:LiveStream)=>(
            <button key={l._id} onClick={()=>setLocation(`/live/${l._id}`)} className="relative aspect-[3/4] rounded-2xl overflow-hidden group"><img src={l.userId.avatarUrl} className="w-full h-full object-cover"/><div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"/><div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-red-500 text-[10px] font-bold text-white flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"/> VIVO</div><div className="absolute bottom-3 left-3 text-left"><p className="text-white text-xs font-bold truncate">@{l.userId.username}</p><p className="text-gray-300 text-[10px] flex items-center gap-1"><Eye size={10}/> {l.viewerCount}</p></div></button>
          ))}
        </div>
        {(!lives||lives.length===0)&&<div className="text-center py-20 text-gray-500"><Video size={40} className="mx-auto mb-4 opacity-20"/><p>No hay emisiones ahora</p></div>}
      </div>
    </div>
  );
}

// ===================== CREATE LIVE =====================
function CreateLivePage() {
  const [, setLocation] = useLocation();
  const [title, setTitle] = useState('');
  return (
    <div className="min-h-screen pt-16 px-6 bg-[#0b0b12]">
      <div className="max-w-md mx-auto space-y-8">
        <button onClick={()=>setLocation('/live')} className="p-2 bg-white/5 rounded-full text-white"><ChevronLeft size={24}/></button>
        <h2 className="text-3xl font-black text-white">Nueva Emisión</h2>
        <div className="space-y-4"><div><label className="text-xs font-bold text-gray-500 uppercase ml-1">Título del Live</label><input type="text" placeholder="¿De qué vas a hablar?" className="w-full bg-white/5 border border-[#2a2a3a] rounded-2xl px-4 py-4 text-white outline-none focus:border-[#00F5FF]" value={title} onChange={e=>setTitle(e.target.value)}/></div><div className="p-6 rounded-2xl bg-[#00F5FF]/5 border border-[#00F5FF]/20 flex items-center gap-4"><div className="w-12 h-12 rounded-full bg-[#00F5FF] flex items-center justify-center text-black"><Zap size={24}/></div><div><p className="text-[#00F5FF] font-bold">Modo Batalla</p><p className="text-gray-400 text-xs">Recibe regalos y compite en tiempo real.</p></div></div></div>
        <button className="w-full py-4 rounded-2xl bg-[#00F5FF] text-black font-black text-lg shadow-[0_0_30px_rgba(0,245,255,0.3)]">EMPEZAR AHORA</button>
      </div>
    </div>
  );
}

// ===================== LIVE VIEWER =====================
function LiveViewerPage({ id }: { id: string }) {
  const { data: live } = useApi(`/api/lives/${id}`);
  const [, setLocation] = useLocation();
  if(!live)return null;
  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      <div className="absolute top-6 left-4 right-4 z-10 flex items-center justify-between"><div className="flex items-center gap-2 bg-black/40 p-1 pr-3 rounded-full border border-white/10"><Av u={live.userId} s={32}/><div><p className="text-white text-[10px] font-bold">@{live.userId.username}</p><p className="text-[#00F5FF] text-[8px] flex items-center gap-0.5 font-bold"><Eye size={8}/> {live.viewerCount}</p></div><button className="ml-2 px-3 py-1 bg-[#00F5FF] rounded-full text-black text-[10px] font-bold">Seguir</button></div><button onClick={()=>setLocation('/live')} className="p-2 bg-black/40 rounded-full text-white"><X size={24}/></button></div>
      <div className="flex-1 flex items-center justify-center bg-[#1a1a2e]"><div className="text-center space-y-4"><Av u={live.userId} s={120}/><p className="text-white font-bold text-xl">Conectando con el directo...</p></div></div>
      <div className="absolute bottom-0 inset-x-0 p-4 space-y-4 bg-gradient-to-t from-black to-transparent">
        <div className="h-40 overflow-y-auto space-y-2 text-sm"><div className="flex items-center gap-2"><span className="text-yellow-400 font-bold">Sistema:</span><span className="text-gray-300">¡Bienvenido al directo! Sé respetuoso.</span></div></div>
        <div className="flex gap-2"><input type="text" placeholder="Di algo..." className="flex-1 bg-black/40 border border-white/10 rounded-full px-4 py-2 text-white text-sm outline-none focus:border-[#00F5FF]"/><button className="w-10 h-10 rounded-full bg-[#FF007F] flex items-center justify-center text-white"><Gift size={20}/></button></div>
      </div>
    </div>
  );
}

// ===================== MESSAGES =====================
function MessagesPage() {
  const { data: convs, loading } = useApi('/api/messages/conversations');
  return (
    <div className="min-h-screen pt-16 px-4 pb-20" style={{background:'#0b0b12'}}>
      <div className="max-w-md mx-auto space-y-6">
        <h2 className="text-2xl font-black text-white">Mensajes</h2>
        <div className="space-y-1">
          {(convs||[]).map((c:Conversation)=>(
            <Link key={c.user._id} href={`/messages/${c.user._id}`} className="flex items-center gap-4 p-4 rounded-2xl hover:bg-white/5 transition-all"><Av u={c.user} s={56}/><div className="flex-1 min-w-0"><div className="flex justify-between items-center"><p className="text-white font-bold truncate">@{c.user.username}</p><p className="text-gray-500 text-[10px]">{ago(c.lastMessage.createdAt)}</p></div><p className="text-gray-400 text-sm truncate">{c.lastMessage.text}</p></div>{c.unread>0&&<div className="w-5 h-5 rounded-full bg-[#00F5FF] text-black text-[10px] font-bold flex items-center justify-center">{c.unread}</div>}</Link>
          ))}
          {(!convs||convs.length===0)&&<div className="text-center py-20 text-gray-500"><MessageCircle size={40} className="mx-auto mb-4 opacity-20"/><p>No hay conversaciones</p></div>}
        </div>
      </div>
    </div>
  );
}

// ===================== CHAT PAGE =====================
function ChatPage({ userId }: { userId: string }) {
  const { user: me, token } = useAuth();
  const { data: u } = useApi(`/api/users/${userId}`, [userId]);
  const { data: msgs, setData } = useApi(`/api/messages/${userId}`, [userId]);
  const [text, setText] = useState('');
  const [, setLocation] = useLocation();
  const send = async () => {
    if(!text.trim()||!token)return;
    const r=await fetch(`${API}/api/messages`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({toUserId:userId,text})});
    if(r.ok){const m=await r.json();setData([...(msgs||[]),m]);setText('');}
  };
  if(!u)return null;
  return (
    <div className="fixed inset-0 z-50 bg-[#0b0b12] flex flex-col">
      <div className="flex items-center gap-3 p-4 border-b border-[#1e1e2a]"><button onClick={()=>setLocation('/messages')} className="p-1 rounded-full hover:bg-white/5 text-white"><ChevronLeft size={24}/></button><Av u={u} s={40}/><div><p className="text-white font-bold">@{u.username}</p><p className="text-[#00F5FF] text-[10px] font-bold uppercase">En línea</p></div></div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {(msgs||[]).map((m:Message)=>(
          <div key={m._id} className={cn('flex',m.fromUserId._id===me?._id?'justify-end':'justify-start')}><div className={cn('max-w-[80%] px-4 py-2 rounded-2xl text-sm',m.fromUserId._id===me?._id?'bg-[#00F5FF] text-black rounded-tr-none':'bg-white/5 text-white border border-white/10 rounded-tl-none')}>{m.text}</div></div>
        ))}
      </div>
      <div className="p-4 border-t border-[#1e1e2a] flex gap-2"><input type="text" placeholder="Escribe un mensaje..." className="flex-1 bg-white/5 border border-[#2a2a3a] rounded-full px-4 py-3 text-white text-sm outline-none focus:border-[#00F5FF]" value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send()}/><button onClick={send} className="w-12 h-12 rounded-full bg-[#00F5FF] flex items-center justify-center text-black"><Send size={20}/></button></div>
    </div>
  );
}

// ===================== HOME PAGE =====================
function HomePage() {
  const [, setLocation] = useLocation();
  const { data: lives } = useApi('/api/lives');
  const { data: challenge } = useApi('/api/challenges/active');
  const { data: ranking } = useApi('/api/ranking');

  return (
    <div className="min-h-screen pt-14 pb-20" style={{background:'#0b0b12'}}>
      {/* Hero Section */}
      <div className="relative h-[400px] overflow-hidden flex items-center justify-center text-center px-6">
        <div className="absolute inset-0 bg-[#00F5FF]/10 mix-blend-overlay"/>
        <div className="absolute inset-0" style={{background:'radial-gradient(circle at 50% 50%,rgba(0,245,255,0.15) 0%,transparent 70%)'}}/>
        <div className="relative z-10 space-y-6">
          <h1 className="text-5xl font-black text-white leading-tight" style={{fontFamily:'Syne,sans-serif'}}>CREA LA PRÓXIMA<br/><span style={{color:'#00F5FF',textShadow:'0 0 20px rgba(0,245,255,0.5)'}}>CADENA GLOBAL</span></h1>
          <p className="text-gray-400 max-w-xs mx-auto text-sm font-medium">Únete a retos, nomina a tus amigos y domina el mundo con tu talento.</p>
          <div className="flex flex-col gap-3">
            <button onClick={()=>setLocation('/feed')} className="px-8 py-4 rounded-2xl bg-[#00F5FF] text-black font-black text-lg shadow-[0_0_30px_rgba(0,245,255,0.3)]">VER EL FEED</button>
            <button onClick={()=>setLocation('/camera')} className="px-8 py-4 rounded-2xl bg-white/5 border border-white/10 text-white font-black text-lg hover:bg-white/10 transition-all">GRABAR AHORA</button>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 space-y-10 mt-6">
        {/* Reto del Día */}
        {challenge && (
          <div className="p-6 rounded-3xl bg-gradient-to-br from-[#1e1e2a] to-[#0b0b12] border border-[#2a2a3a] relative overflow-hidden group">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-[#FF007F]/10 rounded-full blur-2xl group-hover:bg-[#FF007F]/20 transition-all"/>
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-4"><Zap size={18} className="text-yellow-400"/><span className="text-xs font-black text-yellow-400 uppercase tracking-widest">Reto Activo</span></div>
              <h3 className="text-2xl font-black text-white mb-2">{challenge.title}</h3>
              <p className="text-gray-400 text-sm mb-6 leading-relaxed">{challenge.description}</p>
              <div className="flex items-center justify-between">
                <div className="flex -space-x-2"><div className="w-8 h-8 rounded-full bg-gray-800 border-2 border-[#1e1e2a]"/><div className="w-8 h-8 rounded-full bg-gray-700 border-2 border-[#1e1e2a]"/><div className="w-8 h-8 rounded-full bg-gray-600 border-2 border-[#1e1e2a]"/><div className="flex items-center justify-center w-8 h-8 rounded-full bg-[#00F5FF] border-2 border-[#1e1e2a] text-[10px] font-black text-black">+{challenge.globalCounter}</div></div>
                <button onClick={()=>setLocation('/camera')} className="px-6 py-2 rounded-xl bg-white text-black font-bold text-sm">Participar</button>
              </div>
            </div>
          </div>
        )}

        {/* Secciones rápidas */}
        <div className="grid grid-cols-2 gap-4">
          <button onClick={()=>setLocation('/live')} className="p-6 rounded-3xl bg-[#FF007F]/5 border border-[#FF007F]/20 text-left space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-[#FF007F] flex items-center justify-center text-white"><Video size={20}/></div>
            <div><p className="text-white font-bold">En Vivo</p><p className="text-gray-500 text-[10px]">Mira directos ahora</p></div>
          </button>
          <button onClick={()=>setLocation('/map')} className="p-6 rounded-3xl bg-[#7c3aed]/5 border border-[#7c3aed]/20 text-left space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-[#7c3aed] flex items-center justify-center text-white"><Map size={20}/></div>
            <div><p className="text-white font-bold">Mapa</p><p className="text-gray-500 text-[10px]">Explora el mundo</p></div>
          </button>
        </div>

        {/* Ranking */}
        <div className="space-y-6 pb-10">
          <div className="flex items-center justify-between"><h2 className="text-xl font-black text-white">Top Creadores</h2><button className="text-[#00F5FF] text-xs font-bold uppercase tracking-widest">Ver todos</button></div>
          <div className="space-y-3">
            {(ranking||[]).slice(0,5).map((r:RankingEntry, idx:number)=>(
              <div key={r._id} className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5">
                <span className="text-lg font-black text-gray-600 w-4">{idx+1}</span>
                <Av u={r} s={44}/>
                <div className="flex-1">
                  <p className="text-white font-bold text-sm">@{r.username}</p>
                  <p className="text-gray-500 text-[10px]">{r.flag} {r.country}</p>
                </div>
                <div className="text-right">
                  <p className="text-[#00F5FF] font-black text-sm">{r.impactPoints}</p>
                  <p className="text-[8px] text-gray-500 uppercase font-bold">Impacto</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const CreatePage = CameraPage;
const MessagesPage_ = MessagesPage;
const NotificationsPage_ = NotificationsPage;
const ProfilePage_ = ProfilePage;

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
        <Route path="/feed">{(p:any)=><FeedPage/>}</Route>
        <Route path="/following">{(p:any)=><FeedPage following={true}/>}</Route>
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
