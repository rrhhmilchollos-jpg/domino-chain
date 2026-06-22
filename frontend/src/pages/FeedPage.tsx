import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'wouter';
import { Camera, Heart, MessageCircle, Bookmark, Share, Search, Repeat2, Users2, Scissors, Volume2, VolumeX, Plus, Tv, ChevronRight, Music2, Eye, Radio } from 'lucide-react';
import { useApi, useAuth, CommentsPanel, Spinner, Av, cn, fmt, ago, API, DominoVideo, LiveStream, shareLink, Toast } from '../lib/shared';

type Tab = 'forYou' | 'following';
const shadow = { filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.6))' };

// Tarjeta de live que aparece mezclada en el feed — igual que TikTok
function LiveCard({ live }: { live: LiveStream }) {
  return (
    <div className="relative w-full snap-start flex-shrink-0" style={{height:'100dvh',background:'#000',paddingBottom:'56px',boxSizing:'border-box'}}>
      <Link href={`/live/${live._id}`} className="block w-full h-full">
        {/* Fondo con avatar grande */}
        <div className="absolute inset-0 flex items-center justify-center" style={{background:'linear-gradient(135deg,#1a0a2e,#0a1628)'}}>
          <div className="flex flex-col items-center gap-4">
            <div className="w-32 h-32 rounded-full overflow-hidden flex items-center justify-center" style={{background:'#7c3aed',border:'4px solid #FF007F',boxShadow:'0 0 40px rgba(255,0,127,0.4)'}}>
              {live.userId?.avatarUrl
                ? <img src={live.userId.avatarUrl} alt={live.userId.username} className="w-full h-full object-cover"/>
                : <span className="text-white font-black text-5xl">{live.userId?.username?.[0]?.toUpperCase()}</span>
              }
            </div>
            <div className="text-center px-6">
              <p className="text-white font-black text-xl mb-1">@{live.userId?.username}</p>
              <p className="text-gray-300 text-sm mb-4">{live.title}</p>
              <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full font-bold text-white" style={{background:'#FF007F',boxShadow:'0 0 20px rgba(255,0,127,0.5)'}}>
                <div className="w-2 h-2 rounded-full bg-white animate-pulse"/>
                UNIRSE AL DIRECTO
              </div>
            </div>
          </div>
        </div>

        {/* Badge LIVE arriba izquierda */}
        <div className="absolute top-14 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black text-white z-10" style={{background:'#FF007F'}}>
          <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"/>
          EN DIRECTO
        </div>

        {/* Espectadores arriba derecha */}
        <div className="absolute top-14 right-3 flex items-center gap-1 px-2.5 py-1 rounded-full text-xs text-white z-10" style={{background:'rgba(0,0,0,0.6)'}}>
          <Eye size={12}/>{live.viewerCount||0}
        </div>

        {/* Degradado bottom */}
        <div className="absolute inset-x-0 bottom-14 h-32 pointer-events-none" style={{background:'linear-gradient(to top,rgba(0,0,0,0.8),transparent)'}}/>

        {/* Info abajo */}
        <div className="absolute bottom-16 left-3 right-3 z-10">
          <p className="text-gray-400 text-xs">{live.userId?.flag} {live.userId?.city}</p>
        </div>
      </Link>

      {/* Columna acciones derecha */}
      <div className="absolute right-2.5 bottom-20 z-10 flex flex-col items-center gap-5">
        <Link href={`/user/${live.userId?._id}`}>
          <Av u={live.userId} s={46}/>
        </Link>
        <div className="flex flex-col items-center gap-1">
          <Radio size={30} style={shadow} className="text-white"/>
          <span className="text-xs text-white font-semibold" style={shadow}>Live</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <Eye size={30} style={shadow} className="text-white"/>
          <span className="text-xs text-white font-semibold" style={shadow}>{fmt(live.viewerCount||0)}</span>
        </div>
      </div>
    </div>
  );
}

export default function FeedPage() {
  const { user, token } = useAuth();
  const [, setLocation] = useLocation();
  const [tab, setTab] = useState<Tab>('forYou');
  const endpoint = tab==='forYou' ? '/api/videos/feed?limit=20' : (user ? '/api/videos/feed/following?limit=20' : null);
  const { data: videos, loading } = useApi(endpoint || '/api/videos/feed?limit=0', [tab, user?._id, endpoint]);
  const { data: lives } = useApi('/api/lives', []);
  const [liked, setLiked] = useState<Set<string>>(new Set());
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [followedAuthors, setFollowedAuthors] = useState<Set<string>>(new Set());
  const [commentId, setCommentId] = useState<string|null>(null);
  const [muted, setMuted] = useState(true);
  const videoRefs = useRef<(HTMLVideoElement|null)[]>([]);
  const [toast, setToast] = useState<string|null>(null);
  const [remixPickerId, setRemixPickerId] = useState<string|null>(null);

  const doLike = async (id:string) => { if(!token)return; setLiked(p=>{const n=new Set(p);n.has(id)?n.delete(id):n.add(id);return n;}); await fetch(`${API}/api/videos/${id}/like`,{method:'POST',headers:{Authorization:`Bearer ${token}`}}); };
  const doSave = async (id:string) => { if(!token)return; setSaved(p=>{const n=new Set(p);n.has(id)?n.delete(id):n.add(id);return n;}); await fetch(`${API}/api/videos/${id}/save`,{method:'POST',headers:{Authorization:`Bearer ${token}`}}); };

  const doShare = async (id:string) => {
    const url=`${window.location.origin}/video/${id}`;
    const result = await shareLink('DOMINO', url);
    if (result==='copied') { setToast('Enlace copiado'); setTimeout(()=>setToast(null),2000); }
    fetch(`${API}/api/videos/${id}/share`,{method:'POST'}).catch(()=>{});
  };

  const quickFollow = async (e: React.MouseEvent, authorId: string) => {
    e.preventDefault(); e.stopPropagation();
    if (!token) { setLocation('/auth'); return; }
    setFollowedAuthors(p=>new Set(p).add(authorId));
    try { await fetch(`${API}/api/users/${authorId}/follow`, { method:'POST', headers:{Authorization:`Bearer ${token}`} }); } catch {}
  };

  const viewTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const viewedThisSession = useRef<Set<string>>(new Set());

  useEffect(()=>{
    const obs=new IntersectionObserver(entries=>{entries.forEach(e=>{
      const v=e.target as HTMLVideoElement;
      const vid=v.dataset.videoId;
      if(e.isIntersecting){
        v.play().catch(()=>{});
        if(vid && !viewedThisSession.current.has(vid) && !viewTimers.current.has(vid)){
          const t=setTimeout(()=>{
            viewedThisSession.current.add(vid);
            viewTimers.current.delete(vid);
            fetch(`${API}/api/videos/${vid}/view`,{method:'POST',headers:token?{Authorization:`Bearer ${token}`}:{}}).catch(()=>{});
          },3000);
          viewTimers.current.set(vid,t);
        }
      }else{
        v.pause();v.currentTime=0;
        if(vid && viewTimers.current.has(vid)){clearTimeout(viewTimers.current.get(vid));viewTimers.current.delete(vid);}
      }
    });},{threshold:0.8});
    videoRefs.current.forEach(v=>{if(v)obs.observe(v);});
    return()=>{obs.disconnect();viewTimers.current.forEach(t=>clearTimeout(t));viewTimers.current.clear();};
  },[videos]);

  useEffect(()=>{
    const list = Array.isArray(videos)?videos:[];
    setSaved(new Set(list.filter((v:DominoVideo)=>v.isSaved).map((v:DominoVideo)=>v._id)));
  },[videos]);

  const videoList = tab==='following'&&!user ? [] : (Array.isArray(videos)?videos:[]);
  const liveList = Array.isArray(lives) ? lives : [];
  const showLoginPrompt = tab==='following' && !user;

  // Mezcla videos y lives: inserta un live cada 5 vídeos
  const feedItems: Array<{type:'video';data:DominoVideo}|{type:'live';data:LiveStream}> = [];
  let liveIdx = 0;
  // Insertar todos los lives primero al inicio del feed (posición 2),
  // igual que TikTok que muestra los lives activos muy arriba del feed.
  // Después de cada 4 vídeos, otro live si hay más.
  videoList.forEach((v:DominoVideo, i:number) => {
    // Insertar live después del 2º vídeo (posición prominente)
    if (i === 2 && liveIdx < liveList.length) {
      feedItems.push({type:'live', data:liveList[liveIdx]});
      liveIdx++;
    }
    feedItems.push({type:'video', data:v});
    // Después cada 4 vídeos, otro live
    if (i > 2 && (i - 2) % 4 === 0 && liveIdx < liveList.length) {
      feedItems.push({type:'live', data:liveList[liveIdx]});
      liveIdx++;
    }
  });
  // Si hay lives pero pocos vídeos, ponerlos al final igual
  while (liveIdx < liveList.length) {
    feedItems.push({type:'live', data:liveList[liveIdx]});
    liveIdx++;
  }

  return (
    <div className="fixed inset-0 overflow-y-scroll snap-y snap-mandatory" style={{background:'#000'}}>
      {commentId&&<CommentsPanel videoId={commentId} onClose={()=>setCommentId(null)}/>}
      <Toast message={toast}/>

      {/* Header igual que TikTok */}
      <div className="fixed top-0 left-0 right-0 z-30 flex items-center justify-between px-3 pt-3 pb-2.5" style={{background:'rgba(0,0,0,0.6)',backdropFilter:'blur(8px)'}}>
        <Link href="/live" className="flex flex-col items-center w-9 flex-shrink-0">
          <Tv size={20} className="text-white" strokeWidth={2.2}/>
          <span className="text-white font-black leading-none mt-0.5" style={{fontSize:'7px',letterSpacing:'0.5px'}}>LIVE</span>
        </Link>
        <div className="flex items-center justify-center gap-6 flex-1">
          <button onClick={()=>setTab('following')} className={cn('font-bold text-base pb-0.5 border-b-2',tab==='following'?'text-white border-white':'text-gray-400 border-transparent')}>Siguiendo</button>
          <button onClick={()=>setTab('forYou')} className={cn('font-bold text-base pb-0.5 border-b-2',tab==='forYou'?'text-white border-white':'text-gray-400 border-transparent')}>Para ti</button>
        </div>
        <Link href="/search" className="w-9 flex-shrink-0 flex justify-end"><Search size={22} className="text-white"/></Link>
      </div>

      {loading&&!showLoginPrompt&&<div className="h-screen flex items-center justify-center"><Spinner/></div>}

      {showLoginPrompt&&(
        <div className="h-screen flex flex-col items-center justify-center text-center px-4">
          <div className="text-6xl mb-4">👥</div>
          <h3 className="text-xl font-bold text-white mb-2">Inicia sesión para ver Siguiendo</h3>
          <p className="text-gray-400 text-sm mb-6">Aquí verás solo los videos de las cuentas que sigues.</p>
          <Link href="/auth" className="px-6 py-3 rounded-xl font-bold text-black" style={{background:'#00F5FF'}}>Entrar</Link>
        </div>
      )}

      {!loading&&!showLoginPrompt&&feedItems.map((item, idx) => {
        if (item.type === 'live') {
          return <LiveCard key={`live-${item.data._id}`} live={item.data}/>;
        }

        const v = item.data;
        const isAuthor = user?._id === v.userId?._id;
        const showFollowBadge = user && !isAuthor && !followedAuthors.has(v.userId?._id);
        const videoIdx = feedItems.slice(0, idx).filter(i=>i.type==='video').length;

        return (
          <div key={v._id} className="relative w-full snap-start flex-shrink-0 flex flex-col" style={{height:'100dvh',background:'#000',paddingBottom:'56px',boxSizing:'border-box'}}>
            <div className="relative flex-1 min-h-0 overflow-hidden bg-black">
              {v.videoUrl
                ? <video ref={el=>{videoRefs.current[videoIdx]=el;}} data-video-id={v._id} src={v.videoUrl} className="absolute inset-0 w-full h-full object-cover" loop playsInline muted={muted} onDoubleClick={()=>doLike(v._id)}/>
                : v.thumbnailUrl
                  ? <img src={v.thumbnailUrl} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy"/>
                  : <div className="absolute inset-0 flex items-center justify-center" style={{background:'#111'}}><Camera size={48} className="text-gray-600"/></div>
              }
              {v.videoUrl&&<button onClick={()=>setMuted(m=>!m)} className="absolute top-14 right-3 z-10 p-2 rounded-full" style={{background:'rgba(0,0,0,0.45)'}}>{muted?<VolumeX size={16} className="text-white"/>:<Volume2 size={16} className="text-white"/>}</button>}

              {/* Acciones derecha */}
              <div className="absolute right-2.5 bottom-3 z-10 flex flex-col items-center gap-4">
                {(() => {
                  const authorLive = liveList.find(l => l.userId?._id === v.userId?._id);
                  return (
                    <button onClick={()=>v.userId?._id&&setLocation(authorLive ? `/live/${authorLive._id}` : `/user/${v.userId._id}`)} className="relative mb-1">
                      {authorLive && (
                        <div className="absolute -top-5 left-1/2 -translate-x-1/2 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-black text-white z-10 whitespace-nowrap" style={{background:'#FF007F'}}>
                          <div className="w-1 h-1 rounded-full bg-white animate-pulse"/>LIVE
                        </div>
                      )}
                      <div className={authorLive ? 'ring-2 ring-[#FF007F] rounded-full' : ''}>
                        <Av u={v.userId} s={46}/>
                      </div>
                      {showFollowBadge&&!authorLive&&<button onClick={(e)=>quickFollow(e,v.userId._id)} className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full flex items-center justify-center" style={{background:'#FE2C55',border:'1.5px solid #000'}}><Plus size={12} className="text-white" strokeWidth={3.5}/></button>}
                    </button>
                  );
                })()}
                <button onClick={()=>doLike(v._id)} className="flex flex-col items-center gap-1">
                  <Heart size={32} style={shadow} className={liked.has(v._id)?'fill-red-500 text-red-500':'text-white'}/>
                  <span className="text-xs text-white font-semibold" style={shadow}>{fmt((v.likes?.length||0)+(liked.has(v._id)?1:0))}</span>
                </button>
                <button onClick={()=>setCommentId(v._id)} className="flex flex-col items-center gap-1">
                  <MessageCircle size={30} style={shadow} className="text-white"/>
                  <span className="text-xs text-white font-semibold" style={shadow}>{fmt(v.commentsCount||0)}</span>
                </button>
                <button onClick={()=>doSave(v._id)} className="flex flex-col items-center gap-1">
                  <Bookmark size={30} style={shadow} className={saved.has(v._id)?'fill-[#00F5FF] text-[#00F5FF]':'text-white'}/>
                  <span className="text-xs text-white font-semibold" style={shadow}>{fmt(Math.max(0,(v.savesCount||0)+(saved.has(v._id)?1:0)-(v.isSaved?1:0)))}</span>
                </button>
                <button onClick={()=>doShare(v._id)} className="flex flex-col items-center gap-1">
                  <Share size={30} style={shadow} className="text-white"/>
                  <span className="text-xs text-white font-semibold" style={shadow}>Compartir</span>
                </button>
                <div className="relative">
                  <button onClick={()=>setRemixPickerId(p=>p===v._id?null:v._id)} className="flex flex-col items-center gap-1">
                    <Repeat2 size={30} style={shadow} className="text-white"/>
                    <span className="text-xs text-white font-semibold" style={shadow}>Remix</span>
                  </button>
                  {remixPickerId===v._id&&(
                    <>
                      <div className="fixed inset-0 z-20" onClick={()=>setRemixPickerId(null)}/>
                      <div className="absolute z-30 rounded-xl overflow-hidden flex flex-col" style={{right:'42px',bottom:'0',background:'#13131f',border:'1px solid #2a2a3a',minWidth:'140px'}}>
                        <Link href={`/remix/${v._id}?mode=duet`} onClick={()=>setRemixPickerId(null)} className="px-4 py-3 text-sm text-white flex items-center gap-2 hover:bg-white/5"><Users2 size={15} style={{color:'#00F5FF'}}/>Dueto</Link>
                        <Link href={`/remix/${v._id}?mode=stitch`} onClick={()=>setRemixPickerId(null)} className="px-4 py-3 text-sm text-white flex items-center gap-2 hover:bg-white/5 border-t" style={{borderColor:'#2a2a3a'}}><Scissors size={15} style={{color:'#00F5FF'}}/>Stitch</Link>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Leyenda debajo del video */}
            <div className="flex-shrink-0 flex items-start justify-between gap-3 px-3.5 pt-2.5 pb-2" style={{background:'#000'}}>
              <button onClick={()=>v.userId?._id&&setLocation(`/user/${v.userId._id}`)} className="flex-1 min-w-0 text-left">
                <p className="text-white font-bold text-[15px] truncate">@{v.userId?.username}</p>
                {v.remixOf&&<div className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold" style={{background:'rgba(124,58,237,0.35)',border:'1px solid rgba(124,58,237,0.6)',color:'#c4b5fd'}}>{v.remixOf.type==='duet'?'🎭 Dueto':'✂️ Stitch'} con @{v.remixOf.authorUsername}</div>}
                {v.caption
                  ? <p className="text-gray-200 text-sm mt-1">{v.caption.split(/(\s+)/).map((part,i)=>part.startsWith('#')?<span key={i} onClick={(e)=>{e.preventDefault();e.stopPropagation();setLocation(`/search?q=${encodeURIComponent(part)}`);}} style={{color:'#3CC8FF'}}>{part}</span>:part)}</p>
                  : <p className="text-gray-400 text-sm mt-1">{v.userId?.flag} {v.userId?.city} · ⛓️ Cadena {v.chainDepth+1} · {ago(v.createdAt)}</p>
                }
                {v.sound&&<span onClick={(e)=>{e.preventDefault();e.stopPropagation();setLocation(`/camera?soundId=${v.sound!.id}`);}} className="flex items-center gap-1 mt-1"><Music2 size={11} className="text-gray-300 flex-shrink-0"/><span className="text-gray-300 text-xs truncate">{v.sound.title}</span></span>}
              </button>
              <button onClick={()=>v.userId?._id&&setLocation(`/user/${v.userId._id}`)}><Av u={v.userId} s={34}/></button>
            </div>

            {v.hashtags&&v.hashtags.length>0&&(
              <Link href={`/search?q=${encodeURIComponent('#'+v.hashtags[0])}`} className="flex-shrink-0 flex items-center gap-2 px-3.5 py-2.5" style={{background:'#121212',borderTop:'1px solid #1e1e1e'}}>
                <Search size={13} className="text-gray-400 flex-shrink-0"/>
                <span className="text-gray-300 text-xs font-medium truncate flex-1">Búsqueda · #{v.hashtags[0]}</span>
                <ChevronRight size={14} className="text-gray-500 flex-shrink-0"/>
              </Link>
            )}
          </div>
        );
      })}

      {!loading&&!showLoginPrompt&&videoList.length===0&&tab==='forYou'&&<div className="h-screen flex flex-col items-center justify-center text-center px-4"><div className="text-6xl mb-4">🎲</div><h3 className="text-xl font-bold text-white mb-2">Sin videos todavía</h3><p className="text-gray-400 text-sm mb-6">Sé el primero en grabar.</p><Link href="/camera" className="px-6 py-3 rounded-xl font-bold text-black" style={{background:'#00F5FF'}}>Grabar ahora</Link></div>}
      {!loading&&!showLoginPrompt&&videoList.length===0&&tab==='following'&&<div className="h-screen flex flex-col items-center justify-center text-center px-4"><div className="text-6xl mb-4">🔍</div><h3 className="text-xl font-bold text-white mb-2">Aún no sigues a nadie</h3><p className="text-gray-400 text-sm mb-6">Explora "Para ti" y dale a Seguir.</p><button onClick={()=>setTab('forYou')} className="px-6 py-3 rounded-xl font-bold text-black" style={{background:'#00F5FF'}}>Explorar Para ti</button></div>}
    </div>
  );
}
