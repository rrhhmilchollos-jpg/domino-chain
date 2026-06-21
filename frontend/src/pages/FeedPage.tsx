import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'wouter';
import { Camera, Heart, MessageCircle, Bookmark, Share, Search, Repeat2, Users2, Scissors, Volume2, VolumeX, Plus, Tv, ChevronRight } from 'lucide-react';
import { useApi, useAuth, CommentsPanel, Spinner, Av, cn, fmt, ago, API, DominoVideo, shareLink, Toast } from '../lib/shared';

type Tab = 'forYou' | 'following';
const shadow = { filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.6))' };

export default function FeedPage() {
  const { user, token } = useAuth();
  const [, setLocation] = useLocation();
  const [tab, setTab] = useState<Tab>('forYou');
  // Pestaña "Siguiendo" solo pide al backend si hay sesión — si no, ni lo
  // intentamos (evita un 401 inútil y dejamos claro que hace falta cuenta).
  const endpoint = tab==='forYou' ? '/api/videos/feed?limit=20' : (user ? '/api/videos/feed/following?limit=20' : null);
  const { data: videos, loading } = useApi(endpoint || '/api/videos/feed?limit=0', [tab, user?._id, endpoint]);
  const [liked, setLiked] = useState<Set<string>>(new Set());
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [followedAuthors, setFollowedAuthors] = useState<Set<string>>(new Set());
  const [commentId, setCommentId] = useState<string|null>(null);
  const [muted, setMuted] = useState(true);
  const videoRefs = useRef<(HTMLVideoElement|null)[]>([]);
  const doLike = async (id:string) => { if(!token)return; setLiked(p=>{const n=new Set(p);n.has(id)?n.delete(id):n.add(id);return n;}); await fetch(`${API}/api/videos/${id}/like`,{method:'POST',headers:{Authorization:`Bearer ${token}`}}); };
  // Guardar/quitar de guardados — el backend ya nos dice qué está guardado
  // de verdad (isSaved), así que partimos de ese estado real, no de vacío.
  const doSave = async (id:string) => { if(!token)return; setSaved(p=>{const n=new Set(p);n.has(id)?n.delete(id):n.add(id);return n;}); await fetch(`${API}/api/videos/${id}/save`,{method:'POST',headers:{Authorization:`Bearer ${token}`}}); };
  const [toast, setToast] = useState<string|null>(null);
  const [remixPickerId, setRemixPickerId] = useState<string|null>(null);
  const doShare = async (id:string) => {
    const url=`${window.location.origin}/video/${id}`;
    const result = await shareLink('DOMINO', url);
    if (result==='copied') { setToast('Enlace copiado'); setTimeout(()=>setToast(null),2000); }
  };
  // Seguir rápido desde el avatar (el "+" rojo de TikTok) — cuenta real, va
  // directo a la API de seguir, igual que el botón Seguir del perfil.
  const quickFollow = async (e: React.MouseEvent, authorId: string) => {
    e.preventDefault(); e.stopPropagation();
    if (!token) { setLocation('/auth'); return; }
    setFollowedAuthors(p=>new Set(p).add(authorId));
    try { await fetch(`${API}/api/users/${authorId}/follow`, { method:'POST', headers:{Authorization:`Bearer ${token}`} }); } catch {}
  };
  useEffect(()=>{
    const obs=new IntersectionObserver(entries=>{entries.forEach(e=>{const v=e.target as HTMLVideoElement;if(e.isIntersecting)v.play().catch(()=>{});else{v.pause();v.currentTime=0;}});},{threshold:0.8});
    videoRefs.current.forEach(v=>{if(v)obs.observe(v);});
    return()=>obs.disconnect();
  },[videos]);
  // Sincroniza el estado real de "guardado" que viene del servidor cada vez
  // que cambia la lista (cambio de pestaña, recarga...).
  useEffect(()=>{
    const list = Array.isArray(videos)?videos:[];
    setSaved(new Set(list.filter((v:DominoVideo)=>v.isSaved).map((v:DominoVideo)=>v._id)));
  },[videos]);

  const list = tab==='following'&&!user ? [] : (Array.isArray(videos)?videos:[]);
  const showLoginPrompt = tab==='following' && !user;

  return (
    <div className="fixed inset-0 overflow-y-scroll snap-y snap-mandatory" style={{background:'#000'}}>
      {commentId&&<CommentsPanel videoId={commentId} onClose={()=>setCommentId(null)}/>}
      <Toast message={toast}/>

      {/* Cabecera idéntica a TikTok: icono EN VIVO a la izquierda, pestañas
          centradas, lupa a la derecha — fondo negro sólido, no degradado. */}
      <div className="fixed top-0 left-0 right-0 z-30 flex items-center justify-between px-3 pt-3 pb-2.5" style={{background:'#000'}}>
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
          <p className="text-gray-400 text-sm mb-6">Aquí verás solo los videos de las cuentas reales que sigues.</p>
          <Link href="/auth" className="px-6 py-3 rounded-xl font-bold text-black" style={{background:'#00F5FF'}}>Entrar</Link>
        </div>
      )}

      {!loading&&!showLoginPrompt&&list.map((v:DominoVideo,idx:number)=>{
        const isAuthor = user?._id === v.userId?._id;
        const showFollowBadge = user && !isAuthor && !followedAuthors.has(v.userId?._id);
        return (
        <div key={v._id} className="relative w-full snap-start flex-shrink-0 flex flex-col" style={{height:'100dvh',background:'#000',paddingBottom:'56px',boxSizing:'border-box'}}>

          {/* Video — ya no ocupa toda la pantalla: deja sitio abajo para la barra negra de leyenda, igual que TikTok ahora mismo */}
          <div className="relative flex-1 min-h-0 overflow-hidden bg-black">
            {v.videoUrl?<video ref={el=>{videoRefs.current[idx]=el;}} src={v.videoUrl} className="absolute inset-0 w-full h-full object-cover" loop playsInline muted={muted} onDoubleClick={()=>doLike(v._id)}/>:v.thumbnailUrl?<img src={v.thumbnailUrl} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy"/>:<div className="absolute inset-0 flex items-center justify-center" style={{background:'#111'}}><Camera size={48} className="text-gray-600"/></div>}
            {v.videoUrl&&<button onClick={()=>setMuted(m=>!m)} className="absolute top-3 right-3 z-10 p-2 rounded-full" style={{background:'rgba(0,0,0,0.45)'}}>{muted?<VolumeX size={16} className="text-white"/>:<Volume2 size={16} className="text-white"/>}</button>}

            {/* Columna de acciones — iconos sueltos sin círculo de fondo, igual que TikTok. Avatar arriba con "+" rojo para seguir rápido. */}
            <div className="absolute right-2.5 bottom-3 z-10 flex flex-col items-center gap-4">
              <Link href={`/user/${v.userId?._id}`} className="relative mb-1">
                <Av u={v.userId} s={46}/>
                {showFollowBadge&&<button onClick={(e)=>quickFollow(e,v.userId._id)} className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full flex items-center justify-center" style={{background:'#FE2C55',border:'1.5px solid #000'}}><Plus size={12} className="text-white" strokeWidth={3.5}/></button>}
              </Link>
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

          {/* Barra de leyenda — negro sólido, debajo del video (no flotando encima), igual que TikTok */}
          <div className="flex-shrink-0 flex items-start justify-between gap-3 px-3.5 pt-2.5 pb-2" style={{background:'#000'}}>
            <Link href={`/user/${v.userId?._id}`} className="flex-1 min-w-0">
              <p className="text-white font-bold text-[15px] truncate">@{v.userId?.username}</p>
              {v.remixOf&&<div className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold" style={{background:'rgba(124,58,237,0.35)',border:'1px solid rgba(124,58,237,0.6)',color:'#c4b5fd'}}>{v.remixOf.type==='duet'?'🎭 Dueto':'✂️ Stitch'} con @{v.remixOf.authorUsername}</div>}
              {v.caption?(
                <p className="text-gray-200 text-sm mt-1">{v.caption.split(/(\s+)/).map((part,i)=>part.startsWith('#')?<span key={i} onClick={(e)=>{e.preventDefault();e.stopPropagation();setLocation(`/search?q=${encodeURIComponent(part)}`);}} style={{color:'#3CC8FF'}}>{part}</span>:part)}</p>
              ):(
                <p className="text-gray-400 text-sm mt-1">{v.userId?.flag} {v.userId?.city} · ⛓️ Cadena {v.chainDepth+1} · {ago(v.createdAt)}</p>
              )}
            </Link>
            <Av u={v.userId} s={34}/>
          </div>

          {/* Sugerencia de búsqueda relacionada — solo si el video tiene hashtags reales, como en TikTok */}
          {v.hashtags&&v.hashtags.length>0&&(
            <Link href={`/search?q=${encodeURIComponent('#'+v.hashtags[0])}`} className="flex-shrink-0 flex items-center gap-2 px-3.5 py-2.5" style={{background:'#121212',borderTop:'1px solid #1e1e1e'}}>
              <Search size={13} className="text-gray-400 flex-shrink-0"/>
              <span className="text-gray-300 text-xs font-medium truncate flex-1">Búsqueda · #{v.hashtags[0]}</span>
              <ChevronRight size={14} className="text-gray-500 flex-shrink-0"/>
            </Link>
          )}
        </div>
      );})}

      {!loading&&!showLoginPrompt&&list.length===0&&tab==='forYou'&&<div className="h-screen flex flex-col items-center justify-center text-center px-4"><div className="text-6xl mb-4">🎲</div><h3 className="text-xl font-bold text-white mb-2">Sin videos todavía</h3><p className="text-gray-400 text-sm mb-6">Sé el primero en grabar.</p><Link href="/camera" className="px-6 py-3 rounded-xl font-bold text-black" style={{background:'#00F5FF'}}>Grabar ahora</Link></div>}
      {!loading&&!showLoginPrompt&&list.length===0&&tab==='following'&&<div className="h-screen flex flex-col items-center justify-center text-center px-4"><div className="text-6xl mb-4">🔍</div><h3 className="text-xl font-bold text-white mb-2">Aún no sigues a nadie</h3><p className="text-gray-400 text-sm mb-6">Explora "Para ti" y dale a Seguir en los perfiles que te gusten.</p><button onClick={()=>setTab('forYou')} className="px-6 py-3 rounded-xl font-bold text-black" style={{background:'#00F5FF'}}>Explorar Para ti</button></div>}
    </div>
  );
}
