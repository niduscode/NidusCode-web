/* ============================================================
   Juego offline · NidusCode · "Atrapa la N"
   Aparece como overlay cuando el visitante se queda sin internet,
   y se cierra solo cuando vuelve la conexión.
   Modo prueba: agregar ?game=preview a la URL.
   ============================================================ */
(function () {
  'use strict';

  // ===== Estilos =====
  var style = document.createElement('style');
  style.textContent =
    '.nc-off-overlay{position:fixed;inset:0;z-index:2147483647;display:none;' +
    'flex-direction:column;align-items:center;justify-content:center;' +
    'padding:24px;color:#f4f5fb;font-family:"Inter",system-ui,sans-serif;' +
    'background:radial-gradient(ellipse at 25% 0%,rgba(91,140,255,.18),transparent 60%),' +
    'radial-gradient(ellipse at 90% 100%,rgba(236,72,153,.14),transparent 60%),#0a0a0f;}' +
    '.nc-off-overlay.show{display:flex;}' +
    '.nc-off-head{text-align:center;max-width:640px;margin-bottom:14px;}' +
    '.nc-off-flag{display:inline-flex;align-items:center;gap:7px;padding:5px 14px;' +
    'border-radius:999px;background:rgba(255,75,75,.15);' +
    'border:1px solid rgba(255,75,75,.35);color:#ff9b9b;' +
    'font-size:11px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase;' +
    'margin-bottom:10px;font-family:"JetBrains Mono",ui-monospace,monospace;}' +
    '.nc-off-flag .pulse{width:7px;height:7px;border-radius:50%;background:#ff5757;' +
    'animation:ncPulse 1.6s ease-in-out infinite;}' +
    '@keyframes ncPulse{0%,100%{opacity:1;transform:scale(1);}50%{opacity:.4;transform:scale(1.4);}}' +
    '.nc-off-overlay.back .nc-off-flag{background:rgba(34,197,94,.14);' +
    'border-color:rgba(34,197,94,.35);color:#86efac;}' +
    '.nc-off-overlay.back .nc-off-flag .pulse{background:#22c55e;}' +
    '.nc-off-head h2{font-family:"Space Grotesk","Outfit",sans-serif;font-weight:800;' +
    'font-size:clamp(1.5rem,4vw,2.3rem);letter-spacing:-.02em;margin:0 0 6px;line-height:1.15;}' +
    '.nc-off-head h2 .grad{background:linear-gradient(110deg,#5b8cff,#a855f7,#ec4899);' +
    '-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;}' +
    '.nc-off-head p{margin:0;color:rgba(244,245,251,.58);font-size:.92rem;}' +
    '.nc-off-stats{display:flex;gap:22px;margin-top:12px;justify-content:center;' +
    'font-family:"JetBrains Mono",ui-monospace,monospace;font-size:12px;color:rgba(244,245,251,.55);}' +
    '.nc-off-stats b{color:#fff;font-weight:700;margin-left:5px;}' +
    '.nc-off-wrap{position:relative;width:min(640px,100%);aspect-ratio:4/3;' +
    'max-height:min(58vh,460px);border-radius:18px;overflow:hidden;' +
    'background:rgba(255,255,255,.025);border:1px solid rgba(255,255,255,.08);' +
    'box-shadow:0 28px 80px -20px rgba(0,0,0,.7);touch-action:none;}' +
    '.nc-off-wrap canvas{display:block;width:100%;height:100%;cursor:none;}' +
    '.nc-off-go{position:absolute;inset:0;display:none;align-items:center;' +
    'justify-content:center;flex-direction:column;text-align:center;padding:24px;' +
    'background:rgba(10,10,16,.78);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);}' +
    '.nc-off-go.show{display:flex;}' +
    '.nc-off-go h3{font-family:"Space Grotesk",sans-serif;font-weight:800;' +
    'font-size:1.6rem;margin:0 0 6px;}' +
    '.nc-off-go p{margin:0 0 18px;color:rgba(244,245,251,.7);font-size:.94rem;}' +
    '.nc-off-btn{display:inline-flex;align-items:center;gap:8px;padding:11px 26px;' +
    'border-radius:999px;border:none;cursor:pointer;font-family:inherit;font-weight:600;' +
    'font-size:.92rem;background:linear-gradient(135deg,#5b8cff,#a855f7);color:#fff;' +
    'transition:transform .2s ease;}' +
    '.nc-off-btn:hover{transform:translateY(-2px);}' +
    '.nc-off-foot{margin-top:14px;font-family:"JetBrains Mono",ui-monospace,monospace;' +
    'font-size:11px;color:rgba(244,245,251,.4);}' +
    '@media (max-width:520px){.nc-off-wrap{max-height:48vh;}.nc-off-stats{gap:14px;font-size:11px;}}';
  document.head.appendChild(style);

  // ===== DOM del overlay =====
  var overlay = document.createElement('div');
  overlay.className = 'nc-off-overlay';
  overlay.setAttribute('aria-hidden', 'true');
  overlay.innerHTML =
    '<div class="nc-off-head">' +
      '<div class="nc-off-flag"><span class="pulse"></span><span class="msg">Sin conexión</span></div>' +
      '<h2>Mientras vuelve internet, <span class="grad">atrapá las N</span></h2>' +
      '<p>Mové la paleta con el mouse, el dedo o las flechas ← →</p>' +
      '<div class="nc-off-stats">' +
        '<span>SCORE<b id="ncScore">0</b></span>' +
        '<span>RÉCORD<b id="ncBest">0</b></span>' +
        '<span>VIDAS<b id="ncLives">3</b></span>' +
      '</div>' +
    '</div>' +
    '<div class="nc-off-wrap">' +
      '<canvas id="ncCanvas"></canvas>' +
      '<div class="nc-off-go">' +
        '<h3>¡Game over!</h3>' +
        '<p id="ncFinal">Puntaje final: <b>0</b></p>' +
        '<button class="nc-off-btn" id="ncRetry">Volver a jugar</button>' +
      '</div>' +
    '</div>' +
    '<div class="nc-off-foot">// juego offline · NidusCode</div>';
  document.body.appendChild(overlay);

  // ===== Estado del juego =====
  var canvas = overlay.querySelector('#ncCanvas');
  var ctx = canvas.getContext('2d');
  var scoreEl = overlay.querySelector('#ncScore');
  var bestEl = overlay.querySelector('#ncBest');
  var livesEl = overlay.querySelector('#ncLives');
  var goPanel = overlay.querySelector('.nc-off-go');
  var finalMsg = overlay.querySelector('#ncFinal');
  var retryBtn = overlay.querySelector('#ncRetry');
  var flagMsg = overlay.querySelector('.nc-off-flag .msg');

  var dpr = window.devicePixelRatio || 1;
  var W = 0, H = 0;
  var running = false;
  var rafId = null;
  var paddle = { x: 0, w: 110, h: 14, y: 0 };
  var ns = [];
  var score = 0;
  var best = 0;
  try { best = parseInt(localStorage.getItem('nc-off-best') || '0', 10) || 0; } catch (e) {}
  var lives = 3;
  var spawnTimer = 0;
  var spawnInterval = 1100;
  var lastTime = 0;
  var colors = ['#5b8cff', '#a855f7', '#ec4899'];

  function resize() {
    var rect = canvas.getBoundingClientRect();
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    W = rect.width; H = rect.height;
    paddle.w = Math.max(80, Math.min(140, W * 0.18));
    paddle.y = H - 30;
    paddle.x = Math.max(0, Math.min(W - paddle.w, paddle.x || (W - paddle.w) / 2));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function spawn() {
    var size = 22 + Math.random() * 14;
    ns.push({
      x: Math.random() * (W - size * 1.2) + size * 0.6,
      y: -size,
      size: size,
      speed: 90 + Math.random() * 130 + Math.min(score * 2.6, 170),
      color: colors[Math.floor(Math.random() * colors.length)],
      rot: (Math.random() - 0.5) * 0.5,
      rs: (Math.random() - 0.5) * 1.6
    });
  }

  function drawN(n) {
    ctx.save();
    ctx.translate(n.x, n.y);
    ctx.rotate(n.rot);
    ctx.fillStyle = n.color;
    ctx.shadowColor = n.color;
    ctx.shadowBlur = 14;
    ctx.font = '700 ' + n.size + 'px "Space Grotesk","Outfit",sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('N', 0, 0);
    ctx.restore();
  }

  function drawPaddle() {
    ctx.save();
    ctx.fillStyle = '#fff';
    ctx.shadowColor = 'rgba(91,140,255,0.55)';
    ctx.shadowBlur = 22;
    var r = paddle.h / 2;
    ctx.beginPath();
    ctx.moveTo(paddle.x + r, paddle.y);
    ctx.arcTo(paddle.x + paddle.w, paddle.y, paddle.x + paddle.w, paddle.y + r, r);
    ctx.arcTo(paddle.x + paddle.w, paddle.y + paddle.h, paddle.x + paddle.w - r, paddle.y + paddle.h, r);
    ctx.arcTo(paddle.x, paddle.y + paddle.h, paddle.x, paddle.y + paddle.h - r, r);
    ctx.arcTo(paddle.x, paddle.y, paddle.x + r, paddle.y, r);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function update(dt) {
    spawnTimer += dt;
    if (spawnTimer >= spawnInterval) {
      spawnTimer = 0;
      spawnInterval = Math.max(420, spawnInterval - 9);
      spawn();
    }
    for (var i = ns.length - 1; i >= 0; i--) {
      var n = ns[i];
      n.y += n.speed * dt / 1000;
      n.rot += n.rs * dt / 1000;
      var half = n.size * 0.45;
      if (n.y + half >= paddle.y &&
          n.y - half <= paddle.y + paddle.h &&
          n.x + half >= paddle.x &&
          n.x - half <= paddle.x + paddle.w) {
        ns.splice(i, 1);
        score++;
        scoreEl.textContent = score;
        if (score > best) {
          best = score;
          bestEl.textContent = best;
          try { localStorage.setItem('nc-off-best', String(best)); } catch (e) {}
        }
        continue;
      }
      if (n.y - n.size > H) {
        ns.splice(i, 1);
        lives--;
        livesEl.textContent = lives;
        if (lives <= 0) { gameOver(); return; }
      }
    }
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    drawPaddle();
    for (var i = 0; i < ns.length; i++) drawN(ns[i]);
  }

  function loop(t) {
    if (!running) return;
    var dt = lastTime ? Math.min(t - lastTime, 50) : 16;
    lastTime = t;
    update(dt);
    draw();
    rafId = requestAnimationFrame(loop);
  }

  function startGame() {
    score = 0; lives = 3; ns = [];
    scoreEl.textContent = 0;
    livesEl.textContent = 3;
    bestEl.textContent = best;
    spawnTimer = 0;
    spawnInterval = 1100;
    lastTime = 0;
    goPanel.classList.remove('show');
    running = true;
    rafId = requestAnimationFrame(loop);
  }

  function stopGame() {
    running = false;
    if (rafId) cancelAnimationFrame(rafId);
  }

  function gameOver() {
    stopGame();
    var rec = (score >= best && score > 0) ? ' · ¡Nuevo récord!' : '';
    finalMsg.innerHTML = 'Puntaje final: <b>' + score + '</b>' + rec;
    goPanel.classList.add('show');
  }

  retryBtn.addEventListener('click', startGame);

  // ===== Input =====
  function onMove(clientX) {
    var rect = canvas.getBoundingClientRect();
    var x = clientX - rect.left - paddle.w / 2;
    paddle.x = Math.max(0, Math.min(W - paddle.w, x));
  }
  canvas.addEventListener('mousemove', function (e) { onMove(e.clientX); });
  canvas.addEventListener('touchstart', function (e) {
    e.preventDefault();
    onMove(e.touches[0].clientX);
  }, { passive: false });
  canvas.addEventListener('touchmove', function (e) {
    e.preventDefault();
    onMove(e.touches[0].clientX);
  }, { passive: false });

  var keyL = false, keyR = false;
  document.addEventListener('keydown', function (e) {
    if (!overlay.classList.contains('show')) return;
    if (e.key === 'ArrowLeft') keyL = true;
    if (e.key === 'ArrowRight') keyR = true;
  });
  document.addEventListener('keyup', function (e) {
    if (e.key === 'ArrowLeft') keyL = false;
    if (e.key === 'ArrowRight') keyR = false;
  });
  setInterval(function () {
    if (!running) return;
    var step = 14;
    if (keyL) paddle.x = Math.max(0, paddle.x - step);
    if (keyR) paddle.x = Math.min(W - paddle.w, paddle.x + step);
  }, 16);

  window.addEventListener('resize', function () {
    if (overlay.classList.contains('show')) resize();
  });

  // ===== Mostrar / esconder =====
  function showOverlay() {
    overlay.classList.remove('back');
    flagMsg.textContent = 'Sin conexión';
    overlay.classList.add('show');
    overlay.setAttribute('aria-hidden', 'false');
    resize();
    startGame();
  }
  function hideOverlay() {
    overlay.classList.add('back');
    flagMsg.textContent = '¡Volviste! Cerrando...';
    stopGame();
    setTimeout(function () {
      overlay.classList.remove('show');
      overlay.classList.remove('back');
      overlay.setAttribute('aria-hidden', 'true');
    }, 1500);
  }

  window.addEventListener('offline', showOverlay);
  window.addEventListener('online', hideOverlay);

  // Modo prueba: ?game=preview
  if (location.search.indexOf('game=preview') !== -1) {
    setTimeout(showOverlay, 250);
  }
})();
