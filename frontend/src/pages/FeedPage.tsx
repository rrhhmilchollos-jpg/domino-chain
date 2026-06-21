import { useState, useEffect, useRef } from 'react';
import { Link } from 'wouter';
import { Zap, Camera, Heart, MessageCircle, Share } from 'lucide-react';
import { useApi, useAuth, CommentsPanel, Spinner, Av, fmt, ago, left, API, DominoVideo } from '../lib/shared';

export default function FeedPage() {
  const { data: videos, loading } = useApi('/api/videos/feed?limit=20');
  const { data: challenge } = useApi('/api/challenges/active');
  const { token } = useAuth();
  const [liked, setLiked] = useState<Set<string>>(new Set());
  const [commentId, setCommentId] = useState<string|null>(null);
  const videoRefs = useRef<(HTMLVideoElement|null)[]>([]);
  const doLike = async (id:string) => { if(!token)return; setLiked(p=>{const n=new Set(p);n.has(id)?n.delete(id):n.add(id);return n;}); await fetch(`${API}/api/videos/${id}/like`,{method:'POST',headers:{Authorization:`Bearer ${token}`}}); };
  const doShare = (id:string) => { const url=`${window.location.origin}/video/${id}`; if(navigator.share)navigator.share({title:'DOMINO',url});else navigator.clipboard?.writeText(url); };
  useEffect(()=>{
    const obs=new IntersectionObserver(entries=>{entries.forEach(e=>{const v=e.target as HTMLVideoElement;if(e.isIntersecting)v.play().catch(()=>{});else{v.pause();v.currentTime=0;}});},{threshold:0.8});
    videoRefs.current.forEach(v=>{if(v)obs.observe(v);});
    return()=>obs.disconnect();
  },[videos]);
  if(loading)return<div className="min-h-screen flex items-center justify-center" style={{paddingTop:'56px',background:'#0b0b12'}}><Spinner/></div>;
  const list=Array.isArray(videos)?videos:[];
  return (
    <div className="fixed inset-0 overflow-y-scroll snap-y snap-mandatory" style={{paddingTop:'56px',background:'#000'}}>
      {commentId&&<CommentsPanel videoId={commentId} onClose={()=>setCommentId(null)}/>}
      {challenge&&<div className="fixed top-14 left-0 right-0 z-30 pointer-events-none"><div className="max-w-md mx-auto px-4 pt-2"><div className="rounded-xl px-3 py-2 pointer-events-auto flex items-center gap-2" style={{background:'rgba(11,11,18,0.85)',border:'1px solid #1e1e2a',backdropFilter:'blur(10px)'}}><Zap size={14} className="text-yellow-400"/><span className="text-xs font-semibold text-white flex-1 truncate">{challenge.title}</span><span className="text-xs text-gray-400">{left(challenge.expiresAt)}</span></div></div></div>}
      {list.map((v:DominoVideo,idx:number)=>(
        <div key={v._id} className="relative w-full snap-start flex-shrink-0 overflow-hidden bg-black" style={{height:'calc(100vh - 56px)'}}>
          {v.videoUrl?<video ref={el=>{videoRefs.current[idx]=el;}} src={v.videoUrl} className="absolute inset-0 w-full h-full object-cover" loop playsInline muted onDoubleClick={()=>doLike(v._id)}/>:v.thumbnailUrl?<img src={v.thumbnailUrl} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy"/>:<div className="absolute inset-0 flex items-center justify-center" style={{background:'#1a1a2e'}}><Camera size={48} className="text-gray-600"/></div>}
          <div className="absolute inset-0" style={{background:'linear-gradient(to top,rgba(0,0,0,0.85) 0%,rgba(0,0,0,0.1) 50%,transparent 100%)'}}/>
          <div className="absolute bottom-20 left-4 right-20 z-10">
            <div className="flex items-center gap-2 mb-2"><Av u={v.userId} s={40}/><div><p className="text-white text-sm font-bold">@{v.userId?.username}</p><p className="text-gray-300 text-xs">{v.userId?.flag} {v.userId?.city}</p></div></div>
            <div className="flex items-center gap-2"><span className="text-xs rounded-full px-2 py-0.5 text-gray-300" style={{background:'rgba(0,0,0,0.4)',border:'1px solid rgba(255,255,255,0.1)'}}>⛓️ {v.chainDepth+1}</span><span className="text-xs text-gray-400">{ago(v.createdAt)}</span></div>
          </div>
          <div className="absolute right-3 bottom-24 flex flex-col gap-5 items-center z-10">
            <button onClick={()=>doLike(v._id)} className="flex flex-col items-center gap-1"><div className="w-10 h-10 rounded-full flex items-center justify-center" style={{background:'rgba(0,0,0,0.4)'}}><Heart size={22} className={liked.has(v._id)?'fill-red-500 text-red-500':'text-white'}/></div><span className="text-xs text-white font-semibold">{fmt((v.likes?.length||0)+(liked.has(v._id)?1:0))}</span></button>
            <button onClick={()=>setCommentId(v._id)} className="flex flex-col items-center gap-1"><div className="w-10 h-10 rounded-full flex items-center justify-center" style={{background:'rgba(0,0,0,0.4)'}}><MessageCircle size={22} className="text-white"/></div><span className="text-xs text-white font-semibold">Comentar</span></button>
            <button onClick={()=>doShare(v._id)} className="flex flex-col items-center gap-1"><div className="w-10 h-10 rounded-full flex items-center justify-center" style={{background:'rgba(0,0,0,0.4)'}}><Share size={22} className="text-white"/></div><span className="text-xs text-white font-semibold">Compartir</span></button>
          </div>
          <div className="absolute bottom-4 left-4 right-4 z-10"><div className="flex items-center gap-2"><div className="flex-1 h-0.5 rounded-full" style={{background:'rgba(255,255,255,0.2)'}}><div className="h-full rounded-full" style={{width:`${Math.min(100,(v.chainDepth+1)*10)}%`,background:'linear-gradient(90deg,#00F5FF,#FF007F)'}}/></div><span className="text-xs text-gray-400">⛓️ {v.chainDepth+1}</span></div></div>
        </div>
      ))}
      {list.length===0&&<div className="h-screen flex flex-col items-center justify-center text-center px-4"><div className="text-6xl mb-4">🎲</div><h3 className="text-xl font-bold text-white mb-2">Sin videos todavía</h3><p className="text-gray-400 text-sm mb-6">Sé el primero en grabar.</p><Link href="/camera" className="px-6 py-3 rounded-xl font-bold text-black" style={{background:'#00F5FF'}}>Grabar ahora</Link></div>}
    </div>
  );
}
