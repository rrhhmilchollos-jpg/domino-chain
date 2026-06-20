import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, Route, Switch, useLocation, useParams } from 'wouter';
import {
  Home, Play, Map, BarChart2, Camera, Bell, User, Globe, Zap, ChevronRight,
  ChevronLeft, TrendingUp, Star, Share, Users, Clock, CheckCircle, ArrowRight,
  X, Search, Shield, Activity, Award, Menu, ExternalLink, MapPin, Video,
  MessageSquare, Heart, Bookmark, RefreshCw, Plus, Eye, ChevronDown,
  AlertCircle, LogOut, Loader2
} from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...args: Parameters<typeof clsx>) {
  return twMerge(clsx(...args));
}

const API = import.meta.env.VITE_API_URL || 'https://domino-chain-production.up.railway.app';

// ===================== TYPES =====================
interface AppUser {
  _id: string;
  username: string;
  email: string;
  avatarUrl: string;
  country: string;
  city: string;
  flag: string;
  impactPoints: number;
  currentStreak: number;
  bio: string;
}

interface Challenge {
  _id: string;
  title: string;
  description: string;
  category: 'Creativity' | 'Kindness' | 'Eco';
  activatedAt: string;
  expiresAt: string;
  globalCounter: number;
  status: 'active' | 'expired';
}

interface DominoVideo {
  _id: string;
  challengeId: string;
  userId: AppUser;
  videoUrl: string;
  thumbnailUrl: string;
  parentVideoId: string | null;
  rootVideoId: string;
  geoCoordinates: { lat: number; lng: number };
  nominatedUsers: string[];
  chainDepth: number;
  likes: string[];
  createdAt: string;
}

interface Notification {
  _id: string;
  type: 'nomination' | 'chain_continued' | 'milestone' | 'liked';
  fromUserId: { username: string; avatarUrl: string; flag: string };
  message: string;
  read: boolean;
  createdAt: string;
}

interface RankingEntry {
  _id: string;
  username: string;
  avatarUrl: string;
  country: string;
  flag: string;
  impactPoints: number;
  currentStreak: number;
  position: number;
}

// ===================== AUTH CONTEXT =====================
const AuthContext = React.createContext<{
  user: AppUser | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => void;
  loading: boolean;
}>({
  user: null, token: null,
  login: async () => {}, register: async () => {}, logout: () => {}, loading: true
});

function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('domino_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      fetch(`${API}/api/users/me`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.ok ? r.json() : null)
        .then(data => { if (data) setUser(data); else { setToken(null); localStorage.removeItem('domino_token'); } })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [token]);

  const login = async (email: string, password: string) => {
    const r = await fetch(`${API}/api/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || 'Error al iniciar sesión');
    localStorage.setItem('domino_token', data.token);
    setToken(data.token);
    setUser(data.user);
  };

  const register = async (formData: any) => {
    const r = await fetch(`${API}/api/auth/register`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || 'Error al registrarse');
    localStorage.setItem('domino_token', data.token);
    setToken(data.token);
    setUser(data.user);
  };

  const logout = () => {
    localStorage.removeItem('domino_token');
    setToken(null);
    setUser(null);
  };

  return <AuthContext.Provider value={{ user, token, login, register, logout, loading }}>{children}</AuthContext.Provider>;
}

function useAuth() { return React.useContext(AuthContext); }

function useApi(endpoint: string, deps: any[] = []) {
  const { token } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`${API}${endpoint}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then(r => r.json())
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, loading, error, setData };
}

// ===================== UTILS =====================
function formatImpact(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3600000);
  const m = Math.floor(diff / 60000);
  if (h > 0) return `hace ${h}h`;
  if (m > 0) return `hace ${m}m`;
  return 'ahora mismo';
}

function timeLeft(iso: string): string {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return 'Expirado';
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  return `${h}h ${m}m`;
}

function getCategoryColor(cat: string): string {
  if (cat === 'Creativity') return 'text-violet-400 border-violet-400';
  if (cat === 'Kindness') return 'text-pink-400 border-pink-400';
  if (cat === 'Eco') return 'text-green-400 border-green-400';
  return 'text-cyan-400 border-cyan-400';
}

// ===================== COMPONENTS =====================
function DominoLogo({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size * 1.6} viewBox="0 0 24 40" fill="none" aria-hidden="true">
      <rect x="2" y="0" width="20" height="40" rx="3" fill="currentColor" opacity="0.15" />
      <rect x="2" y="0" width="20" height="40" rx="3" stroke="#00F5FF" strokeWidth="1.5" />
      <line x1="2" y1="20" x2="22" y2="20" stroke="#00F5FF" strokeWidth="1" />
      <circle cx="9" cy="10" r="2" fill="#00F5FF" />
      <circle cx="15" cy="10" r="2" fill="#00F5FF" />
      <circle cx="12" cy="30" r="2" fill="#FF007F" />
    </svg>
  );
}

function Spinner() {
  return <Loader2 size={20} className="animate-spin text-neon" />;
}

// ===================== AUTH PAGES =====================
function AuthPage() {
  const { login, register } = useAuth();
  const [, setLocation] = useLocation();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [form, setForm] = useState({ email: '', password: '', username: '', country: '', city: '', flag: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const flags: Record<string, string> = {
    'España': '🇪🇸', 'México': '🇲🇽', 'Argentina': '🇦🇷', 'Colombia': '🇨🇴',
    'Estados Unidos': '🇺🇸', 'Japón': '🇯🇵', 'Brasil': '🇧🇷', 'Francia': '🇫🇷',
    'Alemania': '🇩🇪', 'Italia': '🇮🇹', 'Reino Unido': '🇬🇧', 'Portugal': '🇵🇹'
  };

  const handle = async () => {
    setError(''); setLoading(true);
    try {
      if (mode === 'login') {
        await login(form.email, form.password);
      } else {
        if (!form.username || !form.email || !form.password || !form.country || !form.city) {
          throw new Error('Rellena todos los campos');
        }
        await register({ ...form, flag: flags[form.country] || '🌍' });
      }
      setLocation('/feed');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#0b0b12' }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <DominoLogo size={40} />
          <h1 className="font-display text-4xl font-black mt-4" style={{ fontFamily: 'Syne, sans-serif', color: '#00F5FF', textShadow: '0 0 12px #00F5FF' }}>DOMINO</h1>
          <p className="text-gray-400 text-sm mt-2">The Real-World Chain Reaction</p>
        </div>
        <div className="bg-[#13131f] border border-[#1e1e2a] rounded-2xl p-6 space-y-4">
          <div className="flex gap-1 bg-[#0b0b12] rounded-xl p-1">
            {(['login', 'register'] as const).map(m => (
              <button key={m} onClick={() => { setMode(m); setError(''); }}
                className={cn('flex-1 py-2 rounded-lg text-sm font-semibold transition-all',
                  mode === m ? 'text-[#0b0b12]' : 'text-gray-400 hover:text-white')}
                style={mode === m ? { background: '#00F5FF' } : {}}>
                {m === 'login' ? 'Entrar' : 'Registrarse'}
              </button>
            ))}
          </div>

          {mode === 'register' && (
            <input placeholder="@username" value={form.username} onChange={set('username')}
              className="w-full bg-[#0b0b12] border border-[#2a2a3a] rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#00F5FF]" />
          )}

          <input placeholder="Email" type="email" value={form.email} onChange={set('email')}
            className="w-full bg-[#0b0b12] border border-[#2a2a3a] rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#00F5FF]" />

          <input placeholder="Contraseña (mín. 6 caracteres)" type="password" value={form.password} onChange={set('password')}
            className="w-full bg-[#0b0b12] border border-[#2a2a3a] rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#00F5FF]" />

          {mode === 'register' && (
            <>
              <select value={form.country} onChange={set('country')}
                className="w-full bg-[#0b0b12] border border-[#2a2a3a] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#00F5FF]">
                <option value="">País</option>
                {Object.keys(flags).map(c => <option key={c} value={c}>{flags[c]} {c}</option>)}
              </select>
              <input placeholder="Ciudad" value={form.city} onChange={set('city')}
                className="w-full bg-[#0b0b12] border border-[#2a2a3a] rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#00F5FF]" />
            </>
          )}

          {error && <p className="text-red-400 text-xs text-center">{error}</p>}

          <button onClick={handle} disabled={loading}
            className="w-full py-3 rounded-xl font-bold text-[#0b0b12] flex items-center justify-center gap-2 transition-all hover:opacity-90 active:scale-95 disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #00F5FF, #7c3aed)' }}>
            {loading ? <Spinner /> : mode === 'login' ? 'Entrar' : 'Crear cuenta'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ===================== NAVBAR =====================
function Navbar() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [loc, setLocation] = useLocation();
  const { data: notifData } = useApi('/api/notifications', [user?._id]);
  const unread = (notifData || []).filter((n: Notification) => !n.read).length;

  const links = [
    { href: '/', label: 'Inicio', icon: <Home size={16} /> },
    { href: '/feed', label: 'Feed', icon: <Play size={16} /> },
    { href: '/map', label: 'Mapa', icon: <Map size={16} /> },
    { href: '/dashboard', label: 'Dashboard', icon: <BarChart2 size={16} /> },
    { href: '/camera', label: 'Grabar', icon: <Camera size={16} /> }
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-40 glass border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          <Link href="/" className="flex items-center gap-2">
            <DominoLogo size={18} />
            <span className="font-display text-xl font-bold" style={{ fontFamily: 'Syne, sans-serif', color: '#00F5FF', textShadow: '0 0 12px #00F5FF' }}>DOMINO</span>
          </Link>
          <div className="hidden md:flex items-center gap-1">
            {links.map(l => (
              <Link key={l.href} href={l.href}
                className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200',
                  loc === l.href ? 'bg-neon/10 text-neon' : 'text-gray-400 hover:text-fore hover:bg-muted')}>
                {l.icon}{l.label}
              </Link>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Link href="/notifications" className="relative p-2 rounded-lg hover:bg-muted transition-colors">
              <Bell size={18} className="text-gray-400" />
              {unread > 0 && <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full text-[9px] font-bold text-black flex items-center justify-center" style={{ background: '#FF007F' }}>{unread}</span>}
            </Link>
            {user ? (
              <div className="flex items-center gap-2">
                <Link href="/dashboard" className="w-8 h-8 rounded-full overflow-hidden border-2 border-border hover:border-neon transition-colors">
                  {user.avatarUrl
                    ? <img src={user.avatarUrl} alt={user.username} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-xs font-bold" style={{ background: '#7c3aed', color: 'white' }}>{user.username[0].toUpperCase()}</div>
                  }
                </Link>
                <button onClick={logout} className="p-2 rounded-lg hover:bg-muted text-gray-400 hover:text-white transition-colors" title="Cerrar sesión">
                  <LogOut size={16} />
                </button>
              </div>
            ) : (
              <Link href="/auth" className="text-sm font-semibold px-3 py-1.5 rounded-lg" style={{ background: '#00F5FF', color: '#0b0b12' }}>
                Entrar
              </Link>
            )}
            <button className="md:hidden p-2 rounded-lg hover:bg-muted" onClick={() => setOpen(o => !o)}>
              <Menu size={18} className="text-gray-400" />
            </button>
          </div>
        </div>
      </div>
      {open && (
        <div className="md:hidden border-t border-border bg-surface">
          {links.map(l => (
            <Link key={l.href} href={l.href}
              className={cn('flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors',
                loc === l.href ? 'text-neon bg-neon/5' : 'text-gray-400 hover:text-fore')}
              onClick={() => setOpen(false)}>
              {l.icon}{l.label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
}

// ===================== HOME PAGE =====================
function HomePage() {
  const { data: challenge } = useApi('/api/challenges/active');
  const { data: ranking } = useApi('/api/ranking?limit=5');
  const { data: videos } = useApi('/api/videos/feed?limit=4');
  const [counter, setCounter] = useState(14782);

  useEffect(() => {
    if (challenge?.globalCounter) setCounter(challenge.globalCounter);
  }, [challenge]);

  useEffect(() => {
    const t = setInterval(() => setCounter(c => c + Math.floor(Math.random() * 3)), 2500);
    return () => clearInterval(t);
  }, []);

  const steps = [
    { icon: <Video size={28} />, title: 'Graba el reto', desc: 'Abre la cámara de DOMINO y graba tu versión del reto diario en 15 segundos.', color: 'text-neon' },
    { icon: <Users size={28} />, title: 'Nomina a 3 personas', desc: 'Antes de publicar, elige 3 personas para pasar el dominó en cualquier parte del mundo.', color: 'text-fuchsia' },
    { icon: <Globe size={28} />, title: 'Mira el impacto global', desc: 'Sigue en el mapa cómo tu cadena viaja por el mundo. Cada nodo suma puntos de impacto real.', color: 'text-violet-400' }
  ];

  return (
    <div>
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          <img src="https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1600&h=900&fit=crop"
            alt="Tierra desde el espacio" className="w-full h-full object-cover opacity-20" />
          <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at center, rgba(0,245,255,0.05) 0%, rgba(11,11,18,0.9) 70%)' }} />
        </div>
        <div className="relative z-10 max-w-4xl mx-auto px-4 text-center">
          <div className="flex justify-center mb-6"><DominoLogo size={48} /></div>
          <h1 className="text-5xl sm:text-7xl font-display font-black mb-4 tracking-tight" style={{ fontFamily: 'Syne, sans-serif' }}>
            <span style={{ background: 'linear-gradient(135deg, #00F5FF, #FF007F)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>DOMINO</span>
          </h1>
          <p className="text-xl sm:text-2xl text-gray-300 mb-2 font-medium">The Real-World Chain Reaction</p>
          <p className="text-base text-gray-400 mb-8 max-w-xl mx-auto">
            Completa retos de 15 segundos. Nomina a 3 personas en el mundo. Observa cómo tu acto se convierte en un efecto dominó global.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/feed" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-black transition-all hover:scale-105 active:scale-95"
              style={{ background: 'linear-gradient(135deg, #00F5FF, #7c3aed)', boxShadow: '0 0 20px rgba(0,245,255,0.3)' }}>
              <Play size={18} />Ver el Feed
            </Link>
            <Link href="/camera" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all hover:scale-105 border"
              style={{ color: '#FF007F', borderColor: '#FF007F', boxShadow: '0 0 16px rgba(255,0,127,0.2)' }}>
              <Camera size={18} />Empezar reto
            </Link>
          </div>
          <div className="mt-12 flex items-center justify-center gap-2">
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#00F5FF' }} />
            <span className="text-lg font-bold" style={{ color: '#00F5FF' }}>{counter.toLocaleString('es-ES')}</span>
            <span className="text-gray-400 text-sm">cadenas activas en el mundo</span>
          </div>
        </div>
      </section>

      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-display font-bold text-fore" style={{ fontFamily: 'Syne, sans-serif' }}>Cómo funciona</h2>
            <p className="text-gray-400 mt-2">Tres pasos para cambiar el mundo desde tu móvil</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {steps.map((step, i) => (
              <div key={i} className="bg-surface border border-border rounded-2xl p-6 text-center hover:border-neon/50 transition-all hover:-translate-y-1">
                <div className={cn('inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4 mx-auto', step.color)} style={{ background: 'rgba(42,42,58,0.8)' }}>
                  {step.icon}
                </div>
                <div className="text-4xl font-black text-gray-700 mb-2" style={{ fontFamily: 'Syne, sans-serif' }}>0{i + 1}</div>
                <h3 className="text-lg font-bold text-fore mb-2">{step.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {challenge && (
        <section className="py-16 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-display font-bold text-fore" style={{ fontFamily: 'Syne, sans-serif' }}>Reto del Día</h2>
              <Link href={`/challenge/${challenge._id}`} className="text-sm text-neon hover:underline flex items-center gap-1">
                Ver todo <ChevronRight size={14} />
              </Link>
            </div>
            <div className="bg-surface border border-border rounded-xl p-5 hover:border-neon transition-all">
              <div className="flex items-center gap-2 mb-2">
                <span className={cn('text-xs border rounded-full px-2 py-0.5 font-medium', getCategoryColor(challenge.category))}>{challenge.category}</span>
                <span className="text-xs bg-green-500/20 text-green-400 border border-green-500/30 rounded-full px-2 py-0.5">Activo</span>
              </div>
              <h3 className="font-bold text-fore text-lg">{challenge.title}</h3>
              <p className="text-sm text-gray-400 mt-1 line-clamp-2">{challenge.description}</p>
              <div className="flex items-center justify-between mt-3">
                <div className="flex items-center gap-1 text-xs text-gray-400"><Users size={12} /><span>{formatImpact(challenge.globalCounter)} participantes</span></div>
                <div className="flex items-center gap-1 text-xs text-gray-400"><Clock size={12} /><span>{timeLeft(challenge.expiresAt)}</span></div>
              </div>
              <Link href={`/challenge/${challenge._id}`} className="mt-3 w-full py-2 rounded-lg text-sm font-semibold text-white flex items-center justify-center transition-all hover:opacity-90"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #00F5FF)' }}>
                Ver reto completo
              </Link>
            </div>
          </div>
        </section>
      )}

      {ranking && ranking.length > 0 && (
        <section className="py-16 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-display font-bold text-fore" style={{ fontFamily: 'Syne, sans-serif' }}>Ranking Global</h2>
              <Link href="/dashboard" className="text-sm text-neon hover:underline flex items-center gap-1">Ver completo <ChevronRight size={14} /></Link>
            </div>
            <div className="bg-surface border border-border rounded-2xl overflow-hidden">
              {ranking.map((entry: RankingEntry, i: number) => (
                <div key={entry._id} className="flex items-center gap-3 p-3 border-b border-border last:border-0 hover:bg-muted transition-colors">
                  <span className="w-7 text-center text-sm font-bold">
                    {i < 3 ? ['🥇','🥈','🥉'][i] : <span className="text-gray-500 font-mono">#{i+1}</span>}
                  </span>
                  <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-border flex items-center justify-center" style={{ background: '#7c3aed' }}>
                    {entry.avatarUrl ? <img src={entry.avatarUrl} alt={entry.username} className="w-full h-full object-cover" /> : <span className="text-white text-xs font-bold">{entry.username[0].toUpperCase()}</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-fore truncate">{entry.username} {entry.flag}</div>
                    <div className="text-xs text-gray-500">{entry.country}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold" style={{ color: '#00F5FF' }}>{formatImpact(entry.impactPoints)}</div>
                    <div className="text-xs text-gray-500 flex items-center gap-0.5 justify-end"><Zap size={10} className="text-yellow-400" />{entry.currentStreak}d</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <footer className="border-t border-border bg-surface mt-16">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
            <p className="text-xs text-gray-600">© 2026 DOMINO. The Real-World Chain Reaction.</p>
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <Globe size={12} style={{ color: '#00F5FF' }} />
              <span>{formatImpact(challenge?.globalCounter || 14782)} cadenas activas</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ===================== FEED PAGE =====================
function FeedPage() {
  const { data: videos, loading } = useApi('/api/videos/feed?limit=20');
  const { data: challenge } = useApi('/api/challenges/active');
  const { token } = useAuth();
  const [chainModal, setChainModal] = useState<string | null>(null);

  const handleLike = async (videoId: string) => {
    if (!token) return;
    await fetch(`${API}/api/videos/${videoId}/like`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}` }
    });
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ paddingTop: '56px' }}>
      <Spinner />
    </div>
  );

  return (
    <div className="relative" style={{ paddingTop: '56px' }}>
      {chainModal && (
        <div className="fixed inset-0 z-50 flex flex-col" style={{ background: 'rgba(11,11,18,0.97)' }}>
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h2 className="font-bold text-fore text-lg">Cadena Origen</h2>
            <button onClick={() => setChainModal(null)} className="p-2 rounded-lg hover:bg-muted"><X size={20} /></button>
          </div>
          <div className="flex-1 overflow-auto p-4">
            <p className="text-gray-400 text-sm text-center py-8">La cadena se cargará con los datos reales de la base de datos.</p>
          </div>
        </div>
      )}
      {challenge && (
        <div className="fixed top-14 left-0 right-0 z-30 pointer-events-none">
          <div className="max-w-md mx-auto px-4 pt-3">
            <div className="glass rounded-xl px-3 py-2 pointer-events-auto">
              <div className="flex items-center gap-2">
                <Zap size={14} className="text-yellow-400" />
                <span className="text-xs font-semibold text-fore">{challenge.title}</span>
                <span className="ml-auto text-xs text-gray-400">{timeLeft(challenge.expiresAt)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="fixed top-14 left-0 right-0 bottom-0 overflow-y-scroll snap-y snap-mandatory">
        {(videos || []).map((video: DominoVideo) => (
          <div key={video._id} className="relative w-full h-screen snap-start flex-shrink-0 overflow-hidden bg-black">
            {video.thumbnailUrl
              ? <img src={video.thumbnailUrl} alt={`Video de ${video.userId?.username}`} className="absolute inset-0 w-full h-full object-cover" />
              : <div className="absolute inset-0 flex items-center justify-center" style={{ background: '#1a1a2e' }}><Camera size={48} className="text-gray-600" /></div>
            }
            <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(11,11,18,0.95) 0%, rgba(11,11,18,0.2) 40%, transparent 70%)' }} />
            <div className="absolute bottom-4 left-4 right-16 z-10">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-full overflow-hidden border-2" style={{ borderColor: '#00F5FF', background: '#7c3aed' }}>
                  {video.userId?.avatarUrl ? <img src={video.userId.avatarUrl} alt={video.userId.username} className="w-full h-full object-cover" /> : <span className="text-white text-xs flex items-center justify-center h-full font-bold">{video.userId?.username?.[0]?.toUpperCase()}</span>}
                </div>
                <div>
                  <p className="text-white text-sm font-bold">{video.userId?.username}</p>
                  <p className="text-gray-300 text-xs">{video.userId?.flag} {video.userId?.city}</p>
                </div>
              </div>
              <span className="text-xs bg-black/40 border border-white/10 rounded-full px-2 py-0.5 text-gray-300 mr-2">Profundidad {video.chainDepth + 1}</span>
              <span className="text-xs text-gray-400">{timeAgo(video.createdAt)}</span>
              <button onClick={() => setChainModal(video._id)}
                className="mt-2 flex items-center gap-2 text-sm font-bold px-4 py-2 rounded-xl"
                style={{ background: '#FF007F', boxShadow: '0 0 20px rgba(255,0,127,0.5)' }}>
                <Eye size={16} />Ver Cadena
              </button>
            </div>
            <div className="absolute right-3 bottom-32 flex flex-col gap-4 items-center z-10">
              <button onClick={() => handleLike(video._id)} className="flex flex-col items-center gap-1">
                <Heart size={24} className="text-white" />
                <span className="text-xs text-white">{formatImpact(video.likes?.length || 0)}</span>
              </button>
              <button className="flex flex-col items-center gap-1">
                <Share size={24} className="text-white" />
                <span className="text-xs text-white">Compartir</span>
              </button>
            </div>
          </div>
        ))}
        {(!videos || videos.length === 0) && (
          <div className="h-screen flex flex-col items-center justify-center text-center px-4">
            <div className="text-6xl mb-4">🎲</div>
            <h3 className="text-xl font-bold text-fore mb-2">Sin videos todavía</h3>
            <p className="text-gray-400 text-sm mb-6">Sé el primero en grabar un reto y empezar una cadena.</p>
            <Link href="/camera" className="px-6 py-3 rounded-xl font-bold text-black" style={{ background: '#00F5FF' }}>
              Grabar ahora
            </Link>
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

  const project = (lat: number, lng: number, w: number, h: number) => ({
    x: ((lng + 180) / 360) * w,
    y: ((90 - lat) / 180) * h
  });

  const SAMPLE_POINTS = [
    { lat: 40.4168, lng: -3.7038, flag: '🇪🇸', city: 'Madrid' },
    { lat: 35.6762, lng: 139.6503, flag: '🇯🇵', city: 'Tokio' },
    { lat: 40.7128, lng: -74.006, flag: '🇺🇸', city: 'Nueva York' },
    { lat: -34.6037, lng: -58.3816, flag: '🇦🇷', city: 'Buenos Aires' },
    { lat: 48.8566, lng: 2.3522, flag: '🇫🇷', city: 'París' },
    { lat: 51.5074, lng: -0.1278, flag: '🇬🇧', city: 'Londres' },
  ];

  const points = videos && videos.length > 0
    ? videos.map((v: DominoVideo) => ({
        lat: v.geoCoordinates.lat, lng: v.geoCoordinates.lng,
        flag: v.userId?.flag || '🌍', city: v.userId?.city || ''
      }))
    : SAMPLE_POINTS;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const parent = canvas.parentElement;
    canvas.width = parent?.clientWidth || 800;
    canvas.height = Math.min((parent?.clientWidth || 800) * 0.5, 400);
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#0b0b12';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(42,42,58,0.6)';
    ctx.lineWidth = 0.5;
    for (let lng2 = -180; lng2 <= 180; lng2 += 30) {
      const { x } = project(0, lng2, w, h);
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    for (let lat2 = -90; lat2 <= 90; lat2 += 30) {
      const { y } = project(lat2, 0, w, h);
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }
    for (let i = 0; i < points.length - 1; i++) {
      const p1 = project(points[i].lat, points[i].lng, w, h);
      const p2 = project(points[i+1].lat, points[i+1].lng, w, h);
      const grad = ctx.createLinearGradient(p1.x, p1.y, p2.x, p2.y);
      grad.addColorStop(0, '#00F5FF'); grad.addColorStop(1, '#FF007F');
      ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y);
      ctx.strokeStyle = grad; ctx.lineWidth = 1.5; ctx.globalAlpha = 0.6;
      ctx.stroke(); ctx.globalAlpha = 1;
    }
    points.forEach((pt: {lat: number; lng: number; flag: string; city: string}, idx: number) => {
      const { x, y } = project(pt.lat, pt.lng, w, h);
      ctx.beginPath(); ctx.arc(x, y, idx === 0 ? 8 : 6, 0, Math.PI * 2);
      ctx.fillStyle = idx === 0 ? '#FF007F' : '#00F5FF';
      ctx.shadowBlur = 14; ctx.shadowColor = ctx.fillStyle;
      ctx.fill(); ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(248,250,252,0.85)';
      ctx.font = `${Math.max(8, Math.floor(w/90))}px Inter`;
      ctx.fillText(`${pt.flag} ${pt.city}`, x + 10, y - 4);
    });
  }, [points.length]);

  return (
    <div className="min-h-screen" style={{ paddingTop: '80px' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <h1 className="text-3xl font-display font-bold text-fore mb-2" style={{ fontFamily: 'Syne, sans-serif' }}>Mapa Global de Impacto</h1>
        <p className="text-gray-400 mb-6">Cadenas activas en tiempo real · {points.length} nodos</p>
        <div className="relative w-full rounded-xl overflow-hidden border border-border bg-[#0b0b12]" style={{ minHeight: '300px' }}>
          <canvas ref={canvasRef} className="w-full block" aria-label="Mapa mundial con cadenas DOMINO" />
        </div>
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-surface border border-border rounded-xl p-4">
            <div className="text-2xl font-bold" style={{ color: '#00F5FF' }}>{videos?.length || points.length}</div>
            <div className="text-xs text-gray-400 mt-1">Videos en cadena</div>
          </div>
          <div className="bg-surface border border-border rounded-xl p-4">
            <div className="text-2xl font-bold" style={{ color: '#FF007F' }}>{new Set(points.map((p: any) => p.city)).size}</div>
            <div className="text-xs text-gray-400 mt-1">Ciudades conectadas</div>
          </div>
          <div className="bg-surface border border-border rounded-xl p-4">
            <div className="text-2xl font-bold text-violet-400">{points.length}</div>
            <div className="text-xs text-gray-400 mt-1">Nodos activos</div>
          </div>
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

  const markRead = async (id: string) => {
    if (!token) return;
    await fetch(`${API}/api/notifications/${id}/read`, { method: 'PUT', headers: { Authorization: `Bearer ${token}` } });
    setNotifs((prev: Notification[]) => prev.map(n => n._id === id ? { ...n, read: true } : n));
  };

  const unread = (notifs || []).filter((n: Notification) => !n.read).length;

  if (!user) return (
    <div className="min-h-screen flex items-center justify-center" style={{ paddingTop: '80px' }}>
      <div className="text-center">
        <p className="text-gray-400 mb-4">Inicia sesión para ver tu dashboard</p>
        <Link href="/auth" className="px-6 py-3 rounded-xl font-bold text-black" style={{ background: '#00F5FF' }}>Entrar</Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen" style={{ paddingTop: '80px' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-display font-bold text-fore" style={{ fontFamily: 'Syne, sans-serif' }}>Mi Dashboard</h1>
            <p className="text-gray-400 mt-1">Tu impacto global en tiempo real</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-border" style={{ background: '#7c3aed' }}>
              {user.avatarUrl ? <img src={user.avatarUrl} alt={user.username} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-white font-bold">{user.username[0].toUpperCase()}</div>}
            </div>
            <div className="hidden sm:block">
              <div className="text-sm font-semibold text-fore">{user.username}</div>
              <div className="text-xs text-gray-400">{user.flag} {user.city}</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            { icon: <Zap size={18} />, value: formatImpact(user.impactPoints), label: 'Puntos de impacto', color: 'bg-yellow-500/20 text-yellow-400' },
            { icon: <Activity size={18} />, value: `${user.currentStreak}d`, label: 'Racha actual', color: 'bg-cyan-500/20 text-cyan-400' },
            { icon: <Globe size={18} />, value: '—', label: 'Países alcanzados', color: 'bg-violet-500/20 text-violet-400' },
            { icon: <Bell size={18} />, value: String(unread), label: 'Notificaciones nuevas', color: 'bg-pink-500/20 text-pink-400' }
          ].map((kpi, i) => (
            <div key={i} className="bg-surface border border-border rounded-xl p-4 hover:border-neon transition-all">
              <div className={cn('p-2 rounded-lg w-fit mb-3', kpi.color)}>{kpi.icon}</div>
              <div className="text-2xl font-bold text-fore">{kpi.value}</div>
              <div className="text-xs text-gray-400 mt-1">{kpi.label}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="bg-surface border border-border rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-fore">Ranking Global</h2>
                <div className="flex items-center gap-1 text-xs text-neon"><Star size={12} /></div>
              </div>
              <div className="space-y-1">
                {(ranking || []).map((entry: RankingEntry, i: number) => (
                  <div key={entry._id} className={cn('flex items-center gap-3 p-3 rounded-xl transition-all hover:bg-muted', entry._id === user._id && 'border border-neon/30 bg-neon/5')}>
                    <span className="w-7 text-center text-sm font-bold">
                      {i < 3 ? ['🥇','🥈','🥉'][i] : <span className="text-gray-500 font-mono">#{i+1}</span>}
                    </span>
                    <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-border" style={{ background: '#7c3aed' }}>
                      {entry.avatarUrl ? <img src={entry.avatarUrl} alt={entry.username} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-white text-xs font-bold">{entry.username[0].toUpperCase()}</div>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={cn('text-sm font-semibold truncate', entry._id === user._id ? 'text-neon' : 'text-fore')}>{entry.username} {entry.flag}</div>
                      <div className="text-xs text-gray-500">{entry.country}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-neon">{formatImpact(entry.impactPoints)}</div>
                      <div className="text-xs text-gray-500">{entry.currentStreak}d</div>
                    </div>
                  </div>
                ))}
                {!ranking && <div className="text-center py-8"><Spinner /></div>}
              </div>
            </div>
          </div>

          <div>
            <div className="bg-surface border border-border rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-fore">Notificaciones</h2>
                {unread > 0 && <span className="text-xs font-bold px-2 py-0.5 rounded-full text-black" style={{ background: '#FF007F' }}>{unread} nuevas</span>}
              </div>
              <div className="space-y-2">
                {(notifs || []).map((n: Notification) => (
                  <div key={n._id} onClick={() => markRead(n._id)}
                    className={cn('flex gap-3 p-2.5 rounded-xl cursor-pointer transition-all hover:bg-muted', !n.read && 'bg-neon/5 border border-neon/20')}>
                    <span className="text-lg">{n.type === 'nomination' ? '🎯' : n.type === 'chain_continued' ? '⛓️' : '🏆'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-300 leading-relaxed line-clamp-2">{n.message}</p>
                      <p className="text-xs text-gray-500 mt-1">{timeAgo(n.createdAt)}</p>
                    </div>
                    {!n.read && <div className="w-1.5 h-1.5 rounded-full mt-1 flex-shrink-0" style={{ background: '#00F5FF' }} />}
                  </div>
                ))}
                {(!notifs || notifs.length === 0) && (
                  <div className="text-center py-8">
                    <Bell size={32} className="mx-auto text-gray-700 mb-2" />
                    <p className="text-sm text-gray-500">Sin notificaciones</p>
                  </div>
                )}
              </div>
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
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [recording, setRecording] = useState(false);
  const [timeLeft, setTimeLeft] = useState(15);
  const [recorded, setRecorded] = useState(false);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [showNomination, setShowNomination] = useState(false);
  const [published, setPublished] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [geo, setGeo] = useState({ lat: 40.4168, lng: -3.7038 });
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(p => setGeo({ lat: p.coords.latitude, lng: p.coords.longitude }));
    return () => { streamRef.current?.getTracks().forEach(t => t.stop()); };
  }, []);

  const startCamera = async () => {
    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'user' }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: true
        });
      } catch {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        } catch {
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        }
      }
      streamRef.current = stream;
      setCameraActive(true);
      // Esperar al siguiente frame para que el video esté en el DOM
      await new Promise(r => setTimeout(r, 100));
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true;
        videoRef.current.playsInline = true;
        try {
          await videoRef.current.play();
        } catch (playErr) {
          console.warn('Play error:', playErr);
        }
      }
    } catch (err: any) {
      console.error('Camera error:', err);
      setCameraActive(false);
      if (err.name === 'NotAllowedError') {
        alert('❌ Permiso de cámara denegado.\n\nVe a Ajustes del navegador > Permisos de sitio > Cámara y actívala para esta web.');
      } else if (err.name === 'NotFoundError') {
        alert('❌ No se encontró ninguna cámara en este dispositivo.');
      } else {
        alert('❌ Error al acceder a la cámara: ' + err.message);
      }
    }
  };

  const startRecording = () => {
    if (!streamRef.current) return;
    chunksRef.current = [];
    const mr = new MediaRecorder(streamRef.current, { mimeType: 'video/webm' });
    mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    mr.onstop = () => {
      const b = new Blob(chunksRef.current, { type: 'video/webm' });
      setBlob(b);
      setRecorded(true);
      streamRef.current?.getTracks().forEach(t => t.stop());
      setCameraActive(false);
    };
    mediaRecorderRef.current = mr;
    mr.start();
    setRecording(true);
    setTimeLeft(15);
    intervalRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { stopRecording(); return 0; }
        return t - 1;
      });
    }, 1000);
  };

  const stopRecording = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    mediaRecorderRef.current?.stop();
    setRecording(false);
  };

  const publish = async (nominatedIds: string[]) => {
    if (!token || !challenge) return;
    setPublishing(true);
    try {
      const formData = new FormData();
      if (blob) formData.append('video', blob, 'domino.webm');
      const r = await fetch(`${API}/api/videos`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          challengeId: challenge._id,
          geoCoordinates: geo,
          nominatedUserIds: nominatedIds
        })
      });
      if (r.ok) { setPublished(true); setShowNomination(false); }
    } catch (e) { alert('Error al publicar. Inténtalo de nuevo.'); }
    finally { setPublishing(false); }
  };

  const filteredUsers = (users || []).filter((u: RankingEntry) =>
    u._id !== user?._id && !selected.includes(u._id) &&
    (u.username.toLowerCase().includes(search.toLowerCase()) || (u.country || '').toLowerCase().includes(search.toLowerCase()))
  );

  if (!user) return (
    <div className="min-h-screen flex items-center justify-center" style={{ paddingTop: '56px' }}>
      <div className="text-center">
        <p className="text-gray-400 mb-4">Inicia sesión para grabar retos</p>
        <Link href="/auth" className="px-6 py-3 rounded-xl font-bold text-black" style={{ background: '#00F5FF' }}>Entrar</Link>
      </div>
    </div>
  );

  if (published) return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ paddingTop: '56px' }}>
      <div className="text-center">
        <div className="text-6xl mb-4">🎲</div>
        <h2 className="text-3xl font-display font-bold text-fore mb-2" style={{ fontFamily: 'Syne, sans-serif' }}>¡Dominó pasado!</h2>
        <p className="text-gray-400 mb-6">Tu video está en producción. Los nominados han recibido la notificación.</p>
        <div className="flex gap-3 justify-center">
          <button onClick={() => setLocation('/feed')} className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-black" style={{ background: 'linear-gradient(135deg, #00F5FF, #7c3aed)' }}>
            <Play size={16} />Ver Feed
          </button>
          <button onClick={() => setLocation('/map')} className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold border border-neon" style={{ color: '#00F5FF' }}>
            <Map size={16} />Ver Mapa
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen" style={{ paddingTop: '56px', background: '#000' }}>
      {showNomination && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.85)' }}>
          <div className="w-full max-w-md bg-[#13131f] border border-[#1e1e2a] rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-bold text-fore">Nominar 3 personas</h2>
                <p className="text-xs text-gray-400">Obligatorio ({selected.length}/3)</p>
              </div>
              <button onClick={() => setShowNomination(false)} className="p-1.5 rounded-lg hover:bg-muted"><X size={18} /></button>
            </div>
            {selected.length > 0 && (
              <div className="flex gap-2 flex-wrap mb-3">
                {selected.map(id => {
                  const u = (users || []).find((x: RankingEntry) => x._id === id);
                  return u ? (
                    <button key={id} onClick={() => setSelected(s => s.filter(x => x !== id))}
                      className="flex items-center gap-1 text-xs px-2 py-1 rounded-full border" style={{ borderColor: '#FF007F', color: '#FF007F', background: 'rgba(255,0,127,0.1)' }}>
                      {u.username} <X size={10} />
                    </button>
                  ) : null;
                })}
              </div>
            )}
            <div className="relative mb-3">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input type="text" placeholder="Buscar usuarios..." value={search} onChange={e => setSearch(e.target.value)}
                className="w-full bg-[#0b0b12] border border-[#2a2a3a] rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#00F5FF]" />
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto mb-4">
              {filteredUsers.map((u: RankingEntry) => (
                <button key={u._id} onClick={() => selected.length < 3 && setSelected(s => [...s, u._id])}
                  disabled={selected.length >= 3}
                  className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted text-left disabled:opacity-40 transition-colors border border-transparent hover:border-neon/30">
                  <div className="w-8 h-8 rounded-full overflow-hidden border border-border flex-shrink-0" style={{ background: '#7c3aed' }}>
                    {u.avatarUrl ? <img src={u.avatarUrl} alt={u.username} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-white text-xs font-bold">{u.username[0].toUpperCase()}</div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-fore">{u.username}</div>
                    <div className="text-xs text-gray-400">{u.flag} {u.country}</div>
                  </div>
                  <CheckCircle size={16} className="text-neon flex-shrink-0 opacity-0" />
                </button>
              ))}
              {filteredUsers.length === 0 && <p className="text-center text-gray-500 text-sm py-4">No se encontraron usuarios</p>}
            </div>
            <button onClick={() => publish(selected)} disabled={selected.length < 3 || publishing}
              className="w-full py-3 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              style={{ background: selected.length === 3 ? 'linear-gradient(135deg, #FF007F, #7c3aed)' : '#1e1e2a' }}>
              {publishing ? <Spinner /> : <><Users size={18} />Pasar el Dominó ({selected.length}/3)</>}
            </button>
          </div>
        </div>
      )}

      <div className="relative h-screen max-h-screen overflow-hidden">
        {/* Video siempre en DOM para que el ref funcione correctamente en móvil */}
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover"
          autoPlay
          muted
          playsInline
          style={{ display: cameraActive ? 'block' : 'none' }}
        />
        {!cameraActive && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
            {recorded
              ? <div className="text-center"><CheckCircle size={64} className="mx-auto text-green-400 mb-3" /><p className="text-white font-bold">Video grabado</p></div>
              : <div className="text-center"><Camera size={64} className="mx-auto text-gray-600 mb-3" /><p className="text-gray-400 text-sm">Activa la cámara para grabar</p></div>
            }
          </div>
        )}

        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-4 pointer-events-auto">
            <button onClick={() => { streamRef.current?.getTracks().forEach(t => t.stop()); setLocation('/feed'); }}
              className="p-2 rounded-full" style={{ background: 'rgba(0,0,0,0.5)' }}>
              <X size={20} className="text-white" />
            </button>
            <div className="px-3 py-1.5 rounded-xl flex items-center gap-2" style={{ background: 'rgba(0,0,0,0.5)' }}>
              <DominoLogo size={14} />
              <span className="text-xs font-bold text-white" style={{ fontFamily: 'Syne, sans-serif' }}>DOMINO</span>
            </div>
            <div className="w-10" />
          </div>

          {recording && (
            <div className="absolute top-20 left-1/2 -translate-x-1/2 pointer-events-none">
              <div className="w-16 h-16 rounded-full flex items-center justify-center border-4" style={{ borderColor: '#FF007F', boxShadow: '0 0 20px rgba(255,0,127,0.5)' }}>
                <span className="text-2xl font-black text-white font-mono">{timeLeft}</span>
              </div>
            </div>
          )}

          <div className="absolute top-32 left-4 w-8 h-8 border-t-2 border-l-2 rounded-tl-lg" style={{ borderColor: '#00F5FF' }} />
          <div className="absolute top-32 right-4 w-8 h-8 border-t-2 border-r-2 rounded-tr-lg" style={{ borderColor: '#00F5FF' }} />
          <div className="absolute bottom-32 left-4 w-8 h-8 border-b-2 border-l-2 rounded-bl-lg" style={{ borderColor: '#00F5FF' }} />
          <div className="absolute bottom-32 right-4 w-8 h-8 border-b-2 border-r-2 rounded-br-lg" style={{ borderColor: '#00F5FF' }} />

          <div className="absolute bottom-8 left-0 right-0 flex flex-col items-center gap-4 pointer-events-auto">
            {recorded ? (
              <div className="flex flex-col items-center gap-3 w-full px-8">
                <div className="px-4 py-2 rounded-xl text-center" style={{ background: 'rgba(0,0,0,0.6)' }}>
                  <div className="flex items-center gap-2 justify-center">
                    <CheckCircle size={16} className="text-green-400" />
                    <span className="text-sm text-white font-medium">Video grabado — 15s</span>
                  </div>
                </div>
                <button onClick={() => setShowNomination(true)}
                  className="w-full max-w-xs py-3.5 rounded-2xl font-bold text-white flex items-center justify-center gap-2"
                  style={{ background: 'linear-gradient(135deg, #FF007F, #7c3aed)', boxShadow: '0 0 24px rgba(255,0,127,0.4)' }}>
                  <Users size={18} />Nominar 3 personas y publicar
                </button>
                <button onClick={() => { setRecorded(false); setBlob(null); setTimeLeft(15); }}
                  className="text-sm text-gray-400 hover:text-white flex items-center gap-1">
                  <RefreshCw size={14} />Repetir
                </button>
              </div>
            ) : !cameraActive ? (
              <button onClick={startCamera}
                className="px-8 py-3 rounded-2xl font-bold text-black flex items-center gap-2"
                style={{ background: '#00F5FF', boxShadow: '0 0 20px rgba(0,245,255,0.4)' }}>
                <Camera size={18} />Activar cámara
              </button>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <p className="text-xs text-gray-300">{recording ? 'Grabando...' : 'Pulsa para grabar'}</p>
                <button
                  onMouseDown={startRecording} onMouseUp={stopRecording}
                  onTouchStart={startRecording} onTouchEnd={stopRecording}
                  className={cn('w-20 h-20 rounded-full border-4 flex items-center justify-center transition-all', recording ? 'scale-110' : 'border-white hover:border-neon active:scale-95')}
                  style={recording ? { background: '#FF007F', borderColor: '#FF007F', boxShadow: '0 0 30px rgba(255,0,127,0.6)' } : { background: 'rgba(255,255,255,0.1)' }}>
                  {recording ? <div className="w-8 h-8 bg-white rounded-sm" /> : <div className="w-14 h-14 bg-white rounded-full" />}
                </button>
                <p className="text-xs text-gray-500">Máximo 15 segundos</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ===================== NOTIFICATIONS PAGE =====================
function NotificationsPage() {
  const { user, token } = useAuth();
  const { data: notifs, setData: setNotifs } = useApi('/api/notifications', [user?._id]);

  const markAllRead = async () => {
    if (!token) return;
    await fetch(`${API}/api/notifications/read-all`, { method: 'PUT', headers: { Authorization: `Bearer ${token}` } });
    setNotifs((prev: Notification[]) => prev.map(n => ({ ...n, read: true })));
  };

  return (
    <div className="min-h-screen" style={{ paddingTop: '80px' }}>
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-display font-bold text-fore" style={{ fontFamily: 'Syne, sans-serif' }}>Notificaciones</h1>
          {(notifs || []).some((n: Notification) => !n.read) && (
            <button onClick={markAllRead} className="text-xs text-neon hover:underline">Marcar todas como leídas</button>
          )}
        </div>
        <div className="space-y-2">
          {(notifs || []).map((n: Notification) => (
            <div key={n._id} className={cn('flex gap-3 p-4 rounded-xl border transition-all', !n.read ? 'bg-neon/5 border-neon/20' : 'border-border bg-surface')}>
              <span className="text-xl">{n.type === 'nomination' ? '🎯' : n.type === 'chain_continued' ? '⛓️' : '🏆'}</span>
              <div className="flex-1">
                <p className="text-sm text-fore">{n.message}</p>
                <p className="text-xs text-gray-500 mt-1">{timeAgo(n.createdAt)}</p>
              </div>
              {!n.read && <div className="w-2 h-2 rounded-full flex-shrink-0 mt-1" style={{ background: '#00F5FF' }} />}
            </div>
          ))}
          {(!notifs || notifs.length === 0) && (
            <div className="text-center py-16">
              <Bell size={48} className="mx-auto text-gray-700 mb-3" />
              <p className="text-gray-400">Sin notificaciones</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ===================== APP =====================
export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  );
}

function AppInner() {
  const { loading } = useAuth();

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0b0b12' }}>
      <div className="flex flex-col items-center gap-4">
        <DominoLogo size={40} />
        <Spinner />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen" style={{ background: '#0b0b12' }}>
      <Navbar />
      <Switch>
        <Route path="/" component={HomePage} />
        <Route path="/auth" component={AuthPage} />
        <Route path="/feed" component={FeedPage} />
        <Route path="/map" component={WorldMapPage} />
        <Route path="/dashboard" component={DashboardPage} />
        <Route path="/camera" component={CameraPage} />
        <Route path="/notifications" component={NotificationsPage} />
        <Route>
          <div className="min-h-screen flex items-center justify-center px-4">
            <div className="text-center">
              <div className="text-6xl mb-4">🎲</div>
              <h1 className="text-3xl font-display font-bold text-fore mb-2" style={{ fontFamily: 'Syne, sans-serif' }}>Página no encontrada</h1>
              <Link href="/" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-black" style={{ background: 'linear-gradient(135deg, #00F5FF, #7c3aed)' }}>
                <Home size={16} />Volver al inicio
              </Link>
            </div>
          </div>
        </Route>
      </Switch>
    </div>
  );
}
