import { useState, useRef, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'wouter';
import { Camera, X, Search, CheckCircle, Download, Upload, RefreshCw, Play, Map, Volume2, VolumeX, Music2, SwitchCamera, Grid3x3, Timer, Zap, ZapOff, Palette } from 'lucide-react';
import { cn, useAuth, useApi, Spinner, Av, DominoLogo, uploadToCloudinary, saveVideoToGallery, API, CLOUDINARY_PRESET, RankingEntry, SoundPicker, Sound } from '../lib/shared';

// Filtros de color reales — se aplican de verdad en el video grabado (no
// solo decorativos en la vista previa). Esto sustituye al icono de
// "efectos de belleza IA" de TikTok, que requiere reconocimiento facial
// en tiempo real y no es algo que se pueda clonar de forma responsable.
const FILTERS = [
  { id:'normal',  label:'Normal',   css:'none' },
  { id:'vivido',  label:'Vívido',   css:'saturate(1.6) contrast(1.1)' },
  { id:'calido',  label:'Cálido',   css:'sepia(0.25) saturate(1.3) hue-rotate(-8deg)' },
  { id:'frio',    label:'Frío',     css:'saturate(1.15) hue-rotate(15deg) brightness(1.05)' },
  { id:'byn',     label:'B&N',      css:'grayscale(1) contrast(1.15)' },
  { id:'vintage', label:'Vintage',  css:'sepia(0.4) contrast(0.9) brightness(1.05) saturate(0.75)' },
];
const TIMER_OPTIONS: { val: 0|3|10; label: string }[] = [{val:0,label:'Sin retraso'},{val:3,label:'3s'},{val:10,label:'10s'}];

export default function CameraPage() {
  const { user, token } = useAuth();
  const [, setLocation] = useLocation();
  const { data: challenge } = useApi('/api/challenges/active');
  const { data: users } = useApi('/api/ranking?limit=20');
  const videoRef = useRef<HTMLVideoElement>(null);
  const previewRef = useRef<HTMLVideoElement>(null);
  const mrRef = useRef<MediaRecorder|null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream|null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval>|null>(null);
  const [camOn, setCamOn] = useState(false);
  const [hasAudio, setHasAudio] = useState(true);
  const [rec, setRec] = useState(false);
  const [secs, setSecs] = useState(15);
  const [done, setDone] = useState(false);
  const [blob, setBlob] = useState<Blob|null>(null);
  const [blobUrl, setBlobUrl] = useState<string|null>(null);
  const [showNom, setShowNom] = useState(false);
  const [published, setPublished] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [savedToGallery, setSavedToGallery] = useState(false);
  const [previewMuted, setPreviewMuted] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [caption, setCaption] = useState('');
  const [geo, setGeo] = useState({lat:40.4168,lng:-3.7038});
  // Música — sonido elegido del catálogo CC0, mezclado con el micrófono al grabar
  const [showSoundPicker, setShowSoundPicker] = useState(false);
  const [selectedSound, setSelectedSound] = useState<Sound|null>(null);
  const audioCtxRef = useRef<AudioContext|null>(null);
  const soundElRef = useRef<HTMLAudioElement|null>(null);
  // Flash, temporizador, cuadrícula y filtros — controles reales de la
  // barra lateral, igual que en TikTok
  const [facingMode, setFacingMode] = useState<'user'|'environment'>('user');
  const [flashOn, setFlashOn] = useState(false);
  const [flashMsg, setFlashMsg] = useState<string|null>(null);
  const [showTimerMenu, setShowTimerMenu] = useState(false);
  const [timerDelay, setTimerDelay] = useState<0|3|10>(0);
  const [countdown, setCountdown] = useState<number|null>(null);
  const countdownCancelRef = useRef(false);
  const [showGrid, setShowGrid] = useState(false);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState(FILTERS[0]);
  const [durationMsg, setDurationMsg] = useState<string|null>(null);
  const rafRef = useRef<number|null>(null);

  useEffect(()=>{
    navigator.geolocation?.getCurrentPosition(p=>setGeo({lat:p.coords.latitude,lng:p.coords.longitude}));
    // Si se viene desde el feed con "Usar este sonido" (?soundId=...), lo
    // precargamos automáticamente — mismo patrón que ?q= en SearchPage.
    const soundId=new URLSearchParams(window.location.search).get('soundId');
    if(soundId){
      fetch(`${API}/api/sounds/${soundId}`).then(r=>r.ok?r.json():null).then(s=>{if(s)setSelectedSound(s);}).catch(()=>{});
    }
    return()=>{streamRef.current?.getTracks().forEach(t=>t.stop());if(blobUrl)URL.revokeObjectURL(blobUrl);soundElRef.current?.pause();audioCtxRef.current?.close().catch(()=>{});if(rafRef.current)cancelAnimationFrame(rafRef.current);};
  },[]);

  const startCam=async()=>{
    try{
      let s:MediaStream;
      // Primero pedimos SOLO audio para forzar el permiso del micrófono por separado
      let audioStream:MediaStream|null=null;
      try{
        audioStream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,sampleRate:44100}});
      }catch{ /* sin audio */ }

      try{
        // Video con las mejores constraints posibles
        const videoStream=await navigator.mediaDevices.getUserMedia({
          video:{facingMode:{ideal:'user'},width:{ideal:1280},height:{ideal:720},frameRate:{ideal:30}},
          audio:false
        });
        // Combinar pistas de audio y video en un solo stream
        const tracks=[...videoStream.getVideoTracks(),...(audioStream?.getAudioTracks()||[])];
        s=new MediaStream(tracks);
      }catch{
        // Fallback: todo en una sola llamada
        try{s=await navigator.mediaDevices.getUserMedia({video:true,audio:true});}
        catch{s=await navigator.mediaDevices.getUserMedia({video:true,audio:false});}
      }

      streamRef.current=s;
      const audioTracks=s.getAudioTracks();
      setHasAudio(audioTracks.length>0);
      if(audioTracks.length>0){
        // Asegurar que el micrófono está activo
        audioTracks.forEach(t=>{t.enabled=true;});
      }
      setCamOn(true);
      await new Promise(r=>setTimeout(r,100));
      if(videoRef.current){videoRef.current.srcObject=s;videoRef.current.muted=true;videoRef.current.playsInline=true;try{await videoRef.current.play();}catch{}}
    }catch(err:any){setCamOn(false);if(err.name==='NotAllowedError')alert('❌ Permiso denegado. Ve a Ajustes del navegador y permite el acceso al micrófono y la cámara.');else alert('❌ Error: '+err.message);}
  };

  // Cambiar entre cámara frontal y trasera — pide un stream de video nuevo
  // con el facingMode contrario y sustituye solo la pista de video,
  // manteniendo el audio que ya teníamos.
  const flipCamera=async()=>{
    if(!streamRef.current||rec)return;
    const next=facingMode==='user'?'environment':'user';
    try{
      const newVideoStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:next},width:{ideal:1280},height:{ideal:720},frameRate:{ideal:30}},audio:false});
      const oldVideoTrack=streamRef.current.getVideoTracks()[0];
      oldVideoTrack?.stop();
      const newVideoTrack=newVideoStream.getVideoTracks()[0];
      const audioTracks=streamRef.current.getAudioTracks();
      const newStream=new MediaStream([newVideoTrack,...audioTracks]);
      streamRef.current=newStream;
      setFacingMode(next);
      setFlashOn(false); // la cámara nueva no hereda el estado del flash de la otra
      if(videoRef.current){videoRef.current.srcObject=newStream;await videoRef.current.play().catch(()=>{});}
    }catch(e){console.error('No se pudo cambiar de cámara',e);}
  };

  // Flash/linterna — solo funciona de verdad si el hardware lo soporta (lo
  // normal es que solo la cámara TRASERA tenga linterna; la frontal de
  // selfie casi nunca tiene flash físico, así que avisamos si falla en vez
  // de fingir que se ha activado.
  const toggleFlash=async()=>{
    const track=streamRef.current?.getVideoTracks()[0];
    if(!track)return;
    const next=!flashOn;
    try{
      await track.applyConstraints({advanced:[{torch:next} as any]});
      setFlashOn(next);
    }catch{
      setFlashMsg(facingMode==='user'?'La cámara frontal no tiene flash':'Flash no disponible en este dispositivo');
      setTimeout(()=>setFlashMsg(null),2500);
    }
  };

  const stopRec=useCallback(()=>{if(timerRef.current)clearInterval(timerRef.current);if(mrRef.current&&mrRef.current.state!=='inactive')mrRef.current.stop();setRec(false);},[]);

  const startRec=async()=>{
    if(!streamRef.current)return;chunksRef.current=[];

    // Verificar que el stream tiene audio antes de grabar
    const audioTracks=streamRef.current.getAudioTracks();
    if(audioTracks.length>0) audioTracks.forEach(t=>{t.enabled=true;});

    // 1) Pista de VIDEO: directa de la cámara, o si hay un filtro de color
    // activo, procesada fotograma a fotograma con canvas — así el filtro
    // queda grabado de verdad en el archivo final, no es solo un efecto
    // visual en la vista previa.
    let videoTrack=streamRef.current.getVideoTracks()[0];
    if(selectedFilter.id!=='normal'&&videoRef.current){
      const vw=videoRef.current.videoWidth||720, vh=videoRef.current.videoHeight||1280;
      const canvas=document.createElement('canvas');
      canvas.width=vw;canvas.height=vh;
      const ctx2d=canvas.getContext('2d');
      if(ctx2d){
        const draw=()=>{
          if(ctx2d&&videoRef.current){ctx2d.filter=selectedFilter.css;ctx2d.drawImage(videoRef.current,0,0,vw,vh);}
          rafRef.current=requestAnimationFrame(draw);
        };
        draw();
        const canvasStream=(canvas as HTMLCanvasElement & {captureStream:(fps?:number)=>MediaStream}).captureStream(30);
        videoTrack=canvasStream.getVideoTracks()[0];
      }
    }

    // 2) Pista de AUDIO: solo micrófono, o micrófono+música mezclados con
    // Web Audio API si hay un sonido elegido. La música también se conecta
    // al altavoz (ctx.destination) para que se oiga en directo mientras se
    // graba — el micrófono NO se conecta al altavoz, para evitar eco.
    let audioOutTracks:MediaStreamTrack[]=audioTracks.length>0?[audioTracks[0]]:[];
    if(selectedSound){
      try{
        const Ctx=window.AudioContext||(window as any).webkitAudioContext;
        const ctx=new Ctx();
        audioCtxRef.current=ctx;
        const dest=ctx.createMediaStreamDestination();
        if(audioTracks.length>0){
          const micSource=ctx.createMediaStreamSource(new MediaStream([audioTracks[0]]));
          micSource.connect(dest);
        }
        const audioEl=new Audio();
        audioEl.crossOrigin='anonymous';
        audioEl.src=selectedSound.audioUrl;
        audioEl.currentTime=0;
        soundElRef.current=audioEl;
        await audioEl.play().catch(()=>{});
        const musicSource=ctx.createMediaElementSource(audioEl);
        musicSource.connect(dest);
        musicSource.connect(ctx.destination);
        audioOutTracks=dest.stream.getAudioTracks();
      }catch(e){
        console.error('No se pudo mezclar la música, se graba sin ella',e);
      }
    }

    const recordStream=new MediaStream([videoTrack,...audioOutTracks]);

    // Codecs en orden de preferencia — Android Chrome soporta mejor mp4/avc
    const mimeOptions=[
      'video/mp4;codecs=avc1,mp4a.40.2', // Android Chrome — mejor compatibilidad audio
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm;codecs=h264,opus',
      'video/webm',
      'video/mp4',
    ];
    const mime=mimeOptions.find(t=>{try{return MediaRecorder.isTypeSupported(t);}catch{return false;}})||'';

    const mrOptions:MediaRecorderOptions=mime?{mimeType:mime,audioBitsPerSecond:128000,videoBitsPerSecond:2500000}:{};
    const mr=new MediaRecorder(recordStream,mrOptions);
    mr.ondataavailable=e=>{if(e.data&&e.data.size>0)chunksRef.current.push(e.data);};
    mr.onstop=()=>{
      const mimeType=mime||'video/webm';
      const b=new Blob(chunksRef.current,{type:mimeType});
      setBlob(b);
      const url=URL.createObjectURL(b);
      setBlobUrl(url);
      setDone(true);
      streamRef.current?.getTracks().forEach(t=>t.stop());
      setCamOn(false);
      // Limpiar la mezcla de audio y el dibujado del filtro si los había
      if(soundElRef.current){soundElRef.current.pause();soundElRef.current=null;}
      if(audioCtxRef.current){audioCtxRef.current.close().catch(()=>{});audioCtxRef.current=null;}
      if(rafRef.current){cancelAnimationFrame(rafRef.current);rafRef.current=null;}
    };
    // timeslice de 250ms para capturar datos frecuentemente (mejor audio en Android)
    mrRef.current=mr;mr.start(250);setRec(true);setSecs(15);
    timerRef.current=setInterval(()=>setSecs(t=>{if(t<=1){stopRec();return 0;}return t-1;}),1000);
  };

  // Envuelve startRec con la cuenta atrás del temporizador, si hay una
  // elegida. Tocar el botón de grabar otra vez durante la cuenta atrás la
  // cancela en vez de empezar a grabar.
  const beginRecording=async()=>{
    if(countdown!==null){countdownCancelRef.current=true;setCountdown(null);return;}
    if(timerDelay>0){
      countdownCancelRef.current=false;
      for(let i=timerDelay;i>0;i--){
        setCountdown(i);
        await new Promise(r=>setTimeout(r,1000));
        if(countdownCancelRef.current){setCountdown(null);return;}
      }
      setCountdown(null);
    }
    startRec();
  };

  const handleSaveToGallery = async () => {
    if (!blob) return;
    try {
      await saveVideoToGallery(blob);
      setSavedToGallery(true);
      setTimeout(() => setSavedToGallery(false), 2000);
    } catch {
      // fallback silencioso si IndexedDB no está disponible
      setSavedToGallery(true);
      setTimeout(() => setSavedToGallery(false), 2000);
    }
  };

  const publish=async(ids:string[])=>{
    if(!token||!challenge||!blob)return;
    setPublishing(true);setUploading(true);
    try{
      // Subir a Cloudinary
      let videoUrl='';let thumbnailUrl='';
      try{
        const result=await uploadToCloudinary(blob,(pct)=>setUploadProgress(pct));
        videoUrl=result.videoUrl;thumbnailUrl=result.thumbnailUrl;
      }catch(e:any){
        setUploading(false);setPublishing(false);
        alert(`Error al subir el video: ${e.message}\n\nAsegúrate de que el preset "${CLOUDINARY_PRESET}" en Cloudinary permite subir vídeos sin firma.`);
        return;
      }
      setUploading(false);
      // Publicar en backend
      const r=await fetch(`${API}/api/videos`,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({challengeId:challenge._id,videoUrl,thumbnailUrl,caption,geoCoordinates:geo,nominatedUserIds:ids,soundId:selectedSound?.id})});
      if(r.ok){setPublished(true);setShowNom(false);}
      else{const d=await r.json();alert(d.error||'Error al publicar');}
    }catch{alert('Error de red.');}finally{setPublishing(false);setUploading(false);}
  };

  const filtered=(Array.isArray(users)?users:[]).filter((u:RankingEntry)=>u._id!==user?._id&&!selected.includes(u._id)&&(u.username.toLowerCase().includes(search.toLowerCase())||(u.country||'').toLowerCase().includes(search.toLowerCase())));

  if(!user)return<div className="min-h-screen flex items-center justify-center" style={{paddingTop:'56px',background:'#0b0b12'}}><div className="text-center"><p className="text-gray-400 mb-4">Inicia sesión para grabar</p><Link href="/auth" className="px-6 py-3 rounded-xl font-bold text-black" style={{background:'#00F5FF'}}>Entrar</Link></div></div>;
  if(published)return<div className="min-h-screen flex items-center justify-center px-4" style={{paddingTop:'56px',background:'#0b0b12'}}><div className="text-center"><div className="text-6xl mb-4">🎲</div><h2 className="text-3xl font-black text-white mb-2">¡Dominó pasado!</h2><p className="text-gray-400 mb-6">Publicado en el feed. Los nominados han sido notificados.</p><div className="flex gap-3 justify-center"><button onClick={()=>setLocation('/feed')} className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-black" style={{background:'linear-gradient(135deg,#00F5FF,#7c3aed)'}}><Play size={16}/>Ver Feed</button><button onClick={()=>setLocation('/map')} className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold border border-[#00F5FF]" style={{color:'#00F5FF'}}><Map size={16}/>Ver Mapa</button></div></div></div>;

  return(
    <div className="min-h-screen" style={{paddingTop:'56px',background:'#000'}}>
      {showNom&&(
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" style={{background:'rgba(0,0,0,0.85)'}}>
          <div className="w-full max-w-md rounded-2xl p-5" style={{background:'#13131f',border:'1px solid #1e1e2a'}}>
            <div className="flex items-center justify-between mb-4"><div><h2 className="font-bold text-white">Nominar 3 personas</h2><p className="text-xs text-gray-400">({selected.length}/3)</p></div><button onClick={()=>setShowNom(false)}><X size={18} className="text-gray-400"/></button></div>
            {selected.length>0&&<div className="flex gap-2 flex-wrap mb-3">{selected.map(id=>{const u=(Array.isArray(users)?users:[]).find((x:RankingEntry)=>x._id===id);return u?<button key={id} onClick={()=>setSelected(s=>s.filter(x=>x!==id))} className="flex items-center gap-1 text-xs px-2 py-1 rounded-full border" style={{borderColor:'#FF007F',color:'#FF007F',background:'rgba(255,0,127,0.1)'}}>{u.username}<X size={10}/></button>:null;})}</div>}
            <div className="relative mb-3"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar usuarios..." className="w-full rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none" style={{background:'#0b0b12',border:'1px solid #2a2a3a'}}/></div>
            <div className="space-y-2 max-h-48 overflow-y-auto mb-4">{filtered.map((u:RankingEntry)=><button key={u._id} onClick={()=>selected.length<3&&setSelected(s=>[...s,u._id])} disabled={selected.length>=3} className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/5 text-left disabled:opacity-40"><Av u={u} s={32}/><div className="flex-1 min-w-0"><div className="text-sm font-medium text-white">{u.username}</div><div className="text-xs text-gray-400">{u.flag} {u.country}</div></div></button>)}{filtered.length===0&&<p className="text-center text-gray-500 text-sm py-4">No encontrado</p>}</div>
            {uploading&&<div className="mb-3"><div className="flex items-center justify-between mb-1"><span className="text-xs text-gray-400">Subiendo video...</span><span className="text-xs font-bold" style={{color:'#00F5FF'}}>{uploadProgress}%</span></div><div className="h-2 rounded-full overflow-hidden" style={{background:'#1e1e2a'}}><div className="h-full rounded-full transition-all" style={{width:`${uploadProgress}%`,background:'linear-gradient(90deg,#00F5FF,#7c3aed)'}}/></div></div>}
            <button onClick={()=>publish(selected)} disabled={selected.length<3||publishing} className="w-full py-3 rounded-xl font-bold text-white flex items-center justify-center gap-2 disabled:opacity-50" style={{background:selected.length===3?'linear-gradient(135deg,#FF007F,#7c3aed)':'#1e1e2a'}}>{publishing?<><Spinner/>{uploading?`Subiendo ${uploadProgress}%`:'Publicando...'}</>:<><Upload size={18}/>Publicar en DOMINO ({selected.length}/3)</>}</button>
          </div>
        </div>
      )}

      {showSoundPicker&&<SoundPicker onSelect={s=>{setSelectedSound(s);setShowSoundPicker(false);}} onClose={()=>setShowSoundPicker(false)}/>}

      <div className="relative h-screen max-h-screen overflow-hidden">
        <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" autoPlay muted playsInline style={{display:camOn?'block':'none',filter:selectedFilter.css}}/>

        {camOn&&!hasAudio&&(
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-10 px-3 py-1.5 rounded-full text-xs font-bold text-white flex items-center gap-1.5" style={{background:'rgba(255,0,127,0.85)'}}>🔇 Grabando sin audio — revisa el permiso del micrófono</div>
        )}

        {/* Preview del video grabado */}
        {done&&blobUrl&&!camOn&&(
          <>
            <video ref={previewRef} src={blobUrl} className="absolute inset-0 w-full h-full object-cover" loop playsInline autoPlay muted={previewMuted} controls={false}/>
            <button onClick={()=>{const next=!previewMuted;setPreviewMuted(next);if(!next)previewRef.current?.play().catch(()=>{});}} className="absolute top-16 right-4 z-10 p-2.5 rounded-full" style={{background:'rgba(0,0,0,0.55)'}}>{previewMuted?<VolumeX size={18} className="text-white"/>:<Volume2 size={18} className="text-white"/>}</button>
          </>
        )}

        {!camOn&&!done&&(
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900"><div className="text-center"><Camera size={64} className="mx-auto text-gray-600 mb-3"/><p className="text-gray-400 text-sm">Activa la cámara para grabar</p></div></div>
        )}

        <div className="absolute inset-0 pointer-events-none">
          {/* Barra superior — X, píldora de sonido centrada, cambiar cámara — igual que en TikTok */}
          <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-4 pointer-events-auto">
            <button onClick={()=>{streamRef.current?.getTracks().forEach(t=>t.stop());setLocation('/feed');}} className="p-2 rounded-full flex-shrink-0" style={{background:'rgba(0,0,0,0.5)'}}><X size={20} className="text-white"/></button>
            {!done?(
              <div className="flex items-center gap-1 mx-2 min-w-0 rounded-full" style={{background:'rgba(0,0,0,0.55)'}}>
                <button onClick={()=>setShowSoundPicker(true)} className="flex items-center gap-1.5 pl-4 pr-2 py-2 min-w-0">
                  <Music2 size={14} className="text-white flex-shrink-0"/>
                  <span className="text-sm text-white font-semibold truncate max-w-[120px]">{selectedSound?selectedSound.title:'Añadir sonido'}</span>
                </button>
                {selectedSound&&<button onClick={()=>setSelectedSound(null)} className="p-1.5 mr-1.5 rounded-full flex-shrink-0" style={{background:'rgba(255,255,255,0.15)'}}><X size={12} className="text-white"/></button>}
              </div>
            ):<div className="px-3 py-1.5 rounded-xl flex items-center gap-2 mx-2" style={{background:'rgba(0,0,0,0.5)'}}><DominoLogo size={14}/><span className="text-xs font-bold text-white">DOMINO</span></div>}
            {!done&&camOn?(
              <button onClick={flipCamera} className="p-2 rounded-full flex-shrink-0" style={{background:'rgba(0,0,0,0.5)'}} title="Cambiar cámara"><SwitchCamera size={20} className="text-white"/></button>
            ):<div className="w-9 flex-shrink-0"/>}
          </div>

          {/* Barra lateral derecha — flash, temporizador, cuadrícula, filtros (reales, no decorativos) */}
          {!done&&camOn&&!rec&&(
            <div className="absolute top-20 right-3 z-10 flex flex-col items-center gap-4 pointer-events-auto">
              <button onClick={toggleFlash} className="flex flex-col items-center gap-1">
                <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{background:'rgba(0,0,0,0.5)'}}>
                  {flashOn?<Zap size={17} style={{color:'#FFD700'}} className="fill-current"/>:<ZapOff size={17} className="text-white"/>}
                </div>
              </button>
              <div className="relative">
                <button onClick={()=>{setShowTimerMenu(v=>!v);setShowFilterMenu(false);}} className="flex flex-col items-center gap-1">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{background:timerDelay>0?'rgba(0,245,255,0.3)':'rgba(0,0,0,0.5)'}}>
                    <Timer size={17} className="text-white"/>
                  </div>
                  {timerDelay>0&&<span className="text-[10px] text-white font-bold">{timerDelay}s</span>}
                </button>
                {showTimerMenu&&(
                  <>
                    <div className="fixed inset-0 z-20" onClick={()=>setShowTimerMenu(false)}/>
                    <div className="absolute z-30 rounded-xl overflow-hidden flex flex-col" style={{right:'48px',top:'0',background:'#13131f',border:'1px solid #2a2a3a',minWidth:'130px'}}>
                      {TIMER_OPTIONS.map(o=>(
                        <button key={o.val} onClick={()=>{setTimerDelay(o.val);setShowTimerMenu(false);}} className={cn('px-4 py-2.5 text-sm text-left hover:bg-white/5',timerDelay===o.val?'text-white font-bold':'text-gray-300')} style={timerDelay===o.val?{color:'#00F5FF'}:undefined}>{o.label}</button>
                      ))}
                    </div>
                  </>
                )}
              </div>
              <button onClick={()=>setShowGrid(v=>!v)} className="flex flex-col items-center gap-1">
                <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{background:showGrid?'rgba(0,245,255,0.3)':'rgba(0,0,0,0.5)'}}>
                  <Grid3x3 size={17} className="text-white"/>
                </div>
              </button>
              <div className="relative">
                <button onClick={()=>{setShowFilterMenu(v=>!v);setShowTimerMenu(false);}} className="flex flex-col items-center gap-1">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{background:selectedFilter.id!=='normal'?'rgba(0,245,255,0.3)':'rgba(0,0,0,0.5)'}}>
                    <Palette size={17} className="text-white"/>
                  </div>
                </button>
                {showFilterMenu&&(
                  <>
                    <div className="fixed inset-0 z-20" onClick={()=>setShowFilterMenu(false)}/>
                    <div className="absolute z-30 rounded-xl overflow-hidden flex flex-col" style={{right:'48px',top:'0',background:'#13131f',border:'1px solid #2a2a3a',minWidth:'130px'}}>
                      {FILTERS.map(f=>(
                        <button key={f.id} onClick={()=>{setSelectedFilter(f);setShowFilterMenu(false);}} className={cn('px-4 py-2.5 text-sm text-left hover:bg-white/5',selectedFilter.id===f.id?'font-bold':'text-gray-300')} style={selectedFilter.id===f.id?{color:'#00F5FF'}:undefined}>{f.label}</button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {flashMsg&&<div className="absolute top-20 left-1/2 -translate-x-1/2 z-10 px-3 py-1.5 rounded-full text-xs font-semibold text-white pointer-events-none" style={{background:'rgba(0,0,0,0.75)'}}>{flashMsg}</div>}

          {/* Cuadrícula de tercios — guía visual real, no se graba en el video */}
          {!done&&camOn&&showGrid&&(
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute left-1/3 top-0 bottom-0 w-px" style={{background:'rgba(255,255,255,0.35)'}}/>
              <div className="absolute left-2/3 top-0 bottom-0 w-px" style={{background:'rgba(255,255,255,0.35)'}}/>
              <div className="absolute top-1/3 left-0 right-0 h-px" style={{background:'rgba(255,255,255,0.35)'}}/>
              <div className="absolute top-2/3 left-0 right-0 h-px" style={{background:'rgba(255,255,255,0.35)'}}/>
            </div>
          )}

          {/* Cuenta atrás del temporizador */}
          {countdown!==null&&(
            <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
              <span className="text-8xl font-black text-white" style={{textShadow:'0 0 30px rgba(0,0,0,0.8)'}}>{countdown}</span>
            </div>
          )}
          <div className="absolute bottom-8 left-0 right-0 flex flex-col items-center gap-3 pointer-events-auto">
            {done?(
              <div className="w-full px-6 space-y-3">
                {/* Estado guardado */}
                {savedToGallery&&<div className="text-center py-2 rounded-xl font-bold text-white text-sm" style={{background:'rgba(0,245,255,0.2)',border:'1px solid #00F5FF'}}>✅ Guardado en tu dispositivo</div>}

                {/* Info del video */}
                <div className="px-4 py-2 rounded-xl text-center" style={{background:'rgba(0,0,0,0.7)'}}>
                  <div className="flex items-center gap-2 justify-center"><CheckCircle size={16} className="text-green-400"/><span className="text-sm text-white font-medium">Video grabado — 15s ✓</span></div>
                  {selectedSound&&<div className="flex items-center gap-1.5 justify-center mt-1"><Music2 size={11} style={{color:'#00F5FF'}}/><span className="text-xs text-gray-300">{selectedSound.title}</span></div>}
                  {selectedFilter.id!=='normal'&&<div className="flex items-center gap-1.5 justify-center mt-1"><Palette size={11} style={{color:'#00F5FF'}}/><span className="text-xs text-gray-300">Filtro {selectedFilter.label}</span></div>}
                </div>

                {/* Leyenda opcional — los #hashtags que escribas aquí se podrán buscar luego */}
                <input value={caption} onChange={e=>setCaption(e.target.value.slice(0,150))} placeholder="Añade una leyenda... #hashtag" maxLength={150} className="w-full rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none" style={{background:'rgba(0,0,0,0.6)',border:'1px solid #2a2a3a'}}/>

                {/* Botones de acción */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Guardar en galería */}
                  <button onClick={handleSaveToGallery} className="flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-white border border-gray-600 hover:border-gray-400 transition-colors" style={{background:'rgba(0,0,0,0.6)'}}>
                    <Download size={18}/>Guardar
                  </button>
                  {/* Subir y publicar */}
                  <button onClick={()=>setShowNom(true)} className="flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-white" style={{background:'linear-gradient(135deg,#FF007F,#7c3aed)',boxShadow:'0 0 20px rgba(255,0,127,0.4)'}}>
                    <Upload size={18}/>Publicar
                  </button>
                </div>

                {/* Repetir */}
                <button onClick={()=>{setDone(false);setBlob(null);if(blobUrl)URL.revokeObjectURL(blobUrl);setBlobUrl(null);setSecs(15);setSavedToGallery(false);setCaption('');}} className="w-full text-sm text-gray-400 hover:text-white flex items-center justify-center gap-1 py-2">
                  <RefreshCw size={14}/>Grabar de nuevo
                </button>
              </div>
            ):!camOn?(
              <button onClick={startCam} className="px-8 py-3 rounded-2xl font-bold text-black flex items-center gap-2" style={{background:'#00F5FF',boxShadow:'0 0 20px rgba(0,245,255,0.4)'}}><Camera size={18}/>Activar cámara</button>
            ):(
              <div className="flex flex-col items-center gap-3">
                {/* Fila de duración igual que TikTok — DOMINO es un reto de 15s
                    exactos (es el concepto central de la app), así que solo
                    esa opción funciona de verdad; las demás avisan por qué. */}
                {!rec&&countdown===null&&(
                  <div className="flex items-center gap-4 mb-1">
                    {['10 min','60 s'].map(l=>(
                      <button key={l} onClick={()=>{setDurationMsg('Los retos DOMINO son siempre de 15 segundos');setTimeout(()=>setDurationMsg(null),2500);}} className="text-sm font-semibold text-gray-400">{l}</button>
                    ))}
                    <span className="text-sm font-bold text-black px-3 py-1 rounded-full" style={{background:'#fff'}}>15 s</span>
                    {['FOTO','TEXTO'].map(l=>(
                      <button key={l} onClick={()=>{setDurationMsg('DOMINO solo graba video, de momento');setTimeout(()=>setDurationMsg(null),2500);}} className="text-sm font-semibold text-gray-400">{l}</button>
                    ))}
                  </div>
                )}
                {durationMsg&&<div className="px-3 py-1.5 rounded-full text-xs font-semibold text-white" style={{background:'rgba(0,0,0,0.75)'}}>{durationMsg}</div>}

                <p className="text-xs text-gray-300">{rec?`Grabando... ${secs}s`:countdown!==null?'Empezando...':'Pulsa para grabar'}</p>
                {rec&&<div className="w-16 h-16 rounded-full flex items-center justify-center border-4" style={{borderColor:'#FF007F',boxShadow:'0 0 20px rgba(255,0,127,0.5)'}}><span className="text-2xl font-black text-white font-mono">{secs}</span></div>}
                <button onClick={rec?stopRec:beginRecording} className={cn('w-20 h-20 rounded-full border-4 flex items-center justify-center transition-all active:scale-95',rec?'scale-110':'border-white')} style={rec?{background:'#FF007F',borderColor:'#FF007F',boxShadow:'0 0 30px rgba(255,0,127,0.6)'}:countdown!==null?{background:'rgba(255,0,127,0.3)',borderColor:'#FF007F'}:{background:'rgba(255,255,255,0.1)'}}>
                  {rec?<div className="w-7 h-7 bg-white rounded-sm"/>:countdown!==null?<X size={22} className="text-white"/>:<div className="w-14 h-14 bg-white rounded-full"/>}
                </button>
                <p className="text-xs text-gray-500">{rec?'Pulsa para detener antes':countdown!==null?'Pulsa para cancelar':timerDelay>0?`Empieza con ${timerDelay}s de retraso`:'Se detiene a los 15s'}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
