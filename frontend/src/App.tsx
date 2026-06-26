import React, { Suspense, lazy, useState, useEffect, useRef, useCallback } from 'react';
import { Link, Route, Switch, useLocation } from 'wouter';
import {
  Home, BarChart2, Camera, Bell, X,
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

// ===================== SHARED CORE =====================
// Importamos desde shared para no duplicar lógica
import {
  AuthProvider, useAuth, useApi, cn, fmt, ago, left,
  API, DominoLogo, Spinner, Av, FollowButton,
  GIFT_CATALOG, uploadToCloudinary, shareLink, Toast,
  CommentsPanel, useKeyboardOffset, DominoVideo,
  LiveStream, AppUser, RankingEntry, Notification
} from './lib/shared';

// ===================== LAZY PAGE IMPORTS =====================
// Cada página se carga solo cuando el usuario navega hasta ella
const FeedPage        = lazy(() => import('./pages/FeedPage'));
const AuthPage        = lazy(() => import('./pages/AuthPage'));
const CameraPage      = lazy(() => import('./pages/CameraPage'));
const LiveListPage    = lazy(() => import('./pages/LiveListPage'));
const CreateLivePage  = lazy(() => import('./pages/CreateLivePage'));
const LiveViewerPage  = lazy(() => import('./pages/LiveViewerPage'));
const WorldMapPage    = lazy(() => import('./pages/WorldMapPage'));
const SearchPage      = lazy(() => import('./pages/SearchPage'));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'));
const CoinsStorePage  = lazy(() => import('./pages/CoinsStorePage'));
const DashboardPage   = lazy(() => import('./pages/DashboardPage'));
const HomePage        = lazy(() => import('./pages/HomePage'));
const UserProfilePage = lazy(() => import('./pages/UserProfilePage'));
const FollowListPage  = lazy(() => import('./pages/FollowListPage'));
const RemixCameraPage = lazy(() => import('./pages/RemixCameraPage'));
const DailyChallengesPage = lazy(() => import('./pages/DailyChallengesPage'));
// Páginas extraídas de App.tsx
const MessagesPage    = lazy(() => import('./pages/MessagesPage'));
const ChatPage        = lazy(() => import('./pages/ChatPage'));
const SettingsPage    = lazy(() => import('./pages/SettingsPage'));
const EditProfilePage = lazy(() => import('./pages/EditProfilePage'));

// ===================== TIPOS INTERNOS =====================
interface Message { _id: string; fromUserId: { _id: string; username: string; avatarUrl: string; flag: string }; toUserId: { _id: string; username: string; avatarUrl: string; flag: string }; text: string; read: boolean; createdAt: string; }
interface Conversation { user: { _id: string; username: string; avatarUrl: string; flag: string }; lastMessage: Message; unread: number; }
interface Comment { _id: string; userId: { _id: string; username: string; avatarUrl: string; flag: string }; text: string; createdAt: string; }

// ===================== LOADING FALLBACK =====================
function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0b0b12' }}>
      <div className="flex flex-col items-center gap-4">
        <DominoLogo size={36} />
        <Spinner />
      </div>
    </div>
  );
}

// ===================== BOTTOM NAV =====================
function BottomNav() {
  const [loc, setLocation] = useLocation();
  const { user } = useAuth();
  const { data: nd } = useApi('/api/notifications', [user?._id]);
  const unread = Array.isArray(nd) ? nd.filter((n: Notification) => !n.read).length : 0;
  const hide = ['/create', '/camera', '/auth'].some(p => loc.startsWith(p));
  if (hide) return null;
  const active = (path: string) => path === '/' ? loc === '/' || loc === '/feed' || loc === '/following' : loc.startsWith(path);
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t" style={{ background: 'rgba(11,11,18,0.98)', backdropFilter: 'blur(20px)', borderColor: 'rgba(255,255,255,0.06)', paddingBottom: 'env(safe-area-inset-bottom,0px)' }}>
      <div className="flex items-center justify-around h-14 max-w-lg mx-auto px-1">
        <button onClick={() => setLocation('/feed')} className="flex flex-col items-center gap-0.5 px-3 py-1 flex-1">
          <Home size={24} strokeWidth={active('/') ? 2.5 : 1.5} className={active('/') ? 'text-white' : 'text-gray-500'} />
          <span className={cn('text-[10px] font-medium', active('/') ? 'text-white' : 'text-gray-500')}>Inicio</span>
        </button>
        <button onClick={() => setLocation('/search')} className="flex flex-col items-center gap-0.5 px-3 py-1 flex-1">
          <Users size={24} strokeWidth={active('/search') ? 2.5 : 1.5} className={active('/search') ? 'text-white' : 'text-gray-500'} />
          <span className={cn('text-[10px] font-medium', active('/search') ? 'text-white' : 'text-gray-500')}>Amigos</span>
        </button>
        <button onClick={() => setLocation('/create')} className="flex items-center justify-center px-2 py-1 flex-1">
          <div className="relative flex items-center justify-center h-8 rounded-lg overflow-hidden" style={{ width: '50px' }}>
            <div className="absolute left-0 top-0 bottom-0 w-3.5 rounded-l-lg" style={{ background: '#00F5FF' }} />
            <div className="absolute right-0 top-0 bottom-0 w-3.5 rounded-r-lg" style={{ background: '#FF007F' }} />
            <div className="relative z-10 flex items-center justify-center w-9 h-full rounded-md" style={{ background: 'white' }}><Plus size={22} className="text-black" strokeWidth={3} /></div>
          </div>
        </button>
        <button onClick={() => setLocation('/messages')} className="relative flex flex-col items-center gap-0.5 px-3 py-1 flex-1">
          <MessageCircle size={24} strokeWidth={active('/messages') ? 2.5 : 1.5} className={active('/messages') ? 'text-white' : 'text-gray-500'} />
          {unread > 0 && <span className="absolute top-0 right-2 min-w-[16px] h-4 rounded-full text-[9px] font-bold text-white flex items-center justify-center px-1" style={{ background: '#FF007F' }}>{unread > 99 ? '99+' : unread}</span>}
          <span className={cn('text-[10px] font-medium', active('/messages') ? 'text-white' : 'text-gray-500')}>Mensajes</span>
        </button>
        <button onClick={() => user ? setLocation('/profile') : setLocation('/auth')} className="flex flex-col items-center gap-0.5 px-3 py-1 flex-1">
          {user ? (<div className={cn('rounded-full overflow-hidden', active('/profile') ? 'ring-2 ring-white ring-offset-1 ring-offset-black' : '')} style={{ width: 26, height: 26 }}>{user.avatarUrl ? <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-white font-bold text-xs" style={{ background: '#7c3aed' }}>{user.username?.[0]?.toUpperCase()}</div>}</div>) : (<BarChart2 size={24} strokeWidth={1.5} className="text-gray-500" />)}
          <span className={cn('text-[10px] font-medium', active('/profile') ? 'text-white' : 'text-gray-500')}>Perfil</span>
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
  const unread = Array.isArray(nd) ? nd.filter((n: Notification) => !n.read).length : 0;
  const hide = ['/create', '/camera', '/auth'].some(p => loc.startsWith(p));
  if (hide) return null;
  const isFeed = loc === '/' || loc === '/feed' || loc === '/following';
  return (
    <nav className="fixed top-0 left-0 right-0 z-40" style={{ background: isFeed ? 'transparent' : 'rgba(11,11,18,0.97)', backdropFilter: isFeed ? 'none' : 'blur(20px)', borderBottom: isFeed ? 'none' : '1px solid rgba(255,255,255,0.06)' }}>
      <div className="flex items-center justify-between h-14 px-4 max-w-7xl mx-auto">
        {isFeed ? <div className="flex-1" /> : <button onClick={() => setLocation('/feed')} className="flex items-center gap-2 flex-1"><DominoLogo size={16} /><span className="text-base font-black" style={{ color: '#00F5FF' }}>DOMINO</span></button>}
        {isFeed && <div className="flex items-center gap-6 flex-1 justify-center">
          <button onClick={() => setLocation('/feed')} className={cn('text-base font-bold pb-1', loc !== '/following' ? 'text-white border-b-2 border-white' : 'text-gray-400')}>Para ti</button>
          <button onClick={() => setLocation('/following')} className={cn('text-base font-bold pb-1', loc === '/following' ? 'text-white border-b-2 border-white' : 'text-gray-400')}>Siguiendo</button>
        </div>}
        <div className="flex items-center gap-1 flex-1 justify-end">
          {isFeed && <button onClick={() => setLocation('/search')} className="p-2"><Search size={20} className="text-white" /></button>}
          {user && <button onClick={() => setLocation('/notifications')} className="p-2 relative"><Bell size={20} className={isFeed ? 'text-white' : 'text-gray-300'} />{unread > 0 && <span className="absolute top-1 right-1 w-2 h-2 rounded-full" style={{ background: '#FF007F' }} />}</button>}
          {user && <div className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold" style={{ background: 'rgba(0,245,255,0.1)', color: '#00F5FF', border: '1px solid rgba(0,245,255,0.2)' }}>🪙 {(user.coins || 0).toLocaleString()}</div>}
          {!user && <button onClick={() => setLocation('/auth')} className="text-sm font-bold px-4 py-1.5 rounded-lg" style={{ background: '#FF007F', color: 'white' }}>Entrar</button>}
        </div>
      </div>
    </nav>
  );
}

// ===================== SHARE PANEL =====================
function SharePanel({ videoId, onClose }: { videoId: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const url = `${window.location.origin}/video/${videoId}`;
  const copy = async () => {
    await shareLink('Video DOMINO', url);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="fixed inset-0 z-50 flex items-end" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={onClose}>
      <div className="w-full rounded-t-3xl p-6" style={{ background: '#1e1e2a' }} onClick={e => e.stopPropagation()}>
        <div className="w-10 h-1 rounded-full mx-auto mb-5" style={{ background: '#3a3a4a' }} />
        <h3 className="text-white font-bold mb-4 text-center">Compartir</h3>
        <div className="flex gap-3 justify-center mb-4">
          {[{ e: '💬', l: 'WhatsApp' }, { e: '📸', l: 'Instagram' }, { e: '🐦', l: 'Twitter' }, { e: '📋', l: copied ? '¡Copiado!' : 'Copiar' }].map(s => (
            <button key={s.l} onClick={copy} className="flex flex-col items-center gap-2">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl" style={{ background: '#2a2a3a' }}>{s.e}</div>
              <span className="text-gray-400 text-xs">{s.l}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ===================== PROFILE PAGE (inline — única que tiene estado complejo ligado al router) =====================
function ProfilePage({ userId }: { userId?: string }) {
  const { user: me, token, refreshUser, logout } = useAuth();
  const [, setLocation] = useLocation();
  const isOwn = !userId || userId === me?._id;
  const targetId = isOwn ? me?._id : userId;
  const { data: profile, loading } = useApi(isOwn ? '/api/users/me' : `/api/users/${targetId}`, [targetId]);
  const { data: userVideos } = useApi(targetId ? `/api/users/${targetId}/videos` : '', [targetId]);
  const [tab, setTab] = useState<'videos' | 'private' | 'repost' | 'saved' | 'likes'>('videos');
  const [following, setFollowing] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<DominoVideo | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [showUnfollowConfirm, setShowUnfollowConfirm] = useState(false);

  useEffect(() => { if (me && profile && !isOwn) setFollowing(profile.followers?.includes(me._id) || false); }, [profile, me]);

  const doFollow = async () => {
    if (!token) { setLocation('/auth'); return; }
    if (!targetId) return;
    if (following) { setShowUnfollowConfirm(true); return; }
    setFollowing(true);
    await fetch(`${API}/api/users/${targetId}/follow`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
    await refreshUser();
  };
  const confirmUnfollow = async () => {
    if (!targetId || !token) return;
    setFollowing(false); setShowUnfollowConfirm(false);
    await fetch(`${API}/api/users/${targetId}/follow`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center" style={{ paddingTop: '56px', background: '#0b0b12' }}><Spinner /></div>;
  if (!profile && !isOwn) return <div className="min-h-screen flex items-center justify-center" style={{ paddingTop: '56px', background: '#0b0b12' }}><p className="text-gray-400">Usuario no encontrado</p></div>;
  const displayUser = isOwn ? (me || profile) : profile;
  if (!displayUser) return null;

  const videos = Array.isArray(userVideos) ? userVideos : [];
  const savedVids = Array.isArray(displayUser.savedVideos) ? displayUser.savedVideos.filter((v: any) => v && v._id) : [];
  const likedVids = Array.isArray(displayUser.likedVideos) ? displayUser.likedVideos.filter((v: any) => v && v._id) : [];
  const totalLikes = videos.reduce((a: number, v: DominoVideo) => a + (v.likes?.length || 0), 0);
  const tabVideos = tab === 'videos' ? videos : tab === 'saved' ? savedVids : tab === 'likes' ? likedVids : [];
  const TABS = [
    { key: 'videos', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg> },
    { key: 'private', icon: <Lock size={20} /> }, { key: 'repost', icon: <Repeat2 size={20} /> },
    { key: 'saved', icon: <Bookmark size={20} /> }, { key: 'likes', icon: <Heart size={20} /> },
  ];

  return (
    <div className="min-h-screen pb-20 overflow-y-auto" style={{ paddingTop: '56px', background: '#0b0b12' }}>
      {selectedVideo && <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.97)' }}><button onClick={() => setSelectedVideo(null)} className="absolute top-4 right-4 p-2 rounded-full z-10" style={{ background: 'rgba(255,255,255,0.1)' }}><X size={20} className="text-white" /></button><div className="relative w-full max-w-sm mx-4" style={{ aspectRatio: '9/16', maxHeight: '90svh' }}>{selectedVideo.videoUrl ? <video src={selectedVideo.videoUrl} className="w-full h-full object-cover rounded-2xl" controls autoPlay loop playsInline /> : selectedVideo.thumbnailUrl ? <img src={selectedVideo.thumbnailUrl} alt="" className="w-full h-full object-cover rounded-2xl" /> : <div className="w-full h-full rounded-2xl flex items-center justify-center" style={{ background: '#1a1a2e' }}><Camera size={48} className="text-gray-600" /></div>}</div></div>}
      {showUnfollowConfirm && <div className="fixed inset-0 z-50 flex items-center justify-center px-6" style={{ background: 'rgba(0,0,0,0.75)' }}><div className="w-full max-w-xs rounded-2xl p-6 text-center" style={{ background: '#1e1e2a' }}><Av u={displayUser} s={60} /><p className="text-white font-bold mt-3 mb-1">¿Dejar de seguir?</p><p className="text-gray-400 text-sm mb-5">@{displayUser.username}</p><div className="flex gap-3"><button onClick={() => setShowUnfollowConfirm(false)} className="flex-1 py-2.5 rounded-xl text-white font-semibold border border-gray-600">Cancelar</button><button onClick={confirmUnfollow} className="flex-1 py-2.5 rounded-xl font-bold text-white" style={{ background: '#FF007F' }}>Dejar de seguir</button></div></div></div>}
      {showMenu && <div className="fixed inset-0 z-50 flex items-end" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={() => setShowMenu(false)}><div className="w-full rounded-t-3xl overflow-hidden" style={{ background: '#1e1e2a' }} onClick={e => e.stopPropagation()}><div className="w-10 h-1 rounded-full mx-auto mt-3 mb-1" style={{ background: '#3a3a4a' }} /><div className="p-4 space-y-1">
        {isOwn && <><button onClick={() => { setShowMenu(false); setLocation('/settings'); }} className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-white hover:bg-white/5"><Settings size={18} className="text-gray-400" />Ajustes</button><button onClick={() => { setShowMenu(false); setLocation('/coins'); }} className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-white hover:bg-white/5"><span>🪙</span>Comprar monedas</button><button onClick={() => { setShowMenu(false); setLocation('/notifications'); }} className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-white hover:bg-white/5"><Bell size={18} className="text-gray-400" />Notificaciones</button><div className="border-t my-1" style={{ borderColor: '#2a2a3a' }} /><button onClick={() => { logout(); setShowMenu(false); setLocation('/'); }} className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-red-400 hover:bg-white/5"><LogOut size={18} />Cerrar sesión</button></>}
        {!isOwn && <><button className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-white hover:bg-white/5"><Flag size={18} className="text-gray-400" />Denunciar</button><button className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-red-400 hover:bg-white/5"><Ban size={18} />Bloquear</button></>}
        <button onClick={() => setShowMenu(false)} className="w-full py-3.5 rounded-xl text-gray-400">Cancelar</button>
      </div></div></div>}
      <div className="max-w-lg mx-auto">
        <div className="flex items-center justify-between px-4 pt-2 pb-3">
          {isOwn ? <button className="text-white font-bold text-sm flex items-center gap-1">{displayUser.username}<ChevronRight size={14} /></button> : <button onClick={() => setLocation(-1 as any)} className="p-1"><ChevronLeft size={24} className="text-white" /></button>}
          <div className="flex items-center gap-2">
            {isOwn && <button onClick={() => setLocation('/coins')} className="flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-lg" style={{ background: 'rgba(0,245,255,0.1)', color: '#00F5FF' }}>🪙 {(displayUser.coins || 0).toLocaleString()}</button>}
            <button onClick={() => setShowMenu(true)} className="p-1"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></svg></button>
          </div>
        </div>
        <div className="flex flex-col items-center px-4 pb-4">
          <div className="relative mb-3">
            <div className="w-24 h-24 rounded-full overflow-hidden" style={{ background: '#7c3aed', border: '2px solid #2a2a3a' }}>
              {displayUser.avatarUrl ? <img src={displayUser.avatarUrl} alt="" className="w-full h-full object-cover" /> : <span className="w-full h-full flex items-center justify-center text-white font-black text-4xl">{displayUser.username?.[0]?.toUpperCase()}</span>}
            </div>
            {isOwn && <button className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center" style={{ background: '#00F5FF' }}><Plus size={16} className="text-black" strokeWidth={3} /></button>}
          </div>
          <p className="text-white font-black text-lg">@{displayUser.username}</p>
          {displayUser.bio && <p className="text-gray-300 text-sm text-center mt-1 max-w-xs">{displayUser.bio}</p>}
          <div className="flex items-center gap-6 mt-3 mb-3">
            <button onClick={() => setLocation(isOwn ? `/follow/${me?._id}/following` : `/follow/${targetId}/following`)} className="text-center"><div className="text-white font-black text-lg">{displayUser.followingCount ?? displayUser.following?.length ?? 0}</div><div className="text-gray-400 text-xs">Siguiendo</div></button>
            <button onClick={() => setLocation(isOwn ? `/follow/${me?._id}/followers` : `/follow/${targetId}/followers`)} className="text-center"><div className="text-white font-black text-lg">{displayUser.followersCount ?? displayUser.followers?.length ?? 0}</div><div className="text-gray-400 text-xs">Seguidores</div></button>
            <div className="text-center"><div className="text-white font-black text-lg">{fmt(totalLikes)}</div><div className="text-gray-400 text-xs">Me gusta</div></div>
          </div>
          {isOwn ? (
            <div className="flex items-center gap-2 w-full max-w-xs">
              <button onClick={() => setLocation('/profile/edit')} className="flex-1 py-2 rounded-lg font-semibold text-white text-sm border border-gray-600">Editar perfil</button>
              <button onClick={() => setLocation('/create')} className="flex-1 py-2 rounded-lg font-bold text-black text-sm" style={{ background: '#00F5FF' }}>Grabar ⛓️</button>
              <button onClick={() => setLocation('/settings')} className="w-9 h-9 rounded-lg border border-gray-600 flex items-center justify-center flex-shrink-0"><Settings size={15} className="text-white" /></button>
            </div>
          ) : (
            <div className="flex items-center gap-2 w-full max-w-xs">
              <button onClick={doFollow} className="flex-1 py-2 rounded-lg font-bold text-sm transition-all" style={following ? { background: 'transparent', border: '1px solid #555', color: 'white' } : { background: '#FF007F', color: 'white' }}>{following ? 'Siguiendo' : 'Seguir'}</button>
              <button onClick={() => setLocation(`/messages/${targetId}`)} className="flex-1 py-2 rounded-lg font-semibold text-white text-sm border border-gray-600">Mensaje</button>
              <button className="w-9 h-9 rounded-lg border border-gray-600 flex items-center justify-center flex-shrink-0"><ChevronRight size={15} className="text-white" /></button>
            </div>
          )}
        </div>
        <div className="flex border-b sticky top-14 z-10" style={{ borderColor: '#1e1e2a', background: '#0b0b12' }}>
          {TABS.map(t => <button key={t.key} onClick={() => setTab(t.key as any)} className={cn('flex-1 flex items-center justify-center py-3 border-b-2 transition-all', tab === t.key ? 'text-white border-white' : 'text-gray-600 border-transparent')}>{t.icon}</button>)}
        </div>
        <div className="grid grid-cols-3 gap-px" style={{ background: '#1e1e2a' }}>
          {tabVideos.map((v: DominoVideo) => (
            <button key={v._id} onClick={() => setSelectedVideo(v)} className="relative overflow-hidden bg-black" style={{ aspectRatio: '9/16' }}>
              {v.thumbnailUrl ? <img src={v.thumbnailUrl} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center" style={{ background: '#111' }}><Camera size={18} className="text-gray-700" /></div>}
              <div className="absolute inset-0" style={{ background: 'linear-gradient(to top,rgba(0,0,0,0.5),transparent 50%)' }} />
              <div className="absolute bottom-1.5 left-1.5 flex items-center gap-0.5"><Play size={9} className="text-white fill-white" /><span className="text-white text-xs font-medium">{fmt(v.likes?.length || 0)}</span></div>
              {v.videoUrl && <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full" style={{ background: '#FF007F' }} />}
            </button>
          ))}
        </div>
        {tabVideos.length === 0 && <div className="text-center py-20 px-4"><div className="text-5xl mb-4">{tab === 'videos' ? '🎲' : tab === 'saved' ? '🔖' : tab === 'likes' ? '❤️' : tab === 'private' ? '🔒' : '🔁'}</div><p className="text-gray-500 text-sm">{tab === 'videos' ? 'Sin videos' : tab === 'saved' ? 'Sin guardados' : tab === 'likes' ? 'Sin me gusta' : tab === 'private' ? 'Sin privados' : 'Sin reposts'}</p>{tab === 'videos' && isOwn && <button onClick={() => setLocation('/create')} className="mt-5 px-6 py-2.5 rounded-full font-bold text-black text-sm" style={{ background: '#00F5FF' }}>Grabar primer reto</button>}</div>}
        {tabVideos.length > 0 && <p className="text-center text-gray-700 text-xs py-6">Has visto todos los vídeos</p>}
      </div>
    </div>
  );
}

// ===================== CREATE PAGE (inline — pequeña, no merece lazy) =====================
function CreatePage() {
  const [, setLocation] = useLocation();
  const [subTab, setSubTab] = useState<'publicar' | 'crear' | 'live'>('publicar');
  return (
    <div className="min-h-screen" style={{ background: '#000' }}>
      <div className="flex items-center justify-between px-4 py-4" style={{ paddingTop: 'max(16px,env(safe-area-inset-top))' }}>
        <button onClick={() => setLocation(-1 as any)} className="p-2 rounded-full" style={{ background: 'rgba(255,255,255,0.1)' }}><X size={20} className="text-white" /></button>
        <h1 className="text-white font-bold">Crear</h1>
        <div className="w-10" />
      </div>
      <div className="px-4 mb-5">
        <button onClick={() => setLocation('/camera')} className="w-full py-5 rounded-2xl flex items-center justify-center gap-3 font-bold text-white text-base border-2 border-dashed transition-all" style={{ borderColor: 'rgba(0,245,255,0.3)', background: 'rgba(0,245,255,0.05)' }}>
          <Camera size={24} style={{ color: '#00F5FF' }} /><span style={{ color: '#00F5FF' }}>Grabar nuevo vídeo</span>
        </button>
      </div>
      <div className="flex border-b px-4 mb-4" style={{ borderColor: '#1e1e2a' }}>
        {(['publicar', 'crear', 'live'] as const).map(t => <button key={t} onClick={() => setSubTab(t)} className={cn('flex-1 py-3 text-sm font-bold uppercase border-b-2 transition-all', subTab === t ? 'text-white border-white' : 'text-gray-500 border-transparent')}>{t}</button>)}
      </div>
      {subTab === 'live' && <div className="px-4 text-center py-12"><div className="text-5xl mb-4">📡</div><p className="text-white font-bold mb-2">Iniciar un directo</p><p className="text-gray-400 text-sm mb-6">Conecta en tiempo real con tu audiencia</p><button onClick={() => setLocation('/live/create')} className="px-6 py-3 rounded-xl font-bold text-white" style={{ background: '#FF007F' }}>Empezar directo</button></div>}
      {subTab !== 'live' && <div className="px-4"><h2 className="text-white font-bold mb-3">Plantillas populares</h2><div className="grid grid-cols-2 gap-3">{[{ title: 'Reto Kindness', desc: '14.7K vídeos', thumb: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=300&h=500&fit=crop' }, { title: 'Eco Warrior', desc: '8.9K vídeos', thumb: 'https://images.unsplash.com/photo-1501854140801-50d01698950b?w=300&h=500&fit=crop' }, { title: 'Arte 15s', desc: '22.1K vídeos', thumb: 'https://images.unsplash.com/photo-1511988617509-a57c8a288659?w=300&h=500&fit=crop' }, { title: 'Baila tu Día', desc: '5.3K vídeos', thumb: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=300&h=500&fit=crop' }].map(t => <button key={t.title} onClick={() => setLocation('/camera')} className="relative rounded-2xl overflow-hidden" style={{ aspectRatio: '9/16' }}><img src={t.thumb} alt={t.title} className="w-full h-full object-cover" /><div className="absolute inset-0" style={{ background: 'linear-gradient(to top,rgba(0,0,0,0.7),transparent 60%)' }} /><div className="absolute bottom-2 left-2 right-2"><p className="text-white text-xs font-bold">{t.title}</p><p className="text-gray-300 text-xs">{t.desc}</p></div></button>)}</div></div>}
    </div>
  );
}

// ===================== HOME ROUTE =====================
function HomeRoute() {
  const [, setLocation] = useLocation();
  useEffect(() => { setLocation('/feed'); }, []);
  return <PageLoader />;
}

// ===================== APP =====================
export default function App() { return <AuthProvider><AppInner /></AuthProvider>; }

function AppInner() {
  const { loading } = useAuth();
  if (loading) return <PageLoader />;
  return (
    <div className="min-h-screen" style={{ background: '#0b0b12' }}>
      <TopNav />
      <Suspense fallback={<PageLoader />}>
        <Switch>
          <Route path="/" component={HomeRoute} />
          <Route path="/feed">{() => <FeedPage />}</Route>
          <Route path="/following">{() => <FeedPage />}</Route>
          <Route path="/auth">{() => <AuthPage />}</Route>
          <Route path="/create" component={CreatePage} />
          <Route path="/camera">{() => <CameraPage />}</Route>
          <Route path="/live/create">{() => <CreateLivePage />}</Route>
          <Route path="/live/:id">{(p: any) => <LiveViewerPage id={p.id} />}</Route>
          <Route path="/live">{() => <LiveListPage />}</Route>
          <Route path="/map">{() => <WorldMapPage />}</Route>
          <Route path="/profile" component={() => <ProfilePage />} />
          <Route path="/profile/edit">{() => <EditProfilePage />}</Route>
          <Route path="/user/:id">{(p: any) => <ProfilePage userId={p.id} />}</Route>
          <Route path="/follow/:id/:type">{(p: any) => <FollowListPage id={p.id} type={p.type} />}</Route>
          <Route path="/messages/:id">{(p: any) => <ChatPage userId={p.id} />}</Route>
          <Route path="/messages">{() => <MessagesPage />}</Route>
          <Route path="/search">{() => <SearchPage />}</Route>
          <Route path="/notifications">{() => <NotificationsPage />}</Route>
          <Route path="/settings">{() => <SettingsPage />}</Route>
          <Route path="/coins">{() => <CoinsStorePage />}</Route>
          <Route path="/dashboard">{() => <DashboardPage />}</Route>
          <Route path="/challenges">{() => <DailyChallengesPage />}</Route>
          <Route path="/remix/:id">{(p: any) => <RemixCameraPage videoId={p.id} />}</Route>
          <Route>
            <div className="min-h-screen flex items-center justify-center px-4 pb-20">
              <div className="text-center"><div className="text-6xl mb-4">🎲</div><h1 className="text-2xl font-black text-white mb-2">Página no encontrada</h1><Link href="/" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-black mt-4" style={{ background: 'linear-gradient(135deg,#00F5FF,#7c3aed)' }}><Home size={16} />Inicio</Link></div>
            </div>
          </Route>
        </Switch>
      </Suspense>
      <BottomNav />
    </div>
  );
}
