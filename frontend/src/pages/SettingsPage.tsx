import { useLocation } from 'wouter';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth, Av } from '../lib/shared';

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const sections = [
    { title: 'Cuenta', items: [{ l: 'Información de cuenta', a: () => setLocation('/profile/edit'), e: '👤' }, { l: 'Privacidad', a: () => { }, e: '🔒' }, { l: 'Seguridad', a: () => { }, e: '🛡️' }] },
    { title: 'General', items: [{ l: 'Notificaciones', a: () => setLocation('/notifications'), e: '🔔' }, { l: 'Uso de datos', a: () => { }, e: '📱' }, { l: 'Ayuda y soporte', a: () => { }, e: '❓' }, { l: 'Acerca de DOMINO', a: () => { }, e: 'ℹ️' }] },
    { title: 'Monedas', items: [{ l: 'Comprar monedas', a: () => setLocation('/coins'), e: '🪙' }, { l: 'Ranking global', a: () => setLocation('/map'), e: '🏆' }] },
  ];
  return (
    <div className="min-h-screen pb-20" style={{ paddingTop: '56px', background: '#0b0b12' }}>
      <div className="flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: '#1e1e2a' }}>
        <button onClick={() => setLocation('/profile')}><ChevronLeft size={24} className="text-white" /></button>
        <h1 className="text-white font-bold flex-1">Ajustes</h1>
      </div>
      <div className="max-w-lg mx-auto px-4 py-4 space-y-6">
        {user && <div className="flex items-center gap-3 p-4 rounded-2xl" style={{ background: '#1e1e2a' }}><Av u={user} s={48} /><div><p className="text-white font-bold">@{user.username}</p><p className="text-gray-400 text-sm">{user.email}</p></div></div>}
        {sections.map(s => (
          <div key={s.title}>
            <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-2 px-1">{s.title}</p>
            <div className="rounded-2xl overflow-hidden" style={{ background: '#1e1e2a' }}>
              {s.items.map((item, i) => <button key={item.l} onClick={item.a} className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-white/5 text-left" style={i > 0 ? { borderTop: '1px solid rgba(255,255,255,0.05)' } : {}}><span className="text-lg w-7 text-center">{item.e}</span><span className="text-white text-sm flex-1">{item.l}</span><ChevronRight size={15} className="text-gray-600" /></button>)}
            </div>
          </div>
        ))}
        <button onClick={() => { logout(); setLocation('/'); }} className="w-full py-3.5 rounded-2xl font-bold border transition-colors" style={{ color: '#ef4444', borderColor: 'rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.05)' }}>Cerrar sesión</button>
        <p className="text-center text-gray-700 text-xs">DOMINO v2.0 · © 2026</p>
      </div>
    </div>
  );
}
