import { Link } from 'wouter';
import { Zap, Activity, Bell, ChevronRight } from 'lucide-react';
import { cn, useAuth, useApi, Av, Spinner, fmt, ago, API, RankingEntry, Notification } from '../lib/shared';

export default function DashboardPage() {
  const { user, token } = useAuth();
  const { data: ranking } = useApi('/api/ranking');
  const { data: notifs, setData: setNotifs } = useApi('/api/notifications', [user?._id]);
  const markRead=async(id:string)=>{if(!token)return;await fetch(`${API}/api/notifications/${id}/read`,{method:'PUT',headers:{Authorization:`Bearer ${token}`}});setNotifs((p:Notification[])=>Array.isArray(p)?p.map(n=>n._id===id?{...n,read:true}:n):p);};
  const unread=Array.isArray(notifs)?notifs.filter((n:Notification)=>!n.read).length:0;
  if(!user)return<div className="min-h-screen flex items-center justify-center" style={{paddingTop:'80px',background:'#0b0b12'}}><div className="text-center"><p className="text-gray-400 mb-4">Inicia sesión</p><Link href="/auth" className="px-6 py-3 rounded-xl font-bold text-black" style={{background:'#00F5FF'}}>Entrar</Link></div></div>;
  return(
    <div className="min-h-screen" style={{paddingTop:'80px',background:'#0b0b12'}}>
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6"><div><h1 className="text-3xl font-black text-white" style={{fontFamily:'Syne,sans-serif'}}>Mi Dashboard</h1><p className="text-gray-400 mt-1">Tu impacto global</p></div><Av u={user} s={48}/></div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[{icon:<Zap size={18}/>,value:fmt(user.impactPoints),label:'Puntos',color:'bg-yellow-500/20 text-yellow-400'},{icon:<Activity size={18}/>,value:`${user.currentStreak}d`,label:'Racha',color:'bg-cyan-500/20 text-cyan-400'},{icon:<span className="text-base">🪙</span>,value:(user.coins||0).toLocaleString(),label:'Monedas',color:'bg-yellow-500/20 text-yellow-300'},{icon:<Bell size={18}/>,value:String(unread),label:'Notificaciones',color:'bg-pink-500/20 text-pink-400'}].map((k,i)=><div key={i} className="rounded-xl p-4 border" style={{background:'#13131f',borderColor:'#1e1e2a'}}><div className={cn('p-2 rounded-lg w-fit mb-3',k.color)}>{k.icon}</div><div className="text-2xl font-bold text-white">{k.value}</div><div className="text-xs text-gray-400 mt-1">{k.label}</div></div>)}
        </div>
        <div className="mb-4"><Link href="/coins" className="flex items-center justify-between p-4 rounded-xl border hover:border-[#00F5FF] transition-all" style={{background:'#13131f',borderColor:'#1e1e2a'}}><div className="flex items-center gap-3"><span className="text-2xl">🪙</span><div><p className="text-white font-bold">Comprar Monedas</p><p className="text-xs text-gray-400">Envía regalos en los directos</p></div></div><ChevronRight size={18} className="text-gray-400"/></Link></div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 rounded-2xl p-5 border" style={{background:'#13131f',borderColor:'#1e1e2a'}}>
            <h2 className="font-bold text-white mb-4">Ranking Global</h2>
            <div className="space-y-1">{(Array.isArray(ranking)?ranking:[]).map((e:RankingEntry,i:number)=><div key={e._id} className={cn('flex items-center gap-3 p-3 rounded-xl hover:bg-white/5',e._id===user._id&&'border border-[#00F5FF]/30 bg-[#00F5FF]/5')}><span className="w-7 text-center text-sm font-bold">{i<3?['🥇','🥈','🥉'][i]:<span className="text-gray-500">#{i+1}</span>}</span><Av u={e} s={36}/><div className="flex-1 min-w-0"><div className={cn('text-sm font-semibold truncate',e._id===user._id?'text-[#00F5FF]':'text-white')}>{e.username} {e.flag}</div><div className="text-xs text-gray-500">{e.country}</div></div><div className="text-right"><div className="text-sm font-bold" style={{color:'#00F5FF'}}>{fmt(e.impactPoints)}</div><div className="text-xs text-gray-500">{e.currentStreak}d</div></div></div>)}{!ranking&&<div className="text-center py-8"><Spinner/></div>}</div>
          </div>
          <div className="rounded-2xl p-5 border" style={{background:'#13131f',borderColor:'#1e1e2a'}}>
            <div className="flex items-center justify-between mb-4"><h2 className="font-bold text-white">Notificaciones</h2>{unread>0&&<span className="text-xs font-bold px-2 py-0.5 rounded-full text-black" style={{background:'#FF007F'}}>{unread}</span>}</div>
            <div className="space-y-2">{(Array.isArray(notifs)?notifs:[]).map((n:Notification)=><div key={n._id} onClick={()=>markRead(n._id)} className={cn('flex gap-3 p-2.5 rounded-xl cursor-pointer hover:bg-white/5',!n.read&&'bg-[#00F5FF]/5 border border-[#00F5FF]/20')}><span className="text-lg">{n.type==='nomination'?'🎯':n.type==='chain_continued'?'⛓️':'🏆'}</span><div className="flex-1 min-w-0"><p className="text-xs text-gray-300 line-clamp-2">{n.message}</p><p className="text-xs text-gray-500 mt-1">{ago(n.createdAt)}</p></div>{!n.read&&<div className="w-1.5 h-1.5 rounded-full mt-1 flex-shrink-0" style={{background:'#00F5FF'}}/>}</div>)}{(!notifs||!Array.isArray(notifs)||notifs.length===0)&&<div className="text-center py-8"><Bell size={32} className="mx-auto text-gray-700 mb-2"/><p className="text-sm text-gray-500">Sin notificaciones</p></div>}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
