import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, Route, Switch, useLocation } from 'wouter';
import {
  Home, Play, Map, BarChart2, Camera, Bell, Globe, Zap, ChevronRight,
  X, Search, Activity, Menu, Heart, Share, RefreshCw, Users, Clock,
  CheckCircle, LogOut, Loader2, MessageCircle, Send, Video, Star,
  Eye, Gift, Phone
} from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...args: Parameters<typeof clsx>) { return twMerge(clsx(...args)); }

const API = import.meta.env.VITE_API_URL || 'https://domino-chain-production.up.railway.app';

// ===================== TYPES =====================
interface AppUser { _id: string; username: string; email: string; avatarUrl: string; country: string; city: string; flag: string; impactPoints: number; currentStreak: number; bio: string; }
interface Challenge { _id: string; title: string; description: string; category: 'Creativity' | 'Kindness' | 'Eco'; activatedAt: string; expiresAt: string; globalCounter: number; status: string; }
interface DominoVideo { _id: string; challengeId: string; userId: AppUser; videoUrl: string; thumbnailUrl: string; parentVideoId: string | null; rootVideoId: string; geoCoordinates: { lat: number; lng: number }; nominatedUsers: string[]; chainDepth: number; likes: string[]; createdAt: string; }
interface Notification { _id: string; type: string; fromUserId: { username: string; avatarUrl: string; flag: string }; message: string; read: boolean; createdAt: string; }
interface RankingEntry { _id: string; username: string; avatarUrl: string; country: string; flag: string; impactPoints: number; currentStreak: number; }
interface Comment { _id: string; userId: { _id: string; username: string; avatarUrl: string; flag: string }; text: string; createdAt: string; }
interface LiveStream { _id: string; userId: AppUser; title: string; description: string; roomName: string; status: string; viewerCount: number; category: string; isBattle: boolean; battleScore: { host: number; opponent: number }; createdAt: string; }

const GIFT_CATALOG: Record<string, { name: string; emoji: string; coins: number }> = {
  domino:  { name: 'Dominó',   emoji: '🎲', coins: 5    },
  chain:   { name: 'Cadena',   emoji: '⛓️', coins: 20   },
  star:    { name: 'Estrella', emoji: '⭐', coins: 50   },
  rocket:  { name: 'Cohete',  emoji: '🚀', coins: 100  },
  crown:   { name: 'Corona',  emoji: '👑', coins: 500  },
  diamond: { name: 'Diamante',emoji: '💎', coins: 1000 }
};

// ===================== AUTH =====================
const AuthContext = React.createContext<{
  user: AppUser | null; token: string | null;
  login: (e: string, p: string) => Promise<void>;
  register: (d: any) => Promise<void>;
  logout: () => void; loading: boolean;
}>({ user: null, token: null, login: async()=>{}, register: async()=>{}, logout:()=>{}, loading: true });

function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('domino_token'));
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (token) {
      fetch(`${API}/api/users/me`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.ok ? r.json() : null)
        .then(d => { if (d) setUser(d); else { setToken(null); localStorage.removeItem('domino_token'); } })
        .finally(() => setLoading(false));
    } else setLoading(false);
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
  return <AuthContext.Provider value={{user,token,login,register,logout,loading}}>{children}</AuthContext.Provider>;
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
const fmt = (n: number) => n>=1e6 ? `${(n/1e6).toFixed(1)}M` : n>=1000 ? `${(n/1000).toFixed(1)}K` : String(n);
const ago = (iso: string) => { const d=Date.now()-new Date(iso).getTime(); const h=Math.floor(d/3.6e6); const m=Math.floor(d/6e4); return h>0?`${h}h`:m>0?`${m}m`:'ahora'; };
const left = (iso: string) => { const d=new Date(iso).getTime()-Date.now(); if(d<=0) return 'Expirado'; return `${Math.floor(d/3.6e6)}h ${Math.floor((d%3.6e6)/6e4)}m`; };
const catColor = (c: string) => c==='Creativity'?'text-violet-400 border-violet-400':c==='Kindness'?'text-pink-400 border-pink-400':'text-green-400 border-green-400';

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
      {u.avatarUrl ? <img src={u.avatarUrl} alt={u.username} className="w-full h-full object-cover"/> : <span className="text-white font-bold" style={{fontSize:s*0.35}}>{u.username?.[0]?.toUpperCase()}</span>}
    </div>
  );
}

// ===================== AUTH PAGE =====================
function AuthPage() {
  const { login, register } = useAuth();
  const [, setLocation] = useLocation();
  const [mode, setMode] = useState<'login'|'register'>('login');
  const [form, setForm] = useState({ email:'', password:'', username:'', country:'', city:'' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const flags: Record<string,string> = {'España':'🇪🇸','México':'🇲🇽','Argentina':'🇦🇷','Colombia':'🇨🇴','Estados Unidos':'🇺🇸','Japón':'🇯🇵','Brasil':'🇧🇷','Francia':'🇫🇷','Alemania':'🇩🇪','Italia':'🇮🇹','Reino Unido':'🇬🇧','Portugal':'🇵🇹'};
  const handle = async () => {
    setError(''); setLoading(true);
    try {
      if (mode==='login') await login(form.email, form.password);
      else { if (!form.username||!form.email||!form.password||!form.country||!form.city) throw new Error('Rellena todos los campos'); await register({...form,flag:flags[form.country]||'🌍'}); }
      setLocation('/feed');
    } catch(e:any) { setError(e.message); } finally { setLoading(false); }
  };
  const set = (k:string) => (e:React.ChangeEvent<HTMLInputElement|HTMLSelectElement>) => setForm(f=>({...f,[k]:e.target.value}));
  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{background:'#0b0b12'}}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8"><DominoLogo size={40}/><h1 className="text-4xl font-black mt-4" style={{fontFamily:'Syne,sans-serif',color:'#00F5FF',textShadow:'0 0 12px #00F5FF'}}>DOMINO</h1><p className="text-gray-400 text-sm mt-1">The Real-World Chain Reaction</p></div>
        <div className="rounded-2xl p-6 space-y-4" style={{background:'#13131f',border:'1px solid #1e1e2a'}}>
          <div className="flex gap-1 rounded-xl p-1" style={{background:'#0b0b12'}}>
            {(['login','register'] as const).map(m=><button key={m} onClick={()=>{setMode(m);setError('');}} className={cn('flex-1 py-2 rounded-lg text-sm font-semibold transition-all',mode===m?'text-[#0b0b12]':'text-gray-400 hover:text-white')} style={mode===m?{background:'#00F5FF'}:{}}>{m==='login'?'Entrar':'Registrarse'}</button>)}
          </div>
          {mode==='register'&&<input placeholder="@username" value={form.username} onChange={set('username')} className="w-full rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#00F5FF]" style={{background:'#0b0b12',border:'1px solid #2a2a3a'}}/>}
          <input placeholder="Email" type="email" value={form.email} onChange={set('email')} className="w-full rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#00F5FF]" style={{background:'#0b0b12',border:'1px solid #2a2a3a'}}/>
          <input placeholder="Contraseña" type="password" value={form.password} onChange={set('password')} className="w-full rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#00F5FF]" style={{background:'#0b0b12',border:'1px solid #2a2a3a'}}/>
          {mode==='register'&&<><select value={form.country} onChange={set('country')} className="w-full rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#00F5FF]" style={{background:'#0b0b12',border:'1px solid #2a2a3a'}}><option value="">País</option>{Object.keys(flags).map(c=><option key={c} value={c}>{flags[c]} {c}</option>)}</select><input placeholder="Ciudad" value={form.city} onChange={set('city')} className="w-full rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#00F5FF]" style={{background:'#0b0b12',border:'1px solid #2a2a3a'}}/></>}
          {error&&<p className="text-red-400 text-xs text-center">{error}</p>}
          <button onClick={handle} disabled={loading} className="w-full py-3 rounded-xl font-bold text-[#0b0b12] flex items-center justify-center gap-2 disabled:opacity-50" style={{background:'linear-gradient(135deg,#00F5FF,#7c3aed)'}}>{loading?<Spinner/>:mode==='login'?'Entrar':'Crear cuenta'}</button>
        </div>
      </div>
    </div>
  );
}

// ===================== NAVBAR =====================
function Navbar() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [loc] = useLocation();
  const { data: nd } = useApi('/api/notifications', [user?._id]);
  const unread = Array.isArray(nd) ? nd.filter((n:Notification)=>!n.read).length : 0;
  const links = [
    {href:'/',label:'Inicio',icon:<Home size={16}/>},
    {href:'/feed',label:'Feed',icon:<Play size={16}/>},
    {href:'/live',label:'En Vivo',icon:<Video size={16}/>,badge:'LIVE'},
    {href:'/map',label:'Mapa',icon:<Map size={16}/>},
    {href:'/dashboard',label:'Dashboard',icon:<BarChart2 size={16}/>},
    {href:'/camera',label:'Grabar',icon:<Camera size={16}/>}
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

// ===================== HOME PAGE =====================
function HomePage() {
  const { data: challenge } = useApi('/api/challenges/active');
  const { data: ranking } = useApi('/api/ranking?limit=5');
  const { data: lives } = useApi('/api/lives');
  const [counter, setCounter] = useState(14782);
  useEffect(()=>{if(challenge?.globalCounter)setCounter(challenge.globalCounter);},[challenge]);
  useEffect(()=>{const t=setInterval(()=>setCounter(c=>c+Math.floor(Math.random()*3)),2500);return()=>clearInterval(t);},[]);
  return (
    <div>
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0"><img src="https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1600&h=900&fit=crop" alt="" className="w-full h-full object-cover opacity-20"/><div className="absolute inset-0" style={{background:'radial-gradient(ellipse at center,rgba(0,245,255,0.05) 0%,rgba(11,11,18,0.9) 70%)'}}/></div>
        <div className="relative z-10 max-w-4xl mx-auto px-4 text-center">
          <div className="flex justify-center mb-6"><DominoLogo size={48}/></div>
          <h1 className="text-5xl sm:text-7xl font-black mb-4" style={{fontFamily:'Syne,sans-serif'}}><span style={{background:'linear-gradient(135deg,#00F5FF,#FF007F)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>DOMINO</span></h1>
          <p className="text-xl text-gray-300 mb-2 font-medium">The Real-World Chain Reaction</p>
          <p className="text-base text-gray-400 mb-8 max-w-xl mx-auto">Completa retos de 15s. Nomina 3 personas. Haz lives. Envía regalos. El efecto dominó global.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center flex-wrap">
            <Link href="/feed" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-black" style={{background:'linear-gradient(135deg,#00F5FF,#7c3aed)',boxShadow:'0 0 20px rgba(0,245,255,0.3)'}}><Play size={18}/>Ver Feed</Link>
            <Link href="/live" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white border" style={{borderColor:'#FF007F',boxShadow:'0 0 16px rgba(255,0,127,0.3)'}}><Video size={18}/>En Vivo</Link>
            <Link href="/camera" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white border border-gray-700"><Camera size={18}/>Grabar</Link>
          </div>
          <div className="mt-12 flex items-center justify-center gap-2"><div className="w-2 h-2 rounded-full animate-pulse" style={{background:'#00F5FF'}}/><span className="text-lg font-bold" style={{color:'#00F5FF'}}>{counter.toLocaleString('es-ES')}</span><span className="text-gray-400 text-sm">cadenas activas</span></div>
        </div>
      </section>

      {Array.isArray(lives)&&lives.length>0&&(
        <section className="py-12 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-5"><div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full animate-pulse" style={{background:'#FF007F'}}/><h2 className="text-2xl font-black text-white" style={{fontFamily:'Syne,sans-serif'}}>En Directo</h2></div><Link href="/live" className="text-sm font-semibold" style={{color:'#00F5FF'}}>Ver todos →</Link></div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {lives.slice(0,4).map((l:LiveStream)=>(
                <Link key={l._id} href={`/live/${l._id}`} className="relative rounded-xl overflow-hidden cursor-pointer" style={{aspectRatio:'9/16',background:'#13131f',border:'1px solid #1e1e2a'}}>
                  <div className="absolute inset-0 flex items-center justify-center"><Av u={l.userId} s={64}/></div>
                  <div className="absolute inset-0" style={{background:'linear-gradient(to top,rgba(0,0,0,0.8) 0%,transparent 60%)'}}/>
                  <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold text-white" style={{background:'#FF007F'}}><div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"/>LIVE</div>
                  <div className="absolute top-2 right-2 flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs text-white" style={{background:'rgba(0,0,0,0.6)'}}><Eye size={9}/>{l.viewerCount}</div>
                  <div className="absolute bottom-2 left-2 right-2"><p className="text-white text-xs font-bold truncate">@{l.userId?.username}</p><p className="text-gray-300 text-xs truncate">{l.title}</p></div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {challenge&&(
        <section className="py-12 px-4">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-2xl font-black text-white mb-4" style={{fontFamily:'Syne,sans-serif'}}>Reto del Día</h2>
            <div className="rounded-xl p-5 border" style={{background:'#13131f',borderColor:'#1e1e2a'}}>
              <div className="flex items-center gap-2 mb-2"><span className={cn('text-xs border rounded-full px-2 py-0.5 font-medium',catColor(challenge.category))}>{challenge.category}</span><span className="text-xs rounded-full px-2 py-0.5 text-green-400 border border-green-500/30" style={{background:'rgba(34,197,94,0.1)'}}>Activo</span></div>
              <h3 className="font-bold text-white text-lg">{challenge.title}</h3>
              <p className="text-sm text-gray-400 mt-1 line-clamp-2">{challenge.description}</p>
              <div className="flex items-center justify-between mt-3 mb-3"><div className="flex items-center gap-1 text-xs text-gray-400"><Users size={12}/>{fmt(challenge.globalCounter)} participantes</div><div className="flex items-center gap-1 text-xs text-gray-400"><Clock size={12}/>{left(challenge.expiresAt)}</div></div>
              <Link href="/camera" className="w-full py-2.5 rounded-lg text-sm font-bold text-black flex items-center justify-center gap-2" style={{background:'linear-gradient(135deg,#00F5FF,#7c3aed)'}}><Camera size={16}/>Aceptar reto</Link>
            </div>
          </div>
        </section>
      )}

      {Array.isArray(ranking)&&ranking.length>0&&(
        <section className="py-12 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-4"><h2 className="text-2xl font-black text-white" style={{fontFamily:'Syne,sans-serif'}}>Ranking Global</h2><Link href="/dashboard" className="text-sm font-semibold" style={{color:'#00F5FF'}}>Ver completo</Link></div>
            <div className="rounded-2xl overflow-hidden border" style={{background:'#13131f',borderColor:'#1e1e2a'}}>
              {ranking.map((e:RankingEntry,i:number)=>(
                <div key={e._id} className="flex items-center gap-3 p-3 border-b last:border-0 hover:bg-white/5 transition-colors" style={{borderColor:'#1e1e2a'}}>
                  <span className="w-7 text-center text-sm font-bold">{i<3?['🥇','🥈','🥉'][i]:<span className="text-gray-500">#{i+1}</span>}</span>
                  <Av u={e} s={36}/>
                  <div className="flex-1 min-w-0"><div className="text-sm font-semibold text-white truncate">{e.username} {e.flag}</div><div className="text-xs text-gray-500">{e.country}</div></div>
                  <div className="text-right"><div className="text-sm font-bold" style={{color:'#00F5FF'}}>{fmt(e.impactPoints)}</div><div className="text-xs text-gray-500 flex items-center gap-0.5 justify-end"><Zap size={10} className="text-yellow-400"/>{e.currentStreak}d</div></div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <footer className="border-t mt-16 py-8 px-4" style={{borderColor:'#1e1e2a',background:'#13131f'}}>
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-gray-600">© 2026 DOMINO. The Real-World Chain Reaction.</p>
          <div className="flex items-center gap-1.5 text-xs text-gray-500"><Globe size={12} style={{color:'#00F5FF'}}/>{fmt(challenge?.globalCounter||14782)} cadenas activas</div>
        </div>
      </footer>
    </div>
  );
}

// ===================== COMMENTS PANEL =====================
function CommentsPanel({ videoId, onClose }: { videoId: string; onClose: () => void }) {
  const { user, token } = useAuth();
  const { data: comments, setData } = useApi(`/api/videos/${videoId}/comments`, [videoId]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const send = async () => {
    if (!text.trim()||!token) return; setSending(true);
    try {
      const r = await fetch(`${API}/api/videos/${videoId}/comments`, { method:'POST', headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'}, body:JSON.stringify({text}) });
      const c = await r.json();
      if (r.ok) { setData((p:Comment[])=>[c,...(Array.isArray(p)?p:[])]); setText(''); }
    } finally { setSending(false); }
  };
  return (
    <div className="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl flex flex-col" style={{background:'#13131f',border:'1px solid #1e1e2a',maxHeight:'70vh'}}>
      <div className="flex items-center justify-between p-4 border-b" style={{borderColor:'#1e1e2a'}}>
        <h3 className="font-bold text-white">Comentarios {Array.isArray(comments)?`(${comments.length})`:''}</h3>
        <button onClick={onClose}><X size={18} className="text-gray-400"/></button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {(Array.isArray(comments)?comments:[]).map((c:Comment)=>(
          <div key={c._id} className="flex gap-3"><Av u={c.userId} s={32}/><div className="flex-1"><span className="text-xs font-bold text-white">{c.userId?.username} </span><span className="text-xs text-gray-400">{c.text}</span><div className="text-xs text-gray-600 mt-0.5">{ago(c.createdAt)}</div></div></div>
        ))}
        {(!comments||comments.length===0)&&<p className="text-center text-gray-500 text-sm py-8">Sin comentarios — sé el primero</p>}
      </div>
      {user&&(
        <div className="p-4 border-t flex gap-2" style={{borderColor:'#1e1e2a'}}>
          <Av u={user} s={32}/>
          <input value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send()} placeholder="Añade un comentario..." className="flex-1 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#00F5FF]" style={{background:'#0b0b12',border:'1px solid #2a2a3a'}}/>
          <button onClick={send} disabled={sending||!text.trim()} className="p-2 rounded-xl disabled:opacity-50" style={{background:'#00F5FF'}}><Send size={16} className="text-black"/></button>
        </div>
      )}
    </div>
  );
}

// ===================== FEED PAGE — TikTok Style =====================
function FeedPage() {
  const { data: videos, loading } = useApi('/api/videos/feed?limit=20');
  const { data: challenge } = useApi('/api/challenges/active');
  const { token } = useAuth();
  const [liked, setLiked] = useState<Set<string>>(new Set());
  const [commentId, setCommentId] = useState<string|null>(null);
  const videoRefs = useRef<(HTMLVideoElement|null)[]>([]);

  const doLike = async (id: string) => {
    if (!token) return;
    setLiked(p=>{const n=new Set(p);n.has(id)?n.delete(id):n.add(id);return n;});
    await fetch(`${API}/api/videos/${id}/like`,{method:'POST',headers:{Authorization:`Bearer ${token}`}});
  };
  const doShare = (id: string) => {
    const url = `${window.location.origin}/video/${id}`;
    if (navigator.share) navigator.share({title:'DOMINO',url}); else navigator.clipboard?.writeText(url);
  };

  useEffect(()=>{
    const obs = new IntersectionObserver(entries=>{
      entries.forEach(e=>{const v=e.target as HTMLVideoElement; if(e.isIntersecting) v.play().catch(()=>{}); else{v.pause();v.currentTime=0;}});
    },{threshold:0.8});
    videoRefs.current.forEach(v=>{if(v)obs.observe(v);});
    return ()=>obs.disconnect();
  },[videos]);

  if (loading) return <div className="min-h-screen flex items-center justify-center" style={{paddingTop:'56px',background:'#0b0b12'}}><Spinner/></div>;
  const list = Array.isArray(videos)?videos:[];

  return (
    <div className="fixed inset-0 overflow-y-scroll snap-y snap-mandatory" style={{paddingTop:'56px',background:'#000'}}>
      {commentId&&<CommentsPanel videoId={commentId} onClose={()=>setCommentId(null)}/>}
      {challenge&&(
        <div className="fixed top-14 left-0 right-0 z-30 pointer-events-none">
          <div className="max-w-md mx-auto px-4 pt-2"><div className="rounded-xl px-3 py-2 pointer-events-auto flex items-center gap-2" style={{background:'rgba(11,11,18,0.85)',border:'1px solid #1e1e2a',backdropFilter:'blur(10px)'}}><Zap size={14} className="text-yellow-400"/><span className="text-xs font-semibold text-white flex-1 truncate">{challenge.title}</span><span className="text-xs text-gray-400">{left(challenge.expiresAt)}</span></div></div>
        </div>
      )}
      {list.map((v:DominoVideo,idx:number)=>(
        <div key={v._id} className="relative w-full snap-start flex-shrink-0 overflow-hidden bg-black" style={{height:'calc(100vh - 56px)'}}>
          {v.videoUrl?(
            <video ref={el=>{videoRefs.current[idx]=el;}} src={v.videoUrl} className="absolute inset-0 w-full h-full object-cover" loop playsInline muted onDoubleClick={()=>doLike(v._id)}/>
          ):v.thumbnailUrl?(
            <img src={v.thumbnailUrl} alt="" className="absolute inset-0 w-full h-full object-cover"/>
          ):(
            <div className="absolute inset-0 flex items-center justify-center" style={{background:'#1a1a2e'}}><Camera size={48} className="text-gray-600"/></div>
          )}
          <div className="absolute inset-0" style={{background:'linear-gradient(to top,rgba(0,0,0,0.85) 0%,rgba(0,0,0,0.1) 50%,transparent 100%)'}}/>
          <div className="absolute bottom-20 left-4 right-20 z-10">
            <div className="flex items-center gap-2 mb-2"><Av u={v.userId} s={40}/><div><p className="text-white text-sm font-bold">@{v.userId?.username}</p><p className="text-gray-300 text-xs">{v.userId?.flag} {v.userId?.city}</p></div></div>
            <div className="flex items-center gap-2 flex-wrap"><span className="text-xs rounded-full px-2 py-0.5 text-gray-300" style={{background:'rgba(0,0,0,0.4)',border:'1px solid rgba(255,255,255,0.1)'}}>⛓️ Profundidad {v.chainDepth+1}</span><span className="text-xs text-gray-400">{ago(v.createdAt)}</span></div>
          </div>
          <div className="absolute right-3 bottom-24 flex flex-col gap-5 items-center z-10">
            <button onClick={()=>doLike(v._id)} className="flex flex-col items-center gap-1">
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{background:'rgba(0,0,0,0.4)'}}><Heart size={22} className={liked.has(v._id)?'fill-red-500 text-red-500':'text-white'}/></div>
              <span className="text-xs text-white font-semibold">{fmt((v.likes?.length||0)+(liked.has(v._id)?1:0))}</span>
            </button>
            <button onClick={()=>setCommentId(v._id)} className="flex flex-col items-center gap-1">
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{background:'rgba(0,0,0,0.4)'}}><MessageCircle size={22} className="text-white"/></div>
              <span className="text-xs text-white font-semibold">Comentar</span>
            </button>
            <button onClick={()=>doShare(v._id)} className="flex flex-col items-center gap-1">
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{background:'rgba(0,0,0,0.4)'}}><Share size={22} className="text-white"/></div>
              <span className="text-xs text-white font-semibold">Compartir</span>
            </button>
          </div>
          <div className="absolute bottom-4 left-4 right-4 z-10">
            <div className="flex items-center gap-2">
              <div className="flex-1 h-0.5 rounded-full" style={{background:'rgba(255,255,255,0.2)'}}><div className="h-full rounded-full" style={{width:`${Math.min(100,(v.chainDepth+1)*10)}%`,background:'linear-gradient(90deg,#00F5FF,#FF007F)'}}/></div>
              <span className="text-xs text-gray-400">⛓️ {v.chainDepth+1}</span>
            </div>
          </div>
        </div>
      ))}
      {list.length===0&&(
        <div className="h-screen flex flex-col items-center justify-center text-center px-4">
          <div className="text-6xl mb-4">🎲</div><h3 className="text-xl font-bold text-white mb-2">Sin videos todavía</h3>
          <p className="text-gray-400 text-sm mb-6">Sé el primero en grabar un reto.</p>
          <Link href="/camera" className="px-6 py-3 rounded-xl font-bold text-black" style={{background:'#00F5FF'}}>Grabar ahora</Link>
        </div>
      )}
    </div>
  );
}

// ===================== LIVE LIST =====================
function LiveListPage() {
  const { data: lives, loading } = useApi('/api/lives');
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const list = Array.isArray(lives)?lives:[];
  if (loading) return <div className="min-h-screen flex items-center justify-center" style={{paddingTop:'80px',background:'#0b0b12'}}><Spinner/></div>;
  return (
    <div className="min-h-screen" style={{paddingTop:'80px',background:'#0b0b12'}}>
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full animate-pulse" style={{background:'#FF007F'}}/><h1 className="text-3xl font-black text-white" style={{fontFamily:'Syne,sans-serif'}}>En Directo</h1></div>
          {user&&<button onClick={()=>setLocation('/live/create')} className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-white text-sm" style={{background:'#FF007F'}}><Video size={16}/>Iniciar Live</button>}
        </div>
        {list.length===0?(
          <div className="text-center py-20"><div className="text-6xl mb-4">📡</div><h3 className="text-xl font-bold text-white mb-2">Nadie en directo ahora</h3><p className="text-gray-400 mb-6">¡Sé el primero!</p>{user&&<button onClick={()=>setLocation('/live/create')} className="px-6 py-3 rounded-xl font-bold text-white" style={{background:'#FF007F'}}>Empezar Live</button>}</div>
        ):(
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {list.map((l:LiveStream)=>(
              <Link key={l._id} href={`/live/${l._id}`} className="relative rounded-xl overflow-hidden cursor-pointer" style={{aspectRatio:'9/16',background:'#13131f',border:'1px solid #1e1e2a'}}>
                <div className="absolute inset-0 flex items-center justify-center"><Av u={l.userId} s={80}/></div>
                <div className="absolute inset-0" style={{background:'linear-gradient(to top,rgba(0,0,0,0.85) 0%,transparent 60%)'}}/>
                <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold text-white" style={{background:'#FF007F'}}><div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"/>LIVE</div>
                {l.isBattle&&<div className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-xs font-bold text-white" style={{background:'#7c3aed'}}>VS</div>}
                <div className="absolute top-8 right-2 flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs text-white" style={{background:'rgba(0,0,0,0.6)'}}><Eye size={9}/>{l.viewerCount}</div>
                <div className="absolute bottom-3 left-3 right-3"><div className="flex items-center gap-1 mb-0.5"><Av u={l.userId} s={18}/><p className="text-white text-xs font-bold truncate">@{l.userId?.username}</p></div><p className="text-gray-300 text-xs truncate">{l.title}</p></div>
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  if (!user) return <div className="min-h-screen flex items-center justify-center" style={{paddingTop:'80px',background:'#0b0b12'}}><div className="text-center"><p className="text-gray-400 mb-4">Inicia sesión</p><Link href="/auth" className="px-6 py-3 rounded-xl font-bold text-black" style={{background:'#00F5FF'}}>Entrar</Link></div></div>;
  const create = async () => {
    if (!form.title.trim()) return setError('Escribe un título');
    setError(''); setLoading(true);
    try {
      const r = await fetch(`${API}/api/lives`,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify(form)});
      const d = await r.json(); if (!r.ok) throw new Error(d.error||'Error');
      setLocation(`/live/${d.live._id}`);
    } catch(e:any){setError(e.message);setLoading(false);}
  };
  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{paddingTop:'80px',background:'#0b0b12'}}>
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-black text-white mb-6" style={{fontFamily:'Syne,sans-serif'}}>Iniciar Live</h1>
        <div className="rounded-2xl p-6 space-y-4" style={{background:'#13131f',border:'1px solid #1e1e2a'}}>
          <input placeholder="Título del live" value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} className="w-full rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none" style={{background:'#0b0b12',border:'1px solid #2a2a3a'}}/>
          <input placeholder="Descripción (opcional)" value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} className="w-full rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none" style={{background:'#0b0b12',border:'1px solid #2a2a3a'}}/>
          <select value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))} className="w-full rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none" style={{background:'#0b0b12',border:'1px solid #2a2a3a'}}>
            {['General','Creativity','Kindness','Eco','Battle'].map(c=><option key={c} value={c}>{c}</option>)}
          </select>
          <label className="flex items-center gap-3 cursor-pointer">
            <div className="w-10 h-5 rounded-full relative transition-all" style={{background:form.isBattle?'#FF007F':'#374151'}} onClick={()=>setForm(f=>({...f,isBattle:!f.isBattle}))}>
              <div className={cn('absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all',form.isBattle?'left-5':'left-0.5')}/>
            </div>
            <span className="text-sm text-white">Modo batalla VS 🥊</span>
          </label>
          {error&&<p className="text-red-400 text-xs">{error}</p>}
          <button onClick={create} disabled={loading} className="w-full py-3 rounded-xl font-bold text-white flex items-center justify-center gap-2 disabled:opacity-50" style={{background:'linear-gradient(135deg,#FF007F,#7c3aed)'}}>{loading?<Spinner/>:<><Video size={18}/>Empezar Live</>}</button>
          <p className="text-xs text-gray-500 text-center">Para stream en tiempo real configura LiveKit en las variables de entorno.</p>
        </div>
      </div>
    </div>
  );
}

// ===================== LIVE VIEWER =====================
function LiveViewerPage({ id }: { id: string }) {
  const { user, token } = useAuth();
  const { data: lives } = useApi('/api/lives', [id]);
  const [msgs, setMsgs] = useState<{user:string;text:string;type?:string}[]>([{user:'Sistema',text:'¡Bienvenido al directo! 🎲',type:'system'}]);
  const [input, setInput] = useState('');
  const [showGifts, setShowGifts] = useState(false);
  const [giftAnim, setGiftAnim] = useState<string|null>(null);
  const [viewers, setViewers] = useState(0);
  const chatRef = useRef<HTMLDivElement>(null);
  const live = Array.isArray(lives)?lives.find((l:LiveStream)=>l._id===id):null;
  useEffect(()=>{if(live)setViewers(live.viewerCount||0);},[live]);
  useEffect(()=>{const t=setInterval(()=>setViewers(v=>Math.max(0,v+Math.floor(Math.random()*3-1))),5000);return()=>clearInterval(t);},[]);
  useEffect(()=>{if(chatRef.current)chatRef.current.scrollTop=chatRef.current.scrollHeight;},[msgs]);
  const sendMsg = ()=>{if(!input.trim()||!user)return;setMsgs(m=>[...m,{user:user.username,text:input}]);setInput('');};
  const sendGift = async(type:string)=>{
    const g=GIFT_CATALOG[type]; setGiftAnim(`${g.emoji} ${g.name}`); setTimeout(()=>setGiftAnim(null),3000);
    setMsgs(m=>[...m,{user:user?.username||'Tú',text:`envió ${g.emoji} ${g.name}!`,type:'gift'}]); setShowGifts(false);
    if(token&&id) await fetch(`${API}/api/lives/${id}/gift`,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({giftType:type,quantity:1})}).catch(()=>{});
  };
  if (!live) return <div className="min-h-screen flex items-center justify-center" style={{paddingTop:'80px',background:'#0b0b12'}}><div className="text-center"><div className="text-5xl mb-4">📡</div><p className="text-white font-bold mb-2">Live no encontrado</p><Link href="/live" className="text-sm font-semibold" style={{color:'#00F5FF'}}>Ver otros lives</Link></div></div>;
  return (
    <div className="fixed inset-0 flex" style={{paddingTop:'56px',background:'#000'}}>
      <div className="relative flex-1">
        <div className="absolute inset-0 flex items-center justify-center" style={{background:'#1a1a2e'}}>
          <div className="text-center"><Av u={live.userId} s={120}/><p className="text-white font-bold mt-4 text-xl">@{live.userId?.username}</p><p className="text-gray-400 text-sm mt-1">{live.title}</p><div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full" style={{background:'rgba(255,0,127,0.2)',border:'1px solid #FF007F'}}><div className="w-2 h-2 rounded-full animate-pulse" style={{background:'#FF007F'}}/><span className="text-white text-sm font-bold">EN DIRECTO</span></div></div>
        </div>
        <div className="absolute top-2 left-2 right-2 flex items-center justify-between z-10">
          <div className="flex items-center gap-2"><div className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold text-white" style={{background:'#FF007F'}}><div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"/>LIVE</div><div className="flex items-center gap-1 px-2 py-1 rounded-full text-xs text-white" style={{background:'rgba(0,0,0,0.6)'}}><Eye size={10}/>{Math.max(0,viewers)}</div></div>
          <Link href="/live" className="p-1.5 rounded-full" style={{background:'rgba(0,0,0,0.6)'}}><X size={16} className="text-white"/></Link>
        </div>
        {live.isBattle&&(
          <div className="absolute top-12 left-2 right-2 flex items-center gap-2 z-10">
            <div className="flex-1 text-center py-1 rounded-lg" style={{background:'rgba(255,0,127,0.3)',border:'1px solid #FF007F'}}><p className="text-white text-xs font-bold">{live.userId?.username}</p><p className="text-white text-xl font-black">{live.battleScore?.host||0}</p></div>
            <div className="text-white font-black">VS</div>
            <div className="flex-1 text-center py-1 rounded-lg" style={{background:'rgba(124,58,237,0.3)',border:'1px solid #7c3aed'}}><p className="text-white text-xs font-bold">Rival</p><p className="text-white text-xl font-black">{live.battleScore?.opponent||0}</p></div>
          </div>
        )}
        {giftAnim&&<div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center animate-bounce z-20"><div className="text-5xl mb-2">{giftAnim.split(' ')[0]}</div><p className="text-white font-bold">{giftAnim}</p></div>}
        <div className="absolute bottom-4 left-2 z-10"><button onClick={()=>setShowGifts(true)} className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-bold text-white" style={{background:'linear-gradient(135deg,#FF007F,#7c3aed)'}}><Gift size={16}/>Regalar</button></div>
        {showGifts&&(
          <div className="absolute bottom-16 left-2 z-20 rounded-2xl p-4 w-72" style={{background:'#13131f',border:'1px solid #1e1e2a'}}>
            <div className="flex items-center justify-between mb-3"><h3 className="font-bold text-white text-sm">Enviar Regalo</h3><button onClick={()=>setShowGifts(false)}><X size={16} className="text-gray-400"/></button></div>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(GIFT_CATALOG).map(([k,g])=>(
                <button key={k} onClick={()=>sendGift(k)} className="flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-white/10 border border-transparent hover:border-[#FF007F] transition-colors">
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
        {user&&(
          <div className="p-3 border-t flex gap-2" style={{borderColor:'#1e1e2a'}}>
            <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&sendMsg()} placeholder="Escribe algo..." className="flex-1 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none" style={{background:'#0b0b12',border:'1px solid #2a2a3a'}}/>
            <button onClick={sendMsg} className="p-2 rounded-xl" style={{background:'#00F5FF'}}><Send size={14} className="text-black"/></button>
          </div>
        )}
      </div>
    </div>
  );
}

// ===================== MAP PAGE =====================
function WorldMapPage() {
  const { data: videos } = useApi('/api/videos/feed?limit=50');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const proj = (lat:number,lng:number,w:number,h:number) => ({x:((lng+180)/360)*w,y:((90-lat)/180)*h});
  const SAMPLE = [{lat:40.4168,lng:-3.7038,flag:'🇪🇸',city:'Madrid'},{lat:35.6762,lng:139.6503,flag:'🇯🇵',city:'Tokio'},{lat:40.7128,lng:-74.006,flag:'🇺🇸',city:'Nueva York'},{lat:-34.6037,lng:-58.3816,flag:'🇦🇷',city:'Buenos Aires'},{lat:48.8566,lng:2.3522,flag:'🇫🇷',city:'París'},{lat:51.5074,lng:-0.1278,flag:'🇬🇧',city:'Londres'}];
  const pts = Array.isArray(videos)&&videos.length>0?videos.map((v:DominoVideo)=>({lat:v.geoCoordinates.lat,lng:v.geoCoordinates.lng,flag:v.userId?.flag||'🌍',city:v.userId?.city||''})):SAMPLE;
  useEffect(()=>{
    const c=canvasRef.current; if(!c) return; const ctx=c.getContext('2d'); if(!ctx) return;
    c.width=c.parentElement?.clientWidth||800; c.height=Math.min((c.parentElement?.clientWidth||800)*0.5,400);
    const w=c.width,h=c.height;
    ctx.fillStyle='#0b0b12'; ctx.fillRect(0,0,w,h);
    ctx.strokeStyle='rgba(42,42,58,0.6)'; ctx.lineWidth=0.5;
    for(let l=-180;l<=180;l+=30){const{x}=proj(0,l,w,h);ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,h);ctx.stroke();}
    for(let l=-90;l<=90;l+=30){const{y}=proj(l,0,w,h);ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke();}
    for(let i=0;i<pts.length-1;i++){const p1=proj(pts[i].lat,pts[i].lng,w,h),p2=proj(pts[i+1].lat,pts[i+1].lng,w,h);const g=ctx.createLinearGradient(p1.x,p1.y,p2.x,p2.y);g.addColorStop(0,'#00F5FF');g.addColorStop(1,'#FF007F');ctx.beginPath();ctx.moveTo(p1.x,p1.y);ctx.lineTo(p2.x,p2.y);ctx.strokeStyle=g;ctx.lineWidth=1.5;ctx.globalAlpha=0.6;ctx.stroke();ctx.globalAlpha=1;}
    pts.forEach((p:{lat:number;lng:number;flag:string;city:string},i:number)=>{const{x,y}=proj(p.lat,p.lng,w,h);ctx.beginPath();ctx.arc(x,y,i===0?8:5,0,Math.PI*2);ctx.fillStyle=i===0?'#FF007F':'#00F5FF';ctx.shadowBlur=12;ctx.shadowColor=ctx.fillStyle;ctx.fill();ctx.shadowBlur=0;ctx.fillStyle='rgba(248,250,252,0.85)';ctx.font=`${Math.max(8,Math.floor(w/90))}px Inter`;ctx.fillText(`${p.flag} ${p.city}`,x+8,y-4);});
  },[pts.length]);
  return (
    <div className="min-h-screen" style={{paddingTop:'80px',background:'#0b0b12'}}>
      <div className="max-w-7xl mx-auto px-4 py-6">
        <h1 className="text-3xl font-black text-white mb-2" style={{fontFamily:'Syne,sans-serif'}}>Mapa Global de Impacto</h1>
        <p className="text-gray-400 mb-6">Cadenas activas · {pts.length} nodos</p>
        <div className="rounded-xl overflow-hidden border" style={{minHeight:'300px',borderColor:'#1e1e2a',background:'#0b0b12'}}><canvas ref={canvasRef} className="w-full block"/></div>
        <div className="mt-6 grid grid-cols-3 gap-4">
          {[{v:Array.isArray(videos)?videos.length:pts.length,l:'Videos en cadena',c:'#00F5FF'},{v:new Set(pts.map((p:any)=>p.city)).size,l:'Ciudades',c:'#FF007F'},{v:pts.length,l:'Nodos activos',c:'#7c3aed'}].map((s,i)=>(
            <div key={i} className="rounded-xl p-4 border" style={{background:'#13131f',borderColor:'#1e1e2a'}}><div className="text-2xl font-bold" style={{color:s.c}}>{s.v}</div><div className="text-xs text-gray-400 mt-1">{s.l}</div></div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ===================== DASHBOARD PAGE =====================
function DashboardPage() {
  const { user, token } = useAuth();
  const { data: ranking } = useApi('/api/ranking');
  const { data: notifs, setData: setNotifs } = useApi('/api/notifications', [user?._id]);
  const markRead = async(id:string)=>{if(!token)return;await fetch(`${API}/api/notifications/${id}/read`,{method:'PUT',headers:{Authorization:`Bearer ${token}`}});setNotifs((p:Notification[])=>Array.isArray(p)?p.map(n=>n._id===id?{...n,read:true}:n):p);};
  const unread = Array.isArray(notifs)?notifs.filter((n:Notification)=>!n.read).length:0;
  if (!user) return <div className="min-h-screen flex items-center justify-center" style={{paddingTop:'80px',background:'#0b0b12'}}><div className="text-center"><p className="text-gray-400 mb-4">Inicia sesión</p><Link href="/auth" className="px-6 py-3 rounded-xl font-bold text-black" style={{background:'#00F5FF'}}>Entrar</Link></div></div>;
  return (
    <div className="min-h-screen" style={{paddingTop:'80px',background:'#0b0b12'}}>
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6"><div><h1 className="text-3xl font-black text-white" style={{fontFamily:'Syne,sans-serif'}}>Mi Dashboard</h1><p className="text-gray-400 mt-1">Tu impacto global</p></div><Av u={user} s={48}/></div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[{icon:<Zap size={18}/>,value:fmt(user.impactPoints),label:'Puntos',color:'bg-yellow-500/20 text-yellow-400'},{icon:<Activity size={18}/>,value:`${user.currentStreak}d`,label:'Racha',color:'bg-cyan-500/20 text-cyan-400'},{icon:<Globe size={18}/>,value:'—',label:'Países',color:'bg-violet-500/20 text-violet-400'},{icon:<Bell size={18}/>,value:String(unread),label:'Notificaciones',color:'bg-pink-500/20 text-pink-400'}].map((k,i)=>(
            <div key={i} className="rounded-xl p-4 border" style={{background:'#13131f',borderColor:'#1e1e2a'}}><div className={cn('p-2 rounded-lg w-fit mb-3',k.color)}>{k.icon}</div><div className="text-2xl font-bold text-white">{k.value}</div><div className="text-xs text-gray-400 mt-1">{k.label}</div></div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 rounded-2xl p-5 border" style={{background:'#13131f',borderColor:'#1e1e2a'}}>
            <h2 className="font-bold text-white mb-4">Ranking Global</h2>
            <div className="space-y-1">
              {(Array.isArray(ranking)?ranking:[]).map((e:RankingEntry,i:number)=>(
                <div key={e._id} className={cn('flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-all',e._id===user._id&&'border border-[#00F5FF]/30 bg-[#00F5FF]/5')}>
                  <span className="w-7 text-center text-sm font-bold">{i<3?['🥇','🥈','🥉'][i]:<span className="text-gray-500">#{i+1}</span>}</span>
                  <Av u={e} s={36}/>
                  <div className="flex-1 min-w-0"><div className={cn('text-sm font-semibold truncate',e._id===user._id?'text-[#00F5FF]':'text-white')}>{e.username} {e.flag}</div><div className="text-xs text-gray-500">{e.country}</div></div>
                  <div className="text-right"><div className="text-sm font-bold" style={{color:'#00F5FF'}}>{fmt(e.impactPoints)}</div><div className="text-xs text-gray-500">{e.currentStreak}d</div></div>
                </div>
              ))}
              {!ranking&&<div className="text-center py-8"><Spinner/></div>}
            </div>
          </div>
          <div className="rounded-2xl p-5 border" style={{background:'#13131f',borderColor:'#1e1e2a'}}>
            <div className="flex items-center justify-between mb-4"><h2 className="font-bold text-white">Notificaciones</h2>{unread>0&&<span className="text-xs font-bold px-2 py-0.5 rounded-full text-black" style={{background:'#FF007F'}}>{unread}</span>}</div>
            <div className="space-y-2">
              {(Array.isArray(notifs)?notifs:[]).map((n:Notification)=>(
                <div key={n._id} onClick={()=>markRead(n._id)} className={cn('flex gap-3 p-2.5 rounded-xl cursor-pointer hover:bg-white/5',!n.read&&'bg-[#00F5FF]/5 border border-[#00F5FF]/20')}>
                  <span className="text-lg">{n.type==='nomination'?'🎯':n.type==='chain_continued'?'⛓️':'🏆'}</span>
                  <div className="flex-1 min-w-0"><p className="text-xs text-gray-300 line-clamp-2">{n.message}</p><p className="text-xs text-gray-500 mt-1">{ago(n.createdAt)}</p></div>
                  {!n.read&&<div className="w-1.5 h-1.5 rounded-full mt-1 flex-shrink-0" style={{background:'#00F5FF'}}/>}
                </div>
              ))}
              {(!notifs||!Array.isArray(notifs)||notifs.length===0)&&<div className="text-center py-8"><Bell size={32} className="mx-auto text-gray-700 mb-2"/><p className="text-sm text-gray-500">Sin notificaciones</p></div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ===================== CAMERA PAGE =====================
function CameraPage() {
  const { user, token } = useAuth();
  const [, setLocation] = useLocation();
  const { data: challenge } = useApi('/api/challenges/active');
  const { data: users } = useApi('/api/ranking?limit=20');
  const videoRef = useRef<HTMLVideoElement>(null);
  const mrRef = useRef<MediaRecorder|null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream|null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval>|null>(null);
  const [camOn, setCamOn] = useState(false);
  const [rec, setRec] = useState(false);
  const [secs, setSecs] = useState(15);
  const [done, setDone] = useState(false);
  const [blob, setBlob] = useState<Blob|null>(null);
  const [showNom, setShowNom] = useState(false);
  const [published, setPublished] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [geo, setGeo] = useState({lat:40.4168,lng:-3.7038});
  useEffect(()=>{navigator.geolocation?.getCurrentPosition(p=>setGeo({lat:p.coords.latitude,lng:p.coords.longitude}));return()=>{streamRef.current?.getTracks().forEach(t=>t.stop());};},[]);
  const startCam = async()=>{
    try {
      let s: MediaStream;
      try { s=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'user'},width:{ideal:1280},height:{ideal:720}},audio:true}); }
      catch { try{s=await navigator.mediaDevices.getUserMedia({video:true,audio:true});}catch{s=await navigator.mediaDevices.getUserMedia({video:true,audio:false});} }
      streamRef.current=s; setCamOn(true);
      await new Promise(r=>setTimeout(r,100));
      if(videoRef.current){videoRef.current.srcObject=s;videoRef.current.muted=true;videoRef.current.playsInline=true;try{await videoRef.current.play();}catch{}}
    } catch(err:any){setCamOn(false);if(err.name==='NotAllowedError')alert('❌ Permiso denegado. Ve a Ajustes > Cámara.');else alert('❌ Error: '+err.message);}
  };
  const stopRec = useCallback(()=>{if(timerRef.current)clearInterval(timerRef.current);if(mrRef.current&&mrRef.current.state!=='inactive')mrRef.current.stop();setRec(false);},[]);
  const startRec = ()=>{
    if(!streamRef.current)return; chunksRef.current=[];
    const mime=MediaRecorder.isTypeSupported('video/webm;codecs=vp9')?'video/webm;codecs=vp9':MediaRecorder.isTypeSupported('video/webm')?'video/webm':'';
    const mr=new MediaRecorder(streamRef.current,mime?{mimeType:mime}:{});
    mr.ondataavailable=e=>{if(e.data.size>0)chunksRef.current.push(e.data);};
    mr.onstop=()=>{setBlob(new Blob(chunksRef.current,{type:'video/webm'}));setDone(true);streamRef.current?.getTracks().forEach(t=>t.stop());setCamOn(false);};
    mrRef.current=mr; mr.start(); setRec(true); setSecs(15);
    timerRef.current=setInterval(()=>setSecs(t=>{if(t<=1){stopRec();return 0;}return t-1;}),1000);
  };
  const publish = async(ids:string[])=>{
    if(!token||!challenge)return; setPublishing(true);
    try{const r=await fetch(`${API}/api/videos`,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({challengeId:challenge._id,geoCoordinates:geo,nominatedUserIds:ids})});if(r.ok){setPublished(true);setShowNom(false);}else{const d=await r.json();alert(d.error||'Error al publicar');}}catch{alert('Error de red.');}finally{setPublishing(false);}
  };
  const filtered=(Array.isArray(users)?users:[]).filter((u:RankingEntry)=>u._id!==user?._id&&!selected.includes(u._id)&&(u.username.toLowerCase().includes(search.toLowerCase())||(u.country||'').toLowerCase().includes(search.toLowerCase())));
  if(!user)return<div className="min-h-screen flex items-center justify-center" style={{paddingTop:'56px',background:'#0b0b12'}}><div className="text-center"><p className="text-gray-400 mb-4">Inicia sesión para grabar</p><Link href="/auth" className="px-6 py-3 rounded-xl font-bold text-black" style={{background:'#00F5FF'}}>Entrar</Link></div></div>;
  if(published)return<div className="min-h-screen flex items-center justify-center px-4" style={{paddingTop:'56px',background:'#0b0b12'}}><div className="text-center"><div className="text-6xl mb-4">🎲</div><h2 className="text-3xl font-black text-white mb-2" style={{fontFamily:'Syne,sans-serif'}}>¡Dominó pasado!</h2><p className="text-gray-400 mb-6">Publicado. Los nominados han sido notificados.</p><div className="flex gap-3 justify-center"><button onClick={()=>setLocation('/feed')} className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-black" style={{background:'linear-gradient(135deg,#00F5FF,#7c3aed)'}}><Play size={16}/>Ver Feed</button><button onClick={()=>setLocation('/map')} className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold border border-[#00F5FF]" style={{color:'#00F5FF'}}><Map size={16}/>Ver Mapa</button></div></div></div>;
  return (
    <div className="min-h-screen" style={{paddingTop:'56px',background:'#000'}}>
      {showNom&&(
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" style={{background:'rgba(0,0,0,0.85)'}}>
          <div className="w-full max-w-md rounded-2xl p-5" style={{background:'#13131f',border:'1px solid #1e1e2a'}}>
            <div className="flex items-center justify-between mb-4"><div><h2 className="font-bold text-white">Nominar 3 personas</h2><p className="text-xs text-gray-400">({selected.length}/3)</p></div><button onClick={()=>setShowNom(false)}><X size={18} className="text-gray-400"/></button></div>
            {selected.length>0&&<div className="flex gap-2 flex-wrap mb-3">{selected.map(id=>{const u=(Array.isArray(users)?users:[]).find((x:RankingEntry)=>x._id===id);return u?<button key={id} onClick={()=>setSelected(s=>s.filter(x=>x!==id))} className="flex items-center gap-1 text-xs px-2 py-1 rounded-full border" style={{borderColor:'#FF007F',color:'#FF007F',background:'rgba(255,0,127,0.1)'}}>{u.username}<X size={10}/></button>:null;})}</div>}
            <div className="relative mb-3"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar usuarios..." className="w-full rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none" style={{background:'#0b0b12',border:'1px solid #2a2a3a'}}/></div>
            <div className="space-y-2 max-h-48 overflow-y-auto mb-4">{filtered.map((u:RankingEntry)=><button key={u._id} onClick={()=>selected.length<3&&setSelected(s=>[...s,u._id])} disabled={selected.length>=3} className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/5 text-left disabled:opacity-40 transition-colors"><Av u={u} s={32}/><div className="flex-1 min-w-0"><div className="text-sm font-medium text-white">{u.username}</div><div className="text-xs text-gray-400">{u.flag} {u.country}</div></div></button>)}{filtered.length===0&&<p className="text-center text-gray-500 text-sm py-4">No se encontraron usuarios</p>}</div>
            <button onClick={()=>publish(selected)} disabled={selected.length<3||publishing} className="w-full py-3 rounded-xl font-bold text-white flex items-center justify-center gap-2 disabled:opacity-50" style={{background:selected.length===3?'linear-gradient(135deg,#FF007F,#7c3aed)':'#1e1e2a'}}>{publishing?<Spinner/>:<><Users size={18}/>Pasar el Dominó ({selected.length}/3)</>}</button>
          </div>
        </div>
      )}
      <div className="relative h-screen max-h-screen overflow-hidden">
        <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" autoPlay muted playsInline style={{display:camOn?'block':'none'}}/>
        {!camOn&&<div className="absolute inset-0 flex items-center justify-center bg-gray-900">{done?<div className="text-center"><CheckCircle size={64} className="mx-auto text-green-400 mb-3"/><p className="text-white font-bold">Video grabado ✓</p></div>:<div className="text-center"><Camera size={64} className="mx-auto text-gray-600 mb-3"/><p className="text-gray-400 text-sm">Activa la cámara</p></div>}</div>}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-4 pointer-events-auto"><button onClick={()=>{streamRef.current?.getTracks().forEach(t=>t.stop());setLocation('/feed');}} className="p-2 rounded-full" style={{background:'rgba(0,0,0,0.5)'}}><X size={20} className="text-white"/></button><div className="px-3 py-1.5 rounded-xl flex items-center gap-2" style={{background:'rgba(0,0,0,0.5)'}}><DominoLogo size={14}/><span className="text-xs font-bold text-white">DOMINO</span></div><div className="w-10"/></div>
          <div className="absolute top-32 left-4 w-8 h-8 border-t-2 border-l-2 rounded-tl-lg" style={{borderColor:'#00F5FF'}}/>
          <div className="absolute top-32 right-4 w-8 h-8 border-t-2 border-r-2 rounded-tr-lg" style={{borderColor:'#00F5FF'}}/>
          <div className="absolute bottom-32 left-4 w-8 h-8 border-b-2 border-l-2 rounded-bl-lg" style={{borderColor:'#00F5FF'}}/>
          <div className="absolute bottom-32 right-4 w-8 h-8 border-b-2 border-r-2 rounded-br-lg" style={{borderColor:'#00F5FF'}}/>
          <div className="absolute bottom-8 left-0 right-0 flex flex-col items-center gap-4 pointer-events-auto">
            {done?(
              <div className="flex flex-col items-center gap-3 w-full px-8">
                <div className="px-4 py-2 rounded-xl" style={{background:'rgba(0,0,0,0.6)'}}><div className="flex items-center gap-2"><CheckCircle size={16} className="text-green-400"/><span className="text-sm text-white font-medium">Video grabado — 15s ✓</span></div></div>
                <button onClick={()=>setShowNom(true)} className="w-full max-w-xs py-3.5 rounded-2xl font-bold text-white flex items-center justify-center gap-2" style={{background:'linear-gradient(135deg,#FF007F,#7c3aed)',boxShadow:'0 0 24px rgba(255,0,127,0.4)'}}><Users size={18}/>Nominar 3 y publicar</button>
                <button onClick={()=>{setDone(false);setBlob(null);setSecs(15);}} className="text-sm text-gray-400 hover:text-white flex items-center gap-1"><RefreshCw size={14}/>Repetir</button>
              </div>
            ):!camOn?(
              <button onClick={startCam} className="px-8 py-3 rounded-2xl font-bold text-black flex items-center gap-2" style={{background:'#00F5FF',boxShadow:'0 0 20px rgba(0,245,255,0.4)'}}><Camera size={18}/>Activar cámara</button>
            ):(
              <div className="flex flex-col items-center gap-3">
                <p className="text-xs text-gray-300">{rec?`Grabando... ${secs}s`:'Pulsa para grabar'}</p>
                {rec&&<div className="w-16 h-16 rounded-full flex items-center justify-center border-4" style={{borderColor:'#FF007F',boxShadow:'0 0 20px rgba(255,0,127,0.5)'}}><span className="text-2xl font-black text-white font-mono">{secs}</span></div>}
                <button onClick={rec?stopRec:startRec} className={cn('w-20 h-20 rounded-full border-4 flex items-center justify-center transition-all active:scale-95',rec?'scale-110':'border-white')} style={rec?{background:'#FF007F',borderColor:'#FF007F',boxShadow:'0 0 30px rgba(255,0,127,0.6)'}:{background:'rgba(255,255,255,0.1)'}}>
                  {rec?<div className="w-7 h-7 bg-white rounded-sm"/>:<div className="w-14 h-14 bg-white rounded-full"/>}
                </button>
                <p className="text-xs text-gray-500">{rec?'Pulsa para detener':'Se detiene a los 15s'}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ===================== NOTIFICATIONS =====================
function NotificationsPage() {
  const { user, token } = useAuth();
  const { data: notifs, setData: setNotifs } = useApi('/api/notifications', [user?._id]);
  const markAll = async()=>{if(!token)return;await fetch(`${API}/api/notifications/read-all`,{method:'PUT',headers:{Authorization:`Bearer ${token}`}});setNotifs((p:Notification[])=>Array.isArray(p)?p.map(n=>({...n,read:true})):p);};
  return (
    <div className="min-h-screen" style={{paddingTop:'80px',background:'#0b0b12'}}>
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6"><h1 className="text-2xl font-black text-white" style={{fontFamily:'Syne,sans-serif'}}>Notificaciones</h1>{Array.isArray(notifs)&&notifs.some((n:Notification)=>!n.read)&&<button onClick={markAll} className="text-xs font-semibold" style={{color:'#00F5FF'}}>Marcar todas como leídas</button>}</div>
        <div className="space-y-2">
          {(Array.isArray(notifs)?notifs:[]).map((n:Notification)=>(
            <div key={n._id} className={cn('flex gap-3 p-4 rounded-xl border',!n.read?'border-[#00F5FF]/20 bg-[#00F5FF]/5':'border-[#1e1e2a] bg-[#13131f]')}>
              <span className="text-xl">{n.type==='nomination'?'🎯':n.type==='chain_continued'?'⛓️':'🏆'}</span>
              <div className="flex-1"><p className="text-sm text-white">{n.message}</p><p className="text-xs text-gray-500 mt-1">{ago(n.createdAt)}</p></div>
              {!n.read&&<div className="w-2 h-2 rounded-full flex-shrink-0 mt-1" style={{background:'#00F5FF'}}/>}
            </div>
          ))}
          {(!notifs||!Array.isArray(notifs)||notifs.length===0)&&<div className="text-center py-16"><Bell size={48} className="mx-auto text-gray-700 mb-3"/><p className="text-gray-400">Sin notificaciones</p></div>}
        </div>
      </div>
    </div>
  );
}

// ===================== APP =====================
export default function App() { return <AuthProvider><AppInner/></AuthProvider>; }

function AppInner() {
  const { loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center" style={{background:'#0b0b12'}}><div className="flex flex-col items-center gap-4"><DominoLogo size={40}/><Spinner/></div></div>;
  return (
    <div className="min-h-screen" style={{background:'#0b0b12'}}>
      <Navbar/>
      <Switch>
        <Route path="/" component={HomePage}/>
        <Route path="/auth" component={AuthPage}/>
        <Route path="/feed" component={FeedPage}/>
        <Route path="/live" component={LiveListPage}/>
        <Route path="/live/create" component={CreateLivePage}/>
        <Route path="/live/:id">{(p:any)=><LiveViewerPage id={p.id}/>}</Route>
        <Route path="/map" component={WorldMapPage}/>
        <Route path="/dashboard" component={DashboardPage}/>
        <Route path="/camera" component={CameraPage}/>
        <Route path="/notifications" component={NotificationsPage}/>
        <Route><div className="min-h-screen flex items-center justify-center px-4"><div className="text-center"><div className="text-6xl mb-4">🎲</div><h1 className="text-3xl font-black text-white mb-2">Página no encontrada</h1><Link href="/" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-black" style={{background:'linear-gradient(135deg,#00F5FF,#7c3aed)'}}><Home size={16}/>Inicio</Link></div></div></Route>
      </Switch>
    </div>
  );
}
