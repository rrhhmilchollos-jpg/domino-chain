import { Bell } from 'lucide-react';
import { cn, useAuth, useApi, ago, API, Notification } from '../lib/shared';

export default function NotificationsPage() {
  const { user, token } = useAuth();
  const { data: notifs, setData: setNotifs } = useApi('/api/notifications', [user?._id]);
  const markAll=async()=>{if(!token)return;await fetch(`${API}/api/notifications/read-all`,{method:'PUT',headers:{Authorization:`Bearer ${token}`}});setNotifs((p:Notification[])=>Array.isArray(p)?p.map(n=>({...n,read:true})):p);};
  return(
    <div className="min-h-screen" style={{paddingTop:'80px',background:'#0b0b12'}}>
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6"><h1 className="text-2xl font-black text-white" style={{fontFamily:'Syne,sans-serif'}}>Notificaciones</h1>{Array.isArray(notifs)&&notifs.some((n:Notification)=>!n.read)&&<button onClick={markAll} className="text-xs font-semibold" style={{color:'#00F5FF'}}>Marcar como leídas</button>}</div>
        <div className="space-y-2">
          {(Array.isArray(notifs)?notifs:[]).map((n:Notification)=><div key={n._id} className={cn('flex gap-3 p-4 rounded-xl border',!n.read?'border-[#00F5FF]/20 bg-[#00F5FF]/5':'border-[#1e1e2a] bg-[#13131f]')}><span className="text-xl">{n.type==='nomination'?'🎯':n.type==='chain_continued'?'⛓️':'🏆'}</span><div className="flex-1"><p className="text-sm text-white">{n.message}</p><p className="text-xs text-gray-500 mt-1">{ago(n.createdAt)}</p></div>{!n.read&&<div className="w-2 h-2 rounded-full flex-shrink-0 mt-1" style={{background:'#00F5FF'}}/>}</div>)}
          {(!notifs||!Array.isArray(notifs)||notifs.length===0)&&<div className="text-center py-16"><Bell size={48} className="mx-auto text-gray-700 mb-3"/><p className="text-gray-400">Sin notificaciones</p></div>}
        </div>
      </div>
    </div>
  );
}
