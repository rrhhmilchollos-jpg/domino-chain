import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation } from 'wouter';
import { Home, Play, Pause, Video, Map, BarChart2, Camera, Bell, Menu, LogOut, Loader2, X, Send, Music2 } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...args: Parameters<typeof clsx>) { return twMerge(clsx(...args)); }

export const API = import.meta.env.VITE_API_URL || 'https://domino-chain-production.up.railway.app';
export const CLOUDINARY_CLOUD = import.meta.env.VITE_CLOUDINARY_CLOUD || 'dawgpvzpr';
export const CLOUDINARY_PRESET = import.meta.env.VITE_CLOUDINARY_PRESET || 'domino_unsigned';

// ===================== TYPES =====================
export interface AppUser { _id: string; username: string; email: string; avatarUrl: string; country: string; city: string; flag: string; impactPoints: number; currentStreak: number; bio: string; coins: number; followersCount?: number; followingCount?: number; isFollowing?: boolean; }
export interface Challenge { _id: string; title: string; description: string; category: string; expiresAt: string; globalCounter: number; }
export interface RemixOf { videoId: string; type: 'duet'|'stitch'; authorId: string; authorUsername: string; }
export interface Sound { id: string; title: string; mood: string; duration: number; audioUrl: string; attribution: string; }
export interface DominoVideo { _id: string; userId: AppUser; videoUrl: string; thumbnailUrl: string; caption?: string; hashtags?: string[]; remixOf?: RemixOf; sound?: { id: string; title: string }; chainDepth: number; likes: string[]; savesCount?: number; commentsCount?: number; isSaved?: boolean; createdAt: string; geoCoordinates: { lat: number; lng: number }; isPublic: boolean; }
export interface Notification { _id: string; type: string; fromUserId: { _id: string; username: string; avatarUrl: string; flag: string }; liveId?: string; message: string; read: boolean; createdAt: string; }
export interface RankingEntry { _id: string; username: string; avatarUrl: string; country: string; flag: string; impactPoints: number; currentStreak: number; coins?: number; }
export interface Comment { _id: string; userId: { _id: string; username: string; avatarUrl: string; flag: string }; text: string; createdAt: string; }
export interface LiveStream { _id: string; userId: AppUser; title: string; status: string; viewerCount: number; category: string; isBattle: boolean; battleOpponentId: AppUser | null; battleScore: { host: number; opponent: number }; createdAt: string; }
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
  loginWithGoogle: (credential: string) => Promise<void>;
  logout: () => void; loading: boolean;
  refreshUser: () => Promise<void>;
}>({ user: null, token: null, login: async()=>{}, register: async()=>{}, loginWithGoogle: async()=>{}, logout:()=>{}, loading: true, refreshUser: async()=>{} });

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
  const loginWithGoogle = async (credential: string) => {
    const r = await fetch(`${API}/api/auth/google`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({credential}) });
    const d = await r.json(); if (!r.ok) throw new Error(d.error||'Error');
    localStorage.setItem('domino_token', d.token); setToken(d.token); setUser(d.user);
  };
  const logout = () => { localStorage.removeItem('domino_token'); setToken(null); setUser(null); };
  const refreshUser = async () => { if (token) await fetchUser(token); };

  return <AuthContext.Provider value={{user,token,login,register,loginWithGoogle,logout,loading,refreshUser}}>{children}</AuthContext.Provider>;
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

// ===================== SEGUIR / DEJAR DE SEGUIR =====================
// Botón reutilizable de "+ Seguir" — siempre actúa sobre una cuenta real
// (userId de verdad), nunca un nombre inventado. Optimista en la UI pero
// revierte si el servidor falla.
export function FollowButton({ userId, initialIsFollowing, onChange, compact=false }: { userId: string; initialIsFollowing: boolean; onChange?: (isFollowing: boolean, followersCount?: number) => void; compact?: boolean }) {
  const { user, token } = useAuth();
  const [following, setFollowing] = useState(!!initialIsFollowing);
  const [busy, setBusy] = useState(false);
  useEffect(()=>{ setFollowing(!!initialIsFollowing); }, [initialIsFollowing, userId]);

  if (!user) return <Link href="/auth" className={cn('font-bold text-black rounded-full text-center', compact?'px-3 py-1 text-xs':'px-5 py-1.5 text-sm')} style={{background:'#00F5FF'}}>Seguir</Link>;
  if (user._id === userId) return null; // no puedes seguirte a ti mismo

  const toggle = async () => {
    if (busy) return;
    setBusy(true);
    const next = !following;
    setFollowing(next); // optimista
    try {
      const r = await fetch(`${API}/api/users/${userId}/follow`, { method: next?'POST':'DELETE', headers: { Authorization: `Bearer ${token}` } });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error||'Error');
      onChange?.(d.isFollowing, d.followersCount);
    } catch {
      setFollowing(!next); // revertir si falla
    } finally { setBusy(false); }
  };

  return (
    <button onClick={toggle} disabled={busy} className={cn('font-bold rounded-full transition-colors disabled:opacity-60', compact?'px-3 py-1 text-xs':'px-5 py-1.5 text-sm', following?'text-gray-300 border':'text-black')} style={following?{background:'transparent',borderColor:'#2a2a3a'}:{background:'#00F5FF'}}>
    {following?'Siguiendo':'+ Seguir'}
    </button>
  );
}

// ===================== CLOUDINARY UPLOAD =====================
export async function uploadToCloudinary(blob: Blob, onProgress?: (pct: number) => void): Promise<{ videoUrl: string; thumbnailUrl: string }> {
  return new Promise((resolve, reject) => {
    const fd = new FormData();
    fd.append('file', blob, 'domino.webm');
    fd.append('upload_preset', CLOUDINARY_PRESET);
    // NO incluir resource_type aquí — va en la URL

    const xhr = new XMLHttpRequest();
    xhr.upload.onprogress = e => { if (e.lengthComputable && onProgress) onProgress(Math.round(e.loaded/e.total*100)); };
    xhr.onload = () => {
      if (xhr.status === 200) {
        const d = JSON.parse(xhr.responseText);
        const videoUrl = d.secure_url;
        // Thumbnail: frame del segundo 0, formato jpg
        const thumbnailUrl = videoUrl
          .replace('/upload/', '/upload/so_0,w_400,h_700,c_fill,f_jpg/')
          .replace(/\.(webm|mp4|mov)$/, '.jpg');
        resolve({ videoUrl, thumbnailUrl });
      } else {
        let msg = 'Error al subir video';
        try { const e = JSON.parse(xhr.responseText); msg = e.error?.message || msg; } catch {}
        reject(new Error(msg));
      }
    };
    xhr.onerror = () => reject(new Error('Error de red al subir'));
    // resource_type=video en la URL es lo correcto para Cloudinary
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/video/upload`);
    xhr.send(fd);
  });
}

// ===================== SAVE TO GALLERY =====================
// Guarda el blob en IndexedDB del usuario — sin disparar descarga del navegador
export async function saveVideoToGallery(blob: Blob): Promise<void> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('domino_gallery', 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore('videos', { keyPath: 'id', autoIncrement: true });
    };
    req.onsuccess = () => {
      const db = req.result;
      const tx = db.transaction('videos', 'readwrite');
      tx.objectStore('videos').add({ blob, date: Date.now(), name: `DOMINO_${Date.now()}.webm` });
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => reject(tx.error);
    };
    req.onerror = () => reject(req.error);
  });
}

// ===================== GOOGLE SIGN-IN =====================
declare global {
  interface Window { google?: any; }
}

let gisScriptPromise: Promise<void> | null = null;
function loadGoogleScript(): Promise<void> {
  if (gisScriptPromise) return gisScriptPromise;
  gisScriptPromise = new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) return resolve();
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true; s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('No se pudo cargar Google Sign-In'));
    document.head.appendChild(s);
  });
  return gisScriptPromise;
}

/** Botón oficial "Continuar con Google". No hace nada si VITE_GOOGLE_CLIENT_ID no está configurado. */
export function GoogleSignInButton({ onError, onSuccess }: { onError?: (msg: string) => void; onSuccess?: () => void }) {
  const { loginWithGoogle } = useAuth();
  const btnRef = useRef<HTMLDivElement>(null);
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

  useEffect(() => {
    if (!clientId || !btnRef.current) return;
    let cancelled = false;
    loadGoogleScript().then(() => {
      if (cancelled || !window.google || !btnRef.current) return;
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: async (resp: { credential: string }) => {
          try { await loginWithGoogle(resp.credential); onSuccess?.(); }
          catch (e: any) { onError?.(e.message || 'No se pudo iniciar sesión con Google'); }
        },
      });
      window.google.accounts.id.renderButton(btnRef.current, {
        theme: 'filled_black', size: 'large', shape: 'pill', width: 320, text: 'continue_with',
      });
    }).catch(() => onError?.('No se pudo cargar Google Sign-In'));
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  if (!clientId) return null; // no configurado: no mostramos un botón roto
  return <div ref={btnRef} className="flex justify-center"/>;
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

// ===================== TECLADO MÓVIL =====================
// En apps empaquetadas como WebView/APK (como la que genera PWABuilder a
// partir de esta PWA), el teclado virtual a veces no reduce el viewport
// visual como en un navegador normal — un input "fixed bottom-0" se queda
// tapado físicamente por el teclado aunque el código esté bien posicionado.
// Este hook mide cuánto ocupa el teclado con la Visual Viewport API para
// poder desplazar el panel hacia arriba mientras se escribe.
export function useKeyboardOffset() {
  const [offset, setOffset] = useState(0);
  useEffect(() => {
    const vv = (window as any).visualViewport;
    if (!vv) return;
    const onResize = () => {
      const gap = window.innerHeight - vv.height - vv.offsetTop;
      setOffset(gap > 60 ? gap : 0); // ignora ruido pequeño (barras del navegador, redondeos)
    };
    vv.addEventListener('resize', onResize);
    vv.addEventListener('scroll', onResize);
    onResize();
    return () => { vv.removeEventListener('resize', onResize); vv.removeEventListener('scroll', onResize); };
  }, []);
  return offset;
}

// ===================== COMPARTIR =====================
// Antes cada pantalla repetía "si hay share nativo úsalo, si no copia al
// portapapeles" SIN avisar nunca si funcionó — en un WebView donde a veces
// ninguna de las dos APIs está disponible, tocar "Compartir" no hacía nada
// visible. Esto centraliza el flujo y SIEMPRE deja algún rastro: el panel
// nativo, una copia confirmada, o como último recurso un cuadro con el link.
export async function shareLink(title: string, url: string, text?: string): Promise<'shared'|'copied'|'prompted'> {
  try {
    if (navigator.share) { await navigator.share({ title, text, url }); return 'shared'; }
  } catch (e: any) {
    if (e?.name === 'AbortError') return 'shared'; // el usuario cerró el panel nativo, no es un fallo
  }
  try {
    await navigator.clipboard.writeText(url);
    return 'copied';
  } catch {
    window.prompt('Copia este enlace:', url);
    return 'prompted';
  }
}

export function Toast({ message }: { message: string | null }) {
  if (!message) return null;
  return createPortal(
    <div className="fixed left-1/2 z-[70] px-4 py-2 rounded-full text-sm font-semibold text-white pointer-events-none" style={{bottom:'90px',transform:'translateX(-50%)',background:'rgba(0,0,0,0.85)'}}>{message}</div>,
    document.body
  );
}

// ===================== COMMENTS PANEL =====================
export function CommentsPanel({ videoId, onClose }: { videoId: string; onClose: () => void }) {
  const { user, token } = useAuth();
  const { data: comments, setData } = useApi(`/api/videos/${videoId}/comments`, [videoId]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const kbOffset = useKeyboardOffset();
  const send = async () => {
    if (!text.trim()||!token) return; setSending(true);
    try {
      const r = await fetch(`${API}/api/videos/${videoId}/comments`,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({text})});
      const c = await r.json();
      if (r.ok) { setData((p:Comment[])=>[c,...(Array.isArray(p)?p:[])]); setText(''); }
    } finally { setSending(false); }
  };
  return createPortal(
    <>
      {/* Fondo oscurecido al estilo TikTok — además, tocar fuera cierra el panel */}
      <div className="fixed inset-0 z-[55]" style={{background:'rgba(0,0,0,0.5)'}} onClick={onClose}/>
      {/* BUG ARREGLADO (1): z-50 igual que el BottomNav, el BottomNav se
          pintaba después y tapaba la caja de texto.
          BUG ARREGLADO (2): teclado virtual en WebView/APK tapaba el input.
          BUG ARREGLADO (3) — el de verdad: aunque subiera el z-index a 60,
          este panel vivía DENTRO del contenedor "fixed" del feed, y ese
          contenedor crea su PROPIO contexto de apilamiento (cualquier
          position:fixed lo hace). Eso significa que el z-index de aquí
          dentro nunca llegaba a compararse con el z-50 del BottomNav, que
          vive fuera, como hermano en App.tsx — el feed entero (con todo lo
          que tuviera dentro, sin importar su z-index) siempre quedaba por
          debajo del menú. Por eso seguía tapado pasara lo que pasara con
          el número. La solución real es renderizar este panel con un
          portal directamente en <body>, fuera de ese contenedor, para que
          su z-index compita de verdad contra el del menú inferior. */}
      <div className="fixed inset-x-0 bottom-0 z-[60] rounded-t-2xl flex flex-col" style={{background:'#13131f',border:'1px solid #1e1e2a',maxHeight:'70vh',transform:kbOffset?`translateY(-${kbOffset}px)`:undefined,transition:'transform 0.15s ease-out'}}>
        <div className="flex items-center justify-between p-4 border-b" style={{borderColor:'#1e1e2a'}}><h3 className="font-bold text-white">Comentarios</h3><button onClick={onClose}><X size={18} className="text-gray-400"/></button></div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {(Array.isArray(comments)?comments:[]).map((c:Comment)=>(
            <div key={c._id} className="flex gap-3"><Av u={c.userId} s={32}/><div className="flex-1"><span className="text-xs font-bold text-white">{c.userId?.username} </span><span className="text-xs text-gray-400">{c.text}</span><div className="text-xs text-gray-600 mt-0.5">{ago(c.createdAt)}</div></div></div>
          ))}
          {(!comments||comments.length===0)&&<p className="text-center text-gray-500 text-sm py-8">Sin comentarios</p>}
        </div>
        {/* FIX: antes este bloque entero desaparecía si `user` era null/undefined,
            dejando el panel sin ningún campo de texto y sin explicación.
            Ahora siempre se muestra algo: el input si hay sesión, o un aviso
            con enlace a /auth si no la hay. */}
        {user ? (
          <div className="p-4 pb-6 border-t flex gap-2" style={{borderColor:'#1e1e2a'}}>
            <Av u={user} s={32}/>
            <input value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send()} placeholder="Añade un comentario..." className="flex-1 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none" style={{background:'#0b0b12',border:'1px solid #2a2a3a'}}/>
            <button onClick={send} disabled={sending||!text.trim()} className="p-2 rounded-xl disabled:opacity-50" style={{background:'#00F5FF'}}><Send size={16} className="text-black"/></button>
          </div>
        ) : (
          <div className="p-4 pb-6 border-t text-center" style={{borderColor:'#1e1e2a'}}>
            <Link href="/auth" onClick={onClose} className="text-sm font-semibold" style={{color:'#00F5FF'}}>Inicia sesión para comentar</Link>
          </div>
        )}
      </div>
    </>,
    document.body
  );
}

// ===================== TOGGLE PÚBLICO / PRIVADO =====================
// Pastilla pequeña para marcar un video propio como público o privado,
// pensada para usarse sobre la miniatura en el Dashboard (igual que TikTok
// permite cambiar la visibilidad de cada video desde el propio perfil).
export function VisibilityToggle({ videoId, initialIsPublic, onChanged }: { videoId: string; initialIsPublic: boolean; onChanged?: (isPublic: boolean) => void }) {
  const { token } = useAuth();
  const [isPublic, setIsPublic] = useState(initialIsPublic);
  const [busy, setBusy] = useState(false);

  const toggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!token || busy) return;
    setBusy(true);
    const next = !isPublic;
    try {
      const r = await fetch(`${API}/api/videos/${videoId}/visibility`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPublic: next })
      });
      if (r.ok) { setIsPublic(next); onChanged?.(next); }
    } finally { setBusy(false); }
  };

  return (
    <button
      onClick={toggle}
      disabled={busy}
      className="absolute top-1.5 left-1.5 z-10 flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-bold disabled:opacity-60"
      style={{ background: isPublic ? 'rgba(0,0,0,0.55)' : 'rgba(255,0,127,0.85)', color: 'white' }}
      title={isPublic ? 'Público — toca para hacerlo privado' : 'Privado — toca para hacerlo público'}
    >
      {isPublic ? '🌍 Público' : '🔒 Privado'}
    </button>
  );
}

// ===================== SELECTOR DE MÚSICA =====================
// Selector de sonidos al estilo TikTok para la pantalla de grabar. El
// catálogo viene de /api/sounds — pistas reales con licencia CC0 (dominio
// público), no canciones de artistas con derechos de autor (eso requiere
// acuerdos de licencia comerciales, no es algo que se pueda "instalar").
export function SoundPicker({ onSelect, onClose }: { onSelect: (s: Sound) => void; onClose: () => void }) {
  const { data: sounds, loading } = useApi('/api/sounds');
  const [playingId, setPlayingId] = useState<string | null>(null);
  const previewRef = useRef<HTMLAudioElement | null>(null);

  const togglePreview = (s: Sound) => {
    if (previewRef.current) { previewRef.current.pause(); previewRef.current = null; }
    if (playingId === s.id) { setPlayingId(null); return; }
    const a = new Audio(s.audioUrl);
    a.crossOrigin = 'anonymous';
    a.onended = () => setPlayingId(null);
    a.play().catch(() => {});
    previewRef.current = a;
    setPlayingId(s.id);
  };

  useEffect(() => () => { previewRef.current?.pause(); }, []);

  const pick = (s: Sound) => {
    previewRef.current?.pause();
    setPlayingId(null);
    onSelect(s);
  };

  return createPortal(
    <>
      <div className="fixed inset-0 z-[55]" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={onClose} />
      <div className="fixed inset-x-0 bottom-0 z-[60] rounded-t-2xl flex flex-col" style={{ background: '#13131f', border: '1px solid #1e1e2a', maxHeight: '75vh' }}>
        <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: '#1e1e2a' }}>
          <h3 className="font-bold text-white">Añadir música</h3>
          <button onClick={onClose}><X size={18} className="text-gray-400" /></button>
        </div>
        <p className="px-4 pt-2.5 text-[11px] text-gray-500">🎵 Sonidos de dominio público (CC0) — libres de derechos, sin copyright</p>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {loading && <div className="flex justify-center py-8"><Spinner /></div>}
          {(Array.isArray(sounds) ? sounds : []).map((s: Sound) => (
            <div key={s.id} className="flex items-center gap-3 p-2.5 rounded-xl" style={{ background: '#0b0b12', border: '1px solid #1e1e2a' }}>
              <button onClick={() => togglePreview(s)} className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: playingId === s.id ? '#00F5FF' : '#1e1e2a' }}>
                {playingId === s.id ? <Pause size={16} className="text-black" /> : <Play size={16} className="text-white" />}
              </button>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{s.title}</p>
                <p className="text-xs text-gray-500">{s.mood} · {Math.round(s.duration)}s</p>
              </div>
              <button onClick={() => pick(s)} className="text-xs font-bold px-3.5 py-1.5 rounded-full flex-shrink-0" style={{ background: '#00F5FF', color: '#000' }}>Usar</button>
            </div>
          ))}
          {!loading && (!sounds || sounds.length === 0) && <p className="text-center text-gray-500 text-sm py-8">No hay sonidos disponibles</p>}
        </div>
      </div>
    </>,
    document.body
  );
}
