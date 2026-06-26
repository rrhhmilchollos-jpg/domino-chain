import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { X } from 'lucide-react';
import { useAuth, Spinner, API } from '../lib/shared';

export default function EditProfilePage() {
  const { user, token, refreshUser } = useAuth();
  const [, setLocation] = useLocation();
  const [form, setForm] = useState({ username: '', bio: '', city: '', avatarUrl: '' });
  const [saving, setSaving] = useState(false); const [msg, setMsg] = useState('');
  useEffect(() => { if (user) setForm({ username: user.username || '', bio: user.bio || '', city: user.city || '', avatarUrl: user.avatarUrl || '' }); }, [user]);
  const save = async () => {
    if (!token) return; setSaving(true);
    try { const r = await fetch(`${API}/api/users/me`, { method: 'PUT', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(form) }); if (r.ok) { await refreshUser(); setMsg('✅ Guardado'); setTimeout(() => setLocation('/profile'), 1200); } else setMsg('❌ Error'); } finally { setSaving(false); }
  };
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm(f => ({ ...f, [k]: e.target.value }));
  return (
    <div className="min-h-screen pb-20" style={{ paddingTop: '56px', background: '#0b0b12' }}>
      <div className="flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: '#1e1e2a' }}>
        <button onClick={() => setLocation('/profile')}><X size={22} className="text-white" /></button>
        <h1 className="flex-1 text-white font-bold">Editar perfil</h1>
        <button onClick={save} disabled={saving} className="font-bold text-sm px-4 py-1.5 rounded-lg disabled:opacity-50" style={{ background: '#00F5FF', color: 'black' }}>{saving ? <Spinner /> : 'Guardar'}</button>
      </div>
      <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
        <div className="flex flex-col items-center gap-3">
          <div className="w-20 h-20 rounded-full overflow-hidden" style={{ background: '#7c3aed', border: '3px solid #2a2a3a' }}>{form.avatarUrl ? <img src={form.avatarUrl} alt="" className="w-full h-full object-cover" /> : <span className="w-full h-full flex items-center justify-center text-white font-black text-3xl">{form.username[0]?.toUpperCase()}</span>}</div>
          <input placeholder="URL foto de perfil" value={form.avatarUrl} onChange={set('avatarUrl')} className="w-full rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none text-center" style={{ background: '#1e1e2a', border: '1px solid #2a2a3a' }} />
        </div>
        {[{ k: 'username', l: 'Nombre de usuario', p: '@username' }, { k: 'city', l: 'Ciudad', p: 'Tu ciudad' }].map(f => (
          <div key={f.k}><label className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2 block">{f.l}</label><input value={(form as any)[f.k]} onChange={set(f.k)} placeholder={f.p} className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none" style={{ background: '#1e1e2a', border: '1px solid #2a2a3a' }} /></div>
        ))}
        <div>
          <label className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2 block">Biografía</label>
          <textarea value={form.bio} onChange={set('bio')} rows={3} maxLength={150} placeholder="Cuéntanos sobre ti..." className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none resize-none" style={{ background: '#1e1e2a', border: '1px solid #2a2a3a' }} />
          <p className="text-gray-600 text-xs text-right mt-1">{form.bio.length}/150</p>
        </div>
        {msg && <p className="text-center font-medium" style={{ color: msg.includes('✅') ? '#22c55e' : '#ef4444' }}>{msg}</p>}
      </div>
    </div>
  );
}
