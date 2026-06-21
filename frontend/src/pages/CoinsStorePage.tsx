import { useState } from 'react';
import { Link } from 'wouter';
import { useAuth, useApi, Spinner, GIFT_CATALOG, API, CoinPackage } from '../lib/shared';

export default function CoinsStorePage() {
  const { user, token, refreshUser } = useAuth();
  const { data: packages } = useApi('/api/coins/packages');
  const { data: balance, setData: setBalance } = useApi('/api/coins/balance', [user?._id]);
  const [buying, setBuying] = useState<string|null>(null);
  const [success, setSuccess] = useState<string|null>(null);

  const buy = async (pkg: CoinPackage) => {
    if (!token) return;
    setBuying(pkg.id);
    try {
      const r = await fetch(`${API}/api/coins/purchase`, {
        method:'POST', headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},
        body: JSON.stringify({ packageId: pkg.id })
      });
      const d = await r.json();
      if (r.ok) {
        setBalance((b: any) => ({...b, coins: d.newBalance}));
        setSuccess(`¡${pkg.coins.toLocaleString()} monedas añadidas! 🎉`);
        await refreshUser();
        setTimeout(() => setSuccess(null), 4000);
      }
    } finally { setBuying(null); }
  };

  if (!user) return (
    <div className="min-h-screen flex items-center justify-center" style={{paddingTop:'80px',background:'#0b0b12'}}>
      <div className="text-center"><p className="text-gray-400 mb-4">Inicia sesión para comprar monedas</p><Link href="/auth" className="px-6 py-3 rounded-xl font-bold text-black" style={{background:'#00F5FF'}}>Entrar</Link></div>
    </div>
  );

  return (
    <div className="min-h-screen" style={{paddingTop:'80px',background:'#0b0b12'}}>
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-white" style={{fontFamily:'Syne,sans-serif'}}>Tienda de Monedas</h1>
          <p className="text-gray-400 mt-2">Compra monedas para enviar regalos en los directos</p>
          <div className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-full" style={{background:'rgba(0,245,255,0.1)',border:'1px solid #00F5FF'}}>
            <span className="text-2xl">🪙</span>
            <span className="text-2xl font-black text-white">{(balance?.coins || user?.coins || 0).toLocaleString()}</span>
            <span className="text-gray-400 text-sm">monedas</span>
          </div>
        </div>

        {success && (
          <div className="mb-6 p-4 rounded-xl text-center font-bold text-white" style={{background:'rgba(0,245,255,0.15)',border:'1px solid #00F5FF'}}>
            {success}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 mb-8">
          {(Array.isArray(packages)?packages:[]).map((pkg: CoinPackage) => (
            <button key={pkg.id} onClick={() => buy(pkg)} disabled={!!buying} className="relative rounded-2xl p-5 text-left transition-all hover:scale-105 active:scale-95 disabled:opacity-70" style={{background:'#13131f',border:`2px solid ${pkg.badge?'#FF007F':'#1e1e2a'}`}}>
              {pkg.badge && <div className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-xs font-black text-white" style={{background:'#FF007F',whiteSpace:'nowrap'}}>{pkg.badge}</div>}
              <div className="text-3xl mb-2">{pkg.emoji}</div>
              <div className="text-xl font-black text-white">{pkg.coins.toLocaleString()}</div>
              <div className="text-xs text-gray-400 mb-3">monedas</div>
              <div className="w-full py-2 rounded-xl text-sm font-bold text-black flex items-center justify-center" style={{background:'linear-gradient(135deg,#00F5FF,#7c3aed)'}}>
                {buying===pkg.id ? <Spinner/> : `${pkg.price.toFixed(2)}€`}
              </div>
            </button>
          ))}
        </div>

        <div className="rounded-2xl p-5" style={{background:'#13131f',border:'1px solid #1e1e2a'}}>
          <h2 className="font-bold text-white mb-4">¿Qué puedes hacer con las monedas?</h2>
          <div className="space-y-3">
            {Object.entries(GIFT_CATALOG).map(([k,g]) => (
              <div key={k} className="flex items-center gap-3">
                <span className="text-2xl">{g.emoji}</span>
                <div className="flex-1"><div className="text-sm font-semibold text-white">{g.name}</div><div className="text-xs text-gray-400">Otorga {g.points} puntos al streamer</div></div>
                <div className="text-sm font-bold text-yellow-400">{g.coins} 🪙</div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-center text-xs text-gray-600 mt-6">Los pagos son seguros. Las monedas no son reembolsables.</p>
      </div>
    </div>
  );
}
