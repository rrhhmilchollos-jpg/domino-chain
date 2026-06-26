import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { X, Camera, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth, Spinner, API } from '../lib/shared';

const CLOUD_NAME = 'dawgpvzpr';
const UPLOAD_PRESET = 'domino_unsigned';

export default function EditProfilePage() {
  const { user, token, refreshUser } = useAuth();
  const [, setLocation] = useLocation();
  const [form, setForm] = useState({ username: '', bio: '', city: '', avatarUrl: '' });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [uploading, setUploading] = useState(false);
  const [usernameError, setUsernameError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      // Si el username actual es un email, limpiar el campo para que el usuario lo cambie
      const currentUsername = user.username || '';
      const isEmail = currentUsername.includes('@');
      setForm({
        username: isEmail ? '' : currentUsername,
        bio: user.bio || '',
        city: user.city || '',
        avatarUrl: user.avatarUrl || ''
      });
      if (isEmail) {
        setUsernameError('⚠️ Tu nombre de usuario actual es un email. Por favor elige un @username');
      }
    }
  }, [user]);

  const validateUsername = (val: string) => {
    if (!val) { setUsernameError('El username es obligatorio'); return false; }
    if (val.includes('@')) { setUsernameError('El username no puede contener @'); return false; }
    if (val.length < 3) { setUsernameError('Mínimo 3 caracteres'); return false; }
    if (val.length > 30) { setUsernameError('Máximo 30 caracteres'); return false; }
    if (!/^[a-zA-Z0-9_.]+$/.test(val)) { setUsernameError('Solo letras, números, _ y .'); return false; }
    setUsernameError('');
    return true;
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('upload_preset', UPLOAD_PRESET);
      fd.append('folder', 'domino/avatars');
      const r = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method: 'POST', body: fd });
      const d = await r.json();
      if (d.secure_url) setForm(f => ({ ...f, avatarUrl: d.secure_url }));
      else setMsg('❌ Error al subir la foto');
    } catch { setMsg('❌ Error al subir la foto'); }
    finally { setUploading(false); }
  };

  const save = async () => {
    if (!token) return;
    if (!validateUsername(form.username)) return;
    setSaving(true);
    try {
      const r = await fetch(`${API}/api/users/me`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      if (r.ok) {
        await refreshUser();
        setMsg('✅ Perfil guardado');
        setTimeout(() => setLocation('/dashboard'), 1200);
      } else {
        const d = await r.json();
        setMsg(`❌ ${d.error || 'Error al guardar'}`);
      }
    } catch { setMsg('❌ Error de conexión'); }
    finally { setSaving(false); }
  };

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const val = e.target.value;
    setForm(f => ({ ...f, [k]: val }));
    if (k === 'username') validateUsername(val);
  };

  return (
    <div className="min-h-screen pb-20" style={{ paddingTop: '56px', background: '#0b0b12' }}>
      <div className="flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: '#1e1e2a' }}>
        <button onClick={() => setLocation('/dashboard')}><X size={22} className="text-white" /></button>
        <h1 className="flex-1 text-white font-bold">Editar perfil</h1>
        <button onClick={save} disabled={saving || !!usernameError || !form.username} className="font-bold text-sm px-4 py-1.5 rounded-lg disabled:opacity-50" style={{ background: '#00F5FF', color: 'black' }}>
          {saving ? <Spinner /> : 'Guardar'}
        </button>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
        {/* Avatar */}
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <div className="w-24 h-24 rounded-full overflow-hidden" style={{ background: '#7c3aed', border: '3px solid #2a2a3a' }}>
              {form.avatarUrl
                ? <img src={form.avatarUrl} alt="" className="w-full h-full object-cover" />
                : <span className="w-full h-full flex items-center justify-center text-white font-black text-3xl">{(form.username || user?.username || '?')[0]?.toUpperCase()}</span>
              }
            </div>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="absolute bottom-0 right-0 w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: '#00F5FF' }}
            >
              {uploading ? <Spinner /> : <Camera size={14} color="black" />}
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
          </div>
          <p className="text-gray-500 text-xs">Toca la cámara para cambiar la foto</p>
        </div>

        {/* Username */}
        <div>
          <label className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2 block">Nombre de usuario</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">@</span>
            <input
              value={form.username}
              onChange={set('username')}
              placeholder="tunombre"
              className="w-full rounded-xl pl-8 pr-10 py-3 text-sm text-white placeholder-gray-500 focus:outline-none"
              style={{ background: '#1e1e2a', border: `1px solid ${usernameError ? '#ef4444' : form.username && !usernameError ? '#22c55e' : '#2a2a3a'}` }}
            />
            {form.username && !usernameError && <CheckCircle size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500" />}
            {usernameError && <AlertCircle size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-red-500" />}
          </div>
          {usernameError && <p className="text-red-400 text-xs mt-1">{usernameError}</p>}
          {!usernameError && form.username && <p className="text-green-400 text-xs mt-1">✓ Username disponible</p>}
        </div>

        {/* Ciudad */}
        <div>
          <label className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2 block">Ciudad</label>
          <input
            value={form.city}
            onChange={set('city')}
            placeholder="Tu ciudad"
            className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none"
            style={{ background: '#1e1e2a', border: '1px solid #2a2a3a' }}
          />
        </div>

        {/* Biografía */}
        <div>
          <label className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2 block">Biografía</label>
          <textarea
            value={form.bio}
            onChange={set('bio')}
            rows={3}
            maxLength={150}
            placeholder="Cuéntanos sobre ti..."
            className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none resize-none"
            style={{ background: '#1e1e2a', border: '1px solid #2a2a3a' }}
          />
          <p className="text-gray-600 text-xs text-right mt-1">{form.bio.length}/150</p>
        </div>

        {msg && (
          <p className="text-center font-medium py-2 rounded-xl" style={{ color: msg.includes('✅') ? '#22c55e' : '#ef4444', background: msg.includes('✅') ? '#22c55e15' : '#ef444415' }}>
            {msg}
          </p>
        )}
      </div>
    </div>
  );
}
