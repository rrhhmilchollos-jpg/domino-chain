import { useState, useRef, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'wouter';
import { X, CheckCircle, Download, Upload, RefreshCw, Play, Search, Users2, Scissors } from 'lucide-react';
import { cn, useAuth, useApi, Spinner, Av, DominoLogo, uploadToCloudinary, saveVideoToGallery, API, CLOUDINARY_PRESET, RankingEntry, DominoVideo } from '../lib/shared';

type Mode = 'duet' | 'stitch';
const CANVAS_W = 720, CANVAS_H = 1280;
const TOTAL_SECS = 15;
const STITCH_CLIP_SECS = 5; // cuánto del video original se usa antes de pasar a tu cámara

// Dibuja `source` dentro del rectángulo destino cubriéndolo entero (como
// CSS object-fit:cover), sin deformar la imagen.
function drawCover(ctx: CanvasRenderingContext2D, source: HTMLVideoElement, dx: number, dy: number, dw: number, dh: number) {
  const sw = source.videoWidth, sh = source.videoHeight;
  if (!sw || !sh) return;
  const scale = Math.max(dw / sw, dh / sh);
  const sx = (sw - dw / scale) / 2, sy = (sh - dh / scale) / 2;
  ctx.drawImage(source, sx, sy, dw / scale, dh / scale, dx, dy, dw, dh);
}

export default function RemixCameraPage({ videoId }: { videoId: string }) {
  const { user, token } = useAuth();
  const [, setLocation] = useLocation();
  const initialMode = (new URLSearchParams(window.location.search).get('mode') === 'stitch' ? 'stitch' : 'duet') as Mode;
  const [mode, setMode] = useState<Mode>(initialMode);

  const { data: original, loading: loadingOriginal } = useApi(`/api/videos/${videoId}`, [videoId]);
  const { data: challenge } = useApi('/api/challenges/active');
  const { data: users } = useApi('/api/ranking?limit=20');

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const camFeedRef = useRef<HTMLVideoElement>(null);    // tu cámara, oculta — fuente para el canvas
  const originalRef = useRef<HTMLVideoElement>(null);   // el video original, oculto — fuente para el canvas
  const previewRef = useRef<HTMLVideoElement>(null);
  const camStreamRef = useRef<MediaStream|null>(null);
  const audioCtxRef = useRef<AudioContext|null>(null);
  const audioDestRef = useRef<MediaStreamAudioDestinationNode|null>(null);
  const mrRef = useRef<MediaRecorder|null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const rafRef = useRef<number|null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval>|null>(null);
  const switchedRef = useRef(false); // stitch: ¿ya pasamos del clip original a tu cámara?
  const modeRef = useRef<Mode>(mode); // el draw loop necesita el modo actual sin re-crear el loop

  const [camOn, setCamOn] = useState(false);
  const [rec, setRec] = useState(false);
  const [secs, setSecs] = useState(TOTAL_SECS);
  const [done, setDone] = useState(false);
  const [blob, setBlob] = useState<Blob|null>(null);
  const [blobUrl, setBlobUrl] = useState<string|null>(null);
  const [showNom, setShowNom] = useState(false);
  const [published, setPublished] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [savedToGallery, setSavedToGallery] = useState(false);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [caption, setCaption] = useState('');
  const [error, setError] = useState<string|null>(null);
  const [geo, setGeo] = useState({lat:40.4168,lng:-3.7038});

  useEffect(()=>{ modeRef.current = mode; }, [mode]);
  useEffect(()=>{
    navigator.geolocation?.getCurrentPosition(p=>setGeo({lat:p.coords.latitude,lng:p.coords.longitude}));
    return ()=>{
      camStreamRef.current?.getTracks().forEach(t=>t.stop());
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
      audioCtxRef.current?.close().catch(()=>{});
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  },[]);

  // Bucle de dibujo: antes de grabar solo enseña tu cámara (para que veas
  // cómo sales); en cuanto se pulsa grabar, compone con el video original
  // según el modo (lado a lado en Dueto, secuencial en Stitch).
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const cam = camFeedRef.current;
    const orig = originalRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    const recording = mrRef.current?.state === 'recording';
    if (!recording || !orig) {
      if (cam) drawCover(ctx, cam, 0, 0, CANVAS_W, CANVAS_H);
    } else if (modeRef.current === 'duet') {
      drawCover(ctx, orig, 0, 0, CANVAS_W / 2, CANVAS_H);
      if (cam) drawCover(ctx, cam, CANVAS_W / 2, 0, CANVAS_W / 2, CANVAS_H);
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.fillRect(CANVAS_W / 2 - 1, 0, 2, CANVAS_H);
    } else {
      // Stitch: primero el clip original, luego tu cámara — secuencial, no a la vez
      if (!switchedRef.current) drawCover(ctx, orig, 0, 0, CANVAS_W, CANVAS_H);
      else if (cam) drawCover(ctx, cam, 0, 0, CANVAS_W, CANVAS_H);
    }
    rafRef.current = requestAnimationFrame(draw);
  }, []);

  const startCam = async () => {
    setError(null);
    try {
      let s: MediaStream;
      let audioStream: MediaStream|null = null;
      try { audioStream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 44100 } }); } catch {}
      try {
        const videoStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'user' }, width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } }, audio: false });
        s = new MediaStream([...videoStream.getVideoTracks(), ...(audioStream?.getAudioTracks()||[])]);
      } catch {
        try { s = await navigator.mediaDevices.getUserMedia({ video: true, audio: true }); }
        catch { s = await navigator.mediaDevices.getUserMedia({ video: true, audio: false }); }
      }
      camStreamRef.current = s;
      if (camFeedRef.current) { camFeedRef.current.srcObject = s; camFeedRef.current.muted = true; camFeedRef.current.playsInline = true; await camFeedRef.current.play().catch(()=>{}); }
      setCamOn(true);
      rafRef.current = requestAnimationFrame(draw);
    } catch (err: any) {
      setCamOn(false);
      setError(err?.name === 'NotAllowedError' ? 'Permiso denegado. Activa el acceso a cámara y micrófono en los ajustes de la app.' : `No se pudo activar la cámara: ${err?.message||'error desconocido'}`);
    }
  };

  const stopRec = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (mrRef.current && mrRef.current.state !== 'inactive') mrRef.current.stop();
    originalRef.current?.pause();
    setRec(false);
  }, []);

  const startRec = async () => {
    if (!camStreamRef.current || !canvasRef.current || !original?.videoUrl) return;
    setError(null);
    chunksRef.current = [];
    switchedRef.current = false;

    try {
      // Mezcla de audio real: el sonido del video original (a menor volumen)
      // + tu micrófono, combinados en una sola pista — así no se pierde
      // ninguno de los dos en la grabación final.
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioCtxRef.current = audioCtx;
      const dest = audioCtx.createMediaStreamDestination();
      audioDestRef.current = dest;

      if (originalRef.current) {
        const origSource = audioCtx.createMediaElementSource(originalRef.current);
        const origGain = audioCtx.createGain();
        origGain.gain.value = mode === 'stitch' ? 1 : 0.6; // en dueto bajamos el original para que se oiga tu reacción
        origSource.connect(origGain);
        origGain.connect(dest);
        origGain.connect(audioCtx.destination); // para que también lo oigas mientras grabas
      }
      const micTracks = camStreamRef.current.getAudioTracks();
      if (micTracks.length) {
        const micSource = audioCtx.createMediaStreamSource(new MediaStream(micTracks));
        const micGain = audioCtx.createGain();
        micGain.gain.value = 1;
        micSource.connect(micGain);
        micGain.connect(dest);
      }

      if (originalRef.current) { originalRef.current.currentTime = 0; await originalRef.current.play().catch(()=>{}); }

      const canvasStream = (canvasRef.current as any).captureStream(30) as MediaStream;
      const combined = new MediaStream([...canvasStream.getVideoTracks(), ...dest.stream.getAudioTracks()]);

      const mimeOptions = ['video/mp4;codecs=avc1,mp4a.40.2','video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm;codecs=h264,opus','video/webm','video/mp4'];
      const mime = mimeOptions.find(t=>{try{return MediaRecorder.isTypeSupported(t);}catch{return false;}})||'';
      const mr = new MediaRecorder(combined, mime?{mimeType:mime,audioBitsPerSecond:128000,videoBitsPerSecond:2500000}:{});
      mr.ondataavailable = e => { if (e.data && e.data.size>0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        const b = new Blob(chunksRef.current, { type: mime||'video/webm' });
        setBlob(b);
        const url = URL.createObjectURL(b);
        setBlobUrl(url);
        setDone(true);
        camStreamRef.current?.getTracks().forEach(t=>t.stop());
        setCamOn(false);
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
      };

      mrRef.current = mr;
      mr.start(250);
      setRec(true);
      setSecs(TOTAL_SECS);
      timerRef.current = setInterval(()=>setSecs(t=>{
        const elapsed = TOTAL_SECS - t + 1;
        if (mode==='stitch' && !switchedRef.current && elapsed >= STITCH_CLIP_SECS) switchedRef.current = true;
        if (t<=1) { stopRec(); return 0; }
        return t-1;
      }), 1000);
    } catch (e: any) {
      setError(`No se pudo iniciar la grabación: ${e?.message||'error desconocido'}. Si el problema persiste, puede que el video original no permita componerlo en el canvas (CORS).`);
    }
  };

  const handleSaveToGallery = async () => {
    if (!blob) return;
    try { await saveVideoToGallery(blob); } catch {}
    setSavedToGallery(true);
    setTimeout(()=>setSavedToGallery(false), 2000);
  };

  const publish = async (ids: string[]) => {
    if (!token||!challenge||!blob||!original) return;
    setPublishing(true); setUploading(true);
    try {
      let videoUrl='', thumbnailUrl='';
      try {
        const result = await uploadToCloudinary(blob, pct=>setUploadProgress(pct));
        videoUrl = result.videoUrl; thumbnailUrl = result.thumbnailUrl;
      } catch (e: any) {
        setUploading(false); setPublishing(false);
        alert(`Error al subir el video: ${e.message}\n\nAsegúrate de que el preset "${CLOUDINARY_PRESET}" en Cloudinary permite subir vídeos sin firma.`);
        return;
      }
      setUploading(false);
      const r = await fetch(`${API}/api/videos`, { method:'POST', headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'}, body: JSON.stringify({ challengeId: challenge._id, videoUrl, thumbnailUrl, caption, geoCoordinates: geo, nominatedUserIds: ids, remixOfVideoId: original._id, remixType: mode }) });
      if (r.ok) { setPublished(true); setShowNom(false); }
      else { const d = await r.json(); alert(d.error||'Error al publicar'); }
    } catch { alert('Error de red.'); }
    finally { setPublishing(false); setUploading(false); }
  };

  const filtered = (Array.isArray(users)?users:[]).filter((u:RankingEntry)=>u._id!==user?._id&&!selected.includes(u._id)&&(u.username.toLowerCase().includes(search.toLowerCase())||(u.country||'').toLowerCase().includes(search.toLowerCase())));

  if (!user) return <div className="min-h-screen flex items-center justify-center" style={{paddingTop:'56px',background:'#0b0b12'}}><div className="text-center"><p className="text-gray-400 mb-4">Inicia sesión para grabar</p><Link href="/auth" className="px-6 py-3 rounded-xl font-bold text-black" style={{background:'#00F5FF'}}>Entrar</Link></div></div>;
  if (loadingOriginal) return <div className="min-h-screen flex items-center justify-center" style={{background:'#000'}}><Spinner/></div>;
  if (!original || original.error) return <div className="min-h-screen flex items-center justify-center" style={{paddingTop:'56px',background:'#0b0b12'}}><div className="text-center"><p className="text-gray-400 mb-4">Video original no encontrado</p><Link href="/feed" className="px-6 py-3 rounded-xl font-bold text-black" style={{background:'#00F5FF'}}>Volver al feed</Link></div></div>;
  if (published) return <div className="min-h-screen flex items-center justify-center px-4" style={{paddingTop:'56px',background:'#0b0b12'}}><div className="text-center"><div className="text-6xl mb-4">{mode==='duet'?'🎭':'✂️'}</div><h2 className="text-3xl font-black text-white mb-2">¡{mode==='duet'?'Dueto':'Stitch'} publicado!</h2><p className="text-gray-400 mb-6">Ya está en el feed, con tu reacción junto al video de @{original.userId?.username}.</p><button onClick={()=>setLocation('/feed')} className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-black mx-auto" style={{background:'linear-gradient(135deg,#00F5FF,#7c3aed)'}}><Play size={16}/>Ver Feed</button></div></div>;

  const ov: DominoVideo = original;

  return (
    <div className="min-h-screen" style={{paddingTop:'56px',background:'#000'}}>
      <video ref={camFeedRef} className="hidden" muted playsInline/>
      <video ref={originalRef} src={ov.videoUrl} className="hidden" crossOrigin="anonymous" playsInline muted={false} loop={false}/>

      {showNom&&(
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" style={{background:'rgba(0,0,0,0.85)'}}>
          <div className="w-full max-w-md rounded-2xl p-5" style={{background:'#13131f',border:'1px solid #1e1e2a'}}>
            <div className="flex items-center justify-between mb-4"><div><h2 className="font-bold text-white">Nominar 3 personas</h2><p className="text-xs text-gray-400">({selected.length}/3)</p></div><button onClick={()=>setShowNom(false)}><X size={18} className="text-gray-400"/></button></div>
            {selected.length>0&&<div className="flex gap-2 flex-wrap mb-3">{selected.map(id=>{const u=(Array.isArray(users)?users:[]).find((x:RankingEntry)=>x._id===id);return u?<button key={id} onClick={()=>setSelected(s=>s.filter(x=>x!==id))} className="flex items-center gap-1 text-xs px-2 py-1 rounded-full border" style={{borderColor:'#FF007F',color:'#FF007F',background:'rgba(255,0,127,0.1)'}}>{u.username}<X size={10}/></button>:null;})}</div>}
            <div className="relative mb-3"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar usuarios..." className="w-full rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none" style={{background:'#0b0b12',border:'1px solid #2a2a3a'}}/></div>
            <div className="space-y-2 max-h-48 overflow-y-auto mb-4">{filtered.map((u:RankingEntry)=><button key={u._id} onClick={()=>selected.length<3&&setSelected(s=>[...s,u._id])} disabled={selected.length>=3} className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/5 text-left disabled:opacity-40"><Av u={u} s={32}/><div className="flex-1 min-w-0"><div className="text-sm font-medium text-white">{u.username}</div><div className="text-xs text-gray-400">{u.flag} {u.country}</div></div></button>)}{filtered.length===0&&<p className="text-center text-gray-500 text-sm py-4">No encontrado</p>}</div>
            {uploading&&<div className="mb-3"><div className="flex items-center justify-between mb-1"><span className="text-xs text-gray-400">Subiendo video...</span><span className="text-xs font-bold" style={{color:'#00F5FF'}}>{uploadProgress}%</span></div><div className="h-2 rounded-full overflow-hidden" style={{background:'#1e1e2a'}}><div className="h-full rounded-full transition-all" style={{width:`${uploadProgress}%`,background:'linear-gradient(90deg,#00F5FF,#7c3aed)'}}/></div></div>}
            <button onClick={()=>publish(selected)} disabled={selected.length<3||publishing} className="w-full py-3 rounded-xl font-bold text-white flex items-center justify-center gap-2 disabled:opacity-50" style={{background:selected.length===3?'linear-gradient(135deg,#FF007F,#7c3aed)':'#1e1e2a'}}>{publishing?<><Spinner/>{uploading?`Subiendo ${uploadProgress}%`:'Publicando...'}</>:<><Upload size={18}/>Publicar {mode==='duet'?'dueto':'stitch'} ({selected.length}/3)</>}</button>
          </div>
        </div>
      )}

      <div className="relative h-screen max-h-screen overflow-hidden flex items-center justify-center" style={{background:'#000'}}>
        <div className="relative h-full" style={{aspectRatio:'9/16'}}>
          <canvas ref={canvasRef} width={CANVAS_W} height={CANVAS_H} className="absolute inset-0 w-full h-full" style={{display:done?'none':'block'}}/>

          {done&&blobUrl&&<video ref={previewRef} src={blobUrl} className="absolute inset-0 w-full h-full object-cover" loop playsInline autoPlay controls={false}/>}

          {!camOn&&!done&&(
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6" style={{background:'#0b0b12'}}>
              <div className="w-full mb-5 rounded-xl overflow-hidden" style={{aspectRatio:'9/16',maxHeight:'180px',background:'#13131f'}}>
                {ov.videoUrl&&<video src={ov.videoUrl} className="w-full h-full object-cover" muted playsInline/>}
              </div>
              <p className="text-gray-400 text-xs mb-1">Reaccionando al video de</p>
              <p className="text-white font-bold mb-5">@{ov.userId?.username}</p>

              <div className="flex gap-2 mb-6 p-1 rounded-full" style={{background:'#13131f',border:'1px solid #2a2a3a'}}>
                <button onClick={()=>setMode('duet')} className={cn('flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-bold transition-colors',mode==='duet'?'text-black':'text-gray-400')} style={mode==='duet'?{background:'#00F5FF'}:{}}><Users2 size={14}/>Dueto</button>
                <button onClick={()=>setMode('stitch')} className={cn('flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-bold transition-colors',mode==='stitch'?'text-black':'text-gray-400')} style={mode==='stitch'?{background:'#00F5FF'}:{}}><Scissors size={14}/>Stitch</button>
              </div>
              <p className="text-gray-500 text-xs mb-6 max-w-[260px]">{mode==='duet'?'Tu cámara aparecerá al lado del video original, los dos a la vez.':`Se usan los primeros ${STITCH_CLIP_SECS}s del video original y luego pasa a tu cámara.`}</p>

              {error&&<div className="mb-4 px-4 py-2.5 rounded-xl text-xs text-white max-w-[280px]" style={{background:'rgba(255,0,127,0.85)'}}>{error}</div>}
              <button onClick={startCam} className="px-8 py-3 rounded-2xl font-bold text-black flex items-center gap-2" style={{background:'#00F5FF',boxShadow:'0 0 20px rgba(0,245,255,0.4)'}}>Activar cámara</button>
            </div>
          )}

          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-4 pointer-events-auto">
              <button onClick={()=>{camStreamRef.current?.getTracks().forEach(t=>t.stop());setLocation('/feed');}} className="p-2 rounded-full" style={{background:'rgba(0,0,0,0.5)'}}><X size={20} className="text-white"/></button>
              <div className="px-3 py-1.5 rounded-xl flex items-center gap-2" style={{background:'rgba(0,0,0,0.5)'}}><DominoLogo size={14}/><span className="text-xs font-bold text-white">{mode==='duet'?'Dueto':'Stitch'}</span></div>
              <div className="w-10"/>
            </div>

            {error&&camOn&&!done&&<div className="absolute top-16 left-2 right-2 z-10 px-3 py-2 rounded-xl text-xs text-white text-center" style={{background:'rgba(255,0,127,0.85)'}}>{error}</div>}

            <div className="absolute bottom-8 left-0 right-0 flex flex-col items-center gap-3 pointer-events-auto">
              {done?(
                <div className="w-full px-6 space-y-3">
                  {savedToGallery&&<div className="text-center py-2 rounded-xl font-bold text-white text-sm" style={{background:'rgba(0,245,255,0.2)',border:'1px solid #00F5FF'}}>✅ Guardado en tu dispositivo</div>}
                  <div className="px-4 py-2 rounded-xl text-center" style={{background:'rgba(0,0,0,0.7)'}}><div className="flex items-center gap-2 justify-center"><CheckCircle size={16} className="text-green-400"/><span className="text-sm text-white font-medium">{mode==='duet'?'Dueto':'Stitch'} grabado ✓</span></div></div>
                  <input value={caption} onChange={e=>setCaption(e.target.value.slice(0,150))} placeholder="Añade una leyenda... #hashtag" maxLength={150} className="w-full rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none" style={{background:'rgba(0,0,0,0.6)',border:'1px solid #2a2a3a'}}/>
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={handleSaveToGallery} className="flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-white border border-gray-600 hover:border-gray-400 transition-colors" style={{background:'rgba(0,0,0,0.6)'}}><Download size={18}/>Guardar</button>
                    <button onClick={()=>setShowNom(true)} className="flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-white" style={{background:'linear-gradient(135deg,#FF007F,#7c3aed)',boxShadow:'0 0 20px rgba(255,0,127,0.4)'}}><Upload size={18}/>Publicar</button>
                  </div>
                  <button onClick={()=>{setDone(false);setBlob(null);if(blobUrl)URL.revokeObjectURL(blobUrl);setBlobUrl(null);setSecs(TOTAL_SECS);setSavedToGallery(false);setCaption('');}} className="w-full text-sm text-gray-400 hover:text-white flex items-center justify-center gap-1 py-2"><RefreshCw size={14}/>Grabar de nuevo</button>
                </div>
              ):camOn?(
                <div className="flex flex-col items-center gap-3">
                  <p className="text-xs text-gray-300">{rec?`Grabando... ${secs}s`:'Pulsa para grabar'}</p>
                  {rec&&<div className="w-16 h-16 rounded-full flex items-center justify-center border-4" style={{borderColor:'#FF007F',boxShadow:'0 0 20px rgba(255,0,127,0.5)'}}><span className="text-2xl font-black text-white font-mono">{secs}</span></div>}
                  <button onClick={rec?stopRec:startRec} className={cn('w-20 h-20 rounded-full border-4 flex items-center justify-center transition-all active:scale-95',rec?'scale-110':'border-white')} style={rec?{background:'#FF007F',borderColor:'#FF007F',boxShadow:'0 0 30px rgba(255,0,127,0.6)'}:{background:'rgba(255,255,255,0.1)'}}>
                    {rec?<div className="w-7 h-7 bg-white rounded-sm"/>:<div className="w-14 h-14 bg-white rounded-full"/>}
                  </button>
                  <p className="text-xs text-gray-500">{rec?'Pulsa para detener antes':`Se detiene a los ${TOTAL_SECS}s`}</p>
                </div>
              ):null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
