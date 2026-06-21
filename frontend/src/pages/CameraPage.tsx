import { useState, useRef, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'wouter';
import { Camera, X, Search, CheckCircle, Download, Upload, RefreshCw, Play, Map, Volume2, VolumeX } from 'lucide-react';
import { cn, useAuth, useApi, Spinner, Av, DominoLogo, uploadToCloudinary, saveVideoToGallery, API, CLOUDINARY_PRESET, RankingEntry } from '../lib/shared';

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
  const [geo, setGeo] = useState({lat:40.4168,lng:-3.7038});

  useEffect(()=>{
    navigator.geolocation?.getCurrentPosition(p=>setGeo({lat:p.coords.latitude,lng:p.coords.longitude}));
    return()=>{streamRef.current?.getTracks().forEach(t=>t.stop());if(blobUrl)URL.revokeObjectURL(blobUrl);};
  },[]);

  const startCam=async()=>{
    try{
      let s:MediaStream;
      try{s=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'user'},width:{ideal:1280},height:{ideal:720}},audio:{echoCancellation:true,noiseSuppression:true}});}
      catch{try{s=await navigator.mediaDevices.getUserMedia({video:true,audio:true});}catch{s=await navigator.mediaDevices.getUserMedia({video:true,audio:false});}}
      streamRef.current=s;setCamOn(true);
      setHasAudio(s.getAudioTracks().length>0);
      await new Promise(r=>setTimeout(r,100));
      if(videoRef.current){videoRef.current.srcObject=s;videoRef.current.muted=true;videoRef.current.playsInline=true;try{await videoRef.current.play();}catch{}}
    }catch(err:any){setCamOn(false);if(err.name==='NotAllowedError')alert('❌ Permiso denegado.');else alert('❌ Error: '+err.message);}
  };

  const stopRec=useCallback(()=>{if(timerRef.current)clearInterval(timerRef.current);if(mrRef.current&&mrRef.current.state!=='inactive')mrRef.current.stop();setRec(false);},[]);

  const startRec=()=>{
    if(!streamRef.current)return;chunksRef.current=[];
    const mime=['video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm;codecs=opus','video/webm'].find(t=>MediaRecorder.isTypeSupported(t))||'';
    const mr=new MediaRecorder(streamRef.current,mime?{mimeType:mime}:{});
    mr.ondataavailable=e=>{if(e.data.size>0)chunksRef.current.push(e.data);};
    mr.onstop=()=>{
      const b=new Blob(chunksRef.current,{type:'video/webm'});
      setBlob(b);
      const url=URL.createObjectURL(b);
      setBlobUrl(url);
      setDone(true);
      streamRef.current?.getTracks().forEach(t=>t.stop());
      setCamOn(false);
    };
    mrRef.current=mr;mr.start();setRec(true);setSecs(15);
    timerRef.current=setInterval(()=>setSecs(t=>{if(t<=1){stopRec();return 0;}return t-1;}),1000);
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
      const r=await fetch(`${API}/api/videos`,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({challengeId:challenge._id,videoUrl,thumbnailUrl,geoCoordinates:geo,nominatedUserIds:ids})});
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

      <div className="relative h-screen max-h-screen overflow-hidden">
        <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" autoPlay muted playsInline style={{display:camOn?'block':'none'}}/>

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
          <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-4 pointer-events-auto">
            <button onClick={()=>{streamRef.current?.getTracks().forEach(t=>t.stop());setLocation('/feed');}} className="p-2 rounded-full" style={{background:'rgba(0,0,0,0.5)'}}><X size={20} className="text-white"/></button>
            <div className="px-3 py-1.5 rounded-xl flex items-center gap-2" style={{background:'rgba(0,0,0,0.5)'}}><DominoLogo size={14}/><span className="text-xs font-bold text-white">DOMINO</span></div>
            <div className="w-10"/>
          </div>

          {!done&&<>
            <div className="absolute top-32 left-4 w-8 h-8 border-t-2 border-l-2 rounded-tl-lg" style={{borderColor:'#00F5FF'}}/>
            <div className="absolute top-32 right-4 w-8 h-8 border-t-2 border-r-2 rounded-tr-lg" style={{borderColor:'#00F5FF'}}/>
            <div className="absolute bottom-32 left-4 w-8 h-8 border-b-2 border-l-2 rounded-bl-lg" style={{borderColor:'#00F5FF'}}/>
            <div className="absolute bottom-32 right-4 w-8 h-8 border-b-2 border-r-2 rounded-br-lg" style={{borderColor:'#00F5FF'}}/>
          </>}

          <div className="absolute bottom-8 left-0 right-0 flex flex-col items-center gap-3 pointer-events-auto">
            {done?(
              <div className="w-full px-6 space-y-3">
                {/* Estado guardado */}
                {savedToGallery&&<div className="text-center py-2 rounded-xl font-bold text-white text-sm" style={{background:'rgba(0,245,255,0.2)',border:'1px solid #00F5FF'}}>✅ Guardado en tu dispositivo</div>}

                {/* Info del video */}
                <div className="px-4 py-2 rounded-xl text-center" style={{background:'rgba(0,0,0,0.7)'}}>
                  <div className="flex items-center gap-2 justify-center"><CheckCircle size={16} className="text-green-400"/><span className="text-sm text-white font-medium">Video grabado — 15s ✓</span></div>
                </div>

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
                <button onClick={()=>{setDone(false);setBlob(null);if(blobUrl)URL.revokeObjectURL(blobUrl);setBlobUrl(null);setSecs(15);setSavedToGallery(false);}} className="w-full text-sm text-gray-400 hover:text-white flex items-center justify-center gap-1 py-2">
                  <RefreshCw size={14}/>Grabar de nuevo
                </button>
              </div>
            ):!camOn?(
              <button onClick={startCam} className="px-8 py-3 rounded-2xl font-bold text-black flex items-center gap-2" style={{background:'#00F5FF',boxShadow:'0 0 20px rgba(0,245,255,0.4)'}}><Camera size={18}/>Activar cámara</button>
            ):(
              <div className="flex flex-col items-center gap-3">
                <p className="text-xs text-gray-300">{rec?`Grabando... ${secs}s`:'Pulsa para grabar'}</p>
                {rec&&<div className="w-16 h-16 rounded-full flex items-center justify-center border-4" style={{borderColor:'#FF007F',boxShadow:'0 0 20px rgba(255,0,127,0.5)'}}><span className="text-2xl font-black text-white font-mono">{secs}</span></div>}
                <button onClick={rec?stopRec:startRec} className={cn('w-20 h-20 rounded-full border-4 flex items-center justify-center transition-all active:scale-95',rec?'scale-110':'border-white')} style={rec?{background:'#FF007F',borderColor:'#FF007F',boxShadow:'0 0 30px rgba(255,0,127,0.6)'}:{background:'rgba(255,255,255,0.1)'}}>
                  {rec?<div className="w-7 h-7 bg-white rounded-sm"/>:<div className="w-14 h-14 bg-white rounded-full"/>}
                </button>
                <p className="text-xs text-gray-500">{rec?'Pulsa para detener antes':'Se detiene a los 15s'}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
