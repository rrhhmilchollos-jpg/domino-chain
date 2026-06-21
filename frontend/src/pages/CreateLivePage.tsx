import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Video } from 'lucide-react';
import { cn, useAuth, Spinner, API, storeHostLiveToken } from '../lib/shared';

export default function CreateLivePage() {
  const { user, token } = useAuth();
  const [, setLocation] = useLocation();
  const [form, setForm] = useState({title:'',description:'',category:'General',isBattle:false});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  if(!user)return<div className="min-h-screen flex items-center justify-center" style={{paddingTop:'80px',background:'#0b0b12'}}><div className="text-center"><p className="text-gray-400 mb-4">Inicia sesión</p><Link href="/auth" className="px-6 py-3 rounded-xl font-bold text-black" style={{background:'#00F5FF'}}>Entrar</Link></div></div>;
  const create=async()=>{if(!form.title.trim())return setError('Escribe un título');setError('');setLoading(true);try{const r=await fetch(`${API}/api/lives`,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify(form)});const d=await r.json();if(!r.ok)throw new Error(d.error||'Error');if(d.token&&d.livekitUrl)storeHostLiveToken(d.live._id,d.token,d.livekitUrl);setLocation(`/live/${d.live._id}`);}catch(e:any){setError(e.message);}finally{setLoading(false);}};
  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{paddingTop:'80px',background:'#0b0b12'}}>
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-black text-white mb-6" style={{fontFamily:'Syne,sans-serif'}}>Iniciar Live</h1>
        <div className="rounded-2xl p-6 space-y-4" style={{background:'#13131f',border:'1px solid #1e1e2a'}}>
          <input placeholder="Título del live" value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} className="w-full rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none" style={{background:'#0b0b12',border:'1px solid #2a2a3a'}}/>
          <input placeholder="Descripción (opcional)" value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} className="w-full rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none" style={{background:'#0b0b12',border:'1px solid #2a2a3a'}}/>
          <select value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))} className="w-full rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none" style={{background:'#0b0b12',border:'1px solid #2a2a3a'}}>{['General','Creativity','Kindness','Eco','Battle'].map(c=><option key={c} value={c}>{c}</option>)}</select>
          <label className="flex items-center gap-3 cursor-pointer"><div className="w-10 h-5 rounded-full relative transition-all" style={{background:form.isBattle?'#FF007F':'#374151'}} onClick={()=>setForm(f=>({...f,isBattle:!f.isBattle}))}><div className={cn('absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all',form.isBattle?'left-5':'left-0.5')}/></div><span className="text-sm text-white">Modo batalla VS 🥊</span></label>
          {error&&<p className="text-red-400 text-xs">{error}</p>}
          <button onClick={create} disabled={loading} className="w-full py-3 rounded-xl font-bold text-white flex items-center justify-center gap-2 disabled:opacity-50" style={{background:'linear-gradient(135deg,#FF007F,#7c3aed)'}}>{loading?<Spinner/>:<><Video size={18}/>Empezar Live</>}</button>
        </div>
      </div>
    </div>
  );
}
