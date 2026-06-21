import { Link, useLocation } from 'wouter';
import { Video, Eye } from 'lucide-react';
import { useApi, useAuth, Spinner, Av, LiveStream } from '../lib/shared';

export default function LiveListPage() {
  const { data: lives, loading } = useApi('/api/lives');
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const list=Array.isArray(lives)?lives:[];
  if(loading)return<div className="min-h-screen flex items-center justify-center" style={{paddingTop:'80px',background:'#0b0b12'}}><Spinner/></div>;
  return (
    <div className="min-h-screen" style={{paddingTop:'80px',background:'#0b0b12'}}>
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6"><div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full animate-pulse" style={{background:'#FF007F'}}/><h1 className="text-3xl font-black text-white" style={{fontFamily:'Syne,sans-serif'}}>En Directo</h1></div>{user&&<button onClick={()=>setLocation('/live/create')} className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-white text-sm" style={{background:'#FF007F'}}><Video size={16}/>Iniciar Live</button>}</div>
        {list.length===0?<div className="text-center py-20"><div className="text-6xl mb-4">📡</div><h3 className="text-xl font-bold text-white mb-2">Nadie en directo</h3><p className="text-gray-400 mb-6">¡Sé el primero!</p>{user&&<button onClick={()=>setLocation('/live/create')} className="px-6 py-3 rounded-xl font-bold text-white" style={{background:'#FF007F'}}>Empezar Live</button>}</div>:(
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {list.map((l:LiveStream)=>(
              <Link key={l._id} href={`/live/${l._id}`} className="relative rounded-xl overflow-hidden cursor-pointer" style={{aspectRatio:'9/16',background:'#13131f',border:'1px solid #1e1e2a'}}>
                <div className="absolute inset-0 flex items-center justify-center"><Av u={l.userId} s={80}/></div>
                <div className="absolute inset-0" style={{background:'linear-gradient(to top,rgba(0,0,0,0.85) 0%,transparent 60%)'}}/>
                <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold text-white" style={{background:'#FF007F'}}><div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"/>LIVE</div>
                {l.isBattle&&<div className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-xs font-bold text-white" style={{background:'#7c3aed'}}>VS</div>}
                <div className="absolute top-8 right-2 flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs text-white" style={{background:'rgba(0,0,0,0.6)'}}><Eye size={9}/>{l.viewerCount}</div>
                <div className="absolute bottom-3 left-3 right-3"><p className="text-white text-xs font-bold truncate">@{l.userId?.username}</p><p className="text-gray-300 text-xs truncate">{l.title}</p></div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
