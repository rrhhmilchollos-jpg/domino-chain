import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Bell } from 'lucide-react';
import { cn, useAuth, useApi, ago, API, Notification } from '../lib/shared';

export default function NotificationsPage() {
  const { user, token } = useAuth();
  const [, setLocation] = useLocation();
  const { data: notifs, setData: setNotifs } = useApi('/api/notifications', [user?._id]);
  const [acting, setActing] = useState<string|null>(null);
  const markAll=async()=>{if(!token)return;await fetch(`${API}/api/notifications/read-all`,{method:'PUT',headers:{Authorization:`Bearer ${token}`}});setNotifs((p:Notification[])=>Array.isArray(p)?p.map(n=>({...n,read:true})):p);};

  const respondBattle=async(n:Notification, accept:boolean)=>{
    if(!token||!n.liveId)return;
    setActing(n._id);
    try{
      const r=await fetch(`${API}/api/lives/${n.liveId}/battle/${accept?'accept':'decline'}`,{method:'POST',headers:{Authorization:`Bearer ${token}`}});
      const d=await r.json();
      if(r.ok&&accept)setLocation(`/live/${n.liveId}`);
      else if(!r.ok)alert(d.error||'No se pudo procesar la invitación');
    }catch{ /* noop */ }
    finally{setActing(null);}
  };

  const icon=(t:string)=>t==='nomination'?'🎯':t==='chain_continued'?'⛓️':t==='battle_invite'?'🥊':t==='new_follower'?'👥':t==='liked'?'❤️':'🏆';

  return(
    <div className="min-h-screen" style={{paddingTop:'80px',background:'#0b0b12'}}>
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6"><h1 className="text-2xl font-black text-white" style={{fontFamily:'Syne,sans-serif'}}>Notificaciones</h1>{Array.isArray(notifs)&&notifs.some((n:Notification)=>!n.read)&&<button onClick={markAll} className="text-xs font-semibold" style={{color:'#00F5FF'}}>Marcar como leídas</button>}</div>
        <div className="space-y-2">
          {(Array.isArray(notifs)?notifs:[]).map((n:Notification)=>{
            const row = (
              <div className={cn('flex gap-3 p-4 rounded-xl border',!n.read?'border-[#00F5FF]/20 bg-[#00F5FF]/5':'border-[#1e1e2a] bg-[#13131f]')}>
                <span className="text-xl">{icon(n.type)}</span>
                <div className="flex-1">
                  <p className="text-sm text-white">{n.message}</p>
                  <p className="text-xs text-gray-500 mt-1">{ago(n.createdAt)}</p>
                  {n.type==='battle_invite'&&n.liveId&&(
                    <div className="flex gap-2 mt-2">
                      <button disabled={acting===n._id} onClick={()=>respondBattle(n,true)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-black disabled:opacity-50" style={{background:'#00F5FF'}}>🥊 Aceptar batalla</button>
                      <button disabled={acting===n._id} onClick={()=>respondBattle(n,false)} className="px-3 py-1.5 rounded-lg text-xs font-bold text-gray-300 disabled:opacity-50" style={{background:'#1e1e2a'}}>Rechazar</button>
                    </div>
                  )}
                </div>
                {!n.read&&<div className="w-2 h-2 rounded-full flex-shrink-0 mt-1" style={{background:'#00F5FF'}}/>}
              </div>
            );
            // Las de nuevo seguidor llevan directo al perfil real de quien te sigue
            return n.type==='new_follower'&&n.fromUserId?._id ? (
              <Link key={n._id} href={`/user/${n.fromUserId._id}`}>{row}</Link>
            ) : <div key={n._id}>{row}</div>;
          })}
          {(!notifs||!Array.isArray(notifs)||notifs.length===0)&&<div className="text-center py-16"><Bell size={48} className="mx-auto text-gray-700 mb-3"/><p className="text-gray-400">Sin notificaciones</p></div>}
        </div>
      </div>
    </div>
  );
}
