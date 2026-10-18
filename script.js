(() => {
  const $ = id => document.getElementById(id);
  const lit = $('lit'), scene = $('scene'), ambient = $('ambient'), finalImg = $('final');
  const fx = $('fx'), glow = $('glow');
  const fctx = fx.getContext('2d'), gctx = glow.getContext('2d');
  const W = 941, H = 1671;
  fx.width = glow.width = W; fx.height = glow.height = H;

  // Mask canvas (off-screen): decides where the final photo shows through
  const mask = document.createElement('canvas'); mask.width = W; mask.height = H;
  const mctx = mask.getContext('2d');

  // Key positions measured on the photo (fractions of width / height)
  const SPOUT  = { x: 0.645 * W, y: 0.235 * H };   // tip of the teapot spout
  const IMPACT = { x: 0.611 * W, y: 0.643 * H };   // where the stream meets the table

  // Timeline in seconds since the lights were triggered
  const T = {
    litEnd: 3.4,                 // lights flicker on (photo 2)
    glowIn: [2.4, 4.2],          // teapot warms up
    stream: [3.6, 5.7],          // light pours from the spout to the table
    wave1:  [4.6, 10.2],         // light spreads outward from the teapot
    wave2:  [5.6, 10.4],         // light ripples out from the table
    end: 10.6
  };

  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const prog = (t, [a, b]) => clamp((t - a) / (b - a));
  const easeInOut = p => 0.5 - 0.5 * Math.cos(Math.PI * p);
  const easeOut = p => 1 - Math.pow(1 - p, 3);

  // Natural-feeling flicker as the first lights switch on
  const flick = [[0,0],[.35,0],[.42,.35],[.5,.05],[.75,.55],[.9,.2],[1.05,.65],[1.3,.5],[1.9,.88],[T.litEnd,1]];
  function litOpacity(t) {
    if (t >= T.litEnd) return 1;
    for (let i = 1; i < flick.length; i++) {
      if (t <= flick[i][0]) {
        const [t0, v0] = flick[i-1], [t1, v1] = flick[i];
        return v0 + (v1 - v0) * ((t - t0) / (t1 - t0));
      }
    }
    return 1;
  }

  const streamX = y => SPOUT.x + (IMPACT.x - SPOUT.x) * ((y - SPOUT.y) / (IMPACT.y - SPOUT.y));
  let sparks = [];

  function drawMask(t) {
    mctx.clearRect(0, 0, W, H);

    // 1) The stream: soft-edged column of reveal that follows the falling head
    const sp = prog(t, T.stream);
    if (sp > 0) {
      const headY = SPOUT.y + (IMPACT.y - SPOUT.y) * Math.pow(sp, 1.7);  // accelerates like a falling liquid
      const hx = streamX(headY);
      mctx.lineCap = 'round';
      for (let i = 0; i < 9; i++) {
        mctx.strokeStyle = 'rgba(0,0,0,0.24)';
        mctx.lineWidth = W * (0.26 - i * 0.026);
        mctx.beginPath(); mctx.moveTo(SPOUT.x, SPOUT.y); mctx.lineTo(hx, headY); mctx.stroke();
      }
      // The column gives way to the wave once it has landed
    }

    // 2) Two soft waves of light: one from the spout, one from the impact point
    const wave = (origin, p, rMax) => {
      if (p <= 0) return;
      const R = Math.max(1, easeInOut(p) * rMax);
      const g = mctx.createRadialGradient(origin.x, origin.y, 0, origin.x, origin.y, R);
      g.addColorStop(0, 'rgba(0,0,0,1)');
      g.addColorStop(0.62, 'rgba(0,0,0,1)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      mctx.fillStyle = g;
      mctx.fillRect(0, 0, W, H);
    };
    wave(SPOUT,  prog(t, T.wave1), 1.45 * H);
    wave(IMPACT, prog(t, T.wave2), 1.3 * H);

    if (t >= T.end) { mctx.fillStyle = '#000'; mctx.fillRect(0, 0, W, H); }
  }

  function drawFx() {
    fctx.globalCompositeOperation = 'source-over';
    fctx.clearRect(0, 0, W, H);
    fctx.drawImage(finalImg, 0, 0, W, H);
    fctx.globalCompositeOperation = 'destination-in';
    fctx.drawImage(mask, 0, 0);
    fctx.globalCompositeOperation = 'source-over';
  }

  function radial(ctx, x, y, r, a) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(255,205,130,${a})`);
    g.addColorStop(0.35, `rgba(255,170,80,${a * 0.45})`);
    g.addColorStop(1, 'rgba(255,150,60,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }

  let last = 0;
  function drawGlow(t, dt) {
    gctx.globalCompositeOperation = 'source-over';
    gctx.clearRect(0, 0, W, H);
    gctx.globalCompositeOperation = 'lighter';

    // Teapot warming up, then settling into a gentle glow
    const gi = easeOut(prog(t, T.glowIn));
    const settle = 1 - 0.55 * easeInOut(prog(t, [6.5, T.end]));
    const pulse = 1 + 0.06 * Math.sin(t * 3.2);
    if (gi > 0) radial(gctx, SPOUT.x, SPOUT.y, W * 0.38 * pulse, 0.5 * gi * settle);

    // Bright head and core of the falling stream
    const sp = prog(t, T.stream);
    if (sp > 0) {
      const headY = SPOUT.y + (IMPACT.y - SPOUT.y) * Math.pow(sp, 1.7);
      const hx = streamX(headY);
      if (sp < 1) radial(gctx, hx, headY, W * 0.16, 0.9);
      const fade = 0.55 + 0.45 * (1 - easeInOut(prog(t, [6.5, T.end])));
      gctx.lineCap = 'round';
      gctx.strokeStyle = `rgba(255,214,150,${0.35 * fade})`; gctx.lineWidth = 9;
      gctx.beginPath(); gctx.moveTo(SPOUT.x, SPOUT.y); gctx.lineTo(hx, headY); gctx.stroke();
      gctx.strokeStyle = `rgba(255,245,225,${0.7 * fade})`; gctx.lineWidth = 3;
      gctx.beginPath(); gctx.moveTo(SPOUT.x, SPOUT.y); gctx.lineTo(hx, headY); gctx.stroke();

      // Sparkles shed by the stream
      if (sp < 1 || t < T.end - 2) {
        for (let i = 0; i < 2; i++) {
          const y = SPOUT.y + Math.random() * (headY - SPOUT.y);
          sparks.push({ x: streamX(y) + (Math.random() - .5) * 14, y,
            vx: (Math.random() - .5) * 26, vy: -8 + Math.random() * 16, life: 0, max: 0.8 + Math.random() * 0.9,
            r: 1.2 + Math.random() * 2.2 });
        }
      }
    }

    // Impact flash when the light lands on the table
    const imp = prog(t, [T.stream[1] - 0.15, T.stream[1] + 1.4]);
    if (imp > 0 && imp < 1) radial(gctx, IMPACT.x, IMPACT.y, W * (0.18 + 0.35 * imp), 0.8 * (1 - imp));

    // Draw & age sparkles
    sparks = sparks.filter(s => (s.life += dt) < s.max);
    for (const s of sparks) {
      s.x += s.vx * dt; s.y += s.vy * dt;
      const a = 1 - s.life / s.max;
      radial(gctx, s.x, s.y, s.r * 5, 0.7 * a);
    }
  }

  // Animation driver
  let raf = 0, t0 = 0, running = false, started = false, timer;

  function frame(now) {
    const t = (now - t0) / 1000;
    const dt = Math.min(0.05, (now - last) / 1000 || 0.016); last = now;
    lit.style.opacity = litOpacity(t);
    ambient.style.opacity = clamp(litOpacity(t) * 0.6 + 0.4 * easeInOut(prog(t, [4, T.end])), 0, 1);
    const z = 1 + 0.05 * easeOut(clamp(t / 12));
    scene.style.transform = `scale(${z})`;
    drawMask(t); drawFx(); drawGlow(t, dt);
    if (t < T.end + 0.5) raf = requestAnimationFrame(frame);
    else { running = false; sparks = []; gctx.clearRect(0, 0, W, H); }
  }

  function turnOn() {
    if (started) return;
    started = true; running = true;
    clearTimeout(timer);
    t0 = performance.now(); last = t0;
    raf = requestAnimationFrame(frame);
  }

  function reset() {
    cancelAnimationFrame(raf); clearTimeout(timer);
    started = false; running = false; sparks = [];
    lit.style.opacity = 0; ambient.style.opacity = 0;
    scene.style.transform = 'scale(1)';
    fctx.clearRect(0, 0, W, H); gctx.clearRect(0, 0, W, H);
    timer = setTimeout(turnOn, 700);    // starts by itself right after the first frame
  }

  $('stage').addEventListener('click', e => { if (!e.target.closest('button, .sheet, .drawer')) turnOn(); });

  // Begin as soon as the final photo is decoded (does not wait for web fonts)
  (finalImg.decode ? finalImg.decode() : Promise.resolve()).catch(() => {}).then(reset);

  /* ===== Interface logic ===== */
  const ui = $('ui'), sheet = $('sheet'), dim = $('dim'), drawer = $('drawer'), burger = $('burger');
  const tabs = [...sheet.querySelectorAll('.tab')], panes = [...sheet.querySelectorAll('.pane')];
  const navBtns = [...drawer.querySelectorAll('[data-go]')];

  function setTab(name) {
    tabs.forEach(t => t.classList.toggle('active', t.dataset.tab === name));
    panes.forEach(p => p.classList.toggle('active', p.dataset.pane === name));
    navBtns.forEach(b => b.classList.toggle('active', b.dataset.go === name));
  }
  function openDrawer(open) {
    drawer.classList.toggle('open', open); burger.classList.toggle('open', open);
    burger.setAttribute('aria-expanded', open); drawer.setAttribute('aria-hidden', !open);
  }
  function openSheet(name) {
    setTab(name); openDrawer(false);
    sheet.classList.add('open'); dim.classList.add('on'); sheet.setAttribute('aria-hidden', 'false');
  }
  function closeSheet() {
    sheet.classList.remove('open'); dim.classList.remove('on'); sheet.setAttribute('aria-hidden', 'true');
    navBtns.forEach(b => b.classList.toggle('active', b.dataset.go === 'home'));
  }
  function goHome() { openDrawer(false); closeSheet(); }

  tabs.forEach(t => t.addEventListener('click', () => setTab(t.dataset.tab)));
  navBtns.forEach(b => b.addEventListener('click', () => b.dataset.go === 'home' ? goHome() : openSheet(b.dataset.go)));
  $('explore').addEventListener('click', () => openSheet('menu'));
  $('scrollcue').addEventListener('click', () => openSheet('menu'));
  $('logo').addEventListener('click', goHome);
  $('closer').addEventListener('click', closeSheet);
  dim.addEventListener('click', closeSheet);
  burger.addEventListener('click', () => openDrawer(!drawer.classList.contains('open')));
  $('replay').addEventListener('click', () => { goHome(); reset(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') goHome(); });

  // Scrolling or swiping up on the hero opens the menu, like "Scroll to discover" suggests
  let touchY = null;
  ui.addEventListener('wheel', e => { if (e.deltaY > 20 && !sheet.classList.contains('open') && !drawer.classList.contains('open')) openSheet('menu'); }, { passive: true });
  ui.addEventListener('touchstart', e => { touchY = e.touches[0].clientY; }, { passive: true });
  ui.addEventListener('touchend', e => {
    if (touchY !== null && touchY - e.changedTouches[0].clientY > 60 && !sheet.classList.contains('open')) openSheet('menu');
    touchY = null;
  }, { passive: true });

  // Menu category chips
  sheet.querySelectorAll('.chip').forEach(c => c.addEventListener('click', () => {
    sheet.querySelectorAll('.chip').forEach(x => x.classList.toggle('active', x === c));
    sheet.querySelectorAll('.items').forEach(i => i.classList.toggle('active', i.dataset.items === c.dataset.cat));
  }));

  // Reservation form (front-end only)
  $('form').addEventListener('submit', e => { e.preventDefault(); $('thanks').style.display = 'block'; });
  $('d').min = new Date().toISOString().slice(0, 10);

  // Lute music: loops quietly behind the page. Browsers block sound until the visitor interacts,
  // so it tries to start immediately and otherwise starts on the first tap, click or key press.
  const music = $('music'), audio = $('lute');
  audio.volume = 0;
  let userPaused = false, fadeId = 0;
  function fadeTo(v, ms, done) {
    cancelAnimationFrame(fadeId);
    const v0 = audio.volume, t0 = performance.now();
    const step = now => {
      const p = Math.max(0, Math.min(1, (now - t0) / ms));
      audio.volume = Math.max(0, Math.min(1, v0 + (v - v0) * p));
      if (p < 1) fadeId = requestAnimationFrame(step); else if (done) done();
    };
    fadeId = requestAnimationFrame(step);
  }
  function setMusicUI(on) { music.classList.toggle('on', on); music.setAttribute('aria-pressed', on); }
  function startMusic() {
    return audio.play().then(() => { setMusicUI(true); fadeTo(0.6, 3000); return true; })
                       .catch(() => { setMusicUI(false); return false; });
  }
  function stopMusic() { setMusicUI(false); fadeTo(0, 700, () => audio.pause()); }
  music.addEventListener('click', () => {
    if (audio.paused) { userPaused = false; startMusic(); } else { userPaused = true; stopMusic(); }
  });
  const UNLOCK = ['pointerdown', 'keydown', 'touchend'];
  const unlock = e => {
    if (e.target.closest && e.target.closest('#music')) return;
    UNLOCK.forEach(ev => document.removeEventListener(ev, unlock));
    if (!userPaused && audio.paused) startMusic();
  };
  startMusic().then(ok => { if (!ok) UNLOCK.forEach(ev => document.addEventListener(ev, unlock)); });
})();
