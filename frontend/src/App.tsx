import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, Route, Switch, useLocation } from 'wouter';
import {
  Home, BarChart2, Camera, Bell, Zap, X,
  Search, Heart, Share, RefreshCw, Users, Clock,
  CheckCircle, Loader2, MessageCircle, Send, Video,
  Eye, Gift, Download, Globe, Settings,
  ChevronLeft, ChevronRight, Hash, AtSign, MapPin,
  Lock, Bookmark, Plus, Image as ImageIcon,
  Volume2, VolumeX, RotateCcw, Repeat2, Music,
  Flag, Ban, LogOut, Flame, AlertCircle, Play
} from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...args: Parameters<typeof clsx>) { return twMerge(clsx(...args)); }

const API = import.meta.env.VITE_API_URL || 'https://domino-chain-production.up.railway.app';
const CLOUDINARY_CLOUD = import.meta.env.VITE_CLOUDINARY_CLOUD || 'dawgpvzpr';
const CLOUDINARY_PRESET = import.meta.env.VITE_CLOUDINARY_PRESET || 'domino_unsigned';

interface AppUser { _id: string; username: string; email: string; avatarUrl: string; country: string; city: string; flag: string; bio: string; impactPoints: number; currentStreak: number; coins: number; followers: string[]; following: string[]; savedVideos: DominoVideo[]; likedVideos: DominoVideo[]; }
interface Challenge { _id: string; title: string; description: string; category: string; expiresAt: string; globalCounter: number; }
interface DominoVideo { _id: string; userId: AppUser; videoUrl: string; thumbnailUrl: string; chainDepth: number; likes: string[]; createdAt: string; geoCoordinates: { lat: number; lng: number }; challengeId: string; nominatedUsers: string[]; rootVideoId: string; description?: string; }
interface Notification { _id: string; type: string; fromUserId: { username: string; avatarUrl: string; flag: string }; message: string; read: boolean; createdAt: string; }
interface RankingEntry { _id: string; username: string; avatarUrl: string; country: string; flag: string; impactPoints: number; currentStreak: number; followers: string[]; }
interface Comment { _id: string; userId: { _id: string; username: string; avatarUrl: string; flag: string }; text: string; createdAt: string; likes?: number; }
interface LiveStream { _id: string; userId: AppUser; title: string; status: string; viewerCount: number; category: string; isBattle: boolean; battleScore: { host: number; opponent: number }; }
interface Message { _id: string; fromUserId: { _id: string; username: string; avatarUrl: string; flag: string }; toUserId: { _id: string; username: string; avatarUrl: string; flag: string }; text: string; read: boolean; createdAt: string; }
interface Conversation { user: { _id: string; username: string; avatarUrl: string; flag: string }; lastMessage: Message; unread: number; }

const GIFT_CATALOG: Record<string, { name: string; emoji: string; coins: number }> = {
  domino:{ name:'Dominó', emoji:'🎲', coins:5 }, chain:{ name:'Cadena', emoji:'⛓️', coins:20 },
  star:{ name:'Estrella', emoji:'⭐', coins:50 }, rocket:{ name:'Cohete', emoji:'🚀', coins:100 },
  crown:{ name:'Corona', emoji:'👑', coins:500 }, diamond:{ name:'Diamante', emoji:'💎', coins:1000 }
};

const AuthContext = React.createContext<{ user: AppUser|null; token: string|null; login:(e:string,p:string)=>Promise<void>; register:(d:any)=>Promise<void>; logout:()=>void; loading:boolean; refreshUser:()=>Promise<void>; }>({ user:null, token:null, login:async()=>{}, register:async()=>{}, logout:()=>{}, loading:true, refreshUser:async()=>{} });

function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser|null>(null);
  const [token, setToken] = useState<string|null>(() => localStorage.getItem('domino_token'));
  const [loading, setLoading] = useState(true);
  const fetchUser = async (t: string) => {
    const r = await fetch(`${API}/api/users/me`, { headers: { Authorization:`Bearer ${t}` } });
    if (r.ok) setUser(await r.json());
    else { setToken(null); localStorage.removeItem('domino_token'); }
  };
  useEffect(() => { if (token) fetchUser(token).finally(() => setLoading(false)); else setLoading(false); }, [token]);
  const login = async (email:string, password:string) => { const r = await fetch(`${API}/api/auth/login`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({email,password}) }); const d = await r.json(); if (!r.ok) throw new Error(d.error||'Error'); localStorage.setItem('domino_token', d.token); setToken(d.token); setUser(d.user); };
  const register = async (fd:any) => { const r = await fetch(`${API}/api/auth/register`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(fd) }); const d = await r.json(); if (!r.ok) throw new Error(d.error||'Error'); localStorage.setItem('domino_token', d.token); setToken(d.token); setUser(d.user); };
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
    if (!endpoint) { setLoading(false); return; }
    setLoading(true);
    fetch(`${API}${endpoint}`, { headers: token ? { Authorization:`Bearer ${token}` } : {} })
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(setData).catch(e => setError(e.message)).finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return { data, loading, error, setData };
}

const fmt = (n:number) => n>=1e6?`${(n/1e6).toFixed(1)}M`:n>=1000?`${(n/1000).toFixed(1)}K`:String(n||0);
const ago = (iso:string) => { if(!iso)return''; const d=Date.now()-new Date(iso).getTime(); const h=Math.floor(d/3.6e6); const m=Math.floor(d/6e4); if(h>24)return`${Math.floor(h/24)}d`; if(h>0)return`${h}h`; if(m>0)return`${m}m`; return'ahora'; };
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
function Spinner({ size=20 }: { size?: number }) { return <Loader2 size={size} className="animate-spin" style={{color:'#00F5FF'}}/>; }
function Av({ u, s=36 }: { u: Partial<AppUser & {avatarUrl:string;username:string}>; s?: number }) {
  return (
    <div className="rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center" style={{width:s,height:s,background:'#7c3aed',border:'2px solid #2a2a3a'}}>
      {u.avatarUrl?<img src={u.avatarUrl} alt={u.username||''} className="w-full h-full object-cover"/>:<span className="text-white font-bold" style={{fontSize:s*0.38}}>{(u.username||'?')[0]?.toUpperCase()}</span>}
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
  const flags: Record<string,string> = {'España':'🇪🇸','México':'🇲🇽','Argentina':'🇦🇷','Colombia':'🇨🇴','Estados Unidos':'🇺🇸','Japón':'🇯🇵','Brasil':'🇧🇷','Francia':'🇫🇷','Alemania':'🇩🇪','Italia':'🇮🇹','Reino Unido':'🇬🇧','Portugal':'🇵🇹','Chile':'🇨🇱','Perú':'🇵🇪'};
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
    <div className="min-h-screen flex flex-col" style={{background:'#0b0b12'}}>
      <div className="flex items-center justify-between px-4 pt-14 pb-4">
        <button onClick={()=>setLocation('/')}><ChevronLeft size={24} className="text-white"/></button>
        <div className="flex gap-1 p-1 rounded-xl" style={{background:'#1e1e2a'}}>
          {(['login','register'] as const).map(m=><button key={m} onClick={()=>{setMode(m);setError('');}} className={cn('px-5 py-2 rounded-lg text-sm font-bold transition-all',mode===m?'text-black':'text-gray-400')} style={mode===m?{background:'#00F5FF'}:{}}>{m==='login'?'Entrar':'Registro'}</button>)}
        </div>
        <div className="w-10"/>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-16">
        <div className="mb-8 text-center"><DominoLogo size={44}/><h1 className="text-4xl font-black mt-3" style={{color:'#00F5FF',textShadow:'0 0 20px rgba(0,245,255,0.4)'}}>DOMINO</h1><p className="text-gray-500 text-sm mt-1">The Real-World Chain Reaction</p></div>
        <div className="w-full max-w-sm space-y-3">
          {mode==='register'&&<div className="relative"><AtSign size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"/><input placeholder="username" value={form.username} onChange={set('username')} className="w-full rounded-2xl pl-10 pr-4 py-3.5 text-sm text-white placeholder-gray-600 focus:outline-none" style={{background:'#1e1e2a',border:'1px solid #2a2a3a'}}/></div>}
          <input placeholder="Email" type="email" value={form.email} onChange={set('email')} className="w-full rounded-2xl px-4 py-3.5 text-sm text-white placeholder-gray-600 focus:outline-none" style={{background:'#1e1e2a',border:'1px solid #2a2a3a'}}/>
          <input placeholder="Contraseña" type="password" value={form.password} onChange={set('password')} className="w-full rounded-2xl px-4 py-3.5 text-sm text-white placeholder-gray-600 focus:outline-none" style={{background:'#1e1e2a',border:'1px solid #2a2a3a'}}/>
          {mode==='register'&&<><select value={form.country} onChange={set('country')} className="w-full rounded-2xl px-4 py-3.5 text-sm text-white focus:outline-none" style={{background:'#1e1e2a',border:'1px solid #2a2a3a'}}><option value="">Selecciona tu país</option>{Object.entries(flags).map(([c,f])=><option key={c} value={c}>{f} {c}</option>)}</select><input placeholder="Ciudad" value={form.city} onChange={set('city')} className="w-full rounded-2xl px-4 py-3.5 text-sm text-white placeholder-gray-600 focus:outline-none" style={{background:'#1e1e2a',border:'1px solid #2a2a3a'}}/></>}
          {error&&<div className="flex items-center gap-2 px-4 py-3 rounded-2xl" style={{background:'rgba(255,0,127,0.1)',border:'1px solid rgba(255,0,127,0.3)'}}><AlertCircle size={15} className="text-red-400 flex-shrink-0"/><p className="text-red-400 text-xs">{error}</p></div>}
          <button onClick={handle} disabled={loading} className="w-full py-4 rounded-2xl font-bold text-black flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95 transition-all" style={{background:'linear-gradient(135deg,#00F5FF,#7c3aed)'}}>
            {loading?<Spinner/>:mode==='login'?'Entrar a DOMINO':'Crear cuenta'}
          </button>
        </div>
        <p className="text-gray-700 text-xs mt-8 text-center max-w-xs">Al continuar aceptas los Términos de DOMINO y la Política de Privacidad</p>
      </div>
    </div>
  );
}

// ===================== BOTTOM NAVBAR =====================
function BottomNav() {
  const [loc, setLocation] = useLocation();
  const { user } = useAuth();
  const { data: nd } = useApi('/api/notifications', [user?._id]);
  const unread = Array.isArray(nd)?nd.filter((n:Notification)=>!n.read).length:0;
  const hide = ['/create','/camera','/auth'].some(p=>loc.startsWith(p));
  if (hide) return null;
  const active = (path: string) => path==='/'?loc==='/'||loc==='/feed'||loc==='/following':loc.startsWith(path);
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t" style={{background:'rgba(11,11,18,0.98)',backdropFilter:'blur(20px)',borderColor:'rgba(255,255,255,0.06)',paddingBottom:'env(safe-area-inset-bottom,0px)'}}>
      <div className="flex items-center justify-around h-14 max-w-lg mx-auto px-1">
        <button onClick={()=>setLocation('/feed')} className="flex flex-col items-center gap-0.5 px-3 py-1 flex-1">
          <Home size={24} strokeWidth={active('/')?2.5:1.5} className={active('/')?'text-white':'text-gray-500'}/>
          <span className={cn('text-[10px] font-medium',active('/')?'text-white':'text-gray-500')}>Inicio</span>
        </button>
        <button onClick={()=>setLocation('/search')} className="flex flex-col items-center gap-0.5 px-3 py-1 flex-1">
          <Users size={24} strokeWidth={active('/search')?2.5:1.5} className={active('/search')?'text-white':'text-gray-500'}/>
          <span className={cn('text-[10px] font-medium',active('/search')?'text-white':'text-gray-500')}>Amigos</span>
        </button>
        <button onClick={()=>setLocation('/create')} className="flex items-center justify-center px-2 py-1 flex-1">
          <div className="relative flex items-center justify-center h-8 rounded-lg overflow-hidden" style={{width:'50px'}}>
            <div className="absolute left-0 top-0 bottom-0 w-3.5 rounded-l-lg" style={{background:'#00F5FF'}}/>
            <div className="absolute right-0 top-0 bottom-0 w-3.5 rounded-r-lg" style={{background:'#FF007F'}}/>
            <div className="relative z-10 flex items-center justify-center w-9 h-full rounded-md" style={{background:'white'}}><Plus size={22} className="text-black" strokeWidth={3}/></div>
          </div>
        </button>
        <button onClick={()=>setLocation('/messages')} className="relative flex flex-col items-center gap-0.5 px-3 py-1 flex-1">
          <MessageCircle size={24} strokeWidth={active('/messages')?2.5:1.5} className={active('/messages')?'text-white':'text-gray-500'}/>
          {unread>0&&<span className="absolute top-0 right-2 min-w-[16px] h-4 rounded-full text-[9px] font-bold text-white flex items-center justify-center px-1" style={{background:'#FF007F'}}>{unread>99?'99+':unread}</span>}
          <span className={cn('text-[10px] font-medium',active('/messages')?'text-white':'text-gray-500')}>Mensajes</span>
        </button>
        <button onClick={()=>user?setLocation('/profile'):setLocation('/auth')} className="flex flex-col items-center gap-0.5 px-3 py-1 flex-1">
          {user?(<div className={cn('rounded-full overflow-hidden',active('/profile')?'ring-2 ring-white ring-offset-1 ring-offset-black':'')} style={{width:26,height:26}}>{user.avatarUrl?<img src={user.avatarUrl} alt="" className="w-full h-full object-cover"/>:<div className="w-full h-full flex items-center justify-center text-white font-bold text-xs" style={{background:'#7c3aed'}}>{user.username?.[0]?.toUpperCase()}</div>}</div>):(<BarChart2 size={24} strokeWidth={1.5} className="text-gray-500"/>)}
          <span className={cn('text-[10px] font-medium',active('/profile')?'text-white':'text-gray-500')}>Perfil</span>
        </button>
      </div>
    </nav>
  );
}

// ===================== TOP NAVBAR =====================
function TopNav() {
  const [loc, setLocation] = useLocation();
  const { user } = useAuth();
  const { data: nd } = useApi('/api/notifications', [user?._id]);
  const unread = Array.isArray(nd)?nd.filter((n:Notification)=>!n.read).length:0;
  const hide = ['/create','/camera','/auth'].some(p=>loc.startsWith(p));
  if (hide) return null;
  const isFeed = loc==='/'||loc==='/feed'||loc==='/following';
  return (
    <nav className="fixed top-0 left-0 right-0 z-40" style={{background:isFeed?'transparent':'rgba(11,11,18,0.97)',backdropFilter:isFeed?'none':'blur(20px)',borderBottom:isFeed?'none':'1px solid rgba(255,255,255,0.06)'}}>
      <div className="flex items-center justify-between h-14 px-4 max-w-7xl mx-auto">
        {isFeed?<div className="flex-1"/>:<button onClick={()=>setLocation('/feed')} className="flex items-center gap-2 flex-1"><DominoLogo size={16}/><span className="text-base font-black" style={{color:'#00F5FF'}}>DOMINO</span></button>}
        {isFeed&&<div className="flex items-center gap-6 flex-1 justify-center">
          <button onClick={()=>setLocation('/feed')} className={cn('text-base font-bold pb-1',loc!=='/following'?'text-white border-b-2 border-white':'text-gray-400')}>Para ti</button>
          <button onClick={()=>setLocation('/following')} className={cn('text-base font-bold pb-1',loc==='/following'?'text-white border-b-2 border-white':'text-gray-400')}>Siguiendo</button>
        </div>}
        <div className="flex items-center gap-1 flex-1 justify-end">
          {isFeed&&<button onClick={()=>setLocation('/search')} className="p-2"><Search size={20} className="text-white"/></button>}
          {user&&<button onClick={()=>setLocation('/notifications')} className="p-2 relative"><Bell size={20} className={isFeed?'text-white':'text-gray-300'}/>{unread>0&&<span className="absolute top-1 right-1 w-2 h-2 rounded-full" style={{background:'#FF007F'}}/>}</button>}
          {user&&<div className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold" style={{background:'rgba(0,245,255,0.1)',color:'#00F5FF',border:'1px solid rgba(0,245,255,0.2)'}}>🪙 {(user.coins||0).toLocaleString()}</div>}
          {!user&&<button onClick={()=>setLocation('/auth')} className="text-sm font-bold px-4 py-1.5 rounded-lg" style={{background:'#FF007F',color:'white'}}>Entrar</button>}
        </div>
      </div>
    </nav>
  );
}

// ===================== COMMENTS PANEL =====================
function CommentsPanel({ videoId, onClose }: { videoId: string; onClose: () => void }) {
  const { user, token } = useAuth();
  const { data: comments, setData } = useApi(`/api/videos/${videoId}/comments`, [videoId]);
  const [text, setText] = useState(''); const [sending, setSending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(()=>{ setTimeout(()=>inputRef.current?.focus(),300); },[]);
  const send = async () => {
    if (!text.trim()||!token) return; setSending(true);
    try { const r=await fetch(`${API}/api/videos/${videoId}/comments`,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({text})}); const c=await r.json(); if(r.ok){setData((p:Comment[])=>[c,...(Array.isArray(p)?p:[])]);setText('');} } finally{setSending(false);}
  };
  const count = Array.isArray(comments)?comments.length:0;
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end" onClick={onClose}>
      <div className="rounded-t-3xl flex flex-col" style={{background:'#1a1a2a',maxHeight:'78svh'}} onClick={e=>e.stopPropagation()}>
        <div className="w-10 h-1 rounded-full mx-auto mt-3 mb-1" style={{background:'#3a3a4a'}}/>
        <div className="flex items-center justify-between px-5 py-3 border-b" style={{borderColor:'rgba(255,255,255,0.07)'}}>
          <h3 className="font-bold text-white">{fmt(count)} comentarios</h3>
          <button onClick={onClose}><X size={20} className="text-gray-400"/></button>
        </div>
        <div className="flex-1 overflow-y-auto py-3 px-4 space-y-4 min-h-0" style={{maxHeight:'52vh'}}>
          {!comments&&<div className="flex justify-center py-8"><Spinner/></div>}
          {Array.isArray(comments)&&comments.length===0&&<div className="text-center py-12"><MessageCircle size={36} className="mx-auto text-gray-700 mb-3"/><p className="text-gray-500 text-sm">Sé el primero en comentar</p></div>}
          {(Array.isArray(comments)?comments:[]).map((c:Comment)=>(
            <div key={c._id} className="flex gap-3">
              <Av u={c.userId} s={34}/>
              <div className="flex-1">
                <p className="text-white text-xs font-semibold mb-0.5">@{c.userId?.username}</p>
                <p className="text-gray-200 text-sm leading-relaxed">{c.text}</p>
                <div className="flex items-center gap-4 mt-1.5">
                  <span className="text-gray-600 text-xs">{ago(c.createdAt)}</span>
                  <button className="text-gray-600 text-xs">Responder</button>
                </div>
              </div>
              <div className="flex flex-col items-center gap-0.5"><button><Heart size={13} className="text-gray-600"/></button><span className="text-gray-600 text-xs">{c.likes||0}</span></div>
            </div>
          ))}
        </div>
        <div className="px-4 py-3 border-t flex items-center gap-3 flex-shrink-0" style={{borderColor:'rgba(255,255,255,0.07)',paddingBottom:'max(12px,env(safe-area-inset-bottom))'}}>
          {user?<Av u={user} s={32}/>:<div className="w-8 h-8 rounded-full" style={{background:'#2a2a3a'}}/>}
          <div className="flex-1 flex items-center rounded-full px-4 py-2" style={{background:'#2a2a3a'}}>
            <input ref={inputRef} value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send()} placeholder={user?"Añade un comentario...":"Entra para comentar"} readOnly={!user} className="flex-1 bg-transparent text-white text-sm placeholder-gray-500 focus:outline-none"/>
          </div>
          {user&&text.trim()&&<button onClick={send} disabled={sending} className="font-bold text-sm disabled:opacity-50" style={{color:'#00F5FF'}}>{sending?<Spinner size={15}/>:'Publicar'}</button>}
          {!user&&<Link href="/auth" onClick={onClose} className="font-bold text-sm" style={{color:'#00F5FF'}}>Entrar</Link>}
        </div>
      </div>
    </div>
  );
}

// ===================== SHARE PANEL =====================
function SharePanel({ videoId, onClose }: { videoId: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const url = `${window.location.origin}/video/${videoId}`;
  const copy = () => { navigator.clipboard?.writeText(url); setCopied(true); setTimeout(()=>{setCopied(false);onClose();},1500); };
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end" onClick={onClose}>
      <div className="rounded-t-3xl" style={{background:'#1a1a2a',paddingBottom:'max(24px,env(safe-area-inset-bottom))'}} onClick={e=>e.stopPropagation()}>
        <div className="w-10 h-1 rounded-full mx-auto mt-3 mb-4" style={{background:'#3a3a4a'}}/>
        <h3 className="font-bold text-white text-center mb-5">Compartir</h3>
        <div className="flex justify-center gap-6 px-6 mb-6">
          {[{e:'💬',l:'WhatsApp',fn:()=>{window.open(`https://wa.me/?text=${encodeURIComponent(url)}`,'_blank');onClose();}},{e:'🔗',l:copied?'¡Copiado!':'Copiar',fn:copy},{e:'📤',l:'Más',fn:()=>{navigator.share?.({title:'DOMINO',url}).catch(()=>{});onClose();}}].map(o=>(
            <button key={o.l} onClick={o.fn} className="flex flex-col items-center gap-2">
              <div className="w-14 h-14 rounded-full flex items-center justify-center text-2xl" style={{background:'#2a2a3a'}}>{o.e}</div>
              <span className="text-gray-400 text-xs">{o.l}</span>
            </button>
          ))}
        </div>
        <div className="mx-4 rounded-2xl p-3 flex items-center gap-3" style={{background:'#2a2a3a'}}>
          <span className="text-gray-400 text-xs flex-1 truncate">{url}</span>
          <button onClick={copy} className="text-xs font-bold px-3 py-1.5 rounded-lg flex-shrink-0" style={{background:'#00F5FF',color:'black'}}>{copied?'✓':'Copiar'}</button>
        </div>
      </div>
    </div>
  );
}


// ===================== FEED PAGE =====================
function FeedPage({ following=false }: { following?: boolean }) {
  const endpoint = following?'/api/videos/following?limit=20':'/api/videos/feed?limit=20';
  const { data: videos, loading } = useApi(endpoint, [following]);
  const { data: challenge } = useApi('/api/challenges/active');
  const { token, user } = useAuth();
  const [liked, setLiked] = useState<Set<string>>(new Set());
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [commentId, setCommentId] = useState<string|null>(null);
  const [shareId, setShareId] = useState<string|null>(null);
  const [muted, setMuted] = useState(true);
  const [expandDesc, setExpandDesc] = useState<string|null>(null);
  const videoRefs = useRef<(HTMLVideoElement|null)[]>([]);
  const [, setLocation] = useLocation();

  useEffect(()=>{
    if(user&&Array.isArray(videos)){
      setLiked(new Set(videos.filter((v:DominoVideo)=>v.likes?.includes(user._id)).map((v:DominoVideo)=>v._id)));
    }
  },[videos,user]);

  const doLike = async (id:string) => {
    if(!token){setLocation('/auth');return;}
    setLiked(p=>{const n=new Set(p);n.has(id)?n.delete(id):n.add(id);return n;});
    await fetch(`${API}/api/videos/${id}/like`,{method:'POST',headers:{Authorization:`Bearer ${token}`}});
  };
  const doSave = async (id:string) => {
    if(!token){setLocation('/auth');return;}
    setSaved(p=>{const n=new Set(p);n.has(id)?n.delete(id):n.add(id);return n;});
    await fetch(`${API}/api/users/videos/${id}/save`,{method:'POST',headers:{Authorization:`Bearer ${token}`}});
  };

  useEffect(()=>{
    const obs=new IntersectionObserver(entries=>{
      entries.forEach(e=>{ const v=e.target as HTMLVideoElement; if(e.isIntersecting){v.play().catch(()=>{});}else{v.pause();v.currentTime=0;} });
    },{threshold:0.7});
    videoRefs.current.forEach(v=>{if(v)obs.observe(v);});
    return()=>obs.disconnect();
  },[videos]);

  if(loading) return <div className="fixed inset-0 flex items-center justify-center" style={{background:'#000'}}><Spinner size={32}/></div>;
  const list=Array.isArray(videos)?videos:[];

  return (
    <div className="fixed inset-0 overflow-y-scroll snap-y snap-mandatory" style={{background:'#000',scrollbarWidth:'none'}}>
      {commentId&&<CommentsPanel videoId={commentId} onClose={()=>setCommentId(null)}/>}
      {shareId&&<SharePanel videoId={shareId} onClose={()=>setShareId(null)}/>}

      {/* Mute button */}
      <button onClick={()=>{setMuted(m=>{const nm=!m;videoRefs.current.forEach(v=>{if(v)v.muted=nm;});return nm;});}} className="fixed top-16 right-4 z-30 w-9 h-9 rounded-full flex items-center justify-center" style={{background:'rgba(0,0,0,0.45)'}}>
        {muted?<VolumeX size={16} className="text-white"/>:<Volume2 size={16} className="text-white"/>}
      </button>

      {/* Challenge banner */}
      {challenge&&<div className="fixed top-14 left-0 right-0 z-20 pointer-events-none"><div className="max-w-md mx-auto px-4 pt-2"><div className="rounded-xl px-3 py-1.5 pointer-events-auto flex items-center gap-2" style={{background:'rgba(0,0,0,0.55)',backdropFilter:'blur(10px)'}}><Flame size={13} className="text-orange-400 flex-shrink-0"/><span className="text-xs font-semibold text-white flex-1 truncate">{challenge.title}</span><span className="text-xs text-gray-400">{left(challenge.expiresAt)}</span></div></div></div>}

      {list.map((v:DominoVideo,idx:number)=>{
        const isLiked=liked.has(v._id); const isSaved=saved.has(v._id);
        const desc=v.description||''; const isExp=expandDesc===v._id;
        return (
          <div key={v._id} className="relative w-full snap-start snap-always flex-shrink-0" style={{height:'100svh'}}>
            {/* Media */}
            {v.videoUrl?<video ref={el=>{videoRefs.current[idx]=el;}} src={v.videoUrl} className="absolute inset-0 w-full h-full object-cover" loop playsInline muted={muted} onDoubleClick={()=>doLike(v._id)} onClick={e=>{const vi=videoRefs.current[idx];if(vi)vi.paused?vi.play():vi.pause();}}/>
            :v.thumbnailUrl?<img src={v.thumbnailUrl} alt="" className="absolute inset-0 w-full h-full object-cover"/>
            :<div className="absolute inset-0 flex items-center justify-center" style={{background:'#111'}}><Camera size={48} className="text-gray-700"/></div>}

            {/* Gradients */}
            <div className="absolute inset-0 pointer-events-none" style={{background:'linear-gradient(to top,rgba(0,0,0,0.78) 0%,rgba(0,0,0,0) 45%,rgba(0,0,0,0.25) 100%)'}}/>

            {/* RIGHT ACTIONS */}
            <div className="absolute right-3 flex flex-col items-center gap-5 z-10" style={{bottom:'105px'}}>
              {/* Avatar + follow */}
              <div className="relative">
                <button onClick={()=>setLocation(`/user/${v.userId?._id}`)}>
                  <div className="w-11 h-11 rounded-full overflow-hidden" style={{border:'2px solid white'}}>
                    {v.userId?.avatarUrl?<img src={v.userId.avatarUrl} alt="" className="w-full h-full object-cover"/>:<div className="w-full h-full flex items-center justify-center font-bold text-white" style={{background:'#7c3aed'}}>{v.userId?.username?.[0]?.toUpperCase()}</div>}
                  </div>
                </button>
                {user&&user._id!==v.userId?._id&&<button className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full flex items-center justify-center" style={{background:'#FF007F'}}><Plus size={12} className="text-white" strokeWidth={3}/></button>}
              </div>
              {/* Like */}
              <button onClick={()=>doLike(v._id)} className="flex flex-col items-center gap-1">
                <Heart size={32} strokeWidth={1.5} className={isLiked?'fill-red-500 text-red-500':'text-white'}/>
                <span className="text-white text-xs font-semibold" style={{textShadow:'0 1px 3px rgba(0,0,0,0.9)'}}>{fmt(v.likes?.length||0)}</span>
              </button>
              {/* Comment */}
              <button onClick={()=>setCommentId(v._id)} className="flex flex-col items-center gap-1">
                <MessageCircle size={30} strokeWidth={1.5} className="text-white"/>
                <span className="text-white text-xs font-semibold" style={{textShadow:'0 1px 3px rgba(0,0,0,0.9)'}}>Comentar</span>
              </button>
              {/* Save */}
              <button onClick={()=>doSave(v._id)} className="flex flex-col items-center gap-1">
                <Bookmark size={28} strokeWidth={1.5} className={isSaved?'fill-yellow-400 text-yellow-400':'text-white'}/>
                <span className="text-white text-xs font-semibold" style={{textShadow:'0 1px 3px rgba(0,0,0,0.9)'}}>Guardar</span>
              </button>
              {/* Share */}
              <button onClick={()=>setShareId(v._id)} className="flex flex-col items-center gap-1">
                <Share size={28} strokeWidth={1.5} className="text-white"/>
                <span className="text-white text-xs font-semibold" style={{textShadow:'0 1px 3px rgba(0,0,0,0.9)'}}>Compartir</span>
              </button>
              {/* Disco DOMINO */}
              <div className="w-9 h-9 rounded-full flex items-center justify-center animate-spin" style={{background:'linear-gradient(135deg,#00F5FF,#FF007F)',animationDuration:'4s'}}>
                <div className="w-3.5 h-3.5 rounded-full" style={{background:'#000'}}/>
              </div>
            </div>

            {/* BOTTOM INFO */}
            <div className="absolute left-3 right-16 z-10" style={{bottom:'96px'}}>
              <button onClick={()=>setLocation(`/user/${v.userId?._id}`)} className="flex items-center gap-2 mb-2">
                <span className="text-white font-bold text-sm" style={{textShadow:'0 1px 3px rgba(0,0,0,0.9)'}}>@{v.userId?.username}</span>
                <span className="text-sm">{v.userId?.flag}</span>
              </button>
              {desc&&<div className="mb-2">
                <p className="text-white text-sm leading-relaxed" style={{textShadow:'0 1px 3px rgba(0,0,0,0.8)'}}>
                  {isExp?desc:desc.slice(0,80)}{desc.length>80&&!isExp&&'...'}
                  {desc.length>80&&<button onClick={()=>setExpandDesc(isExp?null:v._id)} className="text-gray-300 text-sm ml-1">{isExp?'menos':'más'}</button>}
                </p>
              </div>}
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{background:'rgba(0,245,255,0.15)',color:'#00F5FF',border:'1px solid rgba(0,245,255,0.3)'}}>⛓️ Cadena {v.chainDepth+1}</span>
                <span className="text-gray-400 text-xs">{ago(v.createdAt)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Music size={12} className="text-white flex-shrink-0"/>
                <p className="text-white text-xs truncate" style={{textShadow:'0 1px 3px rgba(0,0,0,0.8)'}}>DOMINO Original · @{v.userId?.username}</p>
              </div>
            </div>

            {/* Progress bar */}
            <div className="absolute left-0 right-0 z-10" style={{bottom:'56px'}}>
              <div className="h-0.5 w-full" style={{background:'rgba(255,255,255,0.12)'}}>
                <div className="h-full" style={{width:`${Math.min(100,(v.chainDepth+1)*10)}%`,background:'linear-gradient(90deg,#00F5FF,#FF007F)'}}/>
              </div>
            </div>
          </div>
        );
      })}

      {list.length===0&&<div className="fixed inset-0 flex flex-col items-center justify-center text-center px-6" style={{background:'#000'}}><DominoLogo size={48}/><h3 className="text-xl font-bold text-white mt-6 mb-2">{following?'Sigue a alguien primero':'Sin videos todavía'}</h3><p className="text-gray-400 text-sm mb-8">{following?'Busca usuarios y síguelos':'Sé el primero en grabar un reto DOMINO'}</p><button onClick={()=>setLocation(following?'/search':'/create')} className="px-8 py-3 rounded-2xl font-bold text-black" style={{background:'linear-gradient(135deg,#00F5FF,#7c3aed)'}}>{following?'Buscar usuarios':'Grabar ahora'}</button></div>}
      <style>{`::-webkit-scrollbar{display:none}`}</style>
    </div>
  );
}


// ===================== PROFILE PAGE =====================
function ProfilePage({ userId }: { userId?: string }) {
  const { user: me, token, refreshUser, logout } = useAuth();
  const [, setLocation] = useLocation();
  const isOwn = !userId || userId === me?._id;
  const targetId = isOwn ? me?._id : userId;
  const { data: profile, loading } = useApi(isOwn?'/api/users/me':`/api/users/${targetId}`, [targetId]);
  const { data: userVideos } = useApi(targetId?`/api/users/${targetId}/videos`:'', [targetId]);
  const [tab, setTab] = useState<'videos'|'private'|'repost'|'saved'|'likes'>('videos');
  const [following, setFollowing] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<DominoVideo|null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [showUnfollowConfirm, setShowUnfollowConfirm] = useState(false);

  useEffect(()=>{ if(me&&profile&&!isOwn) setFollowing(profile.followers?.includes(me._id)||false); },[profile,me]);

  const doFollow = async () => {
    if(!token){setLocation('/auth');return;}
    if(!targetId) return;
    if(following){setShowUnfollowConfirm(true);return;}
    setFollowing(true);
    await fetch(`${API}/api/users/${targetId}/follow`,{method:'POST',headers:{Authorization:`Bearer ${token}`}});
    await refreshUser();
  };
  const confirmUnfollow = async () => {
    if(!targetId||!token)return;
    setFollowing(false); setShowUnfollowConfirm(false);
    await fetch(`${API}/api/users/${targetId}/follow`,{method:'POST',headers:{Authorization:`Bearer ${token}`}});
  };

  if(loading) return <div className="min-h-screen flex items-center justify-center" style={{paddingTop:'56px',background:'#0b0b12'}}><Spinner/></div>;
  if(!profile&&!isOwn) return <div className="min-h-screen flex items-center justify-center" style={{paddingTop:'56px',background:'#0b0b12'}}><p className="text-gray-400">Usuario no encontrado</p></div>;
  const displayUser = isOwn?(me||profile):profile;
  if(!displayUser) return null;

  const videos=Array.isArray(userVideos)?userVideos:[];
  const savedVids=Array.isArray(displayUser.savedVideos)?displayUser.savedVideos.filter((v:any)=>v&&v._id):[];
  const likedVids=Array.isArray(displayUser.likedVideos)?displayUser.likedVideos.filter((v:any)=>v&&v._id):[];
  const totalLikes=videos.reduce((a:number,v:DominoVideo)=>a+(v.likes?.length||0),0);
  const tabVideos=tab==='videos'?videos:tab==='saved'?savedVids:tab==='likes'?likedVids:[];
  const TABS=[
    {key:'videos',icon:<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>},
    {key:'private',icon:<Lock size={20}/>},{key:'repost',icon:<Repeat2 size={20}/>},
    {key:'saved',icon:<Bookmark size={20}/>},{key:'likes',icon:<Heart size={20}/>},
  ];

  return (
    <div className="min-h-screen pb-20 overflow-y-auto" style={{paddingTop:'56px',background:'#0b0b12'}}>
      {/* Video modal */}
      {selectedVideo&&<div className="fixed inset-0 z-50 flex items-center justify-center" style={{background:'rgba(0,0,0,0.97)'}}><button onClick={()=>setSelectedVideo(null)} className="absolute top-4 right-4 p-2 rounded-full z-10" style={{background:'rgba(255,255,255,0.1)'}}><X size={20} className="text-white"/></button><div className="relative w-full max-w-sm mx-4" style={{aspectRatio:'9/16',maxHeight:'90svh'}}>{selectedVideo.videoUrl?<video src={selectedVideo.videoUrl} className="w-full h-full object-cover rounded-2xl" controls autoPlay loop playsInline/>:selectedVideo.thumbnailUrl?<img src={selectedVideo.thumbnailUrl} alt="" className="w-full h-full object-cover rounded-2xl"/>:<div className="w-full h-full rounded-2xl flex items-center justify-center" style={{background:'#1a1a2e'}}><Camera size={48} className="text-gray-600"/></div>}</div></div>}

      {/* Unfollow confirm */}
      {showUnfollowConfirm&&<div className="fixed inset-0 z-50 flex items-center justify-center px-6" style={{background:'rgba(0,0,0,0.75)'}}><div className="w-full max-w-xs rounded-2xl p-6 text-center" style={{background:'#1e1e2a'}}><Av u={displayUser} s={60}/><div className="mx-auto mt-0"/><p className="text-white font-bold mt-3 mb-1">¿Dejar de seguir?</p><p className="text-gray-400 text-sm mb-5">@{displayUser.username}</p><div className="flex gap-3"><button onClick={()=>setShowUnfollowConfirm(false)} className="flex-1 py-2.5 rounded-xl text-white font-semibold border border-gray-600">Cancelar</button><button onClick={confirmUnfollow} className="flex-1 py-2.5 rounded-xl font-bold text-white" style={{background:'#FF007F'}}>Dejar de seguir</button></div></div></div>}

      {/* Menu */}
      {showMenu&&<div className="fixed inset-0 z-50 flex items-end" style={{background:'rgba(0,0,0,0.6)'}} onClick={()=>setShowMenu(false)}><div className="w-full rounded-t-3xl overflow-hidden" style={{background:'#1e1e2a'}} onClick={e=>e.stopPropagation()}><div className="w-10 h-1 rounded-full mx-auto mt-3 mb-1" style={{background:'#3a3a4a'}}/><div className="p-4 space-y-1">
        {isOwn&&<><button onClick={()=>{setShowMenu(false);setLocation('/settings');}} className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-white hover:bg-white/5"><Settings size={18} className="text-gray-400"/>Ajustes</button><button onClick={()=>{setShowMenu(false);setLocation('/coins');}} className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-white hover:bg-white/5"><span>🪙</span>Comprar monedas</button><button onClick={()=>{setShowMenu(false);setLocation('/notifications');}} className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-white hover:bg-white/5"><Bell size={18} className="text-gray-400"/>Notificaciones</button><div className="border-t my-1" style={{borderColor:'#2a2a3a'}}/><button onClick={()=>{logout();setShowMenu(false);setLocation('/');}} className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-red-400 hover:bg-white/5"><LogOut size={18}/>Cerrar sesión</button></>}
        {!isOwn&&<><button className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-white hover:bg-white/5"><Flag size={18} className="text-gray-400"/>Denunciar</button><button className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-red-400 hover:bg-white/5"><Ban size={18}/>Bloquear</button></>}
        <button onClick={()=>setShowMenu(false)} className="w-full py-3.5 rounded-xl text-gray-400">Cancelar</button>
      </div></div></div>}

      <div className="max-w-lg mx-auto">
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 pt-2 pb-3">
          {isOwn?<button className="text-white font-bold text-sm flex items-center gap-1">{displayUser.username}<ChevronRight size={14}/></button>:<button onClick={()=>setLocation(-1 as any)} className="p-1"><ChevronLeft size={24} className="text-white"/></button>}
          <div className="flex items-center gap-2">
            {isOwn&&<button onClick={()=>setLocation('/coins')} className="flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-lg" style={{background:'rgba(0,245,255,0.1)',color:'#00F5FF'}}>🪙 {(displayUser.coins||0).toLocaleString()}</button>}
            <button onClick={()=>setShowMenu(true)} className="p-1"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg></button>
          </div>
        </div>

        {/* Avatar + info */}
        <div className="flex flex-col items-center px-4 pb-4">
          <div className="relative mb-3">
            <div className="w-24 h-24 rounded-full overflow-hidden" style={{background:'#7c3aed',border:'2px solid #2a2a3a'}}>
              {displayUser.avatarUrl?<img src={displayUser.avatarUrl} alt="" className="w-full h-full object-cover"/>:<span className="w-full h-full flex items-center justify-center text-white font-black text-4xl">{displayUser.username?.[0]?.toUpperCase()}</span>}
            </div>
            {isOwn&&<button className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center" style={{background:'#00F5FF'}}><Plus size={16} className="text-black" strokeWidth={3}/></button>}
          </div>
          <p className="text-white font-black text-lg">@{displayUser.username}</p>
          {displayUser.bio&&<p className="text-gray-300 text-sm text-center mt-1 max-w-xs">{displayUser.bio}</p>}
          <div className="flex items-center gap-2 mt-2 mb-3">
            <div className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold" style={{background:'rgba(0,245,255,0.1)',border:'1px solid rgba(0,245,255,0.3)',color:'#00F5FF'}}><Zap size={11}/>  {(displayUser.impactPoints||0).toLocaleString()} pts</div>
            <div className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold" style={{background:'rgba(255,100,0,0.1)',border:'1px solid rgba(255,100,0,0.3)',color:'#ff6400'}}><Flame size={11}/> {displayUser.currentStreak||0}d</div>
          </div>
          {/* Stats */}
          <div className="flex items-center gap-6 mb-4">
            <div className="flex flex-col items-center"><span className="text-white font-black text-lg leading-tight">{fmt(displayUser.following?.length||0)}</span><span className="text-gray-400 text-xs">Siguiendo</span></div>
            <div className="w-px h-8" style={{background:'#2a2a3a'}}/>
            <div className="flex flex-col items-center"><span className="text-white font-black text-lg leading-tight">{fmt(displayUser.followers?.length||0)}</span><span className="text-gray-400 text-xs">Seguidores</span></div>
            <div className="w-px h-8" style={{background:'#2a2a3a'}}/>
            <div className="flex flex-col items-center"><span className="text-white font-black text-lg leading-tight">{fmt(totalLikes)}</span><span className="text-gray-400 text-xs">Me gusta</span></div>
          </div>
          {/* Buttons */}
          {isOwn?(
            <div className="flex items-center gap-2 w-full max-w-xs">
              <button onClick={()=>setLocation('/profile/edit')} className="flex-1 py-2 rounded-lg font-semibold text-white text-sm border border-gray-600">Editar perfil</button>
              <button onClick={()=>setLocation('/create')} className="flex-1 py-2 rounded-lg font-bold text-black text-sm" style={{background:'#00F5FF'}}>Grabar ⛓️</button>
              <button onClick={()=>setLocation('/settings')} className="w-9 h-9 rounded-lg border border-gray-600 flex items-center justify-center flex-shrink-0"><Settings size={15} className="text-white"/></button>
            </div>
          ):(
            <div className="flex items-center gap-2 w-full max-w-xs">
              <button onClick={doFollow} className="flex-1 py-2 rounded-lg font-bold text-sm transition-all" style={following?{background:'transparent',border:'1px solid #555',color:'white'}:{background:'#FF007F',color:'white'}}>{following?'Siguiendo':'Seguir'}</button>
              <button onClick={()=>setLocation(`/messages/${targetId}`)} className="flex-1 py-2 rounded-lg font-semibold text-white text-sm border border-gray-600">Mensaje</button>
              <button className="w-9 h-9 rounded-lg border border-gray-600 flex items-center justify-center flex-shrink-0"><ChevronRight size={15} className="text-white"/></button>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex border-b sticky top-14 z-10" style={{borderColor:'#1e1e2a',background:'#0b0b12'}}>
          {TABS.map(t=><button key={t.key} onClick={()=>setTab(t.key as any)} className={cn('flex-1 flex items-center justify-center py-3 border-b-2 transition-all',tab===t.key?'text-white border-white':'text-gray-600 border-transparent')}>{t.icon}</button>)}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-3 gap-px" style={{background:'#1e1e2a'}}>
          {tabVideos.map((v:DominoVideo)=>(
            <button key={v._id} onClick={()=>setSelectedVideo(v)} className="relative overflow-hidden bg-black" style={{aspectRatio:'9/16'}}>
              {v.thumbnailUrl?<img src={v.thumbnailUrl} alt="" className="w-full h-full object-cover"/>:<div className="w-full h-full flex items-center justify-center" style={{background:'#111'}}><Camera size={18} className="text-gray-700"/></div>}
              <div className="absolute inset-0" style={{background:'linear-gradient(to top,rgba(0,0,0,0.5),transparent 50%)'}}/>
              <div className="absolute bottom-1.5 left-1.5 flex items-center gap-0.5"><Play size={9} className="text-white fill-white"/><span className="text-white text-xs font-medium">{fmt(v.likes?.length||0)}</span></div>
              {v.videoUrl&&<div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full" style={{background:'#FF007F'}}/>}
            </button>
          ))}
        </div>
        {tabVideos.length===0&&<div className="text-center py-20 px-4"><div className="text-5xl mb-4">{tab==='videos'?'🎲':tab==='saved'?'🔖':tab==='likes'?'❤️':tab==='private'?'🔒':'🔁'}</div><p className="text-gray-500 text-sm">{tab==='videos'?'Sin videos':tab==='saved'?'Sin guardados':tab==='likes'?'Sin me gusta':tab==='private'?'Sin privados':'Sin reposts'}</p>{tab==='videos'&&isOwn&&<button onClick={()=>setLocation('/create')} className="mt-5 px-6 py-2.5 rounded-full font-bold text-black text-sm" style={{background:'#00F5FF'}}>Grabar primer reto</button>}</div>}
        {tabVideos.length>0&&<p className="text-center text-gray-700 text-xs py-6">Has visto todos los vídeos</p>}
      </div>
    </div>
  );
}

// ===================== EDIT PROFILE =====================
function EditProfilePage() {
  const { user, token, refreshUser } = useAuth();
  const [, setLocation] = useLocation();
  const [form, setForm] = useState({ username:'', bio:'', city:'', avatarUrl:'' });
  const [saving, setSaving] = useState(false); const [msg, setMsg] = useState('');
  useEffect(()=>{ if(user) setForm({username:user.username||'',bio:user.bio||'',city:user.city||'',avatarUrl:user.avatarUrl||''}); },[user]);
  const save = async () => {
    if(!token)return; setSaving(true);
    try { const r=await fetch(`${API}/api/users/me`,{method:'PUT',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify(form)}); if(r.ok){await refreshUser();setMsg('✅ Guardado');setTimeout(()=>setLocation('/profile'),1200);}else setMsg('❌ Error'); } finally{setSaving(false);}
  };
  const set=(k:string)=>(e:React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement>)=>setForm(f=>({...f,[k]:e.target.value}));
  return (
    <div className="min-h-screen pb-20" style={{paddingTop:'56px',background:'#0b0b12'}}>
      <div className="flex items-center gap-3 px-4 py-3 border-b" style={{borderColor:'#1e1e2a'}}>
        <button onClick={()=>setLocation('/profile')}><X size={22} className="text-white"/></button>
        <h1 className="flex-1 text-white font-bold">Editar perfil</h1>
        <button onClick={save} disabled={saving} className="font-bold text-sm px-4 py-1.5 rounded-lg disabled:opacity-50" style={{background:'#00F5FF',color:'black'}}>{saving?<Spinner size={15}/>:'Guardar'}</button>
      </div>
      <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
        <div className="flex flex-col items-center gap-3">
          <div className="w-20 h-20 rounded-full overflow-hidden" style={{background:'#7c3aed',border:'3px solid #2a2a3a'}}>{form.avatarUrl?<img src={form.avatarUrl} alt="" className="w-full h-full object-cover"/>:<span className="w-full h-full flex items-center justify-center text-white font-black text-3xl">{form.username[0]?.toUpperCase()}</span>}</div>
          <input placeholder="URL foto de perfil" value={form.avatarUrl} onChange={set('avatarUrl')} className="w-full rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none text-center" style={{background:'#1e1e2a',border:'1px solid #2a2a3a'}}/>
        </div>
        {[{k:'username',l:'Nombre de usuario',p:'@username'},{k:'city',l:'Ciudad',p:'Tu ciudad'}].map(f=>(
          <div key={f.k}><label className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2 block">{f.l}</label><input value={(form as any)[f.k]} onChange={set(f.k)} placeholder={f.p} className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none" style={{background:'#1e1e2a',border:'1px solid #2a2a3a'}}/></div>
        ))}
        <div>
          <label className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2 block">Biografía</label>
          <textarea value={form.bio} onChange={set('bio')} rows={3} maxLength={150} placeholder="Cuéntanos sobre ti..." className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none resize-none" style={{background:'#1e1e2a',border:'1px solid #2a2a3a'}}/>
          <p className="text-gray-600 text-xs text-right mt-1">{form.bio.length}/150</p>
        </div>
        {msg&&<p className="text-center font-medium" style={{color:msg.includes('✅')?'#22c55e':'#ef4444'}}>{msg}</p>}
      </div>
    </div>
  );
}


// ===================== MESSAGES PAGE =====================
function MessagesPage() {
  const { user } = useAuth();
  const { data: convs, loading } = useApi('/api/users/messages/inbox', [user?._id]);
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState('');
  if(!user) return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6" style={{paddingTop:'56px',background:'#0b0b12'}}>
      <MessageCircle size={56} className="text-gray-700 mb-4"/>
      <h2 className="text-white font-bold text-xl mb-2">Inicia sesión</h2>
      <p className="text-gray-400 text-sm text-center mb-6">Conecta con otros usuarios de DOMINO</p>
      <button onClick={()=>setLocation('/auth')} className="px-8 py-3 rounded-2xl font-bold text-black" style={{background:'#00F5FF'}}>Entrar</button>
    </div>
  );
  const list=Array.isArray(convs)?convs:[];
  const filtered=search?list.filter((c:Conversation)=>c.user.username.toLowerCase().includes(search.toLowerCase())):list;
  return (
    <div className="min-h-screen pb-20" style={{paddingTop:'56px',background:'#0b0b12'}}>
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between px-4 py-4">
          <h1 className="text-xl font-black text-white">Mensajes</h1>
          <button onClick={()=>setLocation('/search')} className="p-2 rounded-lg" style={{background:'#1e1e2a'}}><Search size={18} className="text-gray-300"/></button>
        </div>
        <div className="px-4 mb-4">
          <div className="relative"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar conversaciones..." className="w-full rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none" style={{background:'#1e1e2a',border:'1px solid #2a2a3a'}}/></div>
        </div>
        {loading?<div className="flex justify-center py-12"><Spinner/></div>:filtered.length===0?(
          <div className="text-center py-20 px-6">
            <MessageCircle size={48} className="mx-auto text-gray-700 mb-4"/>
            <h3 className="text-white font-bold mb-2">{search?'Sin resultados':'Sin mensajes todavía'}</h3>
            <p className="text-gray-400 text-sm mb-6">{search?'Prueba otro nombre':'Sigue usuarios y empieza a chatear'}</p>
            {!search&&<button onClick={()=>setLocation('/search')} className="px-6 py-2.5 rounded-xl font-bold text-black text-sm" style={{background:'#00F5FF'}}>Buscar usuarios</button>}
          </div>
        ):(
          <div>{filtered.map((c:Conversation)=>(
            <button key={c.user._id} onClick={()=>setLocation(`/messages/${c.user._id}`)} className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-white/5 active:bg-white/10 transition-colors">
              <div className="relative"><Av u={c.user} s={52}/><div className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2" style={{background:'#22c55e',borderColor:'#0b0b12'}}/></div>
              <div className="flex-1 min-w-0 text-left">
                <div className="flex items-center justify-between mb-0.5"><span className={cn('font-semibold text-sm',c.unread>0?'text-white':'text-gray-200')}>{c.user.username}</span><span className="text-gray-500 text-xs">{ago(c.lastMessage?.createdAt)}</span></div>
                <p className={cn('text-xs truncate',c.unread>0?'text-gray-200 font-medium':'text-gray-500')}>{c.lastMessage?.text||'Nuevo chat'}</p>
              </div>
              {c.unread>0&&<span className="min-w-[20px] h-5 rounded-full text-xs font-bold text-white flex items-center justify-center px-1.5 flex-shrink-0" style={{background:'#FF007F'}}>{c.unread}</span>}
            </button>
          ))}</div>
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
  const [text, setText] = useState(''); const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(()=>{ bottomRef.current?.scrollIntoView({behavior:'smooth'}); },[msgs]);
  const send = async () => {
    if(!text.trim()||!token)return; setSending(true);
    const opt={_id:Date.now().toString(),fromUserId:{_id:user?._id||'',username:user?.username||'',avatarUrl:user?.avatarUrl||'',flag:''},toUserId:{_id:userId,username:'',avatarUrl:'',flag:''},text:text.trim(),read:false,createdAt:new Date().toISOString()};
    setData((p:Message[])=>[...(Array.isArray(p)?p:[]),opt]); setText('');
    try { const r=await fetch(`${API}/api/users/messages/${userId}`,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({text:opt.text})}); const m=await r.json(); if(r.ok)setData((p:Message[])=>[...(Array.isArray(p)?p:[]).filter(x=>x._id!==opt._id),m]); } finally{setSending(false);}
  };
  return (
    <div className="fixed inset-0 flex flex-col" style={{background:'#0b0b12'}}>
      <div className="flex items-center gap-3 px-4 py-3 border-b flex-shrink-0" style={{paddingTop:'max(12px,env(safe-area-inset-top))',background:'rgba(11,11,18,0.97)',borderColor:'#1e1e2a',backdropFilter:'blur(20px)'}}>
        <button onClick={()=>setLocation('/messages')} className="p-1"><ChevronLeft size={24} className="text-white"/></button>
        {other&&<button onClick={()=>setLocation(`/user/${userId}`)} className="flex items-center gap-3 flex-1"><Av u={other} s={38}/><div><p className="text-white font-bold text-sm">@{other.username}</p><p className="text-green-400 text-xs">activo ahora</p></div></button>}
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
        {loading&&<div className="flex justify-center py-8"><Spinner/></div>}
        {(Array.isArray(msgs)?msgs:[]).map((m:Message,i:number)=>{
          const isMe=m.fromUserId._id===user?._id;
          const prev=i>0?(Array.isArray(msgs)?msgs:[])[i-1]:null;
          const showAv=!isMe&&(!prev||prev.fromUserId._id!==m.fromUserId._id);
          return (
            <div key={m._id} className={cn('flex gap-2 items-end',isMe?'justify-end':'justify-start')}>
              {!isMe&&(showAv?<Av u={m.fromUserId} s={26}/>:<div className="w-[26px] flex-shrink-0"/>)}
              <div className={cn('max-w-[72%] px-3.5 py-2.5 text-sm leading-relaxed',isMe?'rounded-2xl rounded-br-md':'rounded-2xl rounded-bl-md')} style={isMe?{background:'#00F5FF',color:'#0b0b12'}:{background:'#1e1e2a',color:'white'}}>
                {m.text}
                <div className={cn('text-xs mt-1',isMe?'text-teal-700':'text-gray-600')}>{ago(m.createdAt)}</div>
              </div>
            </div>
          );
        })}
        {(Array.isArray(msgs)?msgs:[]).length===0&&!loading&&<div className="text-center py-12">{other&&<Av u={other} s={64}/>}<p className="text-white font-bold mt-4 mb-1">@{other?.username}</p><p className="text-gray-400 text-sm">Empieza la conversación</p></div>}
        <div ref={bottomRef}/>
      </div>
      <div className="flex-shrink-0 px-4 py-3 border-t flex items-center gap-3" style={{background:'rgba(11,11,18,0.97)',borderColor:'#1e1e2a',paddingBottom:'max(12px,env(safe-area-inset-bottom))'}}>
        <button className="text-xl">😊</button>
        <div className="flex-1 flex items-center gap-2 rounded-full px-4 py-2.5" style={{background:'#1e1e2a',border:'1px solid #2a2a3a'}}>
          <input value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send()} placeholder="Mensaje..." className="flex-1 bg-transparent text-white text-sm placeholder-gray-500 focus:outline-none"/>
        </div>
        {text.trim()?<button onClick={send} disabled={sending} className="w-10 h-10 rounded-full flex items-center justify-center disabled:opacity-50" style={{background:'#00F5FF'}}><Send size={16} className="text-black"/></button>:<button className="text-xl">🎁</button>}
      </div>
    </div>
  );
}

// ===================== SEARCH PAGE =====================
function SearchPage() {
  const [q, setQ] = useState(''); const [results, setResults] = useState<any[]>([]); const [loading, setLoading] = useState(false);
  const { token } = useAuth(); const [, setLocation] = useLocation();
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(()=>{ inputRef.current?.focus(); },[]);
  useEffect(()=>{
    if(q.length<2){setResults([]);return;}
    setLoading(true);
    fetch(`${API}/api/users/search?q=${encodeURIComponent(q)}`,{headers:token?{Authorization:`Bearer ${token}`}:{}})
      .then(r=>r.json()).then(setResults).catch(()=>{}).finally(()=>setLoading(false));
  },[q]);
  const TRENDING=['domino','reto','cadena','kindness','viral','baile','challenge','eco'];
  return (
    <div className="min-h-screen pb-20" style={{paddingTop:'56px',background:'#0b0b12'}}>
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="flex-1 relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"/>
            <input ref={inputRef} value={q} onChange={e=>setQ(e.target.value)} placeholder="Buscar usuarios, temas..." className="w-full rounded-xl pl-9 pr-9 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none" style={{background:'#1e1e2a',border:'1px solid #2a2a3a'}}/>
            {q&&<button onClick={()=>setQ('')} className="absolute right-3 top-1/2 -translate-y-1/2"><X size={14} className="text-gray-500"/></button>}
          </div>
          {q&&<button onClick={()=>setQ('')} className="text-gray-400 text-sm flex-shrink-0">Cancelar</button>}
        </div>
        {!q?(
          <div className="px-4">
            <h2 className="text-white font-bold text-base mb-3">Tendencias</h2>
            <div className="flex flex-wrap gap-2 mb-6">{TRENDING.map(t=><button key={t} onClick={()=>setQ(t)} className="flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium" style={{background:'#1e1e2a',color:'#00F5FF'}}><Hash size={12}/>#{t}</button>)}</div>
            <h2 className="text-white font-bold text-base mb-3">Retos activos 🔥</h2>
            <div className="space-y-3">
              {[{n:'Baila tu Día',c:'14.7K',e:'💃'},{n:'Eco Warrior',c:'8.9K',e:'🌿'},{n:'Cadena Kindness',c:'22.1K',e:'❤️'},{n:'Arte DOMINO',c:'5.3K',e:'🎨'}].map(r=>(
                <div key={r.n} className="flex items-center gap-3 p-3 rounded-xl" style={{background:'#1e1e2a'}}>
                  <span className="text-2xl">{r.e}</span>
                  <div className="flex-1"><p className="text-white font-semibold text-sm">{r.n}</p><p className="text-gray-400 text-xs">{r.c} cadenas</p></div>
                  <button className="px-3 py-1 rounded-full text-xs font-bold text-black" style={{background:'#00F5FF'}}>Unirse</button>
                </div>
              ))}
            </div>
          </div>
        ):(
          <div>
            {loading&&<div className="flex justify-center py-8"><Spinner/></div>}
            {!loading&&results.length===0&&q.length>=2&&<div className="text-center py-16 px-6"><Search size={40} className="mx-auto text-gray-700 mb-3"/><p className="text-gray-400">Sin resultados para "{q}"</p></div>}
            {results.map((u:RankingEntry)=>(
              <button key={u._id} onClick={()=>setLocation(`/user/${u._id}`)} className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-white/5 transition-colors">
                <Av u={u} s={48}/>
                <div className="flex-1 min-w-0 text-left"><p className="text-white font-semibold text-sm">@{u.username}</p><p className="text-gray-400 text-xs">{u.flag} {u.country} · {fmt(u.followers?.length||0)} seguidores</p></div>
                <div className="text-xs font-bold px-3 py-1 rounded-full" style={{background:'rgba(0,245,255,0.1)',color:'#00F5FF'}}>{fmt(u.impactPoints)} pts</div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ===================== NOTIFICATIONS =====================
function NotificationsPage() {
  const { user, token } = useAuth();
  const { data: notifs, setData: setNotifs } = useApi('/api/notifications', [user?._id]);
  const [, setLocation] = useLocation();
  const markAll=async()=>{ if(!token)return; await fetch(`${API}/api/notifications/read-all`,{method:'PUT',headers:{Authorization:`Bearer ${token}`}}); setNotifs((p:Notification[])=>Array.isArray(p)?p.map(n=>({...n,read:true})):p); };
  if(!user) return <div className="min-h-screen flex items-center justify-center" style={{paddingTop:'56px',background:'#0b0b12'}}><button onClick={()=>setLocation('/auth')} className="px-6 py-3 rounded-xl font-bold text-black" style={{background:'#00F5FF'}}>Entrar</button></div>;
  const list=Array.isArray(notifs)?notifs:[];
  const ICONS: Record<string,string>={nomination:'🎯',chain_continued:'⛓️',liked:'❤️',followed:'👤',default:'🏆'};
  return (
    <div className="min-h-screen pb-20" style={{paddingTop:'56px',background:'#0b0b12'}}>
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between px-4 py-4">
          <h1 className="text-xl font-black text-white">Notificaciones</h1>
          {list.some(n=>!n.read)&&<button onClick={markAll} className="text-xs font-semibold px-3 py-1.5 rounded-lg" style={{background:'rgba(0,245,255,0.1)',color:'#00F5FF'}}>Marcar todas</button>}
        </div>
        {list.length===0&&<div className="text-center py-20 px-6"><Bell size={48} className="mx-auto text-gray-700 mb-4"/><h3 className="text-white font-bold mb-2">Sin notificaciones</h3><p className="text-gray-400 text-sm">Aquí verás likes, comentarios y nominaciones</p></div>}
        <div className="divide-y" style={{borderColor:'rgba(255,255,255,0.05)'}}>
          {list.map((n:Notification)=>(
            <div key={n._id} className={cn('flex items-start gap-3 px-4 py-3.5',!n.read?'bg-white/3':'')}>
              <div className="w-11 h-11 rounded-full flex items-center justify-center text-xl flex-shrink-0" style={{background:'#1e1e2a'}}>{ICONS[n.type]||ICONS.default}</div>
              <div className="flex-1 min-w-0">{n.fromUserId&&<p className="text-xs text-gray-400 mb-0.5">@{n.fromUserId.username}</p>}<p className="text-white text-sm">{n.message}</p><p className="text-gray-500 text-xs mt-1">{ago(n.createdAt)}</p></div>
              {!n.read&&<div className="w-2 h-2 rounded-full flex-shrink-0 mt-2" style={{background:'#FF007F'}}/>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ===================== SETTINGS =====================
function SettingsPage() {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const sections = [
    {title:'Cuenta',items:[{l:'Información de cuenta',a:()=>setLocation('/profile/edit'),e:'👤'},{l:'Privacidad',a:()=>{},e:'🔒'},{l:'Seguridad',a:()=>{},e:'🛡️'}]},
    {title:'General',items:[{l:'Notificaciones',a:()=>setLocation('/notifications'),e:'🔔'},{l:'Uso de datos',a:()=>{},e:'📱'},{l:'Ayuda y soporte',a:()=>{},e:'❓'},{l:'Acerca de DOMINO',a:()=>{},e:'ℹ️'}]},
    {title:'Monedas',items:[{l:'Comprar monedas',a:()=>setLocation('/coins'),e:'🪙'},{l:'Ranking global',a:()=>setLocation('/map'),e:'🏆'}]},
  ];
  return (
    <div className="min-h-screen pb-20" style={{paddingTop:'56px',background:'#0b0b12'}}>
      <div className="flex items-center gap-3 px-4 py-3 border-b" style={{borderColor:'#1e1e2a'}}>
        <button onClick={()=>setLocation('/profile')}><ChevronLeft size={24} className="text-white"/></button>
        <h1 className="text-white font-bold flex-1">Ajustes</h1>
      </div>
      <div className="max-w-lg mx-auto px-4 py-4 space-y-6">
        {user&&<div className="flex items-center gap-3 p-4 rounded-2xl" style={{background:'#1e1e2a'}}><Av u={user} s={48}/><div><p className="text-white font-bold">@{user.username}</p><p className="text-gray-400 text-sm">{user.email}</p></div></div>}
        {sections.map(s=>(
          <div key={s.title}>
            <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-2 px-1">{s.title}</p>
            <div className="rounded-2xl overflow-hidden" style={{background:'#1e1e2a'}}>
              {s.items.map((item,i)=><button key={item.l} onClick={item.a} className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-white/5 text-left" style={i>0?{borderTop:'1px solid rgba(255,255,255,0.05)'}:{}}><span className="text-lg w-7 text-center">{item.e}</span><span className="text-white text-sm flex-1">{item.l}</span><ChevronRight size={15} className="text-gray-600"/></button>)}
            </div>
          </div>
        ))}
        <button onClick={()=>{logout();setLocation('/');}} className="w-full py-3.5 rounded-2xl font-bold border transition-colors" style={{color:'#ef4444',borderColor:'rgba(239,68,68,0.3)',background:'rgba(239,68,68,0.05)'}}>Cerrar sesión</button>
        <p className="text-center text-gray-700 text-xs">DOMINO v2.0 · © 2026 The Real-World Chain Reaction</p>
      </div>
    </div>
  );
}

// ===================== COINS =====================
function CoinsPage() {
  const { user, token, refreshUser } = useAuth();
  const [, setLocation] = useLocation();
  const [buying, setBuying] = useState<string|null>(null); const [msg, setMsg] = useState('');
  const PACKS=[{id:'s',coins:100,price:'0.99€',emoji:'🪙',label:'Starter',popular:false,bonus:''},{id:'m',coins:500,price:'3.99€',emoji:'💰',label:'Popular',popular:true,bonus:'+50 GRATIS'},{id:'l',coins:1200,price:'7.99€',emoji:'💎',label:'Pro',popular:false,bonus:'+200 GRATIS'},{id:'xl',coins:3000,price:'17.99€',emoji:'👑',label:'Elite',popular:false,bonus:'+500 GRATIS'}];
  const buy=async(p:typeof PACKS[0])=>{
    if(!token){setLocation('/auth');return;} setBuying(p.id);
    try { const r=await fetch(`${API}/api/coins/purchase`,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({packId:p.id,coins:p.coins})}); if(r.ok){await refreshUser();setMsg(`✅ +${p.coins} monedas!`);setTimeout(()=>setMsg(''),3000);}else setMsg('❌ Error'); } finally{setBuying(null);}
  };
  return (
    <div className="min-h-screen pb-20" style={{paddingTop:'56px',background:'#0b0b12'}}>
      <div className="flex items-center gap-3 px-4 py-3 border-b" style={{borderColor:'#1e1e2a'}}>
        <button onClick={()=>setLocation(-1 as any)}><ChevronLeft size={24} className="text-white"/></button>
        <h1 className="text-white font-bold flex-1">Monedas DOMINO</h1>
        <div className="font-bold text-sm" style={{color:'#00F5FF'}}>🪙 {(user?.coins||0).toLocaleString()}</div>
      </div>
      <div className="max-w-lg mx-auto px-4 py-6">
        <div className="text-center mb-8"><div className="text-6xl mb-3">🪙</div><p className="text-5xl font-black" style={{color:'#00F5FF'}}>{(user?.coins||0).toLocaleString()}</p><p className="text-gray-400 text-sm mt-1">monedas disponibles</p></div>
        <h3 className="text-white font-bold mb-4">Packs de monedas</h3>
        <div className="grid grid-cols-2 gap-3 mb-6">
          {PACKS.map(p=>(
            <button key={p.id} onClick={()=>buy(p)} disabled={!!buying} className="relative p-4 rounded-2xl text-left active:scale-95 transition-all disabled:opacity-60" style={{background:p.popular?'linear-gradient(135deg,rgba(0,245,255,0.12),rgba(124,58,237,0.12))':'#1e1e2a',border:p.popular?'1px solid rgba(0,245,255,0.3)':'1px solid #2a2a3a'}}>
              {p.popular&&<span className="absolute -top-2 left-1/2 -translate-x-1/2 text-xs font-bold px-2 py-0.5 rounded-full whitespace-nowrap" style={{background:'#00F5FF',color:'black'}}>MÁS POPULAR</span>}
              <div className="text-3xl mb-2">{p.emoji}</div>
              <p className="text-white font-black text-xl">{p.coins.toLocaleString()}</p>
              <p className="text-gray-400 text-xs mb-1">{p.label}</p>
              {p.bonus&&<p className="text-xs font-bold mb-1" style={{color:'#00F5FF'}}>{p.bonus}</p>}
              <p className="text-white font-bold text-sm">{buying===p.id?<Spinner size={14}/>:p.price}</p>
            </button>
          ))}
        </div>
        {msg&&<div className="text-center p-3 rounded-xl mb-4" style={{background:'rgba(0,245,255,0.1)',border:'1px solid rgba(0,245,255,0.2)'}}><p className="text-white font-medium">{msg}</p></div>}
        <div className="rounded-2xl p-4" style={{background:'#1e1e2a'}}>
          <h4 className="text-white font-bold mb-3 text-sm">¿Para qué sirven?</h4>
          <div className="space-y-2">{[['🎁','Enviar regalos en directos'],['⭐','Destacar tu perfil'],['🏆','Subir en el ranking']].map(([e,t])=><div key={t as string} className="flex items-center gap-2"><span>{e}</span><span className="text-gray-300 text-sm">{t}</span></div>)}</div>
        </div>
      </div>
    </div>
  );
}


// ===================== LIVE LIST =====================
function LiveListPage() {
  const { token, user } = useAuth();
  const [, setLocation] = useLocation();
  const [lives, setLives] = useState<LiveStream[]>([]); const [livesLoading, setLivesLoading] = useState(true);
  const [previewLive, setPreviewLive] = useState<LiveStream|null>(null);
  useEffect(()=>{
    const fetchLives=async()=>{ try { const r=await fetch(`${API}/api/lives`,{headers:token?{Authorization:`Bearer ${token}`}:{}}); if(r.ok){const d=await r.json();setLives((Array.isArray(d)?d:[]).filter((l:LiveStream)=>l.status==='active'||l.status==='live'));} } catch{} finally{setLivesLoading(false);} };
    fetchLives(); const t=setInterval(fetchLives,30000); return()=>clearInterval(t);
  },[token]);
  useEffect(()=>{ if(previewLive&&!lives.find(l=>l._id===previewLive._id))setPreviewLive(null); },[lives,previewLive]);
  if(previewLive) return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center" style={{background:'linear-gradient(180deg,#0d0020,#1a0030)'}}>
      <button onClick={()=>setPreviewLive(null)} className="absolute top-12 right-4 p-2 rounded-full" style={{background:'rgba(255,255,255,0.1)'}}><X size={20} className="text-white"/></button>
      <div className="relative mb-6">
        <div className="absolute inset-0 rounded-full" style={{background:'radial-gradient(circle,rgba(255,0,127,0.4),transparent)',transform:'scale(1.4)'}}/>
        <div className="w-32 h-32 rounded-full overflow-hidden" style={{border:'3px solid #FF007F',boxShadow:'0 0 40px rgba(255,0,127,0.5)'}}>
          {previewLive.userId?.avatarUrl?<img src={previewLive.userId.avatarUrl} alt="" className="w-full h-full object-cover"/>:<div className="w-full h-full flex items-center justify-center text-white font-black text-4xl" style={{background:'#7c3aed'}}>{previewLive.userId?.username?.[0]?.toUpperCase()}</div>}
        </div>
      </div>
      <div className="flex items-center gap-2 mb-2"><div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"/><span className="text-white text-xs font-bold uppercase tracking-wider">En Directo</span></div>
      <h2 className="text-white font-black text-2xl mb-1">@{previewLive.userId?.username}</h2>
      <p className="text-gray-400 text-sm mb-2">{previewLive.title}</p>
      <p className="text-gray-500 text-xs mb-8"><Eye size={10} className="inline mr-1"/>{previewLive.viewerCount||0} espectadores</p>
      <button onClick={()=>setLocation(`/live/${previewLive._id}`)} className="flex items-center gap-3 px-10 py-4 rounded-full font-black text-white" style={{background:'linear-gradient(135deg,#FF007F,#c0006a)',boxShadow:'0 0 30px rgba(255,0,127,0.4)'}}>
        <div className="w-2 h-2 rounded-full bg-white animate-pulse"/>UNIRSE AL DIRECTO
      </button>
    </div>
  );
  return (
    <div className="min-h-screen pb-20" style={{paddingTop:'56px',background:'#0b0b12'}}>
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full animate-pulse" style={{background:'#FF007F'}}/><h1 className="text-xl font-black text-white">En Directo</h1></div>
          {user&&<button onClick={()=>setLocation('/live/create')} className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-white text-sm" style={{background:'#FF007F'}}><Video size={14}/>Iniciar</button>}
        </div>
        {livesLoading?<div className="flex justify-center py-12"><Spinner/></div>:lives.length===0?(
          <div className="text-center py-20"><div className="text-5xl mb-4">📡</div><h3 className="text-xl font-bold text-white mb-2">Nadie en directo ahora</h3><p className="text-gray-400 text-sm mb-6">¡Sé el primero!</p>{user&&<button onClick={()=>setLocation('/live/create')} className="px-6 py-3 rounded-xl font-bold text-white" style={{background:'#FF007F'}}>Empezar directo</button>}</div>
        ):(
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {lives.map((l:LiveStream)=>(
              <button key={l._id} onClick={()=>setPreviewLive(l)} className="relative rounded-2xl overflow-hidden text-left" style={{aspectRatio:'9/16',background:'linear-gradient(180deg,#0d0020,#1a0030)',border:'1px solid rgba(255,0,127,0.2)'}}>
                <div className="absolute inset-0 flex items-center justify-center"><div className="w-16 h-16 rounded-full overflow-hidden" style={{border:'2px solid #FF007F',boxShadow:'0 0 20px rgba(255,0,127,0.4)'}}>{l.userId?.avatarUrl?<img src={l.userId.avatarUrl} alt="" className="w-full h-full object-cover"/>:<div className="w-full h-full flex items-center justify-center font-black text-2xl text-white" style={{background:'#7c3aed'}}>{l.userId?.username?.[0]?.toUpperCase()}</div>}</div></div>
                <div className="absolute top-2 left-2 flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs font-bold text-white" style={{background:'#FF007F'}}><div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"/>LIVE</div>
                <div className="absolute top-2 right-2 flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs text-white" style={{background:'rgba(0,0,0,0.6)'}}><Eye size={9}/>{l.viewerCount}</div>
                <div className="absolute bottom-0 left-0 right-0 p-2.5" style={{background:'linear-gradient(to top,rgba(0,0,0,0.8),transparent)'}}><p className="text-white text-xs font-bold truncate">@{l.userId?.username}</p><p className="text-gray-300 text-xs truncate">{l.title}</p></div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ===================== CREATE LIVE =====================
function CreateLivePage() {
  const { user, token } = useAuth(); const [, setLocation] = useLocation();
  const [form, setForm] = useState({title:'',description:'',category:'General',isBattle:false});
  const [loading, setLoading] = useState(false); const [error, setError] = useState('');
  if(!user) return <div className="min-h-screen flex items-center justify-center" style={{background:'#0b0b12'}}><button onClick={()=>setLocation('/auth')} className="px-6 py-3 rounded-xl font-bold text-black" style={{background:'#00F5FF'}}>Entrar</button></div>;
  const create=async()=>{
    if(!form.title.trim())return setError('Escribe un título'); setError(''); setLoading(true);
    try {
      const r=await fetch(`${API}/api/lives`,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify(form)});
      const d=await r.json();
      if(!r.ok)throw new Error(d.error||'Error');
      setLocation(`/live/${d.live._id}`);
    } catch(e:any){setError(e.message);} finally{setLoading(false);}
  };
  return (
    <div className="min-h-screen" style={{background:'#0b0b12'}}>
      <div className="flex items-center gap-3 px-4 py-4 border-b" style={{paddingTop:'max(16px,env(safe-area-inset-top))',borderColor:'#1e1e2a'}}>
        <button onClick={()=>setLocation(-1 as any)}><X size={22} className="text-white"/></button>
        <h1 className="text-white font-bold flex-1">Iniciar directo</h1>
      </div>
      <div className="max-w-lg mx-auto px-4 py-8 space-y-4">
        <div className="text-center mb-6">
          <div className="w-24 h-24 rounded-full mx-auto overflow-hidden mb-3" style={{border:'3px solid #FF007F',boxShadow:'0 0 30px rgba(255,0,127,0.3)'}}>
            {user.avatarUrl?<img src={user.avatarUrl} alt="" className="w-full h-full object-cover"/>:<div className="w-full h-full flex items-center justify-center font-black text-3xl text-white" style={{background:'#7c3aed'}}>{user.username[0]?.toUpperCase()}</div>}
          </div>
          <p className="text-white font-bold">@{user.username}</p>
        </div>
        <input placeholder="Título del directo" value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} className="w-full rounded-2xl px-4 py-3.5 text-sm text-white placeholder-gray-500 focus:outline-none" style={{background:'#1e1e2a',border:'1px solid #2a2a3a'}}/>
        <input placeholder="Descripción (opcional)" value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} className="w-full rounded-2xl px-4 py-3.5 text-sm text-white placeholder-gray-500 focus:outline-none" style={{background:'#1e1e2a',border:'1px solid #2a2a3a'}}/>
        <select value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))} className="w-full rounded-2xl px-4 py-3.5 text-sm text-white focus:outline-none" style={{background:'#1e1e2a',border:'1px solid #2a2a3a'}}>
          {['General','Creativity','Kindness','Eco','Challenge','Battle'].map(c=><option key={c} value={c}>{c}</option>)}
        </select>
        <label className="flex items-center gap-3 p-4 rounded-2xl cursor-pointer" style={{background:'#1e1e2a'}}>
          <div className="flex-1"><p className="text-white font-medium text-sm">Modo batalla VS</p><p className="text-gray-400 text-xs">Compite con otro streamer en tiempo real</p></div>
          <div className="w-11 h-6 rounded-full relative transition-all" style={{background:form.isBattle?'#FF007F':'#374151'}} onClick={()=>setForm(f=>({...f,isBattle:!f.isBattle}))}>
            <div className={cn('absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all',form.isBattle?'left-5':'left-0.5')}/>
          </div>
        </label>
        {error&&<p className="text-red-400 text-sm text-center">{error}</p>}
        <button onClick={create} disabled={loading} className="w-full py-4 rounded-2xl font-bold text-white flex items-center justify-center gap-2 disabled:opacity-50" style={{background:'linear-gradient(135deg,#FF007F,#c0006a)',boxShadow:'0 0 20px rgba(255,0,127,0.3)'}}>
          {loading?<Spinner/>:<><Video size={18}/>Empezar directo</>}
        </button>
      </div>
    </div>
  );
}

// ===================== LIVE VIEWER — con LiveKit vídeo real =====================
function LiveViewerPage({ id }: { id: string }) {
  const { user, token, refreshUser } = useAuth();
  const [, setLocation] = useLocation();

  // LiveKit state
  const [room, setRoom] = useState<any>(null);
  const [connected, setConnected] = useState(false);
  const [participants, setParticipants] = useState<any[]>([]);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const roomRef = useRef<any>(null);

  // Live metadata
  const [live, setLive] = useState<LiveStream|null>(null);
  const [liveEnded, setLiveEnded] = useState(false);
  const [isHost, setIsHost] = useState(false);
  const liveRef = useRef<LiveStream|null>(null);
  useEffect(()=>{ liveRef.current=live; },[live]);

  // Join LiveKit room
  useEffect(()=>{
    if(!token||!id) return;
    let r: any = null;

    const joinRoom = async () => {
      try {
        // 1. Get token + room info from backend
        const res = await fetch(`${API}/api/lives/${id}/join`, {
          method:'POST',
          headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'}
        });
        if(!res.ok){ setLiveEnded(true); return; }
        const data = await res.json();
        setLive(data.live);
        setIsHost(data.isHost);

        if(!data.token || !data.livekitUrl) return;

        // 2. Connect to LiveKit
        const { Room, RoomEvent, Track } = await import('livekit-client');
        r = new Room({ adaptiveStream:true, dynacast:true });
        roomRef.current = r;

        r.on(RoomEvent.ParticipantConnected, ()=>setParticipants([...r.participants.values()]));
        r.on(RoomEvent.ParticipantDisconnected, ()=>setParticipants([...r.participants.values()]));
        r.on(RoomEvent.TrackSubscribed, (track:any, pub:any, participant:any)=>{
          if(track.kind===Track.Kind.Video && remoteVideoRef.current){
            track.attach(remoteVideoRef.current);
          }
        });
        r.on(RoomEvent.Disconnected, ()=>{
          setConnected(false);
          if(liveRef.current) setLiveEnded(true);
        });

        await r.connect(data.livekitUrl, data.token);
        setConnected(true);
        setRoom(r);
        setParticipants([...r.participants.values()]);

        // 3. If host, publish camera
        if(data.isHost){
          await r.localParticipant.enableCameraAndMicrophone();
          const camPub = r.localParticipant.getTrackPublication(Track.Source.Camera);
          if(camPub?.track && localVideoRef.current){
            camPub.track.attach(localVideoRef.current);
          }
        }
      } catch(e){ console.error('LiveKit error:', e); }
    };

    joinRoom();

    return ()=>{
      if(r) r.disconnect();
      // Leave backend counter
      fetch(`${API}/api/lives/${id}/leave`,{method:'POST',headers:{Authorization:`Bearer ${token}`}}).catch(()=>{});
    };
  },[id, token]);

  // Poll for live status if NOT connected via LiveKit (fallback)
  useEffect(()=>{
    if(connected) return;
    const fetch_ = async () => {
      try {
        const r=await fetch(`${API}/api/lives`,{headers:token?{Authorization:`Bearer ${token}`}:{}});
        if(r.ok){ const d=await r.json(); const found=(Array.isArray(d)?d:[]).find((l:LiveStream)=>l._id===id); if(!found||(found.status!=='active'&&found.status!=='live')){ if(liveRef.current)setLiveEnded(true); } else setLive(found); }
      } catch{}
    };
    fetch_();
    const t=setInterval(fetch_,20000);
    return()=>clearInterval(t);
  },[id,token,connected]);

  // End live (host only)
  const endLive = async () => {
    if(!token) return;
    await fetch(`${API}/api/lives/${id}`,{method:'DELETE',headers:{Authorization:`Bearer ${token}`}});
    if(roomRef.current) roomRef.current.disconnect();
    setLocation('/live');
  };

  // Chat & gifts
  const [msgs, setMsgs] = useState<{id:number;user:string;text:string;type?:string}[]>([{id:0,user:'Sistema',text:'¡Bienvenido al directo! 🎲',type:'system'}]);
  const [input, setInput] = useState(''); const [showGifts, setShowGifts] = useState(false);
  const [giftAnim, setGiftAnim] = useState<{emoji:string;name:string;user:string}|null>(null);
  const [viewers, setViewers] = useState(0); const [following, setFollowing] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);

  useEffect(()=>{ if(live)setViewers(live.viewerCount||0); },[live]);
  useEffect(()=>{ const t=setInterval(()=>setViewers(v=>Math.max(0,v+Math.floor(Math.random()*3-1))),5000); return()=>clearInterval(t); },[]);
  useEffect(()=>{ if(chatRef.current)chatRef.current.scrollTop=chatRef.current.scrollHeight; },[msgs]);
  useEffect(()=>{
    const F=['🔥🔥','que guay!!','sigue así 💪','increíble','😍😍','me encanta','❤️❤️','wow'];
    const U=['carlos_m','lucia_b','yuki_t','pablo_c','nina_r'];
    const t=setInterval(()=>{ setMsgs(p=>[...p.slice(-40),{id:Date.now(),user:U[Math.floor(Math.random()*U.length)],text:F[Math.floor(Math.random()*F.length)]}]); },2500+Math.random()*3000);
    return()=>clearInterval(t);
  },[]);

  const sendMsg=()=>{ if(!input.trim()||!user)return; setMsgs(m=>[...m,{id:Date.now(),user:user.username,text:input}]); setInput(''); };
  const sendGift=async(type:string)=>{
    const g=GIFT_CATALOG[type]; if((user?.coins||0)<g.coins){alert('Monedas insuficientes');return;}
    setShowGifts(false); setGiftAnim({emoji:g.emoji,name:g.name,user:user?.username||''}); setTimeout(()=>setGiftAnim(null),3000);
    setMsgs(m=>[...m,{id:Date.now(),user:user?.username||'',text:`envió ${g.emoji} ${g.name}`,type:'gift'}]);
    if(token){await fetch(`${API}/api/coins/gift`,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({liveId:id,giftType:type,quantity:1})}); await refreshUser();}
  };
  const doFollow=async()=>{ if(!token||!live)return; setFollowing(f=>!f); await fetch(`${API}/api/users/${live.userId._id}/follow`,{method:'POST',headers:{Authorization:`Bearer ${token}`}}); };

  if(liveEnded) return (
    <div className="fixed inset-0 flex flex-col items-center justify-center" style={{background:'#0b0b12'}}>
      <div className="text-5xl mb-4">📡</div>
      <h2 className="text-white font-black text-xl mb-2">El directo ha terminado</h2>
      <p className="text-gray-400 text-sm mb-8">El streamer ha finalizado la transmisión</p>
      <button onClick={()=>setLocation('/live')} className="px-6 py-3 rounded-xl font-bold text-white" style={{background:'#FF007F'}}>Ver otros directos</button>
    </div>
  );

  if(!live) return (
    <div className="fixed inset-0 flex items-center justify-center" style={{background:'#0b0b12'}}>
      <div className="flex flex-col items-center gap-3"><Spinner size={32}/><p className="text-gray-400 text-sm">Conectando al directo...</p></div>
    </div>
  );

  return (
    <div className="fixed inset-0" style={{background:'#000'}}>
      {/* VIDEO — remoto (espectador ve al host) */}
      <video ref={remoteVideoRef} className="absolute inset-0 w-full h-full object-cover" autoPlay playsInline muted={false} style={{display: connected && !isHost ? 'block' : 'none'}}/>

      {/* VIDEO — local (host se ve a sí mismo) */}
      <video ref={localVideoRef} className="absolute inset-0 w-full h-full object-cover" autoPlay playsInline muted={true} style={{display: isHost && connected ? 'block' : 'none', transform:'scaleX(-1)'}}/>

      {/* Fondo si no hay vídeo aún */}
      {(!connected || (!isHost && participants.length === 0)) && (
        <div className="absolute inset-0 flex items-center justify-center" style={{background:'linear-gradient(180deg,#1a0030,#0d001a)'}}>
          <div className="text-center">
            <div className="w-24 h-24 rounded-full overflow-hidden mx-auto mb-4" style={{border:'3px solid #FF007F',boxShadow:'0 0 30px rgba(255,0,127,0.5)'}}>
              {live.userId?.avatarUrl?<img src={live.userId.avatarUrl} alt="" className="w-full h-full object-cover"/>:<div className="w-full h-full flex items-center justify-center font-black text-3xl text-white" style={{background:'#7c3aed'}}>{live.userId?.username?.[0]?.toUpperCase()}</div>}
            </div>
            <p className="text-white font-bold">@{live.userId?.username}</p>
            <p className="text-gray-400 text-sm mt-1">{connected?'En directo':'Conectando...'}</p>
            {!connected && <div className="mt-3"><Spinner/></div>}
          </div>
        </div>
      )}

      {/* Gradiente overlay */}
      <div className="absolute inset-0 pointer-events-none" style={{background:'linear-gradient(to bottom,rgba(0,0,0,0.4) 0%,transparent 30%,transparent 50%,rgba(0,0,0,0.6) 100%)'}}/>

      {/* HEADER */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center gap-2 px-3 pb-3" style={{paddingTop:'max(48px,env(safe-area-inset-top))',background:'linear-gradient(to bottom,rgba(0,0,0,0.5),transparent)'}}>
        <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0" style={{border:'2px solid #FF007F'}}>
          {live.userId?.avatarUrl?<img src={live.userId.avatarUrl} alt="" className="w-full h-full object-cover"/>:<div className="w-full h-full flex items-center justify-center font-bold text-white" style={{background:'#7c3aed'}}>{live.userId?.username?.[0]?.toUpperCase()}</div>}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-bold text-sm truncate">{live.userId?.username}</p>
          {connected && <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"/><span className="text-red-400 text-xs font-bold">EN DIRECTO</span></div>}
        </div>
        {!isHost && <button onClick={doFollow} className="px-4 py-1.5 rounded-full text-sm font-bold flex-shrink-0" style={following?{background:'transparent',border:'1px solid #aaa',color:'white'}:{background:'#FF007F',color:'white'}}>{following?'Siguiendo':'+ Seguir'}</button>}
        <div className="flex items-center gap-1 px-2 py-1 rounded-full flex-shrink-0" style={{background:'rgba(0,0,0,0.4)'}}><Eye size={11} className="text-white"/><span className="text-white text-xs font-bold">{fmt(viewers)}</span></div>
        {isHost
          ? <button onClick={endLive} className="px-3 py-1.5 rounded-full text-xs font-bold flex-shrink-0" style={{background:'rgba(255,0,0,0.7)',color:'white'}}>Terminar</button>
          : <button onClick={()=>setLocation('/live')} className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{background:'rgba(255,255,255,0.15)'}}><X size={16} className="text-white"/></button>
        }
      </div>

      {/* Mini preview local para host (esquina) */}
      {isHost && connected && (
        <div className="absolute top-24 right-3 z-20 w-24 h-36 rounded-xl overflow-hidden" style={{border:'2px solid rgba(255,255,255,0.3)'}}>
          <video ref={localVideoRef} className="w-full h-full object-cover" autoPlay playsInline muted style={{transform:'scaleX(-1)'}}/>
        </div>
      )}

      {/* Gift animation */}
      {giftAnim&&<div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 text-center animate-bounce"><div className="text-6xl mb-1">{giftAnim.emoji}</div><div className="px-3 py-1.5 rounded-full" style={{background:'rgba(255,0,127,0.3)',border:'1px solid #FF007F'}}><span className="text-white font-bold text-sm">@{giftAnim.user} → {giftAnim.name}</span></div></div>}

      {/* Chat */}
      <div className="absolute left-0 right-16 z-20 px-3" style={{bottom:'85px',maxHeight:'35vh',overflow:'hidden'}}>
        <div ref={chatRef} className="flex flex-col gap-1 overflow-y-auto" style={{maxHeight:'35vh'}}>
          {msgs.map(m=>(
            <div key={m.id}>
              {m.type==='system'?<span className="text-gray-400 text-xs text-center block py-0.5">{m.text}</span>
              :m.type==='gift'?<div className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full" style={{background:'linear-gradient(135deg,rgba(255,0,127,0.4),rgba(124,58,237,0.4))',border:'1px solid rgba(255,0,127,0.4)'}}><span className="text-white text-xs font-bold">🎁 @{m.user} {m.text}</span></div>
              :<div className="flex items-baseline gap-1.5"><span className="text-white text-xs font-bold" style={{textShadow:'0 1px 3px rgba(0,0,0,0.8)'}}>@{m.user}</span><span className="text-white text-xs" style={{textShadow:'0 1px 3px rgba(0,0,0,0.8)'}}>{m.text}</span></div>}
            </div>
          ))}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="absolute bottom-0 left-0 right-0 z-20 px-3 pt-2" style={{paddingBottom:'max(20px,env(safe-area-inset-bottom))',background:'linear-gradient(to top,rgba(0,0,0,0.7),transparent)'}}>
        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center rounded-full px-3 py-2.5" style={{background:'rgba(255,255,255,0.1)',border:'1px solid rgba(255,255,255,0.15)'}}>
            <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&sendMsg()} placeholder="Escribe algo..." className="flex-1 bg-transparent text-white placeholder-gray-400 text-sm focus:outline-none"/>
          </div>
          <button className="w-10 h-10 rounded-full flex items-center justify-center text-xl" style={{background:'rgba(255,255,255,0.1)'}}>😊</button>
          {!isHost && <button onClick={()=>setShowGifts(true)} className="w-10 h-10 rounded-full flex items-center justify-center" style={{background:'rgba(255,0,127,0.3)',border:'1px solid rgba(255,0,127,0.4)'}}><Gift size={18} className="text-white"/></button>}
          <button className="flex flex-col items-center gap-0.5"><div className="w-10 h-10 rounded-full flex items-center justify-center" style={{background:'rgba(255,255,255,0.1)'}}><Share size={16} className="text-white"/></div><span className="text-white text-xs">{fmt(viewers)}</span></button>
        </div>
      </div>

      {/* Gifts panel */}
      {showGifts&&(
        <div className="absolute inset-x-0 bottom-0 z-30 rounded-t-3xl" style={{background:'#13131f',paddingBottom:'max(24px,env(safe-area-inset-bottom))'}}>
          <div className="w-10 h-1 rounded-full mx-auto mt-3 mb-4" style={{background:'#2a2a3a'}}/>
          <div className="flex items-center justify-between px-5 mb-4"><h3 className="font-black text-white">Enviar regalo</h3><div className="flex items-center gap-3"><span className="font-bold text-yellow-400">🪙 {(user?.coins||0).toLocaleString()}</span><button onClick={()=>setShowGifts(false)}><X size={18} className="text-gray-400"/></button></div></div>
          <div className="grid grid-cols-4 gap-3 px-5 mb-4">
            {Object.entries(GIFT_CATALOG).map(([k,g])=>(
              <button key={k} onClick={()=>sendGift(k)} disabled={(user?.coins||0)<g.coins} className="flex flex-col items-center gap-1.5 p-3 rounded-2xl disabled:opacity-40" style={{background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.08)'}}>
                <span className="text-3xl">{g.emoji}</span>
                <span className="text-white text-xs font-semibold">{g.name}</span>
                <span className="text-yellow-400 text-xs">{g.coins}🪙</span>
              </button>
            ))}
          </div>
          <div className="px-5"><Link href="/coins" onClick={()=>setShowGifts(false)} className="block w-full py-3 rounded-2xl text-center font-bold text-sm" style={{background:'rgba(0,245,255,0.1)',color:'#00F5FF',border:'1px solid rgba(0,245,255,0.2)'}}>+ Comprar monedas</Link></div>
        </div>
      )}
    </div>
  );
}

// ===================== CAMERA =====================
function CameraPage() {
  const { user } = useAuth(); const [, setLocation] = useLocation();
  const videoRef = useRef<HTMLVideoElement>(null); const mrRef = useRef<MediaRecorder|null>(null);
  const chunksRef = useRef<Blob[]>([]); const streamRef = useRef<MediaStream|null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval>|null>(null);
  const [camOn, setCamOn] = useState(false); const [rec, setRec] = useState(false);
  const [secs, setSecs] = useState(15); const [duration, setDuration] = useState<15|60>(15);
  const [blob, setBlob] = useState<Blob|null>(null); const [blobUrl, setBlobUrl] = useState<string|null>(null);
  const [facing, setFacing] = useState<'user'|'environment'>('user');
  useEffect(()=>{ return()=>{ streamRef.current?.getTracks().forEach(t=>t.stop()); if(blobUrl)URL.revokeObjectURL(blobUrl); }; },[]);
  const startCam=async()=>{
    streamRef.current?.getTracks().forEach(t=>t.stop());
    try { const s=await navigator.mediaDevices.getUserMedia({video:{facingMode:facing,width:{ideal:1280},height:{ideal:720}},audio:true}); streamRef.current=s;setCamOn(true);await new Promise(r=>setTimeout(r,100));if(videoRef.current){videoRef.current.srcObject=s;videoRef.current.muted=true;try{await videoRef.current.play();}catch{}} } catch(e:any){alert(e.name==='NotAllowedError'?'❌ Permiso denegado':'❌ '+e.message);}
  };
  const stopRec=useCallback(()=>{ if(timerRef.current)clearInterval(timerRef.current); if(mrRef.current&&mrRef.current.state!=='inactive')mrRef.current.stop(); setRec(false); },[]);
  const startRec=()=>{
    if(!streamRef.current)return; chunksRef.current=[];
    const mime=MediaRecorder.isTypeSupported('video/webm;codecs=vp9')?'video/webm;codecs=vp9':MediaRecorder.isTypeSupported('video/webm')?'video/webm':'';
    const mr=new MediaRecorder(streamRef.current,mime?{mimeType:mime}:{});
    mr.ondataavailable=e=>{if(e.data.size>0)chunksRef.current.push(e.data);};
    mr.onstop=()=>{const b=new Blob(chunksRef.current,{type:'video/webm'});setBlob(b);setBlobUrl(URL.createObjectURL(b));streamRef.current?.getTracks().forEach(t=>t.stop());setCamOn(false);};
    mrRef.current=mr;mr.start();setRec(true);setSecs(duration);
    timerRef.current=setInterval(()=>setSecs(t=>{if(t<=1){stopRec();return 0;}return t-1;}),1000);
  };
  const flipCam=()=>{ const f=facing==='user'?'environment':'user'; setFacing(f); if(camOn){setCamOn(false);setTimeout(startCam,200);} };
  if(blob&&blobUrl) return <PublishPage blob={blob} blobUrl={blobUrl}/>;
  if(!user) return <div className="min-h-screen flex items-center justify-center" style={{background:'#0b0b12'}}><div className="text-center"><p className="text-gray-400 mb-4">Inicia sesión para grabar</p><Link href="/auth" className="px-6 py-3 rounded-xl font-bold text-black" style={{background:'#00F5FF'}}>Entrar</Link></div></div>;
  return (
    <div className="fixed inset-0" style={{background:'#000'}}>
      <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" autoPlay muted playsInline style={{display:camOn?'block':'none',transform:facing==='user'?'scaleX(-1)':'none'}}/>
      {!camOn&&<div className="absolute inset-0 flex items-center justify-center"><div className="text-center"><Camera size={64} className="mx-auto text-gray-700 mb-3"/><p className="text-gray-400">Activa la cámara</p></div></div>}
      {/* Top */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 z-10" style={{paddingTop:'max(16px,env(safe-area-inset-top))'}}>
        <button onClick={()=>setLocation('/create')} className="p-2 rounded-full" style={{background:'rgba(0,0,0,0.4)'}}><X size={20} className="text-white"/></button>
        {camOn&&<button className="px-3 py-1.5 rounded-full text-xs text-white font-semibold" style={{background:'rgba(0,0,0,0.4)'}}>♪ Añadir sonido</button>}
        <div className="w-10"/>
      </div>
      {/* Side tools */}
      {camOn&&<div className="absolute right-3 top-24 flex flex-col gap-5 items-center z-10">
        <button onClick={flipCam} className="flex flex-col items-center gap-1"><div className="w-10 h-10 rounded-full flex items-center justify-center" style={{background:'rgba(0,0,0,0.5)'}}><RotateCcw size={18} className="text-white"/></div><span className="text-white text-xs">Girar</span></button>
        <button className="flex flex-col items-center gap-1"><div className="w-10 h-10 rounded-full flex items-center justify-center" style={{background:'rgba(0,0,0,0.5)'}}>⏱️</div><span className="text-white text-xs">Timer</span></button>
        <button className="flex flex-col items-center gap-1"><div className="w-10 h-10 rounded-full flex items-center justify-center" style={{background:'rgba(0,0,0,0.5)'}}>✨</div><span className="text-white text-xs">Efectos</span></button>
        <button className="flex flex-col items-center gap-1"><div className="w-10 h-10 rounded-full flex items-center justify-center" style={{background:'rgba(0,0,0,0.5)'}}>😊</div><span className="text-white text-xs">Filtros</span></button>
      </div>}
      {/* Corners */}
      {camOn&&!rec&&<>
        <div className="absolute top-28 left-4 w-8 h-8 border-t-2 border-l-2 rounded-tl-lg" style={{borderColor:'rgba(0,245,255,0.6)'}}/>
        <div className="absolute top-28 right-16 w-8 h-8 border-t-2 border-r-2 rounded-tr-lg" style={{borderColor:'rgba(0,245,255,0.6)'}}/>
        <div className="absolute bottom-36 left-4 w-8 h-8 border-b-2 border-l-2 rounded-bl-lg" style={{borderColor:'rgba(0,245,255,0.6)'}}/>
        <div className="absolute bottom-36 right-16 w-8 h-8 border-b-2 border-r-2 rounded-br-lg" style={{borderColor:'rgba(0,245,255,0.6)'}}/>
      </>}
      {/* Bottom */}
      <div className="absolute bottom-0 left-0 right-0 z-10" style={{paddingBottom:'max(32px,env(safe-area-inset-bottom))'}}>
        {!rec&&camOn&&<div className="flex justify-center gap-3 mb-4">{([15,60] as const).map(d=><button key={d} onClick={()=>setDuration(d)} className={cn('px-5 py-1.5 rounded-full text-sm font-bold transition-all',duration===d?'text-black':'text-white border border-gray-600')} style={duration===d?{background:'white'}:{}}>{d}s</button>)}</div>}
        {rec&&<div className="flex justify-center mb-4"><div className="w-16 h-16 rounded-full flex items-center justify-center border-4" style={{borderColor:'#FF007F',boxShadow:'0 0 20px rgba(255,0,127,0.5)'}}><span className="text-2xl font-black text-white font-mono">{secs}</span></div></div>}
        <div className="flex items-center justify-center gap-8 mb-4">
          <button className="w-12 h-12 rounded-lg overflow-hidden" style={{background:'#1e1e2a'}}><ImageIcon size={22} className="text-gray-400 mx-auto mt-2.5"/></button>
          {!camOn?<button onClick={startCam} className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center" style={{background:'rgba(255,255,255,0.1)'}}><Camera size={30} className="text-white"/></button>
          :<button onClick={rec?stopRec:startRec} className={cn('transition-all active:scale-95',rec?'scale-110':'')}>
            <div className="w-20 h-20 rounded-full border-4 flex items-center justify-center" style={rec?{background:'#FF007F',borderColor:'#FF007F',boxShadow:'0 0 30px rgba(255,0,127,0.6)'}:{borderColor:'white',background:'rgba(255,0,0,0.8)'}}>
              {rec?<div className="w-8 h-8 bg-white rounded-lg"/>:<div className="w-16 h-16 rounded-full" style={{background:'#FF007F'}}/>}
            </div>
          </button>}
          {camOn?<button onClick={flipCam} className="w-12 h-12 rounded-full flex items-center justify-center" style={{background:'rgba(0,0,0,0.5)'}}><RotateCcw size={22} className="text-white"/></button>:<div className="w-12"/>}
        </div>
        {camOn&&<p className="text-center text-xs text-gray-400 mb-3">{rec?'Pulsa para detener':'Pulsa para grabar'}</p>}
        <div className="flex items-center justify-center gap-8">
          {(['PUBLICAR','CREAR','LIVE'] as const).map((t,i)=><button key={t} onClick={()=>i===2&&setLocation('/live/create')} className={cn('text-xs font-bold pb-1',i===0?'text-white border-b-2 border-white':'text-gray-500')}>{t}</button>)}
        </div>
      </div>
    </div>
  );
}

// ===================== PUBLISH PAGE =====================
function PublishPage({ blob, blobUrl }: { blob: Blob; blobUrl: string }) {
  const { token, user } = useAuth(); const [, setLocation] = useLocation();
  const { data: challenge } = useApi('/api/challenges/active');
  const { data: users } = useApi('/api/ranking?limit=50');
  const [description, setDescription] = useState(''); const [selected, setSelected] = useState<string[]>([]);
  const [search, setSearch] = useState(''); const [privacy, setPrivacy] = useState<'public'|'private'>('public');
  const [publishing, setPublishing] = useState(false); const [uploadProgress, setUploadProgress] = useState(0);
  const [showNomModal, setShowNomModal] = useState(false);
  const doPublish=async()=>{
    if(!token||!challenge)return; if(selected.length<3){setShowNomModal(true);return;}
    setPublishing(true);
    try { let videoUrl='',thumbnailUrl=''; try{const r=await uploadToCloudinary(blob,p=>setUploadProgress(p));videoUrl=r.videoUrl;thumbnailUrl=r.thumbnailUrl;}catch{} const r=await fetch(`${API}/api/videos`,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({challengeId:challenge._id,videoUrl,thumbnailUrl,geoCoordinates:{lat:40.4168,lng:-3.7038},nominatedUserIds:selected,description,isPublic:privacy==='public'})}); if(r.ok)setLocation('/profile'); else{const d=await r.json();alert(d.error||'Error');} } finally{setPublishing(false);}
  };
  const filtered=(Array.isArray(users)?users:[]).filter((u:RankingEntry)=>u._id!==user?._id&&!selected.includes(u._id)&&u.username.toLowerCase().includes(search.toLowerCase()));
  return (
    <div className="min-h-screen" style={{background:'#fff'}}>
      <div className="flex items-center px-4 py-3 border-b border-gray-200 sticky top-0 bg-white z-10">
        <button onClick={()=>setLocation('/camera')} className="p-1 mr-2"><ChevronLeft size={24} className="text-gray-800"/></button>
        <h1 className="text-black font-bold flex-1">Publicar vídeo</h1>
        <button onClick={doPublish} disabled={publishing} className="font-bold text-sm px-4 py-1.5 rounded-lg disabled:opacity-50" style={{background:'#FF007F',color:'white'}}>{publishing?<Spinner size={15}/>:'Publicar'}</button>
      </div>
      <div className="p-4 space-y-4 pb-20">
        <div className="flex gap-3">
          <textarea value={description} onChange={e=>setDescription(e.target.value)} placeholder="Describe tu reto DOMINO... #cadena #challenge" className="flex-1 resize-none text-sm text-gray-800 placeholder-gray-400 focus:outline-none" rows={4}/>
          <div className="w-20 h-28 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0 border border-gray-200"><video src={blobUrl} className="w-full h-full object-cover"/></div>
        </div>
        <div className="flex gap-2">
          <button onClick={()=>setDescription(d=>d+' #domino')} className="flex items-center gap-1 px-3 py-1.5 rounded-full border border-gray-300 text-sm text-gray-600"><Hash size={13}/>Hashtag</button>
          <button onClick={()=>setDescription(d=>d+' @')} className="flex items-center gap-1 px-3 py-1.5 rounded-full border border-gray-300 text-sm text-gray-600"><AtSign size={13}/>Mención</button>
        </div>
        <div className="divide-y divide-gray-100">
          <button onClick={()=>setShowNomModal(true)} className="w-full flex items-center justify-between py-3.5"><div className="flex items-center gap-3"><Users size={20} className="text-gray-500"/><div className="text-left"><p className="text-sm font-medium text-gray-800">Nominar 3 personas</p><p className="text-xs text-gray-400">{selected.length}/3 · Obligatorio</p></div></div><ChevronRight size={16} className="text-gray-400"/></button>
          <button onClick={()=>setPrivacy(p=>p==='public'?'private':'public')} className="w-full flex items-center justify-between py-3.5"><div className="flex items-center gap-3"><Globe size={20} className="text-gray-500"/><p className="text-sm font-medium text-gray-800">{privacy==='public'?'Público':'Solo yo'}</p></div><ChevronRight size={16} className="text-gray-400"/></button>
          <div className="flex items-center justify-between py-3.5"><div className="flex items-center gap-3"><MapPin size={20} className="text-gray-500"/><p className="text-sm font-medium text-gray-800">Ubicación</p></div><ChevronRight size={16} className="text-gray-400"/></div>
        </div>
        {publishing&&<div className="py-2"><div className="flex justify-between mb-1"><span className="text-xs text-gray-500">Subiendo...</span><span className="text-xs font-bold" style={{color:'#FF007F'}}>{uploadProgress}%</span></div><div className="h-1.5 rounded-full bg-gray-200"><div className="h-full rounded-full transition-all" style={{width:`${uploadProgress}%`,background:'#FF007F'}}/></div></div>}
        <button onClick={()=>saveToGallery(blob)} className="w-full py-3 rounded-full border border-gray-300 text-sm font-semibold text-gray-700 flex items-center justify-center gap-2"><Download size={16}/>Guardar borrador</button>
      </div>
      {showNomModal&&<div className="fixed inset-0 z-50 flex items-end justify-center" style={{background:'rgba(0,0,0,0.5)'}}><div className="w-full max-w-md rounded-t-3xl p-5" style={{background:'#0b0b12',maxHeight:'85svh',overflow:'auto'}}><div className="w-10 h-1 rounded-full mx-auto mb-4" style={{background:'#2a2a3a'}}/><div className="flex items-center justify-between mb-4"><div><h2 className="font-bold text-white">Nominar 3 personas</h2><p className="text-xs text-gray-400">Obligatorio · {selected.length}/3</p></div><button onClick={()=>setShowNomModal(false)}><X size={18} className="text-gray-400"/></button></div>{selected.length>0&&<div className="flex gap-2 flex-wrap mb-3">{selected.map(id=>{const u=(Array.isArray(users)?users:[]).find((x:RankingEntry)=>x._id===id);return u?<button key={id} onClick={()=>setSelected(s=>s.filter(x=>x!==id))} className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-full" style={{background:'rgba(255,0,127,0.15)',border:'1px solid #FF007F',color:'#FF007F'}}>@{u.username}<X size={10}/></button>:null;})}</div>}<div className="relative mb-3"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar usuarios..." className="w-full rounded-xl pl-9 pr-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none" style={{background:'#1e1e2a',border:'1px solid #2a2a3a'}}/></div><div className="space-y-1 max-h-52 overflow-y-auto mb-4">{filtered.map((u:RankingEntry)=><button key={u._id} onClick={()=>selected.length<3&&setSelected(s=>[...s,u._id])} disabled={selected.length>=3} className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/5 disabled:opacity-40"><Av u={u} s={36}/><div className="flex-1 text-left"><div className="text-sm font-medium text-white">@{u.username}</div><div className="text-xs text-gray-400">{u.flag} {u.country}</div></div>{selected.includes(u._id)&&<CheckCircle size={16} style={{color:'#00F5FF'}}/>}</button>)}</div><button onClick={()=>selected.length===3&&setShowNomModal(false)} disabled={selected.length<3} className="w-full py-3 rounded-xl font-bold text-white disabled:opacity-40" style={{background:selected.length===3?'#FF007F':'#1e1e2a'}}>Confirmar ({selected.length}/3)</button></div></div>}
    </div>
  );
}

// ===================== CREATE PAGE =====================
function CreatePage() {
  const [, setLocation] = useLocation(); const [subTab, setSubTab] = useState<'publicar'|'crear'|'live'>('publicar');
  return (
    <div className="min-h-screen" style={{background:'#000'}}>
      <div className="flex items-center justify-between px-4 py-4" style={{paddingTop:'max(16px,env(safe-area-inset-top))'}}>
        <button onClick={()=>setLocation(-1 as any)} className="p-2 rounded-full" style={{background:'rgba(255,255,255,0.1)'}}><X size={20} className="text-white"/></button>
        <h1 className="text-white font-bold">Crear</h1>
        <div className="w-10"/>
      </div>
      <div className="flex gap-3 px-4 mb-5 overflow-x-auto pb-1">
        {[{e:'✂️',l:'AutoCut'},{e:'💬',l:'Subtítulos'},{e:'✨',l:'Efectos'},{e:'🎵',l:'Sonido'},{e:'📸',l:'Foto'}].map(t=><button key={t.l} className="flex flex-col items-center gap-2 flex-shrink-0"><div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl" style={{background:'#1e1e2a'}}>{t.e}</div><span className="text-gray-400 text-xs">{t.l}</span></button>)}
      </div>
      <div className="px-4 mb-5">
        <button onClick={()=>setLocation('/camera')} className="w-full py-5 rounded-2xl flex items-center justify-center gap-3 font-bold text-white text-base border-2 border-dashed transition-all" style={{borderColor:'rgba(0,245,255,0.3)',background:'rgba(0,245,255,0.05)'}}>
          <Camera size={24} style={{color:'#00F5FF'}}/><span style={{color:'#00F5FF'}}>Grabar nuevo vídeo</span>
        </button>
      </div>
      <div className="flex border-b px-4 mb-4" style={{borderColor:'#1e1e2a'}}>
        {(['publicar','crear','live'] as const).map(t=><button key={t} onClick={()=>setSubTab(t)} className={cn('flex-1 py-3 text-sm font-bold uppercase border-b-2 transition-all',subTab===t?'text-white border-white':'text-gray-500 border-transparent')}>{t}</button>)}
      </div>
      {subTab==='publicar'&&<div className="px-4"><h2 className="text-white font-bold mb-3">Plantillas populares</h2><div className="grid grid-cols-2 gap-3">{[{title:'Reto Kindness',desc:'14.7K vídeos',thumb:'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=300&h=500&fit=crop'},{title:'Eco Warrior',desc:'8.9K vídeos',thumb:'https://images.unsplash.com/photo-1501854140801-50d01698950b?w=300&h=500&fit=crop'},{title:'Arte 15s',desc:'22.1K vídeos',thumb:'https://images.unsplash.com/photo-1511988617509-a57c8a288659?w=300&h=500&fit=crop'},{title:'Baila tu Día',desc:'5.3K vídeos',thumb:'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=300&h=500&fit=crop'}].map(t=><button key={t.title} onClick={()=>setLocation('/camera')} className="relative rounded-2xl overflow-hidden" style={{aspectRatio:'9/16'}}><img src={t.thumb} alt={t.title} className="w-full h-full object-cover"/><div className="absolute inset-0" style={{background:'linear-gradient(to top,rgba(0,0,0,0.7),transparent 60%)'}}/><div className="absolute bottom-2 left-2 right-2"><p className="text-white text-xs font-bold">{t.title}</p><p className="text-gray-300 text-xs">{t.desc}</p></div></button>)}</div></div>}
      {subTab==='crear'&&<div className="px-4 text-center py-12"><div className="text-5xl mb-4">🎨</div><p className="text-white font-bold mb-2">Editor próximamente</p><button onClick={()=>setLocation('/camera')} className="px-6 py-3 rounded-xl font-bold text-black mt-4" style={{background:'#00F5FF'}}>Ir a grabar</button></div>}
      {subTab==='live'&&<div className="px-4 text-center py-12"><div className="text-5xl mb-4">📡</div><p className="text-white font-bold mb-2">Iniciar un directo</p><p className="text-gray-400 text-sm mb-6">Conecta en tiempo real con tu audiencia</p><button onClick={()=>setLocation('/live/create')} className="px-6 py-3 rounded-xl font-bold text-white" style={{background:'#FF007F'}}>Empezar directo</button></div>}
    </div>
  );
}

// ===================== MAP PAGE =====================
function WorldMapPage() {
  const { data: videos } = useApi('/api/videos/feed?limit=50');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const proj=(lat:number,lng:number,w:number,h:number)=>({x:((lng+180)/360)*w,y:((90-lat)/180)*h});
  const SAMPLE=[{lat:40.4168,lng:-3.7038,flag:'🇪🇸',city:'Madrid'},{lat:35.6762,lng:139.6503,flag:'🇯🇵',city:'Tokio'},{lat:40.7128,lng:-74.006,flag:'🇺🇸',city:'NY'},{lat:-34.6037,lng:-58.3816,flag:'🇦🇷',city:'Buenos Aires'},{lat:48.8566,lng:2.3522,flag:'🇫🇷',city:'París'},{lat:51.5074,lng:-0.1278,flag:'🇬🇧',city:'Londres'},{lat:19.4326,lng:-99.1332,flag:'🇲🇽',city:'México DF'},{lat:-23.5505,lng:-46.6333,flag:'🇧🇷',city:'São Paulo'}];
  const pts=Array.isArray(videos)&&videos.length>0?videos.map((v:DominoVideo)=>({lat:v.geoCoordinates.lat,lng:v.geoCoordinates.lng,flag:v.userId?.flag||'🌍',city:v.userId?.city||''})):SAMPLE;
  useEffect(()=>{
    const c=canvasRef.current;if(!c)return;const ctx=c.getContext('2d');if(!ctx)return;
    c.width=c.parentElement?.clientWidth||800;c.height=Math.min((c.parentElement?.clientWidth||800)*0.55,420);
    const w=c.width,h=c.height;ctx.fillStyle='#0b0b12';ctx.fillRect(0,0,w,h);
    ctx.strokeStyle='rgba(42,42,58,0.5)';ctx.lineWidth=0.5;
    for(let l=-180;l<=180;l+=30){const{x}=proj(0,l,w,h);ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,h);ctx.stroke();}
    for(let l=-90;l<=90;l+=30){const{y}=proj(l,0,w,h);ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke();}
    for(let i=0;i<pts.length-1;i++){const p1=proj(pts[i].lat,pts[i].lng,w,h),p2=proj(pts[i+1].lat,pts[i+1].lng,w,h);const g=ctx.createLinearGradient(p1.x,p1.y,p2.x,p2.y);g.addColorStop(0,'#00F5FF');g.addColorStop(1,'#FF007F');ctx.beginPath();ctx.moveTo(p1.x,p1.y);ctx.lineTo(p2.x,p2.y);ctx.strokeStyle=g;ctx.lineWidth=1.5;ctx.globalAlpha=0.5;ctx.stroke();ctx.globalAlpha=1;}
    pts.forEach((p,i)=>{const{x,y}=proj(p.lat,p.lng,w,h);ctx.beginPath();ctx.arc(x,y,i===0?8:5,0,Math.PI*2);ctx.fillStyle=i===0?'#FF007F':'#00F5FF';ctx.shadowBlur=12;ctx.shadowColor=ctx.fillStyle;ctx.fill();ctx.shadowBlur=0;ctx.fillStyle='rgba(255,255,255,0.9)';ctx.font=`${Math.max(9,Math.floor(w/95))}px Inter`;ctx.fillText(`${p.flag} ${p.city}`,x+8,y-4);});
  },[pts.length]);
  return (
    <div className="min-h-screen pb-20" style={{paddingTop:'56px',background:'#0b0b12'}}>
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="mb-4"><h1 className="text-2xl font-black text-white">Mapa DOMINO 🌍</h1><p className="text-gray-400 text-sm">{pts.length} nodos activos en el mundo</p></div>
        <div className="rounded-2xl overflow-hidden border mb-6" style={{borderColor:'#1e1e2a'}}><canvas ref={canvasRef} className="w-full block"/></div>
        <div className="grid grid-cols-3 gap-3">{[{v:Array.isArray(videos)?videos.length:pts.length,l:'Vídeos',c:'#00F5FF',e:'🎬'},{v:new Set(pts.map((p:any)=>p.city)).size,l:'Ciudades',c:'#FF007F',e:'🏙️'},{v:pts.length,l:'Cadenas',c:'#7c3aed',e:'⛓️'}].map((s,i)=><div key={i} className="rounded-2xl p-4 border" style={{background:'#13131f',borderColor:'#1e1e2a'}}><div className="text-2xl mb-1">{s.e}</div><div className="text-2xl font-bold" style={{color:s.c}}>{s.v}</div><div className="text-xs text-gray-400 mt-0.5">{s.l}</div></div>)}</div>
      </div>
    </div>
  );
}


// ===================== HOME PAGE =====================
function HomePage() {
  const { data: challenge } = useApi('/api/challenges/active');
  const { data: ranking } = useApi('/api/ranking?limit=5');
  const { data: livesData } = useApi('/api/lives');
  const [counter, setCounter] = useState(14782);
  useEffect(()=>{ if(challenge?.globalCounter)setCounter(challenge.globalCounter); },[challenge]);
  useEffect(()=>{ const t=setInterval(()=>setCounter(c=>c+Math.floor(Math.random()*3)),2000); return()=>clearInterval(t); },[]);
  const lives=(Array.isArray(livesData)?livesData:[]).filter((l:LiveStream)=>l.status==='active'||l.status==='live');
  return (
    <div className="pb-20">
      {/* Hero */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0"><img src="https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1600&h=900&fit=crop" alt="" className="w-full h-full object-cover opacity-15"/><div className="absolute inset-0" style={{background:'radial-gradient(ellipse at center,rgba(0,245,255,0.04) 0%,rgba(11,11,18,0.95) 70%)'}}/></div>
        <div className="relative z-10 max-w-2xl mx-auto px-6 text-center">
          <div className="flex justify-center mb-6"><DominoLogo size={52}/></div>
          <h1 className="text-6xl sm:text-8xl font-black mb-4" style={{letterSpacing:'-2px'}}><span style={{background:'linear-gradient(135deg,#00F5FF 30%,#FF007F)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>DOMINO</span></h1>
          <p className="text-xl text-gray-300 mb-1 font-medium">The Real-World Chain Reaction</p>
          <p className="text-gray-500 mb-10 max-w-sm mx-auto">Graba retos de 15s · Nomina 3 personas · Haz el efecto dominó global</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/auth" className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl font-bold text-black text-base" style={{background:'linear-gradient(135deg,#00F5FF,#7c3aed)'}}>Unirse a DOMINO</Link>
            <Link href="/feed" className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl font-bold text-white text-base border border-gray-700">Ver vídeos →</Link>
          </div>
          <div className="mt-12 flex items-center justify-center gap-3"><div className="w-2 h-2 rounded-full animate-pulse" style={{background:'#00F5FF'}}/><span className="text-2xl font-black" style={{color:'#00F5FF'}}>{counter.toLocaleString('es-ES')}</span><span className="text-gray-400">cadenas activas</span></div>
        </div>
      </section>

      {/* Lives */}
      {lives.length>0&&<section className="py-10 px-4"><div className="max-w-7xl mx-auto"><div className="flex items-center justify-between mb-4"><div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full animate-pulse" style={{background:'#FF007F'}}/><h2 className="text-xl font-black text-white">En Directo</h2></div><Link href="/live" className="text-sm font-semibold" style={{color:'#00F5FF'}}>Ver todos →</Link></div><div className="grid grid-cols-2 sm:grid-cols-4 gap-3">{lives.slice(0,4).map((l:LiveStream)=><Link key={l._id} href={`/live/${l._id}`} className="relative rounded-2xl overflow-hidden" style={{aspectRatio:'9/16',background:'linear-gradient(180deg,#0d0020,#1a0030)',border:'1px solid rgba(255,0,127,0.2)'}}><div className="absolute inset-0 flex items-center justify-center"><Av u={l.userId} s={56}/></div><div className="absolute inset-0" style={{background:'linear-gradient(to top,rgba(0,0,0,0.8),transparent 60%)'}}/><div className="absolute top-2 left-2 flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs font-bold text-white" style={{background:'#FF007F'}}><div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"/>LIVE</div><div className="absolute bottom-2 left-2 right-2"><p className="text-white text-xs font-bold truncate">@{l.userId?.username}</p><p className="text-gray-300 text-xs truncate">{l.title}</p></div></Link>)}</div></div></section>}

      {/* Reto del día */}
      {challenge&&<section className="py-6 px-4"><div className="max-w-7xl mx-auto"><div className="rounded-2xl p-5 border" style={{background:'linear-gradient(135deg,rgba(0,245,255,0.05),rgba(124,58,237,0.05))',borderColor:'rgba(0,245,255,0.2)'}}><div className="flex items-center gap-2 mb-2"><Flame size={15} className="text-orange-400"/><span className="text-orange-400 text-xs font-bold uppercase">Reto del día</span></div><h3 className="font-bold text-white text-lg mb-1">{challenge.title}</h3><p className="text-sm text-gray-400 mb-4 line-clamp-2">{challenge.description}</p><div className="flex items-center justify-between mb-4"><span className="text-xs text-gray-400"><Users size={10} className="inline mr-1"/>{fmt(challenge.globalCounter)} participantes</span><span className="text-xs text-gray-400"><Clock size={10} className="inline mr-1"/>{left(challenge.expiresAt)}</span></div><Link href="/create" className="block w-full py-3 rounded-xl text-sm font-bold text-black text-center" style={{background:'linear-gradient(135deg,#00F5FF,#7c3aed)'}}>Aceptar reto ⛓️</Link></div></div></section>}

      {/* Ranking */}
      {Array.isArray(ranking)&&ranking.length>0&&<section className="py-6 px-4"><div className="max-w-7xl mx-auto"><div className="flex items-center justify-between mb-3"><h2 className="text-xl font-black text-white">🏆 Top DOMINO</h2><Link href="/search" className="text-sm font-semibold" style={{color:'#00F5FF'}}>Ver todo</Link></div><div className="rounded-2xl overflow-hidden border" style={{background:'#13131f',borderColor:'#1e1e2a'}}>{ranking.map((e:RankingEntry,i:number)=><Link key={e._id} href={`/user/${e._id}`} className="flex items-center gap-3 p-3.5 hover:bg-white/5 transition-colors" style={i>0?{borderTop:'1px solid rgba(255,255,255,0.05)'}:{}}><span className="w-7 text-center text-base">{i<3?['🥇','🥈','🥉'][i]:<span className="text-gray-500 text-sm font-bold">#{i+1}</span>}</span><Av u={e} s={38}/><div className="flex-1 min-w-0"><p className="text-white font-semibold text-sm truncate">@{e.username} {e.flag}</p><p className="text-gray-500 text-xs">{e.country}</p></div><div className="text-right"><p className="font-bold text-sm" style={{color:'#00F5FF'}}>{fmt(e.impactPoints)}</p><p className="text-gray-500 text-xs">{e.currentStreak}d racha</p></div></Link>)}</div></div></section>}

      <footer className="border-t mt-6 py-6 px-4" style={{borderColor:'#1e1e2a',background:'#13131f'}}><div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2"><div className="flex items-center gap-2"><DominoLogo size={16}/><span className="text-gray-600 text-xs">© 2026 DOMINO</span></div><p className="text-gray-700 text-xs">{fmt(counter)} cadenas · {lives.length} directos</p></div></footer>
    </div>
  );
}

// ===================== HOME ROUTE =====================
function HomeRoute() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();
  useEffect(()=>{ if(!loading&&user) setLocation('/feed'); },[user,loading]);
  if(loading) return <div className="min-h-screen flex items-center justify-center" style={{background:'#0b0b12'}}><div className="flex flex-col items-center gap-4"><DominoLogo size={40}/><Spinner/></div></div>;
  if(user) return null;
  return <HomePage/>;
}

// ===================== APP =====================
export default function App() { return <AuthProvider><AppInner/></AuthProvider>; }

function AppInner() {
  const { loading } = useAuth();
  if(loading) return <div className="min-h-screen flex items-center justify-center" style={{background:'#0b0b12'}}><div className="flex flex-col items-center gap-4"><DominoLogo size={40}/><Spinner/></div></div>;
  return (
    <div className="min-h-screen" style={{background:'#0b0b12'}}>
      <TopNav/>
      <Switch>
        <Route path="/" component={HomeRoute}/>
        <Route path="/feed" component={()=><FeedPage/>}/>
        <Route path="/following" component={()=><FeedPage following={true}/>}/>
        <Route path="/auth" component={AuthPage}/>
        <Route path="/create" component={CreatePage}/>
        <Route path="/camera" component={CameraPage}/>
        <Route path="/live" component={LiveListPage}/>
        <Route path="/live/create" component={CreateLivePage}/>
        <Route path="/live/:id">{(p:any)=><LiveViewerPage id={p.id}/>}</Route>
        <Route path="/map" component={WorldMapPage}/>
        <Route path="/profile" component={()=><ProfilePage/>}/>
        <Route path="/profile/edit" component={EditProfilePage}/>
        <Route path="/user/:id">{(p:any)=><ProfilePage userId={p.id}/>}</Route>
        <Route path="/messages" component={MessagesPage}/>
        <Route path="/messages/:id">{(p:any)=><ChatPage userId={p.id}/>}</Route>
        <Route path="/search" component={SearchPage}/>
        <Route path="/notifications" component={NotificationsPage}/>
        <Route path="/settings" component={SettingsPage}/>
        <Route path="/coins" component={CoinsPage}/>
        <Route>
          <div className="min-h-screen flex items-center justify-center px-4 pb-20">
            <div className="text-center"><div className="text-6xl mb-4">🎲</div><h1 className="text-2xl font-black text-white mb-2">Página no encontrada</h1><Link href="/" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-black mt-4" style={{background:'linear-gradient(135deg,#00F5FF,#7c3aed)'}}><Home size={16}/>Inicio</Link></div>
          </div>
        </Route>
      </Switch>
      <BottomNav/>
    </div>
  );
}
