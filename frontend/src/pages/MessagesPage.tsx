import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { MessageCircle, Search } from 'lucide-react';
import { useAuth, useApi, Av, Spinner, ago, API } from '../lib/shared';

interface Message { _id: string; fromUserId: { _id: string; username: string; avatarUrl: string; flag: string }; toUserId: { _id: string; username: string; avatarUrl: string; flag: string }; text: string; read: boolean; createdAt: string; }
interface Conversation { user: { _id: string; username: string; avatarUrl: string; flag: string }; lastMessage: Message; unread: number; }

export default function MessagesPage() {
  const { user } = useAuth();
  const { data: convs, loading } = useApi('/api/users/messages/inbox', [user?._id]);
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState('');
  if (!user) return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6" style={{ paddingTop: '56px', background: '#0b0b12' }}>
      <MessageCircle size={56} className="text-gray-700 mb-4" />
      <h2 className="text-white font-bold text-xl mb-2">Inicia sesión</h2>
      <p className="text-gray-400 text-sm text-center mb-6">Conecta con otros usuarios de DOMINO</p>
      <button onClick={() => setLocation('/auth')} className="px-8 py-3 rounded-2xl font-bold text-black" style={{ background: '#00F5FF' }}>Entrar</button>
    </div>
  );
  const list = Array.isArray(convs) ? convs : [];
  const filtered = search ? list.filter((c: Conversation) => c.user.username.toLowerCase().includes(search.toLowerCase())) : list;
  return (
    <div className="min-h-screen pb-20" style={{ paddingTop: '56px', background: '#0b0b12' }}>
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between px-4 py-4">
          <h1 className="text-xl font-black text-white">Mensajes</h1>
          <button onClick={() => setLocation('/search')} className="p-2 rounded-lg" style={{ background: '#1e1e2a' }}><Search size={18} className="text-gray-300" /></button>
        </div>
        <div className="px-4 mb-4">
          <div className="relative"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar conversaciones..." className="w-full rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none" style={{ background: '#1e1e2a', border: '1px solid #2a2a3a' }} /></div>
        </div>
        {loading ? <div className="flex justify-center py-12"><Spinner /></div> : filtered.length === 0 ? (
          <div className="text-center py-20 px-6">
            <MessageCircle size={48} className="mx-auto text-gray-700 mb-4" />
            <h3 className="text-white font-bold mb-2">{search ? 'Sin resultados' : 'Sin mensajes todavía'}</h3>
            <p className="text-gray-400 text-sm mb-6">{search ? 'Prueba otro nombre' : 'Sigue usuarios y empieza a chatear'}</p>
            {!search && <button onClick={() => setLocation('/search')} className="px-6 py-2.5 rounded-xl font-bold text-black text-sm" style={{ background: '#00F5FF' }}>Buscar usuarios</button>}
          </div>
        ) : (
          <div>{filtered.map((c: Conversation) => (
            <button key={c.user._id} onClick={() => setLocation(`/messages/${c.user._id}`)} className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-white/5 active:bg-white/10 transition-colors">
              <div className="relative"><Av u={c.user} s={52} /><div className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2" style={{ background: '#22c55e', borderColor: '#0b0b12' }} /></div>
              <div className="flex-1 min-w-0 text-left">
                <div className="flex items-center justify-between mb-0.5"><span className={`font-semibold text-sm ${c.unread > 0 ? 'text-white' : 'text-gray-200'}`}>{c.user.username}</span><span className="text-gray-500 text-xs">{ago(c.lastMessage?.createdAt)}</span></div>
                <p className={`text-xs truncate ${c.unread > 0 ? 'text-gray-200 font-medium' : 'text-gray-500'}`}>{c.lastMessage?.text || 'Nuevo chat'}</p>
              </div>
              {c.unread > 0 && <span className="min-w-[20px] h-5 rounded-full text-xs font-bold text-white flex items-center justify-center px-1.5 flex-shrink-0" style={{ background: '#FF007F' }}>{c.unread}</span>}
            </button>
          ))}</div>
        )}
      </div>
    </div>
  );
}
