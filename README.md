# Quiniela Mundial 🏆

App de quiniela tipo bracket eliminatorio (Dieciseisavos → Final) con:

- **Login con nombre + PIN** (la cuenta del jugador se crea sola la primera vez).
- **Panel de admin** (entra con nombre `admin` y el PIN maestro) para abrir/cerrar/revelar rondas, cargar partidos y resultados.
- **Pronósticos por partido**: ganador + cómo gana (regular / tiempo extra / penales). Bonus por acertar el método.
- **Tabla de posiciones** en vivo (se actualiza cada 8s).
- **Estado compartido** entre todos los jugadores vía Vercel KV.

## Stack

- Vite + React + Tailwind CSS
- Funciones serverless en `/api` (Node) sobre **Vercel KV / Upstash Redis**

## Desarrollo local

```bash
npm install
npm run dev        # UI con localStorage (sin backend compartido)
# o, para probar también /api con KV:
npm i -g vercel && vercel dev
```

Sin `vercel dev` (o sin KV conectado) la app cae automáticamente a `localStorage`,
así que la interfaz funciona en un solo dispositivo, pero **no** se comparte entre jugadores.

## Despliegue en Vercel + conectar KV

1. Importa el repo en Vercel (framework detectado: **Vite**). El build es `npm run build` → `dist/`.
2. En el proyecto de Vercel: **Storage → Create Database → KV (Upstash Redis)** y conéctala al proyecto.
   - Esto inyecta automáticamente las variables `KV_REST_API_URL` y `KV_REST_API_TOKEN`
     (también se aceptan `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`).
3. Vuelve a desplegar (**Redeploy**) para que las funciones tomen las variables.
4. ¡Listo! El estado (rondas, jugadores, picks) queda compartido para todos.

> Mientras KV no esté conectado, `/api/storage` responde `503` y la app usa `localStorage` como respaldo.

## Configuración del juego

En `src/App.jsx`:

- `ADMIN_PIN` — PIN maestro del administrador.
- `ROUND_DEFS` — rondas, etiquetas, puntos por acierto y número de partidos.
- `METHODS` / `METHOD_BONUS` — métodos de victoria y puntos extra por acertarlo.

> ⚠️ El `ADMIN_PIN` y los PIN de jugadores viajan al cliente / se guardan en texto plano en KV.
> Es una quiniela casual entre amigos; no la uses para datos sensibles.
