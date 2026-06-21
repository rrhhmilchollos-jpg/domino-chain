import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { Camera, Heart, Grid3x3 } from 'lucide-react';
import { useApi, useAuth, Av, FollowButton, Spinner, fmt, ago, DominoVideo, AppUser } from '../lib/shared';

function VideoThumb({ v }: { v: DominoVideo }) {
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
      <div className="absolute top-1.5 right-1.5 text-[9px] text-gray-300" style={{textShadow:'0 1px 2px rgba(0,0,0,0.8)'}}>{ago(v.createdAt)}</div>
    </Link>
  );
}

// Perfil público de OTRO usuario, en modo solo lectura — equivalente a tocar
// el nombre de alguien en TikTok: mismo diseño que tu propio Dashboard pero
// sin botones de editar/grabar/ajustes, sin pestaña "Me Gusta" (es privada
// de cada cuenta) y sin ranking/notificaciones. El backend ya solo devuelve
// los videos públicos de este usuario.
export default function UserProfilePage({ id }: { id: string }) {
  const { user: me } = useAuth();
  const { data: profile, loading: loadingProfile } = useApi(id ? `/api/users/${id}` : '/api/users/_', [id]);
  const { data: videos, loading: loadingVideos } = useApi(id ? `/api/videos/user/${id}` : '/api/videos/user/_', [id]);
  // Todos los hooks van ANTES de cualquier return condicional (reglas de
  // hooks de React) — followersCount se sincroniza cuando llega el perfil.
  const [followersCount, setFollowersCount] = useState(0);
  useEffect(()=>{ if (profile && !profile.error) setFollowersCount(profile.followersCount||0); }, [profile]);

  // Si el usuario pincha en su propio nombre, lo llevamos directo a su Dashboard real (con edición, Me Gusta, etc.)
  if (me && id && me._id === id) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{paddingTop:'80px',background:'#0b0b12'}}>
        <div className="text-center">
          <p className="text-gray-400 mb-4">Este es tu propio perfil</p>
          <Link href="/dashboard" className="px-6 py-3 rounded-xl font-bold text-black" style={{background:'#00F5FF'}}>Ir a mi Dashboard</Link>
        </div>
      </div>
    );
  }

  if (loadingProfile) return <div className="min-h-screen flex items-center justify-center" style={{paddingTop:'80px',background:'#0b0b12'}}><Spinner/></div>;
  if (!profile || profile.error) return (
    <div className="min-h-screen flex items-center justify-center" style={{paddingTop:'80px',background:'#0b0b12'}}>
      <div className="text-center">
        <p className="text-gray-400 mb-4">Usuario no encontrado</p>
        <Link href="/feed" className="px-6 py-3 rounded-xl font-bold text-black" style={{background:'#00F5FF'}}>Volver al feed</Link>
      </div>
    </div>
  );

  const u: AppUser = profile;
  const list: DominoVideo[] = Array.isArray(videos) ? videos : [];
  const totalLikesReceived = list.reduce((s, v) => s + (v.likes?.length || 0), 0);

  return (
    <div className="min-h-screen" style={{paddingTop:'80px',background:'#0b0b12'}}>
      <div className="max-w-3xl mx-auto px-4 py-6">

        {/* Cabecera de perfil — igual que el Dashboard, sin botones de edición */}
        <div className="flex flex-col items-center text-center mb-5">
          <Av u={u} s={88}/>
          <h1 className="text-xl font-black text-white mt-3" style={{fontFamily:'Syne,sans-serif'}}>@{u.username}</h1>
          {(u.city||u.country)&&<p className="text-gray-500 text-xs mt-0.5">{u.flag} {u.city}{u.city&&u.country?', ':''}{u.country}</p>}
          {u.bio&&<p className="text-gray-300 text-sm mt-2 max-w-sm">{u.bio}</p>}

          {/* Seguidores / Siguiendo — cuentas reales, con link a la lista, igual que TikTok */}
          <div className="flex items-center gap-6 mt-4">
            <Link href={`/user/${u._id}/followers`} className="text-center"><div className="text-lg font-black text-white">{fmt(followersCount)}</div><div className="text-xs text-gray-500">Seguidores</div></Link>
            <Link href={`/user/${u._id}/following`} className="text-center"><div className="text-lg font-black text-white">{fmt(u.followingCount||0)}</div><div className="text-xs text-gray-500">Siguiendo</div></Link>
            <div className="text-center"><div className="text-lg font-black text-white">{list.length}</div><div className="text-xs text-gray-500">Cadenas</div></div>
            <div className="text-center"><div className="text-lg font-black text-white">{fmt(totalLikesReceived)}</div><div className="text-xs text-gray-500">Me gusta</div></div>
            <div className="text-center"><div className="text-lg font-black text-white">{u.currentStreak}d</div><div className="text-xs text-gray-500">Racha</div></div>
            <div className="text-center"><div className="text-lg font-black text-white">{fmt(u.impactPoints)}</div><div className="text-xs text-gray-500">Impacto</div></div>
          </div>

          <div className="mt-4">
            <FollowButton userId={u._id} initialIsFollowing={!!u.isFollowing} onChange={(_isFollowing, count)=>{ if (typeof count==='number') setFollowersCount(count); }}/>
          </div>
        </div>

        {/* Solo una pestaña: Videos públicos. No hay "Me Gusta" — es información privada de cada cuenta */}
        <div className="flex border-t border-b" style={{borderColor:'#1e1e2a'}}>
          <div className="flex-1 py-3 flex items-center justify-center gap-1.5 text-sm font-semibold border-b-2 -mb-px text-white" style={{borderColor:'#00F5FF'}}>
            <Grid3x3 size={16}/>Videos
          </div>
        </div>

        <div className="py-4">
          {loadingVideos?(
            <div className="text-center py-10"><Spinner/></div>
          ):list.length===0?(
            <div className="text-center py-12 px-4">
              <div className="text-4xl mb-2">🎲</div>
              <p className="text-gray-400 text-sm">Este usuario no tiene videos públicos todavía</p>
            </div>
          ):(
            <div className="grid grid-cols-3 gap-1">
              {list.map((v:DominoVideo)=><VideoThumb key={v._id} v={v}/>)}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
