import { useState } from 'react';
import { Link } from 'wouter';
import { Zap, Bell, ChevronRight, Camera, Heart, Bookmark, Grid3x3, Settings, Share2 } from 'lucide-react';
import { cn, useAuth, useApi, Av, Spinner, fmt, ago, API, RankingEntry, Notification, DominoVideo, VisibilityToggle } from '../lib/shared';

type Tab = 'videos' | 'liked' | 'saved';

function VideoThumb({ v, isOwner }: { v: DominoVideo; isOwner?: boolean }) {
  const [isPublic, setIsPublic] = useState(v.isPublic !== false); // default true si viene undefined (videos antiguos)
  return (
    <Link href={`/feed`} className="relative block rounded-md overflow-hidden" style={{aspectRatio:'9/16',background:'#13131f',border:'1px solid #1e1e2a'}}>
      {v.videoUrl?(
        <video src={v.videoUrl} className="absolute inset-0 w-full h-full object-cover" muted playsInline preload="metadata"/>
      ):v.thumbnailUrl?(
        <img src={v.thumbnailUrl} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy"/>
      ):(
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-center px-2">
          <Camera size={18} className="text-gray-600"/>
          {isOwner && <span className="text-[9px] text-gray-500 leading-tight">Sin archivo — vuelve a publicarlo</span>}
        </div>
      )}
      <div className="absolute inset-0" style={{background:'linear-gradient(to top,rgba(0,0,0,0.75) 0%,transparent 45%)'}}/>
      {/* Toggle público/privado — solo visible y editable en tus propios videos, igual que TikTok */}
      {isOwner && <VisibilityToggle videoId={v._id} initialIsPublic={isPublic} onChanged={setIsPublic}/>}
      <div className="absolute bottom-1.5 left-1.5 flex items-center gap-1"><Heart size={10} className="text-white fill-white"/><span className="text-[10px] text-white font-bold">{fmt(v.likes?.length||0)}</span></div>
      <div className="absolute top-1.5 right-1.5 text-[9px] text-gray-300" style={{textShadow:'0 1px 2px rgba(0,0,0,0.8)'}}>{ago(v.createdAt)}</div>
    </Link>
  );
}

export default function DashboardPage() {
  const { user, token } = useAuth();
  const [tab, setTab] = useState<Tab>('videos');
  const { data: ranking } = useApi('/api/ranking');
  const { data: notifs, setData: setNotifs } = useApi('/api/notifications', [user?._id]);
  const { data: myVideos } = useApi(user?._id ? `/api/videos/user/${user._id}` : '/api/videos/user/_', [user?._id]);
  const { data: likedVideos } = useApi(user?._id ? `/api/videos/liked/${user._id}` : '/api/videos/liked/_', [user?._id]);
  const { data: savedVideos } = useApi(user?._id ? `/api/videos/saved/${user._id}` : '/api/videos/saved/_', [user?._id]);
  const { data: meFull } = useApi(user?._id ? '/api/users/me' : '/api/users/_', [user?._id]);
  const markRead=async(id:string)=>{if(!token)return;await fetch(`${API}/api/notifications/${id}/read`,{method:'PUT',headers:{Authorization:`Bearer ${token}`}});setNotifs((p:Notification[])=>Array.isArray(p)?p.map(n=>n._id===id?{...n,read:true}:n):p);};
  const unread=Array.isArray(notifs)?notifs.filter((n:Notification)=>!n.read).length:0;
  const totalLikesReceived = Array.isArray(myVideos)?myVideos.reduce((s:number,v:DominoVideo)=>s+(v.likes?.length||0),0):0;

  if(!user)return<div className="min-h-screen flex items-center justify-center" style={{paddingTop:'80px',background:'#0b0b12'}}><div className="text-center"><p className="text-gray-400 mb-4">Inicia sesión</p><Link href="/auth" className="px-6 py-3 rounded-xl font-bold text-black" style={{background:'#00F5FF'}}>Entrar</Link></div></div>;

  const activeList: DominoVideo[] = tab==='videos' ? (Array.isArray(myVideos)?myVideos:[]) : tab==='liked' ? (Array.isArray(likedVideos)?likedVideos:[]) : (Array.isArray(savedVideos)?savedVideos:[]);
  const activeLoading = tab==='videos' ? !myVideos : tab==='liked' ? !likedVideos : !savedVideos;

  return(
    <div className="min-h-screen" style={{paddingTop:'80px',background:'#0b0b12'}}>
      <div className="max-w-3xl mx-auto px-4 py-6">

        {/* ===== Cabecera de perfil (estilo TikTok) ===== */}
        <div className="flex flex-col items-center text-center mb-5">
          <Av u={user} s={88}/>
          <h1 className="text-xl font-black text-white mt-3" style={{fontFamily:'Syne,sans-serif'}}>@{user.username}</h1>
          {(user.city||user.country)&&<p className="text-gray-500 text-xs mt-0.5">{user.flag} {user.city}{user.city&&user.country?', ':''}{user.country}</p>}
          {user.bio&&<p className="text-gray-300 text-sm mt-2 max-w-sm">{user.bio}</p>}

          {/* Stats estilo TikTok: Seguidores / Siguiendo / Me gusta -> + métricas propias de DOMINO */}
          <div className="flex items-center gap-6 mt-4 flex-wrap justify-center">
            <Link href={`/user/${user._id}/followers`} className="text-center"><div className="text-lg font-black text-white">{fmt(meFull?.followersCount||0)}</div><div className="text-xs text-gray-500">Seguidores</div></Link>
            <Link href={`/user/${user._id}/following`} className="text-center"><div className="text-lg font-black text-white">{fmt(meFull?.followingCount||0)}</div><div className="text-xs text-gray-500">Siguiendo</div></Link>
            <div className="text-center"><div className="text-lg font-black text-white">{Array.isArray(myVideos)?myVideos.length:'—'}</div><div className="text-xs text-gray-500">Cadenas</div></div>
            <div className="text-center"><div className="text-lg font-black text-white">{fmt(totalLikesReceived)}</div><div className="text-xs text-gray-500">Me gusta</div></div>
            <div className="text-center"><div className="text-lg font-black text-white">{user.currentStreak}d</div><div className="text-xs text-gray-500">Racha</div></div>
            <div className="text-center"><div className="text-lg font-black text-white">{fmt(user.impactPoints)}</div><div className="text-xs text-gray-500">Impacto</div></div>
          </div>

          <div className="flex items-center gap-2 mt-4">
            <Link href="/camera" className="px-5 py-2 rounded-lg font-bold text-black text-sm flex items-center gap-1.5" style={{background:'linear-gradient(135deg,#00F5FF,#7c3aed)'}}><Camera size={14}/>Grabar</Link>
            <button onClick={()=>{if(navigator.share)navigator.share({title:'DOMINO',url:`${window.location.origin}/dashboard`});else navigator.clipboard?.writeText(window.location.href);}} className="p-2.5 rounded-lg border" style={{borderColor:'#2a2a3a'}}><Share2 size={16} className="text-gray-300"/></button>
            <button className="p-2.5 rounded-lg border" style={{borderColor:'#2a2a3a'}}><Settings size={16} className="text-gray-300"/></button>
          </div>
        </div>

        {/* ===== Pestañas Videos / Me Gusta (estilo TikTok) ===== */}
        <div className="flex border-t border-b" style={{borderColor:'#1e1e2a'}}>
          <button onClick={()=>setTab('videos')} className={cn('flex-1 py-3 flex items-center justify-center gap-1.5 text-sm font-semibold border-b-2 -mb-px transition-colors',tab==='videos'?'text-white':'text-gray-500 border-transparent')} style={tab==='videos'?{borderColor:'#00F5FF'}:{}}>
            <Grid3x3 size={16}/>Mis Videos
          </button>
          <button onClick={()=>setTab('liked')} className={cn('flex-1 py-3 flex items-center justify-center gap-1.5 text-sm font-semibold border-b-2 -mb-px transition-colors',tab==='liked'?'text-white':'text-gray-500 border-transparent')} style={tab==='liked'?{borderColor:'#00F5FF'}:{}}>
            <Heart size={16}/>Me Gusta
          </button>
          <button onClick={()=>setTab('saved')} className={cn('flex-1 py-3 flex items-center justify-center gap-1.5 text-sm font-semibold border-b-2 -mb-px transition-colors',tab==='saved'?'text-white':'text-gray-500 border-transparent')} style={tab==='saved'?{borderColor:'#00F5FF'}:{}}>
            <Bookmark size={16}/>Guardados
          </button>
        </div>

        {/* ===== Grid de videos (3 columnas, estilo TikTok) ===== */}
        <div className="py-4">
          {activeLoading?(
            <div className="text-center py-10"><Spinner/></div>
          ):activeList.length===0?(
            <div className="text-center py-12 px-4">
              <div className="text-4xl mb-2">{tab==='videos'?'🎲':tab==='liked'?'❤️':'🔖'}</div>
              <p className="text-gray-400 text-sm mb-4">{tab==='videos'?'Todavía no has publicado ningún dominó':tab==='liked'?'Todavía no le has dado me gusta a ningún video':'Todavía no has guardado ningún video'}</p>
              <Link href={tab==='videos'?'/camera':'/feed'} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-black text-sm" style={{background:'linear-gradient(135deg,#00F5FF,#7c3aed)'}}>{tab==='videos'?<><Camera size={16}/>Grabar mi primer reto</>:<>Explorar feed</>}</Link>
            </div>
          ):(
            <div className="grid grid-cols-3 gap-1">
              {activeList.map((v:DominoVideo)=><VideoThumb key={v._id} v={v} isOwner={tab==='videos'}/>)}
            </div>
          )}
        </div>

        {/* ===== Secciones adicionales: Ranking global y Notificaciones ===== */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-8 pt-6 border-t" style={{borderColor:'#1e1e2a'}}>
          <div className="rounded-2xl p-5 border" style={{background:'#13131f',borderColor:'#1e1e2a'}}>
            <h2 className="font-bold text-white mb-4 flex items-center gap-2"><Zap size={16} style={{color:'#00F5FF'}}/>Ranking Global</h2>
            <div className="space-y-1">{(Array.isArray(ranking)?ranking:[]).slice(0,5).map((e:RankingEntry,i:number)=><div key={e._id} className={cn('flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/5',e._id===user._id&&'border border-[#00F5FF]/30 bg-[#00F5FF]/5')}><span className="w-6 text-center text-sm font-bold">{i<3?['🥇','🥈','🥉'][i]:<span className="text-gray-500">#{i+1}</span>}</span><Av u={e} s={32}/><div className="flex-1 min-w-0"><div className={cn('text-sm font-semibold truncate',e._id===user._id?'text-[#00F5FF]':'text-white')}>{e.username} {e.flag}</div></div><div className="text-sm font-bold" style={{color:'#00F5FF'}}>{fmt(e.impactPoints)}</div></div>)}{!ranking&&<div className="text-center py-6"><Spinner/></div>}</div>
          </div>
          <div className="rounded-2xl p-5 border" style={{background:'#13131f',borderColor:'#1e1e2a'}}>
            <div className="flex items-center justify-between mb-4"><h2 className="font-bold text-white flex items-center gap-2"><Bell size={16}/>Notificaciones</h2>{unread>0&&<span className="text-xs font-bold px-2 py-0.5 rounded-full text-black" style={{background:'#FF007F'}}>{unread}</span>}</div>
            <div className="space-y-2 max-h-72 overflow-y-auto">{(Array.isArray(notifs)?notifs:[]).slice(0,8).map((n:Notification)=><div key={n._id} onClick={()=>markRead(n._id)} className={cn('flex gap-3 p-2.5 rounded-xl cursor-pointer hover:bg-white/5',!n.read&&'bg-[#00F5FF]/5 border border-[#00F5FF]/20')}><span className="text-lg">{n.type==='nomination'?'🎯':n.type==='chain_continued'?'⛓️':n.type==='new_follower'?'👥':n.type==='battle_invite'?'🥊':n.type==='liked'?'❤️':'🏆'}</span><div className="flex-1 min-w-0"><p className="text-xs text-gray-300 line-clamp-2">{n.message}</p><p className="text-xs text-gray-500 mt-1">{ago(n.createdAt)}</p></div>{!n.read&&<div className="w-1.5 h-1.5 rounded-full mt-1 flex-shrink-0" style={{background:'#00F5FF'}}/>}</div>)}{(!notifs||!Array.isArray(notifs)||notifs.length===0)&&<div className="text-center py-6"><Bell size={28} className="mx-auto text-gray-700 mb-2"/><p className="text-sm text-gray-500">Sin notificaciones</p></div>}</div>
            {Array.isArray(notifs)&&notifs.length>8&&<Link href="/notifications" className="flex items-center justify-center gap-1 text-xs font-semibold mt-3 pt-3 border-t" style={{color:'#00F5FF',borderColor:'#1e1e2a'}}>Ver todas<ChevronRight size={12}/></Link>}
          </div>
        </div>

      </div>
    </div>
  );
}
