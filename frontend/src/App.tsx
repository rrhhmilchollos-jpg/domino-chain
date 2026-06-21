import { Suspense, lazy } from 'react';
import { Link, Route, Switch, useLocation } from 'wouter';
import { Home, Play, Video, Camera, BarChart2, Bell, Plus } from 'lucide-react';
import { AuthProvider, useAuth, DominoLogo, Spinner } from './lib/shared';

const HomePage = lazy(() => import('./pages/HomePage'));
const AuthPage = lazy(() => import('./pages/AuthPage'));
const FeedPage = lazy(() => import('./pages/FeedPage'));
const LiveListPage = lazy(() => import('./pages/LiveListPage'));
const CreateLivePage = lazy(() => import('./pages/CreateLivePage'));
const LiveViewerPage = lazy(() => import('./pages/LiveViewerPage'));
const WorldMapPage = lazy(() => import('./pages/WorldMapPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const CameraPage = lazy(() => import('./pages/CameraPage'));
const CoinsStorePage = lazy(() => import('./pages/CoinsStorePage'));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'));
const UserProfilePage = lazy(() => import('./pages/UserProfilePage'));
const FollowListPage = lazy(() => import('./pages/FollowListPage'));
const SearchPage = lazy(() => import('./pages/SearchPage'));
const RemixCameraPage = lazy(() => import('./pages/RemixCameraPage'));

function PageFallback() {
  return <div className="min-h-screen flex items-center justify-center" style={{background:'#000'}}><Spinner/></div>;
}

// BottomNav estilo TikTok — siempre visible en la parte inferior
function BottomNav() {
  const [loc] = useLocation();
  const { user } = useAuth();
  // Ocultar en páginas donde el nav estorba
  if (['/auth', '/camera'].some(p => loc.startsWith(p))) return null;
  if (loc.startsWith('/live/') && loc !== '/live') return null;

  const active = (path: string) => loc === path || (path === '/' && loc === '/feed');

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around px-2 pb-safe"
      style={{background:'rgba(0,0,0,0.92)',backdropFilter:'blur(20px)',borderTop:'1px solid rgba(255,255,255,0.08)',height:'56px'}}>

      {/* Inicio / Feed */}
      <Link href="/" className="flex flex-col items-center gap-0.5 px-3 py-1">
        <Home size={24} className={active('/') ? 'text-white' : 'text-gray-500'}/>
        <span className="text-[10px] font-medium" style={{color: active('/') ? '#fff' : '#6b7280'}}>Inicio</span>
      </Link>

      {/* En Vivo */}
      <Link href="/live" className="flex flex-col items-center gap-0.5 px-3 py-1">
        <Video size={24} className={active('/live') ? 'text-white' : 'text-gray-500'}/>
        <span className="text-[10px] font-medium" style={{color: active('/live') ? '#fff' : '#6b7280'}}>En Vivo</span>
      </Link>

      {/* Botón central GRABAR — igual que el + de TikTok */}
      <Link href="/camera" className="flex flex-col items-center">
        <div className="flex items-center justify-center rounded-xl w-12 h-9 relative"
          style={{background:'#00F5FF',boxShadow:'0 0 0 3px rgba(0,245,255,0.25)'}}>
          <div className="absolute -left-1 w-3 h-full rounded-lg" style={{background:'#FF007F', opacity:0.7}}/>
          <Plus size={22} className="text-black relative z-10" strokeWidth={3}/>
          <div className="absolute -right-1 w-3 h-full rounded-lg" style={{background:'#7c3aed', opacity:0.7}}/>
        </div>
      </Link>

      {/* Notificaciones */}
      <Link href="/notifications" className="flex flex-col items-center gap-0.5 px-3 py-1 relative">
        <Bell size={24} className={active('/notifications') ? 'text-white' : 'text-gray-500'}/>
        <span className="text-[10px] font-medium" style={{color: active('/notifications') ? '#fff' : '#6b7280'}}>Avisos</span>
      </Link>

      {/* Perfil / Dashboard */}
      <Link href={user ? '/dashboard' : '/auth'} className="flex flex-col items-center gap-0.5 px-3 py-1">
        <BarChart2 size={24} className={active('/dashboard') ? 'text-white' : 'text-gray-500'}/>
        <span className="text-[10px] font-medium" style={{color: active('/dashboard') ? '#fff' : '#6b7280'}}>Perfil</span>
      </Link>
    </nav>
  );
}

// ===================== APP =====================
export default function App() { return <AuthProvider><AppInner/></AuthProvider>; }

function AppInner() {
  const { loading } = useAuth();
  if(loading)return<div className="min-h-screen flex items-center justify-center" style={{background:'#000'}}><div className="flex flex-col items-center gap-4"><DominoLogo size={40}/><Spinner/></div></div>;
  return(
    <div className="min-h-screen" style={{background:'#000'}}>
      <Suspense fallback={<PageFallback/>}>
        <Switch>
          <Route path="/" component={FeedPage}/>
          <Route path="/home" component={HomePage}/>
          <Route path="/auth" component={AuthPage}/>
          <Route path="/feed" component={FeedPage}/>
          <Route path="/live" component={LiveListPage}/>
          <Route path="/live/create" component={CreateLivePage}/>
          <Route path="/live/:id">{(p:any)=><LiveViewerPage id={p.id}/>}</Route>
          <Route path="/map" component={WorldMapPage}/>
          <Route path="/dashboard" component={DashboardPage}/>
          <Route path="/search"><SearchPage/></Route>
          <Route path="/remix/:videoId">{(p:any)=><RemixCameraPage videoId={p.videoId}/>}</Route>
          <Route path="/user/:id/followers">{(p:any)=><FollowListPage id={p.id} type="followers"/>}</Route>
          <Route path="/user/:id/following">{(p:any)=><FollowListPage id={p.id} type="following"/>}</Route>
          <Route path="/user/:id">{(p:any)=><UserProfilePage id={p.id}/>}</Route>
          <Route path="/camera" component={CameraPage}/>
          <Route path="/coins" component={CoinsStorePage}/>
          <Route path="/notifications" component={NotificationsPage}/>
          <Route><div className="min-h-screen flex items-center justify-center px-4"><div className="text-center"><div className="text-6xl mb-4">🎲</div><h1 className="text-3xl font-black text-white mb-2">Página no encontrada</h1><Link href="/" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-black" style={{background:'linear-gradient(135deg,#00F5FF,#7c3aed)'}}><Home size={16}/>Inicio</Link></div></div></Route>
        </Switch>
      </Suspense>
      <BottomNav/>
    </div>
  );
}
