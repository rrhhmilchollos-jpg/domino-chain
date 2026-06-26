import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { ChevronLeft, Send } from 'lucide-react';
import { useAuth, useApi, Av, Spinner, ago, API } from '../lib/shared';

interface Message { _id: string; fromUserId: { _id: string; username: string; avatarUrl: string; flag: string }; toUserId: { _id: string; username: string; avatarUrl: string; flag: string }; text: string; read: boolean; createdAt: string; }

export default function ChatPage({ userId }: { userId: string }) {
  const { user, token } = useAuth();
  const [, setLocation] = useLocation();
  const { data: msgs, setData, loading } = useApi(`/api/users/messages/${userId}`, [userId]);
  const { data: other } = useApi(`/api/users/${userId}`, [userId]);
  const [text, setText] = useState(''); const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs]);
  const send = async () => {
    if (!text.trim() || !token) return; setSending(true);
    const opt = { _id: Date.now().toString(), fromUserId: { _id: user?._id || '', username: user?.username || '', avatarUrl: user?.avatarUrl || '', flag: '' }, toUserId: { _id: userId, username: '', avatarUrl: '', flag: '' }, text: text.trim(), read: false, createdAt: new Date().toISOString() };
    setData((p: Message[]) => [...(Array.isArray(p) ? p : []), opt]); setText('');
    try { const r = await fetch(`${API}/api/users/messages/${userId}`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ text: opt.text }) }); const m = await r.json(); if (r.ok) setData((p: Message[]) => [...(Array.isArray(p) ? p : []).filter(x => x._id !== opt._id), m]); } finally { setSending(false); }
  };
  return (
    <div className="fixed inset-0 flex flex-col" style={{ background: '#0b0b12' }}>
      <div className="flex items-center gap-3 px-4 py-3 border-b flex-shrink-0" style={{ paddingTop: 'max(12px,env(safe-area-inset-top))', background: 'rgba(11,11,18,0.97)', borderColor: '#1e1e2a', backdropFilter: 'blur(20px)' }}>
        <button onClick={() => setLocation('/messages')} className="p-1"><ChevronLeft size={24} className="text-white" /></button>
        {other && <button onClick={() => setLocation(`/user/${userId}`)} className="flex items-center gap-3 flex-1"><Av u={other} s={38} /><div><p className="text-white font-bold text-sm">@{other.username}</p><p className="text-green-400 text-xs">activo ahora</p></div></button>}
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
        {loading && <div className="flex justify-center py-8"><Spinner /></div>}
        {(Array.isArray(msgs) ? msgs : []).map((m: Message, i: number) => {
          const isMe = m.fromUserId._id === user?._id;
          const prev = i > 0 ? (Array.isArray(msgs) ? msgs : [])[i - 1] : null;
          const showAv = !isMe && (!prev || prev.fromUserId._id !== m.fromUserId._id);
          return (
            <div key={m._id} className={`flex gap-2 items-end ${isMe ? 'justify-end' : 'justify-start'}`}>
              {!isMe && (showAv ? <Av u={m.fromUserId} s={26} /> : <div className="w-[26px] flex-shrink-0" />)}
              <div className={`max-w-[72%] px-3.5 py-2.5 text-sm leading-relaxed ${isMe ? 'rounded-2xl rounded-br-md' : 'rounded-2xl rounded-bl-md'}`} style={isMe ? { background: '#00F5FF', color: '#0b0b12' } : { background: '#1e1e2a', color: 'white' }}>
                {m.text}
                <div className={`text-xs mt-1 ${isMe ? 'text-teal-700' : 'text-gray-600'}`}>{ago(m.createdAt)}</div>
              </div>
            </div>
          );
        })}
        {(Array.isArray(msgs) ? msgs : []).length === 0 && !loading && <div className="text-center py-12">{other && <Av u={other} s={64} />}<p className="text-white font-bold mt-4 mb-1">@{other?.username}</p><p className="text-gray-400 text-sm">Empieza la conversación</p></div>}
        <div ref={bottomRef} />
      </div>
      <div className="flex-shrink-0 px-4 py-3 border-t flex items-center gap-3" style={{ background: 'rgba(11,11,18,0.97)', borderColor: '#1e1e2a', paddingBottom: 'max(12px,env(safe-area-inset-bottom))' }}>
        <span className="text-xl">😊</span>
        <div className="flex-1 flex items-center gap-2 rounded-full px-4 py-2.5" style={{ background: '#1e1e2a', border: '1px solid #2a2a3a' }}>
          <input value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} placeholder="Mensaje..." className="flex-1 bg-transparent text-white text-sm placeholder-gray-500 focus:outline-none" />
        </div>
        {text.trim() ? <button onClick={send} disabled={sending} className="w-10 h-10 rounded-full flex items-center justify-center disabled:opacity-50" style={{ background: '#00F5FF' }}><Send size={16} className="text-black" /></button> : <span className="text-xl">🎁</span>}
      </div>
    </div>
  );
}
