# NidusCode — Landing Page

Landing de NidusCode (desarrollo web a medida, automatizaciones y optimización · Chile y Argentina), con portafolio de demos navegables embebidas.

## Estructura

```
NidusCode-web/
├── index.html            Página principal (HTML semántico + Tailwind pre-buildeado)
├── 404.html              Página de error con branding
├── styles.css            Estilos personalizados (scrollbar, reveal, navbar blur, dark mode)
├── script.js             Interacciones (scroll, menú móvil, counters, reveals, lightbox, modal de demos)
├── contact-form.js       Formulario de contacto → Supabase REST + selector de país
├── offline-game.js       Mini-juego que aparece si el visitante pierde conexión
├── tailwind.build.css    CSS de Tailwind ya compilado (sin build step en runtime)
├── tailwind.input.css    Entrada de Tailwind (para regenerar el build)
├── tailwind.config.cjs   Config de Tailwind
├── vercel.json           Headers de seguridad + cache + routing
├── robots.txt            Indexación + referencia al sitemap
├── sitemap.xml           Mapa del sitio para buscadores
├── assets/               Imágenes, logo, OG image, QR de Instagram
└── demos/                8 demos navegables de proyectos entregados
```

## Deploy en Vercel

### Desde Git (recomendado)
1. Conecta el repo `niduscode/NidusCode-web` en Vercel.
2. Framework preset: **Other** · Build command: *(vacío)* · Output directory: `.`
3. Vercel detecta `vercel.json` (headers, cache y routing) automáticamente.

### CLI
```bash
npm i -g vercel
vercel --prod
```

> **Dominio:** los metadatos (OG, canonical, `sitemap.xml`, `robots.txt` y el JSON-LD en `index.html`)
> usan `https://niduscode-web.vercel.app`. Si tu subdominio real es otro, busca y reemplaza esa URL
> en `index.html`, `sitemap.xml` y `robots.txt`.

## Regenerar el CSS de Tailwind

```bash
npm install
npx tailwindcss -i tailwind.input.css -o tailwind.build.css --minify
```

## Formulario de contacto (Supabase)

Los envíos van a la tabla `public.contact_messages` vía Supabase REST (`contact-form.js`).

- La *publishable key* es pública por diseño; la seguridad la da el **RLS**.
- ⚠️ **Verifica en Supabase** que la política RLS permita **solo `INSERT` para el rol `anon`**
  (nunca `SELECT`/`UPDATE`/`DELETE`), o cualquiera podría leer los mensajes recibidos.
- Para notificaciones: configura un *Database Webhook* o un trigger que avise por email.

## Analítica

`index.html` incluye **Vercel Web Analytics** (`/_vercel/insights/script.js`).
Actívalo en el panel de Vercel: *Project → Analytics → Enable*.

## Modo claro / oscuro

Se adapta automáticamente a la preferencia del sistema (`@media (prefers-color-scheme: dark)`). Sin botón.

## Stack

- HTML5 semántico
- Tailwind CSS (pre-compilado, sin CDN runtime)
- Google Fonts: Inter + Poppins + JetBrains Mono
- JavaScript vanilla (IntersectionObserver, sin dependencias)
- Backend de contacto: Supabase REST
- Deploy: Vercel
