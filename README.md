# NidusCode — Landing Page

Landing minimalista para NidusCode (desarrollo web con IA, automatizaciones y optimizaciones).

## Estructura

```
NidusCode/
├── index.html        Página principal (HTML semántico + Tailwind via CDN)
├── styles.css        Estilos personalizados (scrollbar, reveal, navbar blur, dark mode)
├── script.js         Interacciones (smooth scroll, menú móvil, counters, reveals)
├── netlify.toml      Configuración opcional de Netlify (headers de seguridad + cache)
├── assets/           Imágenes y vídeos del proyecto
└── README.md         Este archivo
```

## Deploy en Netlify (3 opciones)

### 1. Drag & drop (lo más rápido)
1. Entra en https://app.netlify.com/drop
2. Arrastra la carpeta `NidusCode` completa
3. Listo

### 2. Desde Git
1. Sube esta carpeta a un repo (GitHub/GitLab/Bitbucket)
2. En Netlify: *Add new site → Import an existing project*
3. Build command: vacío  ·  Publish directory: `.` (o la subcarpeta donde esté)

### 3. CLI
```bash
npm i -g netlify-cli
netlify deploy --prod --dir=NidusCode
```

## Formulario de contacto

El formulario ya está marcado con `data-netlify="true"` y un `honeypot` anti-spam.
Una vez desplegado, Netlify detecta el formulario automáticamente y verás los envíos en
**Forms** dentro del panel de tu sitio.

> Si quieres notificaciones por email: *Site settings → Forms → Form notifications*.

## Modo claro / oscuro

Se adapta automáticamente a la preferencia del sistema del usuario
(`@media (prefers-color-scheme: dark)`). No requiere botón.

## Datos que conviene personalizar

Busca y sustituye en `index.html`:

- `hola@niduscode.com` → vuestro email real
- `[+34 TU TELÉFONO AQUÍ]` → teléfono real
- `[CIUDAD]` → ciudad
- Tarjetas de portafolio: títulos, descripciones y reemplazar los degradados por
  capturas reales en `assets/`
- Footer: enlaces de LinkedIn / GitHub
- Stats del hero (`data-target`) si quieres números diferentes

## Stack

- HTML5 semántico
- Tailwind CSS (vía CDN — sin build step)
- Google Fonts: Inter + Space Grotesk + JetBrains Mono
- JavaScript vanilla (IntersectionObserver, no dependencias)
