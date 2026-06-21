import { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { ChevronLeft, Search as SearchIcon, X, Camera, Heart, Hash } from 'lucide-react';
import { useApi, useAuth, Av, FollowButton, Spinner, fmt, API, DominoVideo, AppUser, Challenge, RankingEntry } from '../lib/shared';

function VideoGridThumb({ v }: { v: DominoVideo }) {
  return (
    <Link href="/feed" className="relative block rounded-md overflow-hidden" style={{aspectRatio:'9/16',background:'#13131f',border:'1px solid #1e1e2a'}}>
      {v.videoUrl?(
        <video src={v.videoUrl} className="absolute inset-0 w-full h-full object-cover" muted playsInline preload="metadata"/>
      ):v.thumbnailUrl?(
        <img src={v.thumbnailUrl} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy"/>
      ):(
        <div className="absolute inset-0 flex items-center justify-center"><Camera size={18} className="text-gray-600"/></div>
      )}
      <div className="absolute inset-0" style={{background:'linear-gradient(to top,rgba(0,0,0,0.75) 0%,transparent 45%)'}}/>
      <div className="absolute bottom-1.5 left-1.5 flex items-center gap-1"><Heart size={10} className="text-white fill-white"/><span className="text-[10px] text-white font-bold">{fmt(v.likes?.length||0)}</span></div>
      {v.caption&&<div className="absolute bottom-1.5 right-1.5 left-7 text-[9px] text-gray-200 truncate text-right" style={{textShadow:'0 1px 2px rgba(0,0,0,0.8)'}}>{v.caption}</div>}
    </Link>
  );
}

// Pantalla de Búsqueda y Descubrimiento, estilo TikTok: sin escribir nada
// muestra hashtags y cuentas reales en tendencia; al escribir, busca de
// verdad en cuentas, videos (por leyenda o #hashtag) y retos — nada de
// resultados inventados.
export default function SearchPage() {
  const [, setLocation] = useLocation();
  const [input, setInput] = useState(() => new URLSearchParams(window.location.search).get('q') || '');
  const [query, setQuery] = useState(input);

  // Debounce: esperamos 350ms sin teclear antes de buscar de verdad
  useEffect(() => {
    const t = setTimeout(() => setQuery(input.trim()), 350);
    return () => clearTimeout(t);
  }, [input]);

  const hasQuery = query.length >= 2;
  const { data: results, loading } = useApi(hasQuery ? `/api/search?q=${encodeURIComponent(query)}` : '/api/search?q=_', [query, hasQuery]);
  const { data: topHashtags } = useApi('/api/search/hashtags/top?limit=12');
  const { data: suggested } = useApi('/api/ranking?limit=8');
  const { data: trending } = useApi('/api/videos/trending?limit=12');

  const users: AppUser[] = hasQuery && results?.users ? results.users : [];
  const videos: DominoVideo[] = hasQuery && results?.videos ? results.videos : [];
  const challenges: Challenge[] = hasQuery && results?.challenges ? results.challenges : [];
  const noResults = hasQuery && !loading && users.length===0 && videos.length===0 && challenges.length===0;

  return (
    <div className="min-h-screen" style={{paddingTop:'56px',background:'#0b0b12'}}>
      <div className="max-w-2xl mx-auto px-4 py-4">

        {/* Cabecera con buscador */}
        <div className="flex items-center gap-3 mb-5">
          <Link href="/feed" className="p-1.5 rounded-full flex-shrink-0" style={{background:'#13131f'}}><ChevronLeft size={18} className="text-white"/></Link>
          <div className="relative flex-1">
            <SearchIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"/>
            <input
              autoFocus
              value={input}
              onChange={e=>setInput(e.target.value)}
              placeholder="Buscar cuentas, #hashtags, retos..."
              className="w-full rounded-full pl-9 pr-9 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none"
              style={{background:'#13131f',border:'1px solid #2a2a3a'}}
            />
            {input&&<button onClick={()=>setInput('')} className="absolute right-3 top-1/2 -translate-y-1/2"><X size={15} className="text-gray-500"/></button>}
          </div>
        </div>

        {!hasQuery && (
          <div className="space-y-7">
            {/* Hashtags en tendencia */}
            {Array.isArray(topHashtags)&&topHashtags.length>0&&(
              <div>
                <h2 className="text-sm font-bold text-gray-400 mb-2.5">Hashtags en tendencia</h2>
                <div className="flex flex-wrap gap-2">
                  {topHashtags.map((h:{tag:string;count:number})=>(
                    <button key={h.tag} onClick={()=>setInput(`#${h.tag}`)} className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold text-white" style={{background:'#13131f',border:'1px solid #2a2a3a'}}>
                      <Hash size={11} style={{color:'#00F5FF'}}/>{h.tag}<span className="text-gray-500">· {fmt(h.count)}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Cuentas sugeridas (ranking real, no inventado) */}
            {Array.isArray(suggested)&&suggested.length>0&&(
              <div>
                <h2 className="text-sm font-bold text-gray-400 mb-2.5">Cuentas destacadas</h2>
                <div className="space-y-1">
                  {suggested.slice(0,6).map((u:RankingEntry)=>(
                    <div key={u._id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5">
                      <Link href={`/user/${u._id}`} className="flex items-center gap-3 flex-1 min-w-0">
                        <Av u={u} s={42}/>
                        <div className="min-w-0"><p className="text-sm font-bold text-white truncate">@{u.username}</p><p className="text-xs text-gray-500">{u.flag} {fmt(u.impactPoints)} pts de impacto</p></div>
                      </Link>
                      <FollowButton userId={u._id} initialIsFollowing={false} compact/>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Videos en tendencia */}
            <div>
              <h2 className="text-sm font-bold text-gray-400 mb-2.5">Videos en tendencia</h2>
              {!trending?(
                <div className="text-center py-8"><Spinner/></div>
              ):Array.isArray(trending)&&trending.length>0?(
                <div className="grid grid-cols-3 gap-1">{trending.map((v:DominoVideo)=><VideoGridThumb key={v._id} v={v}/>)}</div>
              ):(
                <p className="text-center text-gray-500 text-sm py-6">Todavía no hay suficientes videos para mostrar tendencias</p>
              )}
            </div>
          </div>
        )}

        {hasQuery && (
          <div className="space-y-7">
            {loading&&<div className="text-center py-10"><Spinner/></div>}

            {!loading&&noResults&&(
              <div className="text-center py-16 px-4">
                <div className="text-4xl mb-2">🔍</div>
                <p className="text-gray-400 text-sm">Sin resultados para "{query}"</p>
              </div>
            )}

            {!loading&&users.length>0&&(
              <div>
                <h2 className="text-sm font-bold text-gray-400 mb-2.5">Cuentas</h2>
                <div className="space-y-1">
                  {users.map(u=>(
                    <div key={u._id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5">
                      <Link href={`/user/${u._id}`} className="flex items-center gap-3 flex-1 min-w-0">
                        <Av u={u} s={42}/>
                        <div className="min-w-0"><p className="text-sm font-bold text-white truncate">@{u.username}</p>{(u.city||u.country)&&<p className="text-xs text-gray-500 truncate">{u.flag} {u.city}{u.city&&u.country?', ':''}{u.country}</p>}</div>
                      </Link>
                      <FollowButton userId={u._id} initialIsFollowing={!!u.isFollowing} compact/>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!loading&&challenges.length>0&&(
              <div>
                <h2 className="text-sm font-bold text-gray-400 mb-2.5">Retos</h2>
                <div className="space-y-2">
                  {challenges.map(c=>(
                    <div key={c._id} className="p-3.5 rounded-xl" style={{background:'#13131f',border:'1px solid #1e1e2a'}}>
                      <p className="text-sm font-bold text-white">⚡ {c.title}</p>
                      <p className="text-xs text-gray-400 mt-1">{c.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!loading&&videos.length>0&&(
              <div>
                <h2 className="text-sm font-bold text-gray-400 mb-2.5">Videos</h2>
                <div className="grid grid-cols-3 gap-1">{videos.map(v=><VideoGridThumb key={v._id} v={v}/>)}</div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
