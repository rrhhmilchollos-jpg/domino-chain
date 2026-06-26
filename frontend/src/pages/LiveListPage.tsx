import { Link, useLocation } from 'wouter';
import { Video, Eye } from 'lucide-react';
import { useApi, useAuth, Spinner, Av, LiveStream } from '../lib/shared';

export default function LiveListPage() {
  const { data: lives, loading } = useApi('/api/lives');
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const list = Array.isArray(lives) ? lives : [];

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{paddingTop:'80px',background:'#0b0b12'}}>
      <Spinner/>
    </div>
  );

  return (
    <div className="min-h-screen" style={{paddingTop:'80px',background:'#0b0b12'}}>
      <style>{`
        @keyframes liveCardZoom {
          0%,100%{transform:scale(1.05) translate(0,0)}
          33%{transform:scale(1.09) translate(-1.5%,-1%)}
          66%{transform:scale(1.07) translate(1%,0.5%)}
        }
        @keyframes particleFloatMini {
          0%{transform:translateY(100%) scale(0);opacity:0}
          15%{opacity:1}
          85%{opacity:0.6}
          100%{transform:translateY(-30px) scale(1);opacity:0}
        }
        @keyframes liveCardVignette {
          0%,100%{box-shadow:inset 0 0 30px rgba(255,0,127,0.1)}
          50%{box-shadow:inset 0 0 40px rgba(255,0,127,0.2)}
        }
      `}</style>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full animate-pulse" style={{background:'#FF007F'}}/>
            <h1 className="text-3xl font-black text-white" style={{fontFamily:'Syne,sans-serif'}}>En Directo</h1>
          </div>
          {user && (
            <button onClick={()=>setLocation('/live/create')} className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-white text-sm" style={{background:'#FF007F'}}>
              <Video size={16}/>Iniciar Live
            </button>
          )}
        </div>

        {list.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">📡</div>
            <h3 className="text-xl font-bold text-white mb-2">Nadie en directo</h3>
            <p className="text-gray-400 mb-6">¡Sé el primero!</p>
            {user && (
              <button onClick={()=>setLocation('/live/create')} className="px-6 py-3 rounded-xl font-bold text-white" style={{background:'#FF007F'}}>
                Empezar Live
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {list.map((l: LiveStream) => (
              <Link
                key={l._id}
                href={`/live/${l._id}`}
                className="relative rounded-xl overflow-hidden cursor-pointer"
                style={{
                  aspectRatio:'9/16',
                  background:'#0a0a1a',
                  border:`1px solid ${l.userId?.isBot ? 'rgba(0,245,255,0.3)' : 'rgba(255,0,127,0.2)'}`,
                  animation: 'liveCardVignette 3s ease-in-out infinite',
                }}
              >
                {/* Fondo del avatar */}
                {l.userId?.isBot && l.userId?.avatarUrl ? (
                  <>
                    {/* Fondo degradado cyberpunk */}
                    <div className="absolute inset-0" style={{background:'linear-gradient(180deg,#0a0a1a 0%,#1a0a2e 50%,#0d0d1d 100%)'}}/>
                    {/* Avatar animado */}
                    <img
                      src={l.userId.avatarUrl}
                      alt={l.userId.username}
                      className="absolute inset-0 w-full h-full object-cover object-top"
                      style={{
                        filter:'brightness(0.85) contrast(1.12) saturate(1.25)',
                        animation:'liveCardZoom 10s ease-in-out infinite',
                        transformOrigin:'center 25%',
                      }}
                    />
                    {/* Partículas flotantes */}
                    <div className="absolute inset-0 pointer-events-none overflow-hidden">
                      {[0,1,2,3].map(i=>(
                        <div key={i} className="absolute rounded-full" style={{
                          width: `${3+i}px`,
                          height: `${3+i}px`,
                          background: i===0?'rgba(0,245,255,0.7)':i===1?'rgba(255,0,127,0.5)':i===2?'rgba(124,58,237,0.5)':'rgba(0,245,255,0.4)',
                          left: `${15+i*22}%`,
                          animation: `particleFloatMini ${2.5+i*0.7}s ease-in-out ${i*0.6}s infinite`,
                        }}/>
                      ))}
                    </div>
                    {/* Badge BOT IA */}
                    <div className="absolute top-8 left-1/2 -translate-x-1/2 flex items-center gap-1 px-2 py-0.5 rounded-full" style={{background:'rgba(0,0,0,0.75)',border:'1px solid rgba(0,245,255,0.6)'}}>
                      <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{background:'#00F5FF'}}/>
                      <span className="text-[9px] font-black tracking-wide" style={{color:'#00F5FF'}}>🤖 BOT IA</span>
                    </div>
                    {/* Ondas de audio mini */}
                    <div className="absolute pointer-events-none" style={{top:'50%',left:'50%',transform:'translate(-50%,-50%)',display:'flex',alignItems:'flex-end',gap:'2px',height:'20px',opacity:0.6}}>
                      {[0,1,2,3,4,5].map(i=>(
                        <div key={i} className="rounded-full" style={{
                          width:'2px',
                          background:'rgba(0,245,255,0.8)',
                          animation:`audioWave${(i%4)+1} ${0.4+i*0.08}s ease-in-out infinite alternate`,
                          animationDelay:`${i*0.07}s`,
                        }}/>
                      ))}
                    </div>
                    <style>{`
                      @keyframes audioWave1{0%{height:3px}100%{height:12px}}
                      @keyframes audioWave2{0%{height:5px}100%{height:18px}}
                      @keyframes audioWave3{0%{height:2px}100%{height:10px}}
                      @keyframes audioWave4{0%{height:6px}100%{height:15px}}
                    `}</style>
                  </>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center" style={{background:'#1a1a2e'}}>
                    <Av u={l.userId} s={80}/>
                  </div>
                )}

                {/* Overlay degradado inferior */}
                <div className="absolute inset-0" style={{background:'linear-gradient(to top,rgba(0,0,0,0.88) 0%,rgba(0,0,0,0.15) 40%,transparent 70%)'}}/>

                {/* Badge LIVE */}
                <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold text-white" style={{background:'#FF007F'}}>
                  <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"/>LIVE
                </div>

                {/* Badge batalla */}
                {l.isBattle && (
                  <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-xs font-bold text-white" style={{background:'#7c3aed'}}>VS ⚔️</div>
                )}

                {/* Viewers */}
                {!l.isBattle && (
                  <div className="absolute top-8 right-2 flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs text-white" style={{background:'rgba(0,0,0,0.65)'}}>
                    <Eye size={9}/>{l.viewerCount}
                  </div>
                )}

                {/* Info inferior */}
                <div className="absolute bottom-3 left-3 right-3">
                  <p className="text-white text-xs font-bold truncate">@{l.userId?.username}</p>
                  <p className="text-gray-300 text-xs truncate">{l.title}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
