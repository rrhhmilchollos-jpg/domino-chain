import { useState } from 'react';
import { useLocation } from 'wouter';
import { cn, useAuth, DominoLogo, Spinner, GoogleSignInButton } from '../lib/shared';

export default function AuthPage() {
  const { login, register } = useAuth();
  const [, setLocation] = useLocation();
  const [mode, setMode] = useState<'login'|'register'>('login');
  const [form, setForm] = useState({ email:'', password:'', username:'', country:'', city:'' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const flags: Record<string,string> = {'España':'🇪🇸','México':'🇲🇽','Argentina':'🇦🇷','Colombia':'🇨🇴','Estados Unidos':'🇺🇸','Japón':'🇯🇵','Brasil':'🇧🇷','Francia':'🇫🇷','Alemania':'🇩🇪','Italia':'🇮🇹','Reino Unido':'🇬🇧','Portugal':'🇵🇹'};
  const handle = async () => {
    setError(''); setLoading(true);
    try {
      if (mode==='login') await login(form.email, form.password);
      else { if (!form.username||!form.email||!form.password||!form.country||!form.city) throw new Error('Rellena todos los campos'); await register({...form,flag:flags[form.country]||'🌍'}); }
      setLocation('/feed');
    } catch(e:any){setError(e.message);}finally{setLoading(false);}
  };
  const set = (k:string) => (e:React.ChangeEvent<HTMLInputElement|HTMLSelectElement>) => setForm(f=>({...f,[k]:e.target.value}));
  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{background:'#0b0b12'}}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8"><DominoLogo size={40}/><h1 className="text-4xl font-black mt-4" style={{fontFamily:'Syne,sans-serif',color:'#00F5FF',textShadow:'0 0 12px #00F5FF'}}>DOMINO</h1><p className="text-gray-400 text-sm mt-1">The Real-World Chain Reaction</p></div>
        <div className="rounded-2xl p-6 space-y-4" style={{background:'#13131f',border:'1px solid #1e1e2a'}}>
          <GoogleSignInButton onError={setError} onSuccess={()=>setLocation('/feed')}/>
          <div className="flex items-center gap-3"><div className="flex-1 h-px" style={{background:'#2a2a3a'}}/><span className="text-xs text-gray-500">o con email</span><div className="flex-1 h-px" style={{background:'#2a2a3a'}}/></div>
          <div className="flex gap-1 rounded-xl p-1" style={{background:'#0b0b12'}}>{(['login','register'] as const).map(m=><button key={m} onClick={()=>{setMode(m);setError('');}} className={cn('flex-1 py-2 rounded-lg text-sm font-semibold transition-all',mode===m?'text-[#0b0b12]':'text-gray-400')} style={mode===m?{background:'#00F5FF'}:{}}>{m==='login'?'Entrar':'Registrarse'}</button>)}</div>
          {mode==='register'&&<input placeholder="@username" value={form.username} onChange={set('username')} className="w-full rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none" style={{background:'#0b0b12',border:'1px solid #2a2a3a'}}/>}
          <input placeholder="Email" type="email" value={form.email} onChange={set('email')} className="w-full rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none" style={{background:'#0b0b12',border:'1px solid #2a2a3a'}}/>
          <input placeholder="Contraseña" type="password" value={form.password} onChange={set('password')} className="w-full rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none" style={{background:'#0b0b12',border:'1px solid #2a2a3a'}}/>
          {mode==='register'&&<><select value={form.country} onChange={set('country')} className="w-full rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none" style={{background:'#0b0b12',border:'1px solid #2a2a3a'}}><option value="">País</option>{Object.keys(flags).map(c=><option key={c} value={c}>{flags[c]} {c}</option>)}</select><input placeholder="Ciudad" value={form.city} onChange={set('city')} className="w-full rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none" style={{background:'#0b0b12',border:'1px solid #2a2a3a'}}/></>}
          {error&&<p className="text-red-400 text-xs text-center">{error}</p>}
          <button onClick={handle} disabled={loading} className="w-full py-3 rounded-xl font-bold text-[#0b0b12] flex items-center justify-center gap-2 disabled:opacity-50" style={{background:'linear-gradient(135deg,#00F5FF,#7c3aed)'}}>{loading?<Spinner/>:mode==='login'?'Entrar':'Crear cuenta'}</button>
        </div>
      </div>
    </div>
  );
}
