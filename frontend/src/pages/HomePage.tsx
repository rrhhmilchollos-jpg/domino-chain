import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { Play, Video, Camera, Globe, Users, Clock, Eye } from 'lucide-react';
import { useApi, DominoLogo, Av, fmt, left, RankingEntry, LiveStream } from '../lib/shared';

export default function HomePage() {
  const { data: challenge } = useApi('/api/challenges/active');
  const { data: ranking } = useApi('/api/ranking?limit=5');
  const { data: lives } = useApi('/api/lives');
  const [counter, setCounter] = useState(14782);
  useEffect(()=>{if(challenge?.globalCounter)setCounter(challenge.globalCounter);},[challenge]);
  useEffect(()=>{const t=setInterval(()=>setCounter(c=>c+Math.floor(Math.random()*3)),2500);return()=>clearInterval(t);},[]);
  return (
    <div>
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0"><img src="https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200&h=900&fit=crop&auto=format&q=60" alt="" className="w-full h-full object-cover opacity-20"/><div className="absolute inset-0" style={{background:'radial-gradient(ellipse at center,rgba(0,245,255,0.05) 0%,rgba(11,11,18,0.9) 70%)'}}/></div>
        <div className="relative z-10 max-w-4xl mx-auto px-4 text-center">
          <div className="flex justify-center mb-6"><DominoLogo size={48}/></div>
          <h1 className="text-5xl sm:text-7xl font-black mb-4" style={{fontFamily:'Syne,sans-serif'}}><span style={{background:'linear-gradient(135deg,#00F5FF,#FF007F)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>DOMINO</span></h1>
          <p className="text-xl text-gray-300 mb-2 font-medium">The Real-World Chain Reaction</p>
          <p className="text-base text-gray-400 mb-8 max-w-xl mx-auto">Graba retos de 15s. Nomina 3 personas. Haz lives. Envía regalos. El efecto dominó global.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center flex-wrap">
            <Link href="/feed" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-black" style={{background:'linear-gradient(135deg,#00F5FF,#7c3aed)',boxShadow:'0 0 20px rgba(0,245,255,0.3)'}}><Play size={18}/>Ver Feed</Link>
            <Link href="/live" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white border" style={{borderColor:'#FF007F',boxShadow:'0 0 16px rgba(255,0,127,0.3)'}}><Video size={18}/>En Vivo</Link>
            <Link href="/camera" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white border border-gray-700"><Camera size={18}/>Grabar Reto</Link>
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
                <div key={e._id} className="flex items-center gap-3 p-3 border-b last:border-0 hover:bg-white/5" style={{borderColor:'#1e1e2a'}}>
                  <span className="w-7 text-center text-sm font-bold">{i<3?['🥇','🥈','🥉'][i]:<span className="text-gray-500">#{i+1}</span>}</span>
                  <Av u={e} s={36}/>
                  <div className="flex-1 min-w-0"><div className="text-sm font-semibold text-white truncate">{e.username} {e.flag}</div><div className="text-xs text-gray-500">{e.country}</div></div>
                  <div className="text-right"><div className="text-sm font-bold" style={{color:'#00F5FF'}}>{fmt(e.impactPoints)}</div><div className="text-xs text-gray-500">{e.currentStreak}d</div></div>
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
