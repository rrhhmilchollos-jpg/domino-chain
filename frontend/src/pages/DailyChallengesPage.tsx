import { useState, useEffect, useRef, useMemo } from 'react';
import { Link, useLocation } from 'wouter';
import { ChevronLeft, Camera, Users, Clock, CheckCircle2, Lock } from 'lucide-react';
import { useApi, useAuth, Spinner, fmt, left, Challenge, CalendarDay } from '../lib/shared';

const CATEGORY_INFO: Record<string, { emoji: string; color: string; label: string }> = {
  Kindness: { emoji: '💛', color: '#FF6FB5', label: 'Bondad' },
  Creativity: { emoji: '🎨', color: '#00F5FF', label: 'Creatividad' },
  Eco: { emoji: '🌱', color: '#4ade80', label: 'Eco' },
};
const FALLBACK_INFO = { emoji: '🎲', color: '#00F5FF', label: 'Reto' };

const dk = (d: Date) => d.toISOString().slice(0, 10);
const todayKey = () => dk(new Date());
const DOW_LABELS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

// Semanas completas (lunes-domingo) que cubren todo el año — nunca se corta
// una semana a la mitad, ni en el cambio de mes ni en el cambio de año.
function getYearWeeks(year: number): Date[][] {
  const jan1 = new Date(Date.UTC(year, 0, 1));
  const dow = jan1.getUTCDay();
  const firstMonday = new Date(jan1);
  firstMonday.setUTCDate(jan1.getUTCDate() - ((dow + 6) % 7));
  const dec31 = new Date(Date.UTC(year, 11, 31));
  const weeks: Date[][] = [];
  let cursor = new Date(firstMonday);
  while (cursor <= dec31) {
    const week: Date[] = [];
    for (let i = 0; i < 7; i++) { week.push(new Date(cursor)); cursor = new Date(cursor.getTime() + 86400000); }
    weeks.push(week);
  }
  return weeks;
}

export default function DailyChallengesPage() {
  const { token } = useAuth();
  const [, setLocation] = useLocation();
  const year = new Date().getFullYear();
  const weeks = useMemo(() => getYearWeeks(year), [year]);
  const from = dk(weeks[0][0]);
  const to = dk(weeks[weeks.length - 1][6]);

  const { data: todays, loading: loadingToday } = useApi('/api/challenges/daily');
  const { data: calendarData, loading: loadingCalendar } = useApi(`/api/challenges/calendar?from=${from}&to=${to}`, [from, to, token]);

  const calendarMap = useMemo(() => {
    const m: Record<string, CalendarDay> = {};
    (Array.isArray(calendarData) ? calendarData : []).forEach((d: CalendarDay) => { m[d.dayKey] = d; });
    return m;
  }, [calendarData]);

  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const todayWeekRef = useRef<HTMLDivElement>(null);
  const tk = todayKey();

  useEffect(() => {
    const t = setTimeout(() => todayWeekRef.current?.scrollIntoView({ block: 'center' }), 150);
    return () => clearTimeout(t);
  }, [loadingCalendar]);

  const selectedDayData = selectedDay ? calendarMap[selectedDay] : null;

  return (
    <div className="min-h-screen pb-24" style={{ paddingTop: '56px', background: '#000' }}>
      <div className="sticky z-10 flex items-center gap-3 px-4 py-3" style={{ top: '56px', background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(12px)', borderBottom: '1px solid #1e1e2a' }}>
        <Link href="/" className="p-1.5 -ml-1.5"><ChevronLeft size={22} className="text-white" /></Link>
        <h1 className="text-lg font-black text-white" style={{ fontFamily: 'Syne,sans-serif' }}>Retos Diarios</h1>
      </div>

      {/* Los 2 retos de hoy */}
      <div className="px-4 pt-5">
        <h2 className="text-sm font-bold text-gray-400 mb-3 uppercase tracking-wide">Hoy tienes 2 retos</h2>
        {loadingToday && <div className="flex justify-center py-6"><Spinner /></div>}
        <div className="space-y-3 mb-7">
          {(Array.isArray(todays) ? todays : []).map((c: Challenge, i: number) => {
            const info = CATEGORY_INFO[c.category] || FALLBACK_INFO;
            return (
              <div key={c._id} className="rounded-2xl p-4" style={{ background: '#13131f', border: `1px solid ${info.color}33` }}>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full inline-block mb-2" style={{ background: `${info.color}22`, color: info.color }}>{info.emoji} Reto {i + 1} · {info.label}</span>
                <h3 className="font-bold text-white text-base mb-1">{c.title}</h3>
                <p className="text-sm text-gray-400 mb-3">{c.description}</p>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-1 text-xs text-gray-500"><Users size={12} />{fmt(c.globalCounter)} participantes</div>
                  <div className="flex items-center gap-1 text-xs text-gray-500"><Clock size={12} />{left(c.expiresAt)}</div>
                </div>
                <button onClick={() => setLocation(`/camera?challengeId=${c._id}`)} className="w-full py-2.5 rounded-xl text-sm font-bold text-black flex items-center justify-center gap-2" style={{ background: `linear-gradient(135deg,${info.color},#7c3aed)` }}><Camera size={16} />Grabar este reto</button>
              </div>
            );
          })}
          {!loadingToday && (!todays || todays.length === 0) && <p className="text-center text-gray-500 text-sm py-4">No hay retos de hoy todavía — vuelve en un momento.</p>}
        </div>
      </div>

      {/* Calendario anual, semana a semana completa */}
      <div className="px-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wide">Calendario {year}</h2>
          {loadingCalendar && <Spinner />}
        </div>
        <div className="flex items-center gap-3 mb-3 text-[11px] text-gray-500 flex-wrap">
          <span className="flex items-center gap-1"><CheckCircle2 size={11} style={{ color: '#00F5FF' }} />Completado</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full" style={{ background: '#16161f', border: '1px solid #2a2a3a' }} />Pendiente</span>
          <span className="flex items-center gap-1"><Lock size={10} />Por venir</span>
        </div>
        <div className="rounded-2xl overflow-hidden" style={{ background: '#0b0b12', border: '1px solid #1e1e2a' }}>
          <div className="grid grid-cols-7 gap-0 px-3 pt-3 pb-1">
            {DOW_LABELS.map((l, i) => <div key={i} className="text-center text-[10px] text-gray-600 font-bold">{l}</div>)}
          </div>
          <div className="max-h-[440px] overflow-y-auto px-3 pb-3">
            {weeks.map((week, wi) => {
              const isCurrentWeek = week.some(d => dk(d) === tk);
              const monthChanged = wi === 0 || week[0].getUTCMonth() !== weeks[wi - 1][0].getUTCMonth();
              return (
                <div key={wi} ref={isCurrentWeek ? todayWeekRef : undefined} className="mb-1">
                  {monthChanged && <div className="text-[10px] font-bold text-gray-500 pt-2.5 pb-1">{MONTHS[week[3].getUTCMonth()]}</div>}
                  <div className="grid grid-cols-7 gap-1">
                    {week.map(d => {
                      const key = dk(d);
                      const isFuture = key > tk;
                      const isToday = key === tk;
                      const day = calendarMap[key];
                      const allDone = !!day && day.challenges.length > 0 && day.challenges.every(c => c.completed);
                      const someDone = !!day && day.challenges.some(c => c.completed);
                      return (
                        <button key={key} disabled={isFuture} onClick={() => !isFuture && setSelectedDay(key)}
                          className="aspect-square rounded-lg flex items-center justify-center text-[11px] font-bold relative"
                          style={{
                            background: isFuture ? 'transparent' : allDone ? 'rgba(0,245,255,0.25)' : someDone ? 'rgba(0,245,255,0.12)' : '#16161f',
                            border: isToday ? '1.5px solid #00F5FF' : allDone ? '1px solid #00F5FF' : '1px solid transparent',
                            color: isFuture ? '#3a3a45' : '#fff',
                            cursor: isFuture ? 'default' : 'pointer'
                          }}>
                          {isFuture ? <Lock size={10} /> : d.getUTCDate()}
                          {allDone && <CheckCircle2 size={9} className="absolute" style={{ top: '-3px', right: '-3px', color: '#00F5FF', background: '#0b0b12', borderRadius: '50%' }} />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Detalle de un día */}
      {selectedDay && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.85)' }} onClick={() => setSelectedDay(null)}>
          <div className="w-full max-w-md rounded-2xl p-5" style={{ background: '#13131f', border: '1px solid #1e1e2a' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-white">{new Date(selectedDay + 'T00:00:00Z').toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })}</h3>
              <button onClick={() => setSelectedDay(null)} className="text-gray-400 text-2xl leading-none">×</button>
            </div>
            {selectedDayData?.challenges.length ? (
              <div className="space-y-3">
                {selectedDayData.challenges.map(c => {
                  const info = CATEGORY_INFO[c.category] || FALLBACK_INFO;
                  return (
                    <div key={c._id} className="rounded-xl p-3 flex items-center gap-3" style={{ background: '#0b0b12', border: '1px solid #1e1e2a' }}>
                      <span className="text-xl flex-shrink-0">{info.emoji}</span>
                      <div className="flex-1 min-w-0"><p className="text-sm font-semibold text-white truncate">{c.title}</p><p className="text-xs text-gray-500">{info.label}</p></div>
                      {c.completed
                        ? <CheckCircle2 size={20} style={{ color: '#00F5FF' }} className="flex-shrink-0" />
                        : selectedDay === tk
                          ? <button onClick={() => setLocation(`/camera?challengeId=${c._id}`)} className="text-xs font-bold px-3 py-1.5 rounded-full text-black flex-shrink-0" style={{ background: '#00F5FF' }}>Grabar</button>
                          : <span className="text-[10px] text-gray-600 flex-shrink-0">No completado</span>}
                    </div>
                  );
                })}
              </div>
            ) : <p className="text-center text-gray-500 text-sm py-4">Sin datos para este día</p>}
          </div>
        </div>
      )}
    </div>
  );
}
