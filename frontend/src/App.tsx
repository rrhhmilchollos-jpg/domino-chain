import { Suspense, lazy } from 'react';
import { Link, Route, Switch } from 'wouter';
import { Home } from 'lucide-react';
import { AuthProvider, useAuth, Navbar, DominoLogo, Spinner } from './lib/shared';

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

function PageFallback() {
  return <div className="min-h-screen flex items-center justify-center" style={{paddingTop:'80px',background:'#0b0b12'}}><Spinner/></div>;
}

// ===================== APP =====================
export default function App() { return <AuthProvider><AppInner/></AuthProvider>; }

function AppInner() {
  const { loading } = useAuth();
  if(loading)return<div className="min-h-screen flex items-center justify-center" style={{background:'#0b0b12'}}><div className="flex flex-col items-center gap-4"><DominoLogo size={40}/><Spinner/></div></div>;
  return(
    <div className="min-h-screen" style={{background:'#0b0b12'}}>
      <Navbar/>
      <Suspense fallback={<PageFallback/>}>
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
          <Route path="/coins" component={CoinsStorePage}/>
          <Route path="/notifications" component={NotificationsPage}/>
          <Route><div className="min-h-screen flex items-center justify-center px-4"><div className="text-center"><div className="text-6xl mb-4">🎲</div><h1 className="text-3xl font-black text-white mb-2">Página no encontrada</h1><Link href="/" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-black" style={{background:'linear-gradient(135deg,#00F5FF,#7c3aed)'}}><Home size={16}/>Inicio</Link></div></div></Route>
        </Switch>
      </Suspense>
    </div>
  );
}
