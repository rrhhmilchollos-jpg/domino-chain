# DOMINO — Instrucciones de instalación

## Estructura del proyecto
```
domino/
  frontend/          ← React + Vite (lo que ya tienes en GitHub)
    public/
      manifest.json  ← NUEVO
      sw.js          ← NUEVO
      icons/
        generate.html ← Abre en Chrome para generar los PNG
        icon-*.png    ← Generados con generate.html
    index.html       ← ACTUALIZADO con PWA
    src/
      ...            ← Sin cambios
  backend/           ← NUEVO: Express + MongoDB
    src/
      index.js
      models/
      routes/
      middleware/
    package.json
    .env.example
```

## PASO 1 — Subir archivos PWA al frontend

En GitHub, dentro de `/frontend/`:
1. Reemplaza `index.html` por el nuevo
2. Crea carpeta `public/` y sube dentro:
   - `manifest.json`
   - `sw.js`
   - `icons/generate.html`

## PASO 2 — Generar los iconos PNG

1. Abre `frontend/public/icons/generate.html` en Chrome
2. Se descargan automáticamente 8 archivos PNG
3. Súbelos todos a `frontend/public/icons/` en GitHub

## PASO 3 — Probar PWABuilder

1. Haz deploy en Vercel del frontend
2. Ve a https://pwabuilder.com
3. Pega la URL de Vercel
4. Descarga el APK (Android) o IPA (iOS)

## PASO 4 — Backend (cuando quieras datos reales)

### Opción A: Local
```bash
cd backend
cp .env.example .env
# Edita .env con tu MongoDB URI
npm install
npm run dev
```

### Opción B: Railway/Render (gratis)
1. Sube la carpeta `backend/` a un repo de GitHub
2. Conéctalo a Railway.app o Render.com
3. Añade las variables de entorno del .env.example
4. Deploy automático

## Variables de entorno del backend
```
MONGODB_URI=mongodb+srv://usuario:password@cluster.mongodb.net/domino
JWT_SECRET=un_secreto_muy_largo_y_seguro
PORT=3001
```

## MongoDB gratis
Crea una base de datos gratuita en https://mongodb.com/atlas (512MB gratis)
