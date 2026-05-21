/* ============================================================
   Modo demo · NidusCode
   Capa compartida por TODAS las demos del portafolio.
   Convierte el sitio en un sandbox: se puede ver y pulsar todo,
   pero ningún enlace externo / de contacto navega a ningún lado
   y ningún formulario se envía.

   Uso en cada demo, antes de </body>:
     <script src="../demo-mode.js" defer></script>
   ============================================================ */
(function () {
  'use strict';

  // ---- Estilos de la píldora y el aviso ----
  var style = document.createElement('style');
  style.textContent = `
    .ndc-demo-pill{
      position:fixed; left:16px; bottom:16px; z-index:2147482000;
      display:flex; align-items:center; gap:8px;
      padding:8px 14px; border-radius:999px;
      background:rgba(26,18,12,.88); color:#F5EBDC;
      font:600 12px/1 'Inter',system-ui,sans-serif;
      box-shadow:0 8px 28px rgba(0,0,0,.28);
      pointer-events:none; -webkit-backdrop-filter:blur(6px); backdrop-filter:blur(6px);
    }
    .ndc-demo-pill .dot{
      width:8px; height:8px; border-radius:50%; background:#A6C36F;
      animation:ndc-pulse 2.2s infinite;
    }
    @keyframes ndc-pulse{
      0%{box-shadow:0 0 0 0 rgba(166,195,111,.6)}
      70%{box-shadow:0 0 0 9px rgba(166,195,111,0)}
      100%{box-shadow:0 0 0 0 rgba(166,195,111,0)}
    }
    .ndc-demo-toast{
      position:fixed; left:50%; bottom:24px; transform:translate(-50%,150%);
      z-index:2147483000; max-width:min(460px,90vw);
      display:flex; align-items:flex-start; gap:10px;
      padding:14px 18px; border-radius:14px;
      background:#1A120C; color:#F5EBDC;
      font:500 13.5px/1.5 'Inter',system-ui,sans-serif;
      box-shadow:0 16px 48px rgba(0,0,0,.4);
      opacity:0; transition:transform .35s cubic-bezier(.2,.8,.2,1),opacity .35s;
    }
    .ndc-demo-toast.show{ transform:translate(-50%,0); opacity:1; }
    .ndc-demo-toast svg{ flex:0 0 auto; width:18px; height:18px; margin-top:1px; color:#A6C36F; }
    @media (prefers-reduced-motion:reduce){
      .ndc-demo-pill .dot{ animation:none }
      .ndc-demo-toast{ transition:opacity .2s }
    }`;
  document.head.appendChild(style);

  // ---- Píldora fija "Demo interactiva" ----
  var pill = document.createElement('div');
  pill.className = 'ndc-demo-pill';
  pill.setAttribute('aria-hidden', 'true');
  pill.innerHTML = '<span class="dot"></span>Demo interactiva · NidusCode';
  document.body.appendChild(pill);

  // ---- Aviso emergente ----
  var toast = document.createElement('div');
  toast.className = 'ndc-demo-toast';
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');
  toast.innerHTML =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
    '<circle cx="12" cy="12" r="10"/><path d="M12 8v5M12 16h.01" stroke-linecap="round"/></svg>' +
    '<span>Esto es una <strong>demo</strong>. Puedes verlo y probarlo todo, pero el ' +
    'contacto y los enlaces externos están desactivados: aquí no se envía ni se navega fuera.</span>';
  document.body.appendChild(toast);

  var hideTimer;
  function flash() {
    toast.classList.add('show');
    clearTimeout(hideTimer);
    hideTimer = setTimeout(function () { toast.classList.remove('show'); }, 3800);
  }

  // ---- ¿El enlace sale del sitio de la demo? ----
  function isExternal(href) {
    if (!href) return false;
    var low = href.toLowerCase().trim();
    // Esquemas de contacto directo (WhatsApp, correo, teléfono, SMS).
    if (low.indexOf('mailto:') === 0 || low.indexOf('tel:') === 0 ||
        low.indexOf('whatsapp:') === 0 || low.indexOf('sms:') === 0) return true;
    // Anclas internas: navegación dentro de la propia demo, se permite.
    if (low.charAt(0) === '#' || low === '#') return false;
    // URL absoluta o protocol-relative: externa si el origen no es el de la demo.
    if (/^https?:\/\//i.test(low) || low.indexOf('//') === 0) {
      try {
        return new URL(href, location.href).origin !== location.origin;
      } catch (e) {
        return true;
      }
    }
    return false; // ruta relativa -> interna, se permite
  }

  // ---- Interceptar clics en enlaces externos / de contacto ----
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a) return;
    if (isExternal(a.getAttribute('href'))) {
      e.preventDefault();
      e.stopPropagation();
      flash();
    }
  }, true);

  // ---- Bloquear envío de formularios (las demos no tienen backend) ----
  document.addEventListener('submit', function (e) {
    e.preventDefault();
    e.stopPropagation();
    flash();
  }, true);

  // ---- Por si algún botón abre ventanas externas con JS ----
  var _open = window.open;
  window.open = function (url) {
    if (typeof url === 'string' && isExternal(url)) { flash(); return null; }
    return _open.apply(window, arguments);
  };
})();
