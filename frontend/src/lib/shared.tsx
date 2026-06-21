import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'wouter';
import { Home, Play, Video, Map, BarChart2, Camera, Bell, Menu, LogOut, Loader2, X, Send } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...args: Parameters<typeof clsx>) { return twMerge(clsx(...args)); }

export const API = import.meta.env.VITE_API_URL || 'https://domino-chain-production.up.railway.app';
export const CLOUDINARY_CLOUD = import.meta.env.VITE_CLOUDINARY_CLOUD || 'dawgpvzpr';
export const CLOUDINARY_PRESET = import.meta.env.VITE_CLOUDINARY_PRESET || 'domino_unsigned';

// ===================== TYPES =====================
export interface AppUser { _id: string; username: string; email: string; avatarUrl: string; country: string; city: string; flag: string; impactPoints: number; currentStreak: number; bio: string; coins: number; }
export interface Challenge { _id: string; title: string; description: string; category: string; expiresAt: string; globalCounter: number; }
export interface DominoVideo { _id: string; userId: AppUser; videoUrl: string; thumbnailUrl: string; chainDepth: number; likes: string[]; createdAt: string; geoCoordinates: { lat: number; lng: number }; }
export interface Notification { _id: string; type: string; fromUserId: { username: string; avatarUrl: string; flag: string }; message: string; read: boolean; createdAt: string; }
export interface RankingEntry { _id: string; username: string; avatarUrl: string; country: string; flag: string; impactPoints: number; currentStreak: number; coins?: number; }
export interface Comment { _id: string; userId: { _id: string; username: string; avatarUrl: string; flag: string }; text: string; createdAt: string; }
export interface LiveStream { _id: string; userId: AppUser; title: string; status: string; viewerCount: number; category: string; isBattle: boolean; battleScore: { host: number; opponent: number }; createdAt: string; }
export interface CoinPackage { id: string; coins: number; price: number; label: string; emoji: string; badge?: string; }

export const GIFT_CATALOG: Record<string, { name: string; emoji: string; coins: number; points: number }> = {
  domino:  { name:'Dominó',   emoji:'🎲', coins:5,    points:10   },
  chain:   { name:'Cadena',   emoji:'⛓️', coins:20,   points:50   },
  star:    { name:'Estrella', emoji:'⭐', coins:50,   points:100  },
  rocket:  { name:'Cohete',   emoji:'🚀', coins:100,  points:200  },
  crown:   { name:'Corona',   emoji:'👑', coins:500,  points:1000 },
  diamond: { name:'Diamante', emoji:'💎', coins:1000, points:2500 }
};

// ===================== AUTH =====================
const AuthContext = React.createContext<{
  user: AppUser | null; token: string | null;
  login: (e: string, p: string) => Promise<void>;
  register: (d: any) => Promise<void>;
  logout: () => void; loading: boolean;
  refreshUser: () => Promise<void>;
}>({ user: null, token: null, login: async()=>{}, register: async()=>{}, logout:()=>{}, loading: true, refreshUser: async()=>{} });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('domino_token'));
  const [loading, setLoading] = useState(true);

  const fetchUser = async (t: string) => {
    const r = await fetch(`${API}/api/users/me`, { headers: { Authorization: `Bearer ${t}` } });
    if (r.ok) { const d = await r.json(); setUser(d); }
    else { setToken(null); localStorage.removeItem('domino_token'); }
  };

  useEffect(() => {
    if (token) fetchUser(token).finally(() => setLoading(false));
    else setLoading(false);
  }, [token]);

  const login = async (email: string, password: string) => {
    const r = await fetch(`${API}/api/auth/login`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({email,password}) });
    const d = await r.json(); if (!r.ok) throw new Error(d.error||'Error');
    localStorage.setItem('domino_token', d.token); setToken(d.token); setUser(d.user);
  };
  const register = async (fd: any) => {
    const r = await fetch(`${API}/api/auth/register`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(fd) });
    const d = await r.json(); if (!r.ok) throw new Error(d.error||'Error');
    localStorage.setItem('domino_token', d.token); setToken(d.token); setUser(d.user);
  };
  const logout = () => { localStorage.removeItem('domino_token'); setToken(null); setUser(null); };
  const refreshUser = async () => { if (token) await fetchUser(token); };

  return <AuthContext.Provider value={{user,token,login,register,logout,loading,refreshUser}}>{children}</AuthContext.Provider>;
}
export function useAuth() { return React.useContext(AuthContext); }

export function useApi(endpoint: string, deps: any[] = []) {
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
export const fmt = (n: number) => n>=1e6?`${(n/1e6).toFixed(1)}M`:n>=1000?`${(n/1000).toFixed(1)}K`:String(n);
export const ago = (iso: string) => { const d=Date.now()-new Date(iso).getTime(); const h=Math.floor(d/3.6e6); const m=Math.floor(d/6e4); return h>0?`${h}h`:m>0?`${m}m`:'ahora'; };
export const left = (iso: string) => { const d=new Date(iso).getTime()-Date.now(); if(d<=0)return'Expirado'; return`${Math.floor(d/3.6e6)}h ${Math.floor((d%3.6e6)/6e4)}m`; };

export function DominoLogo({ size=24 }: { size?: number }) {
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
export function Spinner() { return <Loader2 size={20} className="animate-spin" style={{color:'#00F5FF'}}/>; }
export function Av({ u, s=36 }: { u: Partial<AppUser>; s?: number }) {
  return (
    <div className="rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center" style={{width:s,height:s,background:'#7c3aed',border:'2px solid #2a2a3a'}}>
      {u.avatarUrl?<img src={u.avatarUrl} alt={u.username} className="w-full h-full object-cover" loading="lazy"/>:<span className="text-white font-bold" style={{fontSize:s*0.35}}>{u.username?.[0]?.toUpperCase()}</span>}
    </div>
  );
}

// ===================== CLOUDINARY UPLOAD =====================
export async function uploadToCloudinary(blob: Blob, onProgress?: (pct: number) => void): Promise<{ videoUrl: string; thumbnailUrl: string }> {
  return new Promise((resolve, reject) => {
    const fd = new FormData();
    fd.append('file', blob, 'domino.webm');
    fd.append('upload_preset', CLOUDINARY_PRESET);
    fd.append('resource_type', 'video');

    const xhr = new XMLHttpRequest();
    xhr.upload.onprogress = e => { if (e.lengthComputable && onProgress) onProgress(Math.round(e.loaded/e.total*100)); };
    xhr.onload = () => {
      if (xhr.status === 200) {
        const d = JSON.parse(xhr.responseText);
        resolve({
          videoUrl: d.secure_url,
          thumbnailUrl: d.secure_url.replace('/upload/', '/upload/so_0,w_400,h_700,c_fill,f_jpg/').replace('.webm', '.jpg')
        });
      } else reject(new Error('Error al subir video'));
    };
    xhr.onerror = () => reject(new Error('Error de red al subir'));
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/video/upload`);
    xhr.send(fd);
  });
}

// ===================== SAVE TO GALLERY =====================
export function saveVideoToGallery(blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `DOMINO_${Date.now()}.webm`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ===================== NAVBAR =====================
export function Navbar() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [loc] = useLocation();
  const { data: nd } = useApi('/api/notifications', [user?._id]);
  const unread = Array.isArray(nd)?nd.filter((n:Notification)=>!n.read).length:0;
  const links = [
    {href:'/',label:'Inicio',icon:<Home size={16}/>},
    {href:'/feed',label:'Feed',icon:<Play size={16}/>},
    {href:'/live',label:'En Vivo',icon:<Video size={16}/>,badge:'LIVE'},
    {href:'/map',label:'Mapa',icon:<Map size={16}/>},
    {href:'/dashboard',label:'Dashboard',icon:<BarChart2 size={16}/>},
    {href:'/camera',label:'Grabar',icon:<Camera size={16}/>},
    {href:'/coins',label:'Monedas',icon:<span>🪙</span>}
  ];
  return (
    <nav className="fixed top-0 left-0 right-0 z-40 border-b" style={{background:'rgba(11,11,18,0.95)',backdropFilter:'blur(20px)',borderColor:'#1e1e2a'}}>
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          <Link href="/" className="flex items-center gap-2"><DominoLogo size={18}/><span className="text-xl font-black" style={{fontFamily:'Syne,sans-serif',color:'#00F5FF',textShadow:'0 0 12px #00F5FF'}}>DOMINO</span></Link>
          <div className="hidden md:flex items-center gap-1">
            {links.map(l=>(
              <Link key={l.href} href={l.href} className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all',loc===l.href?'text-[#00F5FF] bg-[#00F5FF]/10':'text-gray-400 hover:text-white hover:bg-white/5')}>
                {l.icon}{l.label}{l.badge&&<span className="text-[9px] font-black px-1 rounded text-white" style={{background:'#FF007F'}}>{l.badge}</span>}
              </Link>
            ))}
          </div>
          <div className="flex items-center gap-2">
            {user && <Link href="/coins" className="flex items-center gap-1 px-2 py-1 rounded-lg text-sm font-bold" style={{background:'rgba(0,245,255,0.1)',color:'#00F5FF',border:'1px solid rgba(0,245,255,0.3)'}}><span>🪙</span>{(user.coins||0).toLocaleString()}</Link>}
            <Link href="/notifications" className="relative p-2 rounded-lg hover:bg-white/5"><Bell size={18} className="text-gray-400"/>{unread>0&&<span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full text-[9px] font-bold text-black flex items-center justify-center" style={{background:'#FF007F'}}>{unread}</span>}</Link>
            {user?<><Av u={user} s={32}/><button onClick={logout} className="p-2 rounded-lg hover:bg-white/5 text-gray-400"><LogOut size={16}/></button></>:<Link href="/auth" className="text-sm font-semibold px-3 py-1.5 rounded-lg" style={{background:'#00F5FF',color:'#0b0b12'}}>Entrar</Link>}
            <button className="md:hidden p-2 rounded-lg hover:bg-white/5" onClick={()=>setOpen(o=>!o)}><Menu size={18} className="text-gray-400"/></button>
          </div>
        </div>
      </div>
      {open&&<div className="md:hidden border-t" style={{background:'#13131f',borderColor:'#1e1e2a'}}>{links.map(l=><Link key={l.href} href={l.href} className={cn('flex items-center gap-2 px-4 py-3 text-sm font-medium',loc===l.href?'text-[#00F5FF]':'text-gray-400')} onClick={()=>setOpen(false)}>{l.icon}{l.label}</Link>)}</div>}
    </nav>
  );
}

// ===================== COMMENTS PANEL =====================
export function CommentsPanel({ videoId, onClose }: { videoId: string; onClose: () => void }) {
  const { user, token } = useAuth();
  const { data: comments, setData } = useApi(`/api/videos/${videoId}/comments`, [videoId]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const send = async () => {
    if (!text.trim()||!token) return; setSending(true);
    try {
      const r = await fetch(`${API}/api/videos/${videoId}/comments`,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({text})});
      const c = await r.json();
      if (r.ok) { setData((p:Comment[])=>[c,...(Array.isArray(p)?p:[])]); setText(''); }
    } finally { setSending(false); }
  };
  return (
    <div className="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl flex flex-col" style={{background:'#13131f',border:'1px solid #1e1e2a',maxHeight:'70vh'}}>
      <div className="flex items-center justify-between p-4 border-b" style={{borderColor:'#1e1e2a'}}><h3 className="font-bold text-white">Comentarios</h3><button onClick={onClose}><X size={18} className="text-gray-400"/></button></div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {(Array.isArray(comments)?comments:[]).map((c:Comment)=>(
          <div key={c._id} className="flex gap-3"><Av u={c.userId} s={32}/><div className="flex-1"><span className="text-xs font-bold text-white">{c.userId?.username} </span><span className="text-xs text-gray-400">{c.text}</span><div className="text-xs text-gray-600 mt-0.5">{ago(c.createdAt)}</div></div></div>
        ))}
        {(!comments||comments.length===0)&&<p className="text-center text-gray-500 text-sm py-8">Sin comentarios</p>}
      </div>
      {user&&(
        <div className="p-4 border-t flex gap-2" style={{borderColor:'#1e1e2a'}}>
          <Av u={user} s={32}/>
          <input value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send()} placeholder="Añade un comentario..." className="flex-1 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none" style={{background:'#0b0b12',border:'1px solid #2a2a3a'}}/>
          <button onClick={send} disabled={sending||!text.trim()} className="p-2 rounded-xl disabled:opacity-50" style={{background:'#00F5FF'}}><Send size={16} className="text-black"/></button>
        </div>
      )}
    </div>
  );
}
