import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Link, Route, Switch, useLocation, useParams } from 'wouter';
import {
  Home, Play, Map, BarChart2, Camera, Bell, User, Globe, Zap, ChevronRight,
  ChevronLeft, TrendingUp, Star, Share, Users, Clock, CheckCircle, ArrowRight,
  X, Search, Shield, Activity, Award, Menu, ExternalLink, MapPin, Video,
  MessageSquare, Heart, Bookmark, RefreshCw, Plus, Eye, ChevronDown, ChevronUp,
  AlertCircle, Info
} from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...args: Parameters<typeof clsx>) {
  return twMerge(clsx(...args));
}

// ===================== TYPES =====================
interface User {
  userId: string;
  username: string;
  email: string;
  avatarUrl: string;
  country: string;
  city: string;
  flag: string;
  impactPoints: number;
  currentStreak: number;
  bio: string;
  createdAt: string;
}

interface DailyChallenge {
  challengeId: string;
  title: string;
  description: string;
  category: 'Creativity' | 'Kindness' | 'Eco';
  activatedAt: string;
  expiresAt: string;
  globalCounter: number;
  status: 'active' | 'expired';
}

interface DominoVideo {
  videoId: string;
  challengeId: string;
  userId: string;
  videoUrl: string;
  thumbnailUrl: string;
  parentVideoId: string | null;
  rootVideoId: string;
  geoCoordinates: { lat: number; lng: number };
  nominatedUsers: string[];
  chainDepth: number;
  createdAt: string;
}

interface Notification {
  notificationId: string;
  userId: string;
  type: 'nomination' | 'chain_continued' | 'milestone';
  fromUserId: string;
  videoId: string;
  chainId: string;
  message: string;
  read: boolean;
  createdAt: string;
}

interface RankingEntry {
  userId: string;
  username: string;
  avatarUrl: string;
  country: string;
  flag: string;
  impactPoints: number;
  currentStreak: number;
  totalChains: number;
  category: string;
  period: string;
  position: number;
}

// ===================== MOCK DATA =====================
const USERS: User[] = [
  { userId: 'u1', username: 'luciagarcia', email: 'lucia@domino.app', avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=face', country: 'España', city: 'Madrid', flag: '🇪🇸', impactPoints: 4820, currentStreak: 12, bio: 'Activista digital y creadora de contenido positivo', createdAt: '2024-01-15' },
  { userId: 'u2', username: 'hironakamura', email: 'hiro@domino.app', avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face', country: 'Japón', city: 'Tokio', flag: '🇯🇵', impactPoints: 7340, currentStreak: 28, bio: 'Fotógrafo urbano y amante de las cadenas de bondad', createdAt: '2024-01-10' },
  { userId: 'u3', username: 'marianyc', email: 'marian@domino.app', avatarUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face', country: 'Estados Unidos', city: 'Nueva York', flag: '🇺🇸', impactPoints: 5910, currentStreak: 7, bio: 'Diseñadora y emprendedora social en NYC', createdAt: '2024-02-01' },
  { userId: 'u4', username: 'emekaokafor', email: 'emeka@domino.app', avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face', country: 'Nigeria', city: 'Lagos', flag: '🇳🇬', impactPoints: 3450, currentStreak: 5, bio: 'Músico y promotor de cultura africana', createdAt: '2024-02-10' },
  { userId: 'u5', username: 'sofiarivera', email: 'sofia@domino.app', avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&h=150&fit=crop&crop=face', country: 'Argentina', city: 'Buenos Aires', flag: '🇦🇷', impactPoints: 6120, currentStreak: 19, bio: 'Bailarina y activista medioambiental porteña', createdAt: '2024-01-20' },
  { userId: 'u6', username: 'diegolopez', email: 'diego@domino.app', avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face', country: 'México', city: 'Ciudad de México', flag: '🇲🇽', impactPoints: 2980, currentStreak: 3, bio: 'Chef y divulgador de cocina sostenible', createdAt: '2024-03-01' }
];

const CHALLENGE: DailyChallenge = {
  challengeId: 'ch1',
  title: '30 Segundos de Bondad',
  description: 'Graba un acto espontáneo de amabilidad hacia un desconocido o comparte algo que te sobre con alguien que lo necesite. Sin guión, sin preparación — bondad real.',
  category: 'Kindness',
  activatedAt: new Date().toISOString(),
  expiresAt: new Date(Date.now() + 14 * 3600000).toISOString(),
  globalCounter: 14782,
  status: 'active'
};

const VIDEOS: DominoVideo[] = [
  { videoId: 'v1', challengeId: 'ch1', userId: 'u1', videoUrl: '', thumbnailUrl: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=400&h=700&fit=crop', parentVideoId: null, rootVideoId: 'v1', geoCoordinates: { lat: 40.4168, lng: -3.7038 }, nominatedUsers: ['u2','u3','u4'], chainDepth: 0, createdAt: '2024-06-17T08:00:00Z' },
  { videoId: 'v2', challengeId: 'ch1', userId: 'u2', videoUrl: '', thumbnailUrl: 'https://images.unsplash.com/photo-1493894473891-10fc1e5dbd22?w=400&h=700&fit=crop', parentVideoId: 'v1', rootVideoId: 'v1', geoCoordinates: { lat: 35.6762, lng: 139.6503 }, nominatedUsers: ['u5','u6','u3'], chainDepth: 1, createdAt: '2024-06-17T10:30:00Z' },
  { videoId: 'v3', challengeId: 'ch1', userId: 'u3', videoUrl: '', thumbnailUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=700&fit=crop', parentVideoId: 'v2', rootVideoId: 'v1', geoCoordinates: { lat: 40.7128, lng: -74.0060 }, nominatedUsers: ['u4','u1','u5'], chainDepth: 2, createdAt: '2024-06-17T13:00:00Z' },
  { videoId: 'v4', challengeId: 'ch1', userId: 'u5', videoUrl: '', thumbnailUrl: 'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=400&h=700&fit=crop', parentVideoId: 'v3', rootVideoId: 'v1', geoCoordinates: { lat: -34.6037, lng: -58.3816 }, nominatedUsers: ['u2','u6','u1'], chainDepth: 3, createdAt: '2024-06-17T15:30:00Z' },
  { videoId: 'v5', challengeId: 'ch1', userId: 'u4', videoUrl: '', thumbnailUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=700&fit=crop', parentVideoId: 'v4', rootVideoId: 'v1', geoCoordinates: { lat: 6.5244, lng: 3.3792 }, nominatedUsers: ['u1','u3','u5'], chainDepth: 4, createdAt: '2024-06-17T17:00:00Z' },
  { videoId: 'v6', challengeId: 'ch1', userId: 'u6', videoUrl: '', thumbnailUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=700&fit=crop', parentVideoId: 'v1', rootVideoId: 'v1', geoCoordinates: { lat: 19.4326, lng: -99.1332 }, nominatedUsers: ['u2','u4','u5'], chainDepth: 1, createdAt: '2024-06-17T09:15:00Z' },
  { videoId: 'v7', challengeId: 'ch1', userId: 'u2', videoUrl: '', thumbnailUrl: 'https://images.unsplash.com/photo-1552058544-f2b08422138a?w=400&h=700&fit=crop', parentVideoId: 'v6', rootVideoId: 'v1', geoCoordinates: { lat: 35.6762, lng: 139.6503 }, nominatedUsers: ['u1','u3','u4'], chainDepth: 2, createdAt: '2024-06-17T11:45:00Z' },
  { videoId: 'v8', challengeId: 'ch1', userId: 'u5', videoUrl: '', thumbnailUrl: 'https://images.unsplash.com/photo-1499996860823-5214fcc65f8f?w=400&h=700&fit=crop', parentVideoId: 'v7', rootVideoId: 'v1', geoCoordinates: { lat: -34.6037, lng: -58.3816 }, nominatedUsers: ['u3','u6','u1'], chainDepth: 3, createdAt: '2024-06-17T14:20:00Z' }
];

const NOTIFICATIONS: Notification[] = [
  { notificationId: 'n1', userId: 'u1', type: 'nomination', fromUserId: 'u2', videoId: 'v2', chainId: 'v1', message: 'hironakamura te ha nominado para continuar la cadena desde Tokio 🇯🇵', read: false, createdAt: '2024-06-17T10:30:00Z' },
  { notificationId: 'n2', userId: 'u1', type: 'chain_continued', fromUserId: 'u3', videoId: 'v3', chainId: 'v1', message: 'marianyc ha continuado tu cadena desde Nueva York 🇺🇸 — ya está en profundidad 3', read: false, createdAt: '2024-06-17T13:00:00Z' },
  { notificationId: 'n3', userId: 'u1', type: 'milestone', fromUserId: 'u4', videoId: 'v5', chainId: 'v1', message: '¡Tu cadena ha llegado a 5 países! 🌍 Impacto global desbloqueado', read: true, createdAt: '2024-06-17T17:00:00Z' },
  { notificationId: 'n4', userId: 'u1', type: 'nomination', fromUserId: 'u5', videoId: 'v4', chainId: 'v1', message: 'sofiarivera quiere que continúes el reto desde Buenos Aires 🇦🇷', read: false, createdAt: '2024-06-17T15:30:00Z' },
  { notificationId: 'n5', userId: 'u1', type: 'chain_continued', fromUserId: 'u6', videoId: 'v6', chainId: 'v1', message: 'diegolopez ha iniciado una ramificación desde tu vídeo en CDMX 🇲🇽', read: true, createdAt: '2024-06-17T09:15:00Z' }
];

const RANKING: RankingEntry[] = [
  { userId: 'u2', username: 'hironakamura', avatarUrl: USERS[1].avatarUrl, country: 'Japón', flag: '🇯🇵', impactPoints: 7340, currentStreak: 28, totalChains: 47, category: 'global', period: 'week', position: 1 },
  { userId: 'u5', username: 'sofiarivera', avatarUrl: USERS[4].avatarUrl, country: 'Argentina', flag: '🇦🇷', impactPoints: 6120, currentStreak: 19, totalChains: 38, category: 'global', period: 'week', position: 2 },
  { userId: 'u3', username: 'marianyc', avatarUrl: USERS[2].avatarUrl, country: 'EEUU', flag: '🇺🇸', impactPoints: 5910, currentStreak: 7, totalChains: 31, category: 'global', period: 'week', position: 3 },
  { userId: 'u1', username: 'luciagarcia', avatarUrl: USERS[0].avatarUrl, country: 'España', flag: '🇪🇸', impactPoints: 4820, currentStreak: 12, totalChains: 24, category: 'global', period: 'week', position: 4 },
  { userId: 'u4', username: 'emekaokafor', avatarUrl: USERS[3].avatarUrl, country: 'Nigeria', flag: '🇳🇬', impactPoints: 3450, currentStreak: 5, totalChains: 18, category: 'global', period: 'week', position: 5 },
  { userId: 'u6', username: 'diegolopez', avatarUrl: USERS[5].avatarUrl, country: 'México', flag: '🇲🇽', impactPoints: 2980, currentStreak: 3, totalChains: 12, category: 'global', period: 'week', position: 6 }
];

// ===================== UTILS =====================
function formatImpact(points: number): string {
  if (points >= 1000000) return `${(points / 1000000).toFixed(1)}M`;
  if (points >= 1000) return `${(points / 1000).toFixed(1)}K`;
  return String(points);
}

function getUserById(id: string): User | undefined {
  return USERS.find(u => u.userId === id);
}

function getChainPath(rootId: string): DominoVideo[] {
  const chain: DominoVideo[] = [];
  let current = VIDEOS.find(v => v.videoId === rootId);
  while (current) {
    chain.push(current);
    current = VIDEOS.find(v => v.parentVideoId === current!.videoId && v.rootVideoId === rootId);
  }
  return chain;
}

function getCategoryColor(cat: string): string {
  if (cat === 'Creativity') return 'text-violet-400 border-violet-400';
  if (cat === 'Kindness') return 'text-pink-400 border-pink-400';
  if (cat === 'Eco') return 'text-green-400 border-green-400';
  return 'text-cyan-400 border-cyan-400';
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
  return `${h}h ${m}m restantes`;
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

function UserAvatar({ user, size = 'md', showBadge = true }: { user: User; size?: 'sm' | 'md' | 'lg'; showBadge?: boolean }) {
  const sizes = { sm: 'w-8 h-8 text-xs', md: 'w-10 h-10 text-sm', lg: 'w-14 h-14 text-base' };
  return (
    <div className="relative inline-flex">
      <img
        src={user.avatarUrl}
        alt={`Avatar de ${user.username}, usuario de ${user.city}`}
        className={cn(sizes[size], 'rounded-full object-cover border-2 border-border')}
      />
      {showBadge && user.currentStreak > 0 && (
        <span className="absolute -bottom-1 -right-1 bg-fuchsia text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center" style={{ background: '#FF007F' }}>
          {user.currentStreak}
        </span>
      )}
    </div>
  );
}

function KPICard({ icon, value, label, change, color }: { icon: React.ReactNode; value: string; label: string; change?: string; color?: string }) {
  return (
    <div className="bg-surface border border-border rounded-xl p-4 hover:border-neon transition-all duration-200 hover:-translate-y-0.5">
      <div className="flex items-start justify-between mb-3">
        <div className={cn('p-2 rounded-lg', color || 'bg-violet/20 text-violet-400')}>{icon}</div>
        {change && (
          <span className={cn('text-xs font-medium flex items-center gap-1', change.startsWith('+') ? 'text-green-400' : 'text-red-400')}>
            {change.startsWith('+') ? <TrendingUp size={12} /> : <TrendingUp size={12} className="rotate-180" />}
            {change}
          </span>
        )}
      </div>
      <div className="text-2xl font-bold text-fore font-display" style={{ fontFamily: 'Syne, sans-serif' }}>{value}</div>
      <div className="text-xs text-gray-400 mt-1">{label}</div>
    </div>
  );
}

function ChallengeCard({ challenge, compact = false }: { challenge: DailyChallenge; compact?: boolean }) {
  const [, setLocation] = useLocation();
  const catColor = getCategoryColor(challenge.category);
  return (
    <div className={cn('bg-surface border border-border rounded-xl overflow-hidden hover:border-neon transition-all duration-200', compact ? 'p-3' : 'p-5')}>
      <div className="flex items-center gap-2 mb-2">
        <span className={cn('text-xs border rounded-full px-2 py-0.5 font-medium', catColor)}>{challenge.category}</span>
        {challenge.status === 'active' && (
          <span className="text-xs bg-green-500/20 text-green-400 border border-green-500/30 rounded-full px-2 py-0.5">Activo</span>
        )}
      </div>
      <h3 className={cn('font-bold text-fore', compact ? 'text-sm' : 'text-lg')}>{challenge.title}</h3>
      {!compact && <p className="text-sm text-gray-400 mt-1 line-clamp-2">{challenge.description}</p>}
      <div className="flex items-center justify-between mt-3">
        <div className="flex items-center gap-1 text-xs text-gray-400">
          <Users size={12} />
          <span>{formatImpact(challenge.globalCounter)} participantes</span>
        </div>
        <div className="flex items-center gap-1 text-xs text-gray-400">
          <Clock size={12} />
          <span>{timeLeft(challenge.expiresAt)}</span>
        </div>
      </div>
      {!compact && (
        <button
          onClick={() => setLocation(`/challenge/${challenge.challengeId}`)}
          className="mt-3 w-full py-2 rounded-lg text-sm font-semibold text-white transition-all duration-200 hover:opacity-90 active:scale-95"
          style={{ background: 'linear-gradient(135deg, #7c3aed, #00F5FF)' }}
        >
          Ver reto completo
        </button>
      )}
    </div>
  );
}

function RankingRow({ entry, isMe = false }: { entry: RankingEntry; isMe?: boolean }) {
  const medalColors = ['#FFD700', '#C0C0C0', '#CD7F32'];
  return (
    <div className={cn('flex items-center gap-3 p-3 rounded-xl transition-all duration-200 hover:bg-muted', isMe && 'border border-neon/30 bg-neon/5')}>
      <div className="w-7 text-center">
        {entry.position <= 3
          ? <span className="text-lg" style={{ filter: `drop-shadow(0 0 4px ${medalColors[entry.position - 1]})` }}>{'🥇🥈🥉'[entry.position - 1]}</span>
          : <span className="text-sm text-gray-500 font-mono">#{entry.position}</span>
        }
      </div>
      <img src={entry.avatarUrl} alt={`Avatar de ${entry.username}`} className="w-9 h-9 rounded-full object-cover border-2 border-border" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className={cn('text-sm font-semibold truncate', isMe ? 'text-neon' : 'text-fore')}>{entry.username}</span>
          <span className="text-sm">{entry.flag}</span>
        </div>
        <div className="text-xs text-gray-500">{entry.country}</div>
      </div>
      <div className="text-right">
        <div className="text-sm font-bold text-neon">{formatImpact(entry.impactPoints)}</div>
        <div className="text-xs text-gray-500 flex items-center gap-0.5 justify-end">
          <Zap size={10} className="text-yellow-400" />
          {entry.currentStreak}d
        </div>
      </div>
    </div>
  );
}

function ChainTimeline({ videoId, onClose }: { videoId: string; onClose: () => void }) {
  const video = VIDEOS.find(v => v.videoId === videoId);
  const chain = video ? getChainPath(video.rootVideoId) : [];

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: 'rgba(11,11,18,0.97)' }}>
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div>
          <h2 className="font-bold text-fore font-display text-lg">Cadena Origen</h2>
          <p className="text-xs text-gray-400">Recorrido completo de la cadena</p>
        </div>
        <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted transition-colors" aria-label="Cerrar cadena origen">
          <X size={20} />
        </button>
      </div>
      <div className="flex-1 overflow-auto p-4">
        <div className="flex items-start gap-0 overflow-x-auto pb-4" style={{ minWidth: 'max-content' }}>
          {chain.map((vid, idx) => {
            const user = getUserById(vid.userId);
            if (!user) return null;
            const cityNames = ['Madrid', 'Tokio', 'Nueva York', 'Buenos Aires', 'Lagos', 'CDMX'];
            const city = cityNames[idx % cityNames.length];
            return (
              <div key={vid.videoId} className="flex items-center">
                <div className="flex flex-col items-center w-40">
                  <div className="relative">
                    <img
                      src={vid.thumbnailUrl}
                      alt={`Video de ${user.username} desde ${city} en la cadena`}
                      className="w-28 h-44 object-cover rounded-xl border-2"
                      style={{ borderColor: idx === 0 ? '#00F5FF' : idx === chain.length - 1 ? '#FF007F' : '#2a2a3a' }}
                    />
                    <div className="absolute bottom-2 left-2 right-2">
                      <div className="glass rounded-lg px-2 py-1">
                        <div className="text-xs font-semibold text-fore truncate">{user.username}</div>
                        <div className="text-xs text-gray-400 flex items-center gap-1">
                          <MapPin size={8} />
                          {user.flag} {user.city}
                        </div>
                      </div>
                    </div>
                    {idx === 0 && (
                      <div className="absolute -top-2 left-1/2 -translate-x-1/2 text-xs bg-neon text-black font-bold px-2 py-0.5 rounded-full">Origen</div>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 mt-2">{timeAgo(vid.createdAt)}</div>
                  <div className="flex items-center gap-1 mt-1">
                    {[...Array(vid.chainDepth + 1)].map((_, i) => (
                      <div key={`depth-${vid.videoId}-${i}`} className="w-1.5 h-1.5 rounded-full" style={{ background: '#00F5FF' }} />
                    ))}
                  </div>
                </div>
                {idx < chain.length - 1 && (
                  <div className="flex items-center mx-1">
                    <div className="w-8 h-0.5 relative overflow-hidden">
                      <div className="absolute inset-0 animate-pulse2" style={{ background: 'linear-gradient(90deg, #00F5FF, #FF007F)' }} />
                    </div>
                    <ChevronRight size={14} className="text-neon" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {chain.length === 0 && (
          <div className="text-center py-12">
            <AlertCircle size={40} className="mx-auto text-gray-600 mb-3" />
            <p className="text-gray-400">No se encontró la cadena</p>
          </div>
        )}
      </div>
    </div>
  );
}

function NominationSelector({ onConfirm, onClose }: { onConfirm: (ids: string[]) => void; onClose: () => void }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [search, setSearch] = useState('');

  const filtered = USERS.filter(u =>
    u.userId !== 'u1' &&
    (u.username.includes(search.toLowerCase()) || u.city.toLowerCase().includes(search.toLowerCase()))
  );

  const toggle = (id: string) => {
    if (selected.includes(id)) setSelected(s => s.filter(x => x !== id));
    else if (selected.length < 3) setSelected(s => [...s, id]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.8)' }}>
      <div className="w-full max-w-md glass rounded-2xl p-5 animate-slideUp">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-bold text-fore font-display">Nominar 3 personas</h2>
            <p className="text-xs text-gray-400">Obligatorio antes de publicar ({selected.length}/3)</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted" aria-label="Cerrar selector de nominaciones">
            <X size={18} />
          </button>
        </div>
        <div className="relative mb-3">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" aria-hidden="true" />
          <input
            type="text"
            placeholder="Buscar amigos o usuarios..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-muted border border-border rounded-lg pl-9 pr-3 py-2 text-sm text-fore placeholder-gray-500 focus:outline-none focus:border-neon transition-colors"
            aria-label="Buscar usuarios para nominar"
          />
        </div>
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {filtered.map(user => {
            const isSel = selected.includes(user.userId);
            return (
              <button
                key={user.userId}
                onClick={() => toggle(user.userId)}
                className={cn('w-full flex items-center gap-3 p-2.5 rounded-xl transition-all duration-200 text-left', isSel ? 'bg-neon/10 border border-neon/40' : 'hover:bg-muted border border-transparent')}
                aria-pressed={isSel}
              >
                <UserAvatar user={user} size="sm" showBadge={false} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-fore">{user.username}</div>
                  <div className="text-xs text-gray-400">{user.flag} {user.city}</div>
                </div>
                {isSel && <CheckCircle size={16} className="text-neon flex-shrink-0" />}
              </button>
            );
          })}
        </div>
        <button
          onClick={() => selected.length === 3 && onConfirm(selected)}
          disabled={selected.length < 3}
          className={cn('mt-4 w-full py-3 rounded-xl font-bold text-sm transition-all duration-200', selected.length === 3 ? 'text-black hover:opacity-90 active:scale-95' : 'bg-muted text-gray-600 cursor-not-allowed')}
          style={selected.length === 3 ? { background: 'linear-gradient(135deg, #FF007F, #7c3aed)' } : {}}
        >
          {selected.length === 3 ? 'Pasar el Dominó 🎲' : `Selecciona ${3 - selected.length} más`}
        </button>
      </div>
    </div>
  );
}

function MapGlobe() {
  const [activeChain, setActiveChain] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const geoPoints = VIDEOS.map(v => {
    const user = getUserById(v.userId);
    return { ...v, user };
  });

  const project = (lat: number, lng: number, w: number, h: number) => {
    const x = ((lng + 180) / 360) * w;
    const y = ((90 - lat) / 180) * h;
    return { x, y };
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#0b0b12';
    ctx.fillRect(0, 0, w, h);

    // Draw grid
    ctx.strokeStyle = 'rgba(42,42,58,0.5)';
    ctx.lineWidth = 0.5;
    for (let lng2 = -180; lng2 <= 180; lng2 += 30) {
      const { x } = project(0, lng2, w, h);
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let lat2 = -90; lat2 <= 90; lat2 += 30) {
      const { y } = project(lat2, 0, w, h);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Draw chain lines
    VIDEOS.forEach(vid => {
      if (vid.parentVideoId) {
        const parent = VIDEOS.find(v => v.videoId === vid.parentVideoId);
        if (parent) {
          const p1 = project(parent.geoCoordinates.lat, parent.geoCoordinates.lng, w, h);
          const p2 = project(vid.geoCoordinates.lat, vid.geoCoordinates.lng, w, h);
          const grad = ctx.createLinearGradient(p1.x, p1.y, p2.x, p2.y);
          grad.addColorStop(0, '#00F5FF');
          grad.addColorStop(1, '#FF007F');
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.strokeStyle = grad;
          ctx.lineWidth = 1.5;
          ctx.globalAlpha = 0.7;
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
      }
    });

    // Draw video nodes
    geoPoints.forEach(pt => {
      const { x, y } = project(pt.geoCoordinates.lat, pt.geoCoordinates.lng, w, h);
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fillStyle = activeChain === pt.videoId ? '#FF007F' : '#00F5FF';
      ctx.shadowBlur = 12;
      ctx.shadowColor = activeChain === pt.videoId ? '#FF007F' : '#00F5FF';
      ctx.fill();
      ctx.shadowBlur = 0;
      if (pt.user) {
        ctx.fillStyle = 'rgba(248,250,252,0.8)';
        ctx.font = '9px Inter';
        ctx.fillText(pt.user.flag + ' ' + pt.user.city, x + 8, y - 4);
      }
    });
  }, [activeChain]);

  return (
    <div className="relative w-full rounded-xl overflow-hidden border border-border">
      <canvas
        ref={canvasRef}
        width={800}
        height={400}
        className="w-full"
        style={{ height: '400px', objectFit: 'cover' }}
        aria-label="Mapa global interactivo con cadenas de dominó conectando ciudades del mundo"
      />
      <div className="absolute bottom-3 left-3 right-3 flex gap-2 flex-wrap">
        {VIDEOS.slice(0, 4).map(v => {
          const user = getUserById(v.userId);
          return (
            <button
              key={v.videoId}
              onClick={() => setActiveChain(a => a === v.videoId ? null : v.videoId)}
              className={cn('text-xs px-2.5 py-1.5 rounded-lg font-medium glass transition-all duration-200', activeChain === v.videoId ? 'border border-fuchsia text-white' : 'border border-border text-gray-300 hover:border-neon')}
            >
              {user?.flag} {user?.city}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function VideoCard({ video, onViewChain }: { video: DominoVideo; onViewChain: (id: string) => void }) {
  const user = getUserById(video.userId);
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);

  if (!user) return null;

  return (
    <div className="video-item">
      <img
        src={video.thumbnailUrl}
        alt={`Video de ${user.username} desde ${user.city} completando el reto del día`}
        className="absolute inset-0 w-full h-full object-cover"
      />
      <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(11,11,18,0.95) 0%, rgba(11,11,18,0.2) 40%, transparent 70%)' }} />
      <div className="relative z-10 w-full p-4 pb-8">
        <div className="flex items-end justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <UserAvatar user={user} size="md" />
              <div>
                <div className="font-semibold text-fore text-sm">{user.username}</div>
                <div className="text-xs text-gray-300 flex items-center gap-1">
                  <MapPin size={10} aria-hidden="true" />
                  {user.flag} {user.city}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs bg-black/40 border border-white/10 rounded-full px-2 py-0.5 text-gray-300">
                Profundidad {video.chainDepth + 1}
              </span>
              <span className="text-xs text-gray-400">{timeAgo(video.createdAt)}</span>
            </div>
            <button
              onClick={() => onViewChain(video.videoId)}
              className="flex items-center gap-2 text-sm font-bold px-4 py-2.5 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95"
              style={{ background: '#FF007F', boxShadow: '0 0 20px rgba(255,0,127,0.5)' }}
            >
              <Eye size={16} aria-hidden="true" />
              Ver Cadena Origen
            </button>
          </div>
          <div className="flex flex-col items-center gap-4 ml-4">
            <button
              onClick={() => setLiked(l => !l)}
              className="flex flex-col items-center gap-1"
              aria-label={liked ? 'Quitar me gusta' : 'Me gusta'}
            >
              <Heart size={24} className={cn('transition-colors', liked ? 'fill-current text-red-500' : 'text-white')} aria-hidden="true" />
              <span className="text-xs text-white">2.4K</span>
            </button>
            <button
              onClick={() => setSaved(s => !s)}
              className="flex flex-col items-center gap-1"
              aria-label={saved ? 'Quitar guardado' : 'Guardar video'}
            >
              <Bookmark size={24} className={cn('transition-colors', saved ? 'fill-current text-neon' : 'text-white')} aria-hidden="true" />
              <span className="text-xs text-white">847</span>
            </button>
            <button className="flex flex-col items-center gap-1" aria-label="Compartir video">
              <Share size={24} className="text-white" aria-hidden="true" />
              <span className="text-xs text-white">Compartir</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Navbar({ notifCount }: { notifCount: number }) {
  const [open, setOpen] = useState(false);
  const [loc] = useLocation();

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
          <Link href="/" className="flex items-center gap-2" aria-label="Ir a inicio de DOMINO">
            <DominoLogo size={18} />
            <span className="font-display text-xl font-bold" style={{ fontFamily: 'Syne, sans-serif', color: '#00F5FF', textShadow: '0 0 12px #00F5FF' }}>DOMINO</span>
          </Link>
          <div className="hidden md:flex items-center gap-1">
            {links.map(l => (
              <Link
                key={l.href}
                href={l.href}
                className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200', loc === l.href ? 'bg-neon/10 text-neon' : 'text-gray-400 hover:text-fore hover:bg-muted')}
              >
                {l.icon}
                {l.label}
              </Link>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button className="relative p-2 rounded-lg hover:bg-muted transition-colors" aria-label={`${notifCount} notificaciones sin leer`}>
              <Bell size={18} className="text-gray-400" aria-hidden="true" />
              {notifCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full text-[9px] font-bold text-black flex items-center justify-center" style={{ background: '#FF007F' }}>{notifCount}</span>
              )}
            </button>
            <Link href="/dashboard" className="w-8 h-8 rounded-full overflow-hidden border-2 border-border hover:border-neon transition-colors">
              <img src={USERS[0].avatarUrl} alt={`Perfil de ${USERS[0].username}`} className="w-full h-full object-cover" />
            </Link>
            <button className="md:hidden p-2 rounded-lg hover:bg-muted" onClick={() => setOpen(o => !o)} aria-label="Abrir menú">
              <Menu size={18} className="text-gray-400" />
            </button>
          </div>
        </div>
      </div>
      {open && (
        <div className="md:hidden border-t border-border bg-surface">
          {links.map(l => (
            <Link
              key={l.href}
              href={l.href}
              className={cn('flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors', loc === l.href ? 'text-neon bg-neon/5' : 'text-gray-400 hover:text-fore')}
              onClick={() => setOpen(false)}
            >
              {l.icon}{l.label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border bg-surface mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <DominoLogo size={16} />
              <span className="font-display font-bold" style={{ fontFamily: 'Syne, sans-serif', color: '#00F5FF' }}>DOMINO</span>
            </div>
            <p className="text-xs text-gray-500 leading-relaxed">La red social que conecta el mundo a través de retos de bondad y creatividad.</p>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-fore mb-2">Producto</h4>
            <div className="space-y-1.5">
              {['Cómo funciona', 'Retos del día', 'Mapa global', 'Ranking'].map(l => (
                <div key={l} className="text-xs text-gray-500 hover:text-fore cursor-pointer transition-colors">{l}</div>
              ))}
            </div>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-fore mb-2">Legal</h4>
            <div className="space-y-1.5">
              {['Privacidad', 'Términos de uso', 'Cookies', 'Contacto'].map(l => (
                <div key={l} className="text-xs text-gray-500 hover:text-fore cursor-pointer transition-colors">{l}</div>
              ))}
            </div>
          </div>
        </div>
        <div className="border-t border-border pt-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-gray-600">© 2024 DOMINO. The Real-World Chain Reaction.</p>
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Globe size={12} className="text-neon" aria-hidden="true" />
            <span>{formatImpact(CHALLENGE.globalCounter)} cadenas activas ahora mismo</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

// ===================== PAGES =====================

function HomePage() {
  const [counter, setCounter] = useState(14782);
  useEffect(() => {
    const t = setInterval(() => setCounter(c => c + Math.floor(Math.random() * 3)), 2500);
    return () => clearInterval(t);
  }, []);

  const steps = [
    { icon: <Video size={28} />, title: 'Graba el reto', desc: 'Abre la cámara nativa de DOMINO y graba tu versión del reto diario en 15 segundos. Sin filtros, sin galería — solo tú.', color: 'text-neon' },
    { icon: <Users size={28} />, title: 'Nomina a 3 personas', desc: 'Antes de publicar, elige 3 personas — amigos cercanos o desconocidos al otro lado del mundo — para pasar el dominó.', color: 'text-fuchsia' },
    { icon: <Globe size={28} />, title: 'Mira el impacto global', desc: 'Sigue en el mapa 3D cómo tu cadena viaja por el mundo. Cada nodo conectado suma puntos de impacto real.', color: 'text-violet-400' }
  ];

  return (
    <div>
      {/* Hero */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1600&h=900&fit=crop"
            alt="Vista nocturna del planeta Tierra desde el espacio mostrando luces de ciudades conectadas"
            className="w-full h-full object-cover opacity-20"
          />
          <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at center, rgba(0,245,255,0.05) 0%, rgba(11,11,18,0.9) 70%)' }} />
        </div>
        <div className="relative z-10 max-w-4xl mx-auto px-4 text-center animate-fadeIn">
          <div className="flex justify-center mb-6">
            <DominoLogo size={48} />
          </div>
          <h1 className="text-5xl sm:text-7xl font-display font-black mb-4 tracking-tight" style={{ fontFamily: 'Syne, sans-serif' }}>
            <span className="domino-gradient">DOMINO</span>
          </h1>
          <p className="text-xl sm:text-2xl text-gray-300 mb-2 font-medium">The Real-World Chain Reaction</p>
          <p className="text-base text-gray-400 mb-8 max-w-xl mx-auto">
            Completa retos de 15 segundos. Nomina a 3 personas en el mundo. Observa cómo tu acto de bondad se convierte en un efecto dominó global.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/feed"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-black transition-all duration-200 hover:scale-105 active:scale-95"
              style={{ background: 'linear-gradient(135deg, #00F5FF, #7c3aed)', boxShadow: '0 0 20px rgba(0,245,255,0.3)' }}
            >
              <Play size={18} aria-hidden="true" />
              Ver el Feed
            </Link>
            <Link
              href="/camera"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all duration-200 hover:scale-105 border border-fuchsia"
              style={{ color: '#FF007F', boxShadow: '0 0 16px rgba(255,0,127,0.2)' }}
            >
              <Camera size={18} aria-hidden="true" />
              Empezar reto
            </Link>
          </div>
          <div className="mt-12 flex items-center justify-center gap-2">
            <div className="w-2 h-2 rounded-full animate-pulse2" style={{ background: '#00F5FF' }} />
            <span className="text-lg font-bold" style={{ color: '#00F5FF' }}>{counter.toLocaleString('es-ES')}</span>
            <span className="text-gray-400 text-sm">cadenas activas ahora mismo en el mundo</span>
          </div>
        </div>
      </section>

      {/* Cómo funciona */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-display font-bold text-fore" style={{ fontFamily: 'Syne, sans-serif' }}>Cómo funciona</h2>
            <p className="text-gray-400 mt-2">Tres pasos para cambiar el mundo desde tu móvil</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {steps.map((step, i) => (
              <div key={`step-${i}`} className="bg-surface border border-border rounded-2xl p-6 text-center hover:border-neon/50 transition-all duration-200 hover:-translate-y-1">
                <div className={cn('inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4 mx-auto', step.color)} style={{ background: 'rgba(42,42,58,0.8)' }}>
                  {step.icon}
                </div>
                <div className="text-4xl font-black text-gray-700 mb-2 font-display" style={{ fontFamily: 'Syne, sans-serif' }}>0{i + 1}</div>
                <h3 className="text-lg font-bold text-fore mb-2">{step.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Reto del día */}
      <section className="py-16 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-display font-bold text-fore" style={{ fontFamily: 'Syne, sans-serif' }}>Reto del Día</h2>
            <Link href={`/challenge/${CHALLENGE.challengeId}`} className="text-sm text-neon hover:underline flex items-center gap-1">
              Ver todo <ChevronRight size={14} />
            </Link>
          </div>
          <ChallengeCard challenge={CHALLENGE} />
        </div>
      </section>

      {/* Ranking preview */}
      <section className="py-16 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-display font-bold text-fore" style={{ fontFamily: 'Syne, sans-serif' }}>Ranking Global</h2>
            <Link href="/dashboard" className="text-sm text-neon hover:underline flex items-center gap-1">
              Ver completo <ChevronRight size={14} />
            </Link>
          </div>
          <div className="bg-surface border border-border rounded-2xl overflow-hidden">
            {RANKING.slice(0, 5).map(entry => (
              <div key={entry.userId} className="border-b border-border last:border-0">
                <RankingRow entry={entry} isMe={entry.userId === 'u1'} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Map preview */}
      <section className="py-16 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-display font-bold text-fore" style={{ fontFamily: 'Syne, sans-serif' }}>Mapa de Impacto Global</h2>
              <p className="text-sm text-gray-400 mt-1">Las cadenas activas de hoy en tiempo real</p>
            </div>
            <Link href="/map" className="text-sm text-neon hover:underline flex items-center gap-1">
              Abrir mapa <ChevronRight size={14} />
            </Link>
          </div>
          <MapGlobe />
        </div>
      </section>

      <Footer />
    </div>
  );
}

function FeedPage() {
  const [chainModal, setChainModal] = useState<string | null>(null);
  const [currentIdx, setCurrentIdx] = useState(0);

  return (
    <div className="relative" style={{ paddingTop: '56px' }}>
      {chainModal && <ChainTimeline videoId={chainModal} onClose={() => setChainModal(null)} />}
      <div className="fixed top-14 left-0 right-0 bottom-0 video-snap">
        {VIDEOS.map((video, idx) => (
          <VideoCard key={video.videoId} video={video} onViewChain={setChainModal} />
        ))}
      </div>
      {/* Reto overlay top */}
      <div className="fixed top-14 left-0 right-0 z-30 pointer-events-none">
        <div className="max-w-md mx-auto px-4 pt-3">
          <div className="glass rounded-xl px-3 py-2 pointer-events-auto">
            <div className="flex items-center gap-2">
              <Zap size={14} className="text-yellow-400" aria-hidden="true" />
              <span className="text-xs font-semibold text-fore">{CHALLENGE.title}</span>
              <span className="ml-auto text-xs text-gray-400">{timeLeft(CHALLENGE.expiresAt)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function WorldMapPage() {
  const [selectedChain, setSelectedChain] = useState<string | null>(null);
  const chain = selectedChain ? getChainPath(selectedChain) : [];

  return (
    <div className="min-h-screen" style={{ paddingTop: '80px' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-display font-bold text-fore" style={{ fontFamily: 'Syne, sans-serif' }}>Mapa Global de Impacto</h1>
          <p className="text-gray-400 mt-1">Toca una línea para ver el viaje geográfico de esa cadena</p>
        </div>
        <MapGlobe />
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-surface border border-border rounded-xl p-4">
            <div className="text-2xl font-bold text-neon">{VIDEOS.length}</div>
            <div className="text-xs text-gray-400 mt-1">Videos en cadena hoy</div>
          </div>
          <div className="bg-surface border border-border rounded-xl p-4">
            <div className="text-2xl font-bold" style={{ color: '#FF007F' }}>{new Set(VIDEOS.map(v => v.userId)).size}</div>
            <div className="text-xs text-gray-400 mt-1">Países conectados</div>
          </div>
          <div className="bg-surface border border-border rounded-xl p-4">
            <div className="text-2xl font-bold text-violet-400">{VIDEOS.filter(v => !v.parentVideoId).length}</div>
            <div className="text-xs text-gray-400 mt-1">Cadenas iniciadas</div>
          </div>
        </div>
        <div className="mt-6">
          <h2 className="text-lg font-bold text-fore mb-3">Cadenas Activas</h2>
          <div className="space-y-2">
            {VIDEOS.filter(v => !v.parentVideoId).map(rootVid => {
              const user = getUserById(rootVid.userId);
              const chainLen = getChainPath(rootVid.videoId).length;
              return (
                <button
                  key={rootVid.videoId}
                  onClick={() => setSelectedChain(s => s === rootVid.videoId ? null : rootVid.videoId)}
                  className={cn('w-full flex items-center gap-3 p-3 rounded-xl border transition-all duration-200 text-left', selectedChain === rootVid.videoId ? 'border-neon bg-neon/5' : 'border-border bg-surface hover:border-neon/50')}
                >
                  {user && <UserAvatar user={user} size="sm" showBadge={false} />}
                  <div className="flex-1">
                    <div className="text-sm font-medium text-fore">{user?.username} {user?.flag}</div>
                    <div className="text-xs text-gray-400">Iniciada en {user?.city} · {chainLen} eslabones</div>
                  </div>
                  <div className="flex items-center gap-1">
                    {[...Array(chainLen)].map((_, i) => (
                      <div key={`node-${rootVid.videoId}-${i}`} className="w-2 h-2 rounded-full" style={{ background: i === 0 ? '#00F5FF' : '#FF007F', opacity: 1 - (i * 0.15) }} />
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
        {selectedChain && (
          <div className="mt-6">
            <h2 className="text-lg font-bold text-fore mb-3">Recorrido de la Cadena</h2>
            <div className="overflow-x-auto pb-2">
              <div className="flex items-center gap-2" style={{ minWidth: 'max-content' }}>
                {getChainPath(selectedChain).map((vid, idx, arr) => {
                  const user = getUserById(vid.userId);
                  return (
                    <React.Fragment key={vid.videoId}>
                      <div className="flex flex-col items-center">
                        <img src={vid.thumbnailUrl} alt={`Miniatura del video de ${user?.username} en la cadena`} className="w-20 h-32 object-cover rounded-lg border-2" style={{ borderColor: idx === 0 ? '#00F5FF' : '#2a2a3a' }} />
                        <div className="text-xs text-gray-400 mt-1">{user?.flag} {user?.city}</div>
                      </div>
                      {idx < arr.length - 1 && (
                        <ArrowRight size={16} className="text-neon flex-shrink-0" aria-hidden="true" />
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}

function DashboardPage() {
  const [period, setPeriod] = useState<'week' | 'month' | 'all'>('week');
  const [notifs, setNotifs] = useState(NOTIFICATIONS);
  const unread = notifs.filter(n => !n.read).length;

  const markRead = (id: string) => {
    setNotifs(ns => ns.map(n => n.notificationId === id ? { ...n, read: true } : n));
  };

  const weekData = [
    { day: 'Lun', value: 120 },
    { day: 'Mar', value: 340 },
    { day: 'Mié', value: 210 },
    { day: 'Jue', value: 480 },
    { day: 'Vie', value: 390 },
    { day: 'Sáb', value: 620 },
    { day: 'Dom', value: 540 }
  ];
  const maxVal = Math.max(...weekData.map(d => d.value));

  const notifIcons: Record<string, React.ReactNode> = {
    nomination: <span className="text-lg">🎯</span>,
    chain_continued: <span className="text-lg">⛓️</span>,
    milestone: <span className="text-lg">🏆</span>
  };

  return (
    <div className="min-h-screen" style={{ paddingTop: '80px' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-display font-bold text-fore" style={{ fontFamily: 'Syne, sans-serif' }}>Mi Dashboard</h1>
            <p className="text-gray-400 mt-1">Tu impacto global en tiempo real</p>
          </div>
          <div className="flex items-center gap-2">
            <UserAvatar user={USERS[0]} size="md" />
            <div className="hidden sm:block">
              <div className="text-sm font-semibold text-fore">{USERS[0].username}</div>
              <div className="text-xs text-gray-400">{USERS[0].flag} {USERS[0].city}</div>
            </div>
          </div>
        </div>

        {/* KPI Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <KPICard
            icon={<Zap size={18} />}
            value={formatImpact(USERS[0].impactPoints)}
            label="Puntos de impacto"
            change="+12%"
            color="bg-yellow-500/20 text-yellow-400"
          />
          <KPICard
            icon={<Activity size={18} />}
            value={`${USERS[0].currentStreak}d`}
            label="Racha actual"
            change="+3d"
            color="bg-neon/20 text-neon"
          />
          <KPICard
            icon={<Globe size={18} />}
            value="5"
            label="Países alcanzados"
            change="+2"
            color="bg-violet/20 text-violet-400"
          />
          <KPICard
            icon={<Users size={18} />}
            value="24"
            label="Nominaciones recibidas"
            change="+6"
            color="bg-fuchsia/20"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chart + Ranking */}
          <div className="lg:col-span-2 space-y-6">
            {/* Activity chart */}
            <div className="bg-surface border border-border rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-fore">Actividad Semanal</h2>
                <div className="flex gap-1">
                  {(['week', 'month', 'all'] as const).map(p => (
                    <button
                      key={p}
                      onClick={() => setPeriod(p)}
                      className={cn('text-xs px-2.5 py-1 rounded-lg transition-colors', period === p ? 'bg-neon/20 text-neon' : 'text-gray-500 hover:text-fore')}
                    >
                      {p === 'week' ? 'Semana' : p === 'month' ? 'Mes' : 'Todo'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-end gap-2 h-32">
                {weekData.map(d => (
                  <div key={`bar-${d.day}`} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className="w-full rounded-t-md transition-all duration-500 relative group"
                      style={{ height: `${(d.value / maxVal) * 100}%`, background: 'linear-gradient(to top, #7c3aed, #00F5FF)', minHeight: '4px' }}
                    >
                      <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs text-neon opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">{d.value}</div>
                    </div>
                    <span className="text-xs text-gray-500">{d.day}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Ranking */}
            <div className="bg-surface border border-border rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-fore">Ranking Global</h2>
                <div className="flex items-center gap-1 text-xs text-neon">
                  <Star size={12} aria-hidden="true" />
                  <span>Tu posición: #4</span>
                </div>
              </div>
              <div className="space-y-1">
                {RANKING.map(entry => (
                  <RankingRow key={entry.userId} entry={entry} isMe={entry.userId === 'u1'} />
                ))}
              </div>
            </div>

            {/* Mi cadena */}
            <div className="bg-surface border border-border rounded-2xl p-5">
              <h2 className="font-bold text-fore mb-4">Mi Cadena Activa</h2>
              <div className="overflow-x-auto pb-2">
                <div className="flex items-center gap-2" style={{ minWidth: 'max-content' }}>
                  {getChainPath('v1').map((vid, idx, arr) => {
                    const user = getUserById(vid.userId);
                    return (
                      <React.Fragment key={vid.videoId}>
                        <div className="flex flex-col items-center">
                          <img src={vid.thumbnailUrl} alt={`Video de ${user?.username} en la cadena principal`} className="w-16 h-24 object-cover rounded-lg border-2" style={{ borderColor: idx === 0 ? '#00F5FF' : '#2a2a3a' }} />
                          <div className="text-xs text-gray-500 mt-1">{user?.flag}</div>
                        </div>
                        {idx < arr.length - 1 && <ArrowRight size={14} className="text-neon flex-shrink-0" aria-hidden="true" />}
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Notifications */}
          <div className="space-y-4">
            <div className="bg-surface border border-border rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-fore">Notificaciones</h2>
                {unread > 0 && (
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full text-black" style={{ background: '#FF007F' }}>{unread} nuevas</span>
                )}
              </div>
              <div className="space-y-2">
                {notifs.map(notif => {
                  const from = getUserById(notif.fromUserId);
                  return (
                    <div
                      key={notif.notificationId}
                      className={cn('flex gap-3 p-2.5 rounded-xl cursor-pointer transition-all duration-200 hover:bg-muted', !notif.read && 'bg-neon/5 border border-neon/20')}
                      onClick={() => markRead(notif.notificationId)}
                      role="button"
                      aria-label={`Notificación: ${notif.message}`}
                    >
                      <div className="flex-shrink-0 mt-0.5">{notifIcons[notif.type]}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-300 leading-relaxed line-clamp-2">{notif.message}</p>
                        <div className="flex items-center gap-2 mt-1">
                          {from && <img src={from.avatarUrl} alt={`Avatar de ${from.username}`} className="w-4 h-4 rounded-full" />}
                          <span className="text-xs text-gray-500">{timeAgo(notif.createdAt)}</span>
                          {!notif.read && <span className="w-1.5 h-1.5 rounded-full ml-auto flex-shrink-0" style={{ background: '#00F5FF' }} />}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {notifs.length === 0 && (
                  <div className="text-center py-8">
                    <Bell size={32} className="mx-auto text-gray-700 mb-2" />
                    <p className="text-sm text-gray-500">Sin notificaciones aún</p>
                  </div>
                )}
              </div>
            </div>

            {/* Misiones */}
            <div className="bg-surface border border-border rounded-2xl p-5">
              <h2 className="font-bold text-fore mb-4">Misiones Activas</h2>
              <div className="space-y-3">
                {[
                  { label: 'Conectar 5 países', current: 5, total: 5, done: true },
                  { label: 'Racha de 14 días', current: 12, total: 14, done: false },
                  { label: 'Nominar a 30 personas', current: 24, total: 30, done: false }
                ].map((m, i) => (
                  <div key={`mission-${i}`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-fore">{m.label}</span>
                      <span className={cn('text-xs font-medium', m.done ? 'text-green-400' : 'text-gray-400')}>
                        {m.done ? '✓' : `${m.current}/${m.total}`}
                      </span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${(m.current / m.total) * 100}%`, background: m.done ? '#22c55e' : 'linear-gradient(90deg, #7c3aed, #00F5FF)' }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}

function ChallengePage() {
  const params = useParams<{ challengeId: string }>();
  const [, setLocation] = useLocation();
  const challenge = CHALLENGE;
  const catColor = getCategoryColor(challenge.category);
  const relatedVideos = VIDEOS.filter(v => v.challengeId === challenge.challengeId);

  return (
    <div className="min-h-screen" style={{ paddingTop: '80px' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Link href="/" className="flex items-center gap-1 text-sm text-gray-400 hover:text-fore mb-6 transition-colors">
          <ChevronLeft size={16} />
          Volver al inicio
        </Link>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="bg-surface border border-border rounded-2xl p-6 mb-6">
              <div className="flex items-center gap-2 mb-4">
                <span className={cn('text-xs border rounded-full px-3 py-1 font-medium', catColor)}>{challenge.category}</span>
                <span className="text-xs text-gray-400 bg-green-500/10 text-green-400 border border-green-500/20 rounded-full px-2 py-0.5">Activo</span>
              </div>
              <h1 className="text-3xl font-display font-bold text-fore mb-3" style={{ fontFamily: 'Syne, sans-serif' }}>{challenge.title}</h1>
              <p className="text-gray-300 leading-relaxed mb-6">{challenge.description}</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
                <div className="bg-muted rounded-xl p-3 text-center">
                  <div className="text-xl font-bold text-neon">{formatImpact(challenge.globalCounter)}</div>
                  <div className="text-xs text-gray-400">Participantes</div>
                </div>
                <div className="bg-muted rounded-xl p-3 text-center">
                  <div className="text-xl font-bold" style={{ color: '#FF007F' }}>{VIDEOS.filter(v => !v.parentVideoId).length}</div>
                  <div className="text-xs text-gray-400">Cadenas activas</div>
                </div>
                <div className="bg-muted rounded-xl p-3 text-center">
                  <div className="text-xl font-bold text-violet-400">{timeLeft(challenge.expiresAt)}</div>
                  <div className="text-xs text-gray-400">Tiempo restante</div>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setLocation('/camera')}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-black transition-all duration-200 hover:scale-105 active:scale-95"
                  style={{ background: 'linear-gradient(135deg, #FF007F, #7c3aed)', boxShadow: '0 0 20px rgba(255,0,127,0.3)' }}
                >
                  <Camera size={18} aria-hidden="true" />
                  Grabar mi versión
                </button>
                <button
                  onClick={() => setLocation('/feed')}
                  className="flex items-center gap-2 px-4 py-3 rounded-xl font-bold border border-neon transition-all duration-200 hover:bg-neon/10"
                  style={{ color: '#00F5FF' }}
                >
                  <Play size={18} aria-hidden="true" />
                  Ver Feed
                </button>
              </div>
            </div>

            <h2 className="text-xl font-bold text-fore mb-4">Videos del Reto</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {relatedVideos.map(v => {
                const user = getUserById(v.userId);
                return (
                  <div key={v.videoId} className="relative rounded-xl overflow-hidden group cursor-pointer border border-border hover:border-neon/50 transition-all duration-200">
                    <img src={v.thumbnailUrl} alt={`Video de ${user?.username} en el reto ${challenge.title}`} className="w-full h-40 object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-bg/90 to-transparent" />
                    <div className="absolute bottom-2 left-2 right-2">
                      <div className="flex items-center gap-1.5">
                        {user && <img src={user.avatarUrl} alt={`Avatar de ${user.username}`} className="w-5 h-5 rounded-full border border-border" />}
                        <span className="text-xs text-fore font-medium truncate">{user?.username}</span>
                        <span className="text-xs ml-auto">{user?.flag}</span>
                      </div>
                    </div>
                    <div className="absolute top-2 right-2 text-xs bg-black/60 rounded-full px-1.5 py-0.5 text-gray-300">
                      #{v.chainDepth + 1}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-surface border border-border rounded-2xl p-5">
              <h3 className="font-bold text-fore mb-4">Cadenas Activas</h3>
              <div className="space-y-3">
                {VIDEOS.filter(v => !v.parentVideoId).map(rootVid => {
                  const user = getUserById(rootVid.userId);
                  const len = getChainPath(rootVid.videoId).length;
                  return (
                    <div key={rootVid.videoId} className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted transition-colors">
                      {user && <img src={user.avatarUrl} alt={`Avatar de ${user.username}`} className="w-8 h-8 rounded-full border border-border" />}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-fore truncate">{user?.username}</div>
                        <div className="text-xs text-gray-500">{len} eslabones · {user?.flag} {user?.city}</div>
                      </div>
                      <ChevronRight size={14} className="text-gray-600" aria-hidden="true" />
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-surface border border-border rounded-2xl p-5">
              <h3 className="font-bold text-fore mb-3">Reglas del Reto</h3>
              <ul className="space-y-2">
                {[
                  'Máximo 15 segundos de grabación',
                  'Solo cámara nativa de la app',
                  'Sin filtros ni edición',
                  'Nominar 3 personas obligatorio',
                  'Una participación por usuario'
                ].map((rule, i) => (
                  <li key={`rule-${i}`} className="flex items-start gap-2 text-xs text-gray-400">
                    <CheckCircle size={12} className="text-neon mt-0.5 flex-shrink-0" aria-hidden="true" />
                    {rule}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}

function CameraPage() {
  const [, setLocation] = useLocation();
  const [recording, setRecording] = useState(false);
  const [timeLeft2, setTimeLeft2] = useState(15);
  const [recorded, setRecorded] = useState(false);
  const [showNomination, setShowNomination] = useState(false);
  const [published, setPublished] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startRecording = () => {
    setRecording(true);
    setTimeLeft2(15);
    intervalRef.current = setInterval(() => {
      setTimeLeft2(t => {
        if (t <= 1) {
          clearInterval(intervalRef.current!);
          setRecording(false);
          setRecorded(true);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  };

  const stopRecording = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setRecording(false);
    setRecorded(true);
  };

  const handleNominate = (ids: string[]) => {
    setShowNomination(false);
    setPublished(true);
  };

  if (published) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ paddingTop: '56px' }}>
        <div className="text-center animate-slideUp">
          <div className="text-6xl mb-4">🎲</div>
          <h2 className="text-3xl font-display font-bold text-fore mb-2" style={{ fontFamily: 'Syne, sans-serif' }}>¡Dominó pasado!</h2>
          <p className="text-gray-400 mb-2">Tu video ha sido publicado y tus 3 nominados han recibido la notificación.</p>
          <p className="text-sm" style={{ color: '#00F5FF' }}>Cadena ID: DOM-{Math.random().toString(36).slice(2, 8).toUpperCase()}</p>
          <div className="flex gap-3 justify-center mt-6">
            <button onClick={() => setLocation('/feed')} className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-black" style={{ background: 'linear-gradient(135deg, #00F5FF, #7c3aed)' }}>
              <Play size={16} /> Ver en el Feed
            </button>
            <button onClick={() => setLocation('/map')} className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold border border-neon" style={{ color: '#00F5FF' }}>
              <Map size={16} /> Ver en el Mapa
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ paddingTop: '56px', background: '#000' }}>
      {showNomination && (
        <NominationSelector
          onConfirm={handleNominate}
          onClose={() => setShowNomination(false)}
        />
      )}
      <div className="relative h-screen max-h-screen overflow-hidden">
        {/* Camera viewfinder */}
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
          <div className="text-center">
            <Camera size={64} className="mx-auto text-gray-700 mb-3" aria-hidden="true" />
            <p className="text-gray-600 text-sm">Vista previa de cámara</p>
            <p className="text-gray-700 text-xs mt-1">La cámara nativa se activa en el dispositivo</p>
          </div>
        </div>

        {/* Overlay UI */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Top bar */}
          <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-4 pointer-events-auto">
            <button onClick={() => setLocation('/')} className="p-2 rounded-full glass" aria-label="Cerrar cámara">
              <X size={20} className="text-white" />
            </button>
            <div className="glass rounded-xl px-3 py-1.5 flex items-center gap-2">
              <DominoLogo size={14} />
              <span className="text-xs font-bold text-white font-display" style={{ fontFamily: 'Syne, sans-serif' }}>DOMINO</span>
              <span className="text-xs text-gray-400 font-mono">DOM-{Math.random().toString(36).slice(2, 6).toUpperCase()}</span>
            </div>
            <div className="w-10" />
          </div>

          {/* Timer */}
          {recording && (
            <div className="absolute top-20 left-1/2 -translate-x-1/2 pointer-events-none">
              <div className="w-16 h-16 rounded-full flex items-center justify-center border-4" style={{ borderColor: '#FF007F', boxShadow: '0 0 20px rgba(255,0,127,0.5)' }}>
                <span className="text-2xl font-black text-white font-mono">{timeLeft2}</span>
              </div>
            </div>
          )}

          {/* Viewfinder corners */}
          <div className="absolute top-32 left-4 w-8 h-8 border-t-2 border-l-2 border-neon rounded-tl-lg" />
          <div className="absolute top-32 right-4 w-8 h-8 border-t-2 border-r-2 border-neon rounded-tr-lg" />
          <div className="absolute bottom-32 left-4 w-8 h-8 border-b-2 border-l-2 border-neon rounded-bl-lg" />
          <div className="absolute bottom-32 right-4 w-8 h-8 border-b-2 border-r-2 border-neon rounded-br-lg" />

          {/* Bottom controls */}
          <div className="absolute bottom-8 left-0 right-0 flex flex-col items-center gap-4 pointer-events-auto">
            {recorded ? (
              <div className="flex flex-col items-center gap-3 w-full px-8">
                <div className="glass rounded-xl px-4 py-2 text-center">
                  <div className="flex items-center gap-2 justify-center">
                    <CheckCircle size={16} className="text-green-400" aria-hidden="true" />
                    <span className="text-sm text-white font-medium">Video grabado — 15s</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Marca de agua DOMINO aplicada automáticamente</p>
                </div>
                <button
                  onClick={() => setShowNomination(true)}
                  className="w-full max-w-xs py-3.5 rounded-2xl font-bold text-white transition-all duration-200 hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
                  style={{ background: 'linear-gradient(135deg, #FF007F, #7c3aed)', boxShadow: '0 0 24px rgba(255,0,127,0.4)' }}
                >
                  <Users size={18} aria-hidden="true" />
                  Nominar 3 personas y publicar
                </button>
                <button
                  onClick={() => { setRecorded(false); setTimeLeft2(15); }}
                  className="text-sm text-gray-400 hover:text-fore flex items-center gap-1"
                >
                  <RefreshCw size={14} aria-hidden="true" />
                  Repetir grabación
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <p className="text-xs text-gray-400">{recording ? 'Grabando...' : 'Mantén pulsado para grabar'}</p>
                <button
                  onMouseDown={startRecording}
                  onMouseUp={stopRecording}
                  onTouchStart={startRecording}
                  onTouchEnd={stopRecording}
                  disabled={recording && timeLeft2 === 0}
                  className={cn('w-20 h-20 rounded-full border-4 flex items-center justify-center transition-all duration-200', recording ? 'scale-110 border-red-500' : 'border-white hover:border-neon active:scale-95')}
                  style={recording ? { background: '#FF007F', boxShadow: '0 0 30px rgba(255,0,127,0.6)' } : { background: 'rgba(255,255,255,0.1)' }}
                  aria-label={recording ? 'Detener grabación' : 'Iniciar grabación'}
                >
                  {recording ? <div className="w-8 h-8 bg-white rounded-sm" /> : <div className="w-14 h-14 bg-white rounded-full" />}
                </button>
                <p className="text-xs text-gray-500">Máximo 15 segundos · Sin acceso a galería</p>
              </div>
            )}
          </div>

          {/* Info bar */}
          <div className="absolute left-4 top-1/2 -translate-y-1/2 flex flex-col items-center gap-2">
            <div className="glass rounded-full px-2 py-1 text-xs text-gray-300 writing-vertical">{CHALLENGE.title}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ===================== APP =====================
export default function App() {
  const unreadCount = NOTIFICATIONS.filter(n => !n.read).length;

  return (
    <div className="min-h-screen" style={{ background: '#0b0b12' }}>
      <Navbar notifCount={unreadCount} />
      <Switch>
        <Route path="/" component={HomePage} />
        <Route path="/feed" component={FeedPage} />
        <Route path="/map" component={WorldMapPage} />
        <Route path="/dashboard" component={DashboardPage} />
        <Route path="/challenge/:challengeId" component={ChallengePage} />
        <Route path="/camera" component={CameraPage} />
        <Route>
          <div className="min-h-screen flex items-center justify-center px-4">
            <div className="text-center animate-fadeIn">
              <div className="text-6xl mb-4">🎲</div>
              <h1 className="text-3xl font-display font-bold text-fore mb-2" style={{ fontFamily: 'Syne, sans-serif' }}>Página no encontrada</h1>
              <p className="text-gray-400 mb-6">Esta ficha de dominó se ha perdido en el camino...</p>
              <Link href="/" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-black" style={{ background: 'linear-gradient(135deg, #00F5FF, #7c3aed)' }}>
                <Home size={16} /> Volver al inicio
              </Link>
            </div>
          </div>
        </Route>
      </Switch>
    </div>
  );
}
