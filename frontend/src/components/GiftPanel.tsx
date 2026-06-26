import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Coins } from 'lucide-react';
import { cn, useAuth, API } from '../lib/shared';
import { GIFT_CATALOG_FULL, GIFT_CATEGORIES, GIFT_BY_ID, GiftDef } from '../lib/giftCatalog';

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface GiftPanelProps {
  liveId: string;
  hostId: string;
  onClose: () => void;
  onGiftSent?: (gift: GiftDef, qty: number) => void;
  target?: 'host' | 'opponent';
  opponentId?: string;
}

interface GiftAnimEvent {
  id: number;
  gift: GiftDef;
  sender: string;
  qty: number;
  combo?: number;
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function GiftPanel({ liveId, hostId, onClose, onGiftSent, target = 'host', opponentId }: GiftPanelProps) {
  const { user, token, refreshUser } = useAuth();
  const [category, setCategory] = useState<string>('all');
  const [selected, setSelected] = useState<GiftDef | null>(null);
  const [qty, setQty] = useState(1);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const gifts = category === 'all'
    ? GIFT_CATALOG_FULL
    : GIFT_CATALOG_FULL.filter(g => g.category === category);

  const totalCost = selected ? selected.coins * qty : 0;
  const canAfford = (user?.coins ?? 0) >= totalCost;

  async function sendGift() {
    if (!selected || !token || sending) return;
    setSending(true);
    setError(null);
    try {
      const toUserId = target === 'opponent' && opponentId ? opponentId : hostId;
      const res = await fetch(`${API}/api/lives/${liveId}/gift`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ giftType: selected.id, quantity: qty, toUserId }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Error al enviar regalo'); return; }
      await refreshUser();
      onGiftSent?.(selected, qty);
      onClose();
    } catch {
      setError('Error de red');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end" onClick={onClose}>
      <div
        className="w-full rounded-t-2xl overflow-hidden"
        style={{ background: 'rgba(10,10,20,0.97)', border: '1px solid rgba(255,255,255,0.1)', maxHeight: '75vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <span className="font-bold text-white text-lg">🎁 Enviar regalo</span>
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold" style={{ color: '#00F5FF' }}>🪙 {(user?.coins ?? 0).toLocaleString()}</span>
            <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={20} /></button>
          </div>
        </div>

        {/* Categorías */}
        <div className="flex gap-2 px-4 py-2 overflow-x-auto scrollbar-hide">
          {GIFT_CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setCategory(cat.id)}
              className={cn(
                'flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-all',
                category === cat.id
                  ? 'text-black'
                  : 'text-gray-400 hover:text-white'
              )}
              style={category === cat.id ? { background: '#00F5FF' } : { background: 'rgba(255,255,255,0.08)' }}
            >
              {cat.emoji} {cat.label}
            </button>
          ))}
        </div>

        {/* Grid de regalos */}
        <div className="grid grid-cols-4 gap-2 px-4 py-2 overflow-y-auto" style={{ maxHeight: '35vh' }}>
          {gifts.map(gift => (
            <button
              key={gift.id}
              onClick={() => { setSelected(gift); setQty(1); }}
              className={cn(
                'flex flex-col items-center gap-1 p-2 rounded-xl transition-all',
                selected?.id === gift.id ? 'ring-2' : 'hover:bg-white/5'
              )}
              style={selected?.id === gift.id
                ? { background: `${gift.color}22`, ringColor: gift.color, boxShadow: `0 0 12px ${gift.color}44` }
                : { background: 'rgba(255,255,255,0.04)' }
              }
            >
              <div className="relative w-14 h-14 flex items-center justify-center">
                <img
                  src={gift.image}
                  alt={gift.name}
                  className="w-12 h-12 object-contain"
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
                {gift.type === 'fullscreen' && (
                  <span className="absolute -top-1 -right-1 text-xs bg-yellow-500 text-black rounded-full px-1 font-bold">✨</span>
                )}
                {gift.type === 'interactive' && (
                  <span className="absolute -top-1 -right-1 text-xs rounded-full px-1 font-bold" style={{ background: '#00F5FF', color: '#000' }}>⚡</span>
                )}
              </div>
              <span className="text-white text-xs font-medium truncate w-full text-center">{gift.name}</span>
              <span className="text-xs font-bold" style={{ color: '#FFD700' }}>🪙 {gift.coins}</span>
            </button>
          ))}
        </div>

        {/* Panel de envío */}
        {selected && (
          <div
            className="px-4 py-3 flex items-center gap-3"
            style={{ borderTop: '1px solid rgba(255,255,255,0.08)', background: 'rgba(0,0,0,0.4)' }}
          >
            <img src={selected.image} alt={selected.name} className="w-12 h-12 object-contain" />
            <div className="flex-1">
              <div className="font-bold text-white">{selected.name}</div>
              <div className="text-xs text-gray-400">{selected.description}</div>
              {error && <div className="text-xs text-red-400 mt-1">{error}</div>}
            </div>

            {/* Selector de cantidad */}
            <div className="flex items-center gap-1">
              {[1, 5, 10, 99].map(n => (
                <button
                  key={n}
                  onClick={() => setQty(n)}
                  className={cn('w-8 h-8 rounded-lg text-xs font-bold transition-all', qty === n ? 'text-black' : 'text-gray-300')}
                  style={qty === n ? { background: '#00F5FF' } : { background: 'rgba(255,255,255,0.1)' }}
                >
                  x{n}
                </button>
              ))}
            </div>

            {/* Botón enviar */}
            <button
              onClick={sendGift}
              disabled={sending || !canAfford}
              className={cn(
                'px-4 py-2 rounded-xl font-bold text-sm transition-all',
                canAfford ? 'text-black' : 'text-gray-500 cursor-not-allowed'
              )}
              style={canAfford ? { background: '#00F5FF', boxShadow: '0 0 16px #00F5FF88' } : { background: 'rgba(255,255,255,0.1)' }}
            >
              {sending ? '...' : canAfford ? `🪙 ${totalCost}` : 'Sin monedas'}
            </button>
          </div>
        )}

        {/* Botón recargar monedas */}
        {selected && !canAfford && (
          <div className="px-4 pb-3 text-center">
            <a href="/coins" className="text-sm font-bold" style={{ color: '#00F5FF' }}>
              + Recargar monedas
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Animaciones de regalos en pantalla ──────────────────────────────────────
interface GiftAnimationOverlayProps {
  events: GiftAnimEvent[];
  onDone: (id: number) => void;
}

export function GiftAnimationOverlay({ events, onDone }: GiftAnimationOverlayProps) {
  return (
    <div className="pointer-events-none fixed inset-0 z-40 overflow-hidden">
      {events.map(ev => (
        <GiftAnimation key={ev.id} event={ev} onDone={() => onDone(ev.id)} />
      ))}
    </div>
  );
}

function GiftAnimation({ event, onDone }: { event: GiftAnimEvent; onDone: () => void }) {
  const { gift, sender, qty, combo } = event;

  useEffect(() => {
    const duration = gift.type === 'fullscreen' ? 4000 : gift.type === 'interactive' ? 3000 : 2000;
    const t = setTimeout(onDone, duration);
    return () => clearTimeout(t);
  }, []);

  if (gift.type === 'fullscreen') return <FullscreenGiftAnim gift={gift} sender={sender} qty={qty} combo={combo} />;
  if (gift.type === 'interactive') return <InteractiveGiftAnim gift={gift} sender={sender} qty={qty} combo={combo} />;
  return <NormalGiftAnim gift={gift} sender={sender} qty={qty} />;
}

// ─── Animación normal (burbuja flotante) ──────────────────────────────────────
function NormalGiftAnim({ gift, sender, qty }: { gift: GiftDef; sender: string; qty: number }) {
  return (
    <div
      className="absolute left-4 animate-gift-float"
      style={{ bottom: '25%', animation: 'giftFloat 2s ease-out forwards' }}
    >
      <div
        className="flex items-center gap-2 px-3 py-2 rounded-full"
        style={{
          background: `linear-gradient(135deg, ${gift.color}33, rgba(0,0,0,0.8))`,
          border: `1px solid ${gift.color}66`,
          backdropFilter: 'blur(8px)',
        }}
      >
        <img src={gift.image} alt={gift.name} className="w-8 h-8 object-contain" />
        <div>
          <div className="text-white text-xs font-bold">{sender}</div>
          <div className="text-xs" style={{ color: gift.color }}>
            {qty > 1 ? `x${qty} ` : ''}{gift.name}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Animación interactiva (entra desde el lado con efectos) ──────────────────
function InteractiveGiftAnim({ gift, sender, qty, combo }: { gift: GiftDef; sender: string; qty: number; combo?: number }) {
  return (
    <div
      className="absolute inset-x-0"
      style={{ bottom: '30%', animation: 'giftSlideIn 0.5s ease-out forwards' }}
    >
      {/* Banner del regalo */}
      <div
        className="mx-4 rounded-2xl overflow-hidden"
        style={{
          background: `linear-gradient(135deg, rgba(0,0,0,0.9), ${gift.color}33)`,
          border: `2px solid ${gift.color}`,
          boxShadow: `0 0 30px ${gift.color}66`,
        }}
      >
        <div className="flex items-center gap-3 p-3">
          <div className="relative">
            <img src={gift.image} alt={gift.name} className="w-16 h-16 object-contain" style={{ animation: 'giftPulse 0.5s ease-in-out infinite alternate' }} />
            {qty > 1 && (
              <span
                className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-black text-black"
                style={{ background: gift.color }}
              >
                {qty}
              </span>
            )}
          </div>
          <div className="flex-1">
            <div className="text-white font-black text-base">{sender}</div>
            <div className="font-bold" style={{ color: gift.color }}>envió {gift.name}</div>
            <div className="text-gray-300 text-xs">{gift.description}</div>
          </div>
          <div className="text-right">
            <div className="text-2xl">{gift.emoji}</div>
            {combo && combo > 1 && (
              <div className="text-xs font-black" style={{ color: '#FFD700' }}>x{combo} COMBO!</div>
            )}
          </div>
        </div>
        {/* Barra de progreso animada */}
        <div className="h-1 w-full" style={{ background: 'rgba(255,255,255,0.1)' }}>
          <div
            className="h-full"
            style={{ background: gift.color, animation: 'giftProgress 3s linear forwards' }}
          />
        </div>
      </div>

      {/* Partículas */}
      <GiftParticles color={gift.color} count={qty > 5 ? 20 : 10} />
    </div>
  );
}

// ─── Animación fullscreen (toma toda la pantalla) ─────────────────────────────
function FullscreenGiftAnim({ gift, sender, qty, combo }: { gift: GiftDef; sender: string; qty: number; combo?: number }) {
  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center z-50"
      style={{
        background: `radial-gradient(ellipse at center, ${gift.color}44 0%, rgba(0,0,0,0.95) 70%)`,
        animation: 'fullscreenGiftIn 0.6s ease-out forwards',
      }}
    >
      {/* Imagen grande del regalo */}
      <div className="relative" style={{ animation: 'giftBounceIn 0.6s cubic-bezier(0.175,0.885,0.32,1.275) forwards' }}>
        <img
          src={gift.image}
          alt={gift.name}
          className="w-48 h-48 object-contain"
          style={{ filter: `drop-shadow(0 0 40px ${gift.color})` }}
        />
        {/* Anillo de glow pulsante */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: `radial-gradient(circle, ${gift.color}33 0%, transparent 70%)`,
            animation: 'glowPulse 0.8s ease-in-out infinite alternate',
          }}
        />
      </div>

      {/* Nombre del regalo */}
      <div
        className="mt-4 text-4xl font-black text-center"
        style={{ color: gift.color, textShadow: `0 0 20px ${gift.color}`, animation: 'textGlowIn 0.8s ease-out 0.3s both' }}
      >
        {gift.name}
      </div>

      {/* Quien lo envió */}
      <div className="mt-2 text-white text-lg font-bold" style={{ animation: 'textGlowIn 0.8s ease-out 0.5s both' }}>
        {sender} {qty > 1 ? `x${qty}` : ''}
      </div>

      {/* Combo */}
      {combo && combo > 1 && (
        <div
          className="mt-2 text-2xl font-black"
          style={{ color: '#FFD700', textShadow: '0 0 20px #FFD700', animation: 'comboIn 0.5s cubic-bezier(0.175,0.885,0.32,1.275) 0.7s both' }}
        >
          ✨ COMBO x{combo}!
        </div>
      )}

      {/* Partículas masivas */}
      <GiftParticles color={gift.color} count={40} fullscreen />
    </div>
  );
}

// ─── Partículas ───────────────────────────────────────────────────────────────
function GiftParticles({ color, count, fullscreen }: { color: string; count: number; fullscreen?: boolean }) {
  const particles = Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 8 + 4,
    delay: Math.random() * 1,
    duration: Math.random() * 1.5 + 1,
  }));

  return (
    <div className={fullscreen ? 'fixed inset-0 pointer-events-none' : 'absolute inset-0 pointer-events-none'}>
      {particles.map(p => (
        <div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            background: color,
            boxShadow: `0 0 ${p.size * 2}px ${color}`,
            animation: `particleFloat ${p.duration}s ease-out ${p.delay}s forwards`,
            opacity: 0,
          }}
        />
      ))}
    </div>
  );
}

// ─── Hook para gestionar los eventos de animación ─────────────────────────────
let animCounter = 0;
export function useGiftAnimations() {
  const [events, setEvents] = useState<GiftAnimEvent[]>([]);

  const addGiftAnim = useCallback((giftId: string, sender: string, qty = 1, combo?: number) => {
    const gift = GIFT_BY_ID[giftId];
    if (!gift) return;
    const id = ++animCounter;
    setEvents(prev => [...prev, { id, gift, sender, qty, combo }]);
    // Reproducir sonido
    playGiftSound(gift.sound);
  }, []);

  const removeAnim = useCallback((id: number) => {
    setEvents(prev => prev.filter(e => e.id !== id));
  }, []);

  return { events, addGiftAnim, removeAnim };
}

// ─── Reproducir sonido del regalo ─────────────────────────────────────────────
function playGiftSound(soundPath: string) {
  try {
    const audio = new Audio(soundPath);
    audio.volume = 0.6;
    audio.play().catch(() => {});
  } catch {}
}
