import { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { Video, Search, X } from 'lucide-react';
import { cn, useAuth, Spinner, Av, API, AppUser } from '../lib/shared';

export default function CreateLivePage() {
  const { user, token } = useAuth();
  const [, setLocation] = useLocation();
  const [form, setForm] = useState({title:'',description:'',category:'General',isBattle:false});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  // Rival real para el modo batalla — nunca un nombre inventado por la app:
  // se busca y se elige una cuenta de verdad, igual que en TikTok LIVE.
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<AppUser[]>([]);
  const [opponent, setOpponent] = useState<AppUser|null>(null);

  useEffect(()=>{
    if(!form.isBattle||opponent||search.trim().length<2){setResults([]);return;}
    const t=setTimeout(()=>{
      fetch(`${API}/api/users/search?q=${encodeURIComponent(search.trim())}`)
        .then(r=>r.json()).then(d=>setResults(Array.isArray(d)?d.filter((u:AppUser)=>u._id!==user?._id):[])).catch(()=>setResults([]));
    },300);
    return()=>clearTimeout(t);
  },[search,form.isBattle,opponent,user?._id]);

  if(!user)return<div className="min-h-screen flex items-center justify-center" style={{paddingTop:'80px',background:'#0b0b12'}}><div className="text-center"><p className="text-gray-400 mb-4">Inicia sesión</p><Link href="/auth" className="px-6 py-3 rounded-xl font-bold text-black" style={{background:'#00F5FF'}}>Entrar</Link></div></div>;

  const create=async()=>{
    if(!form.title.trim())return setError('Escribe un título');
    if(form.isBattle&&!opponent)return setError('Elige a tu rival real para la batalla');
    setError('');setLoading(true);
    try{
      const r=await fetch(`${API}/api/lives`,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify(form)});
      const d=await r.json();if(!r.ok)throw new Error(d.error||'Error');
      // Si es batalla, invitamos a la cuenta real elegida — el rival recibe
      // un aviso y tiene que aceptar para entrar a publicar su cámara.
      if(form.isBattle&&opponent){
        await fetch(`${API}/api/lives/${d.live._id}/battle/invite`,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({userId:opponent._id})}).catch(()=>{});
      }
      setLocation(`/live/${d.live._id}`);
    }catch(e:any){setError(e.message);}finally{setLoading(false);}
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{paddingTop:'80px',background:'#0b0b12'}}>
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-black text-white mb-6" style={{fontFamily:'Syne,sans-serif'}}>Iniciar Live</h1>
        <div className="rounded-2xl p-6 space-y-4" style={{background:'#13131f',border:'1px solid #1e1e2a'}}>
          <input placeholder="Título del live" value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} className="w-full rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none" style={{background:'#0b0b12',border:'1px solid #2a2a3a'}}/>
          <input placeholder="Descripción (opcional)" value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} className="w-full rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none" style={{background:'#0b0b12',border:'1px solid #2a2a3a'}}/>
          <select value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))} className="w-full rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none" style={{background:'#0b0b12',border:'1px solid #2a2a3a'}}>{['General','Creativity','Kindness','Eco','Battle'].map(c=><option key={c} value={c}>{c}</option>)}</select>
          <label className="flex items-center gap-3 cursor-pointer"><div className="w-10 h-5 rounded-full relative transition-all" style={{background:form.isBattle?'#FF007F':'#374151'}} onClick={()=>{setForm(f=>({...f,isBattle:!f.isBattle}));setOpponent(null);setSearch('');}}><div className={cn('absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all',form.isBattle?'left-5':'left-0.5')}/></div><span className="text-sm text-white">Modo batalla VS 🥊</span></label>

          {form.isBattle&&(
            <div className="rounded-xl p-3" style={{background:'#0b0b12',border:'1px solid #2a2a3a'}}>
              <p className="text-xs text-gray-400 mb-2">Elige a tu rival (cuenta real de DOMINO)</p>
              {opponent?(
                <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg" style={{background:'rgba(255,0,127,0.12)',border:'1px solid #FF007F'}}>
                  <Av u={opponent} s={28}/>
                  <span className="text-sm text-white font-bold flex-1">@{opponent.username}</span>
                  <button type="button" onClick={()=>setOpponent(null)}><X size={16} className="text-gray-400"/></button>
                </div>
              ):(
                <>
                  <div className="relative mb-2"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar por nombre de usuario..." className="w-full rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none" style={{background:'#13131f',border:'1px solid #2a2a3a'}}/></div>
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {results.map(u=>(
                      <button type="button" key={u._id} onClick={()=>{setOpponent(u);setSearch('');setResults([]);}} className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5">
                        <Av u={u} s={28}/><span className="text-sm text-white">@{u.username}</span>
                      </button>
                    ))}
                    {search.trim().length>=2&&results.length===0&&<p className="text-xs text-gray-500 px-1">Sin resultados</p>}
                  </div>
                </>
              )}
              <p className="text-[11px] text-gray-500 mt-2">Tu rival recibirá un aviso y deberá aceptar para entrar al directo con su propia cámara.</p>
            </div>
          )}

          {error&&<p className="text-red-400 text-xs">{error}</p>}
          <button onClick={create} disabled={loading} className="w-full py-3 rounded-xl font-bold text-white flex items-center justify-center gap-2 disabled:opacity-50" style={{background:'linear-gradient(135deg,#FF007F,#7c3aed)'}}>{loading?<Spinner/>:<><Video size={18}/>Empezar Live</>}</button>
        </div>
      </div>
    </div>
  );
}
