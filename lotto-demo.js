import { CAT_FRAMES, CAT_PALETTE, BALL, ballPalette } from './assets/lotto-demo/sprites.js';

// UI palette and sprites adapted from the user's original LottoMax frontend:
// legowen/lottomax-ai @ d410287cfe64ee729687436fdf3eba7badbfa867.
// This portfolio slice samples locally; it never calls the Python/model service.
const POOL_SIZE = 52;
const PICK_SIZE = 7;
const colorFor = n => n <= 10 ? '#ef4444' : n <= 20 ? '#3b82f6' : n <= 30 ? '#a855f7' : n <= 40 ? '#22c55e' : '#f97316';

export function randomLottoPick() {
  const pool = Array.from({ length: POOL_SIZE }, (_, i) => i + 1);
  const entropy = new Uint32Array(1);
  for (let i = 0; i < PICK_SIZE; i++) {
    const range = POOL_SIZE - i;
    // Reject the remainder so modulo reduction does not favour any number.
    const limit = Math.floor(4294967296 / range) * range;
    do { globalThis.crypto.getRandomValues(entropy); } while (entropy[0] >= limit);
    const j = i + entropy[0] % range;
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, PICK_SIZE).sort((a, b) => a - b);
}

function sprite(rows, palette) {
  const rects = [];
  rows.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const char = row[x];
      if (char === '.') { x++; continue; }
      let run = 1;
      while (row[x + run] === char) run++;
      rects.push(`<rect x="${x}" y="${y}" width="${run}" height="1" fill="${palette[char]}"/>`);
      x += run;
    }
  });
  return `<svg viewBox="0 0 ${rows[0].length} ${rows.length}" aria-hidden="true" focusable="false" shape-rendering="crispEdges">${rects.join('')}</svg>`;
}

export function mountLotto(root) {
  const controller = new AbortController();
  const timers = new Set();
  let current = [], history = [], disposed = false, revealing = false;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const app = document.createElement('section');
  app.className = 'lotto-demo';
  app.setAttribute('aria-label', "LottoMax — Bomi's random number picker");
  app.innerHTML = `
    <header class="lotto-heading"><div class="lotto-logo">${sprite(CAT_FRAMES.idle, CAT_PALETTE)}</div><div><h3>LOTTO MAX</h3><p>BOMI'S NUMBER PICKER</p></div></header>
    <div class="lotto-status"><span>● BROWSER DEMO</span><span>7 NUMBERS / 1–52</span><span>RANDOM MODE</span></div>
    <nav class="lotto-tabs" aria-label="Number picker views"><button type="button" data-view="generate" aria-pressed="true">&gt; GENERATE</button><button type="button" data-view="history" aria-pressed="false">RECENT PICKS <span class="lotto-history-count">0</span></button></nav>
    <p class="lotto-honesty">Every combination has the same chance. This demo makes random picks in your browser; it does not run the AI model.</p>
    <div class="lotto-generate-view">
      <div class="lotto-generate-action"><button class="lotto-primary" type="button" data-action="generate">GENERATE NUMBERS</button></div>
      <section class="lotto-panel" aria-label="Your numbers">
        <div class="lotto-panel-title"><h4>LOTTOMAX NUMBERS</h4><span>RANDOM</span></div>
        <div class="lotto-reveal"><div class="lotto-cat" role="img" aria-label="Bomi, a black pixel cat">${sprite(CAT_FRAMES.idle, CAT_PALETTE)}</div><div class="lotto-tray"><p class="lotto-speech" aria-live="polite">READY WHEN YOU ARE!</p><div class="lotto-balls" aria-hidden="true"></div><p class="lotto-result" aria-live="polite"></p><div class="lotto-result-actions"><button type="button" data-action="skip" hidden>SKIP &gt;&gt;</button><button type="button" data-action="copy" disabled>COPY NUMBERS</button></div></div></div>
        <p class="lotto-stats">Seven unique numbers, sorted from low to high.</p>
      </section>
    </div>
    <section class="lotto-history-view lotto-panel" aria-label="Recent random picks" hidden><h4>RECENT PICKS</h4><p class="lotto-history-note">Your last five picks, kept only while this demo is open.</p><ol class="lotto-history"></ol><p class="lotto-empty">No picks yet. Generate your first set!</p></section>
    <footer class="lotto-footer">ORIGINAL PIXEL ART & UI · LOCAL RANDOM DEMO · NO PURCHASE OR SIGN-IN</footer>`;
  root.append(app);
  const find = selector => app.querySelector(selector);
  const generate = find('[data-action="generate"]');
  const copy = find('[data-action="copy"]');
  const skip = find('[data-action="skip"]');
  const balls = find('.lotto-balls');
  const cat = find('.lotto-cat');
  const speech = find('.lotto-speech');
  const result = find('.lotto-result');
  const stats = find('.lotto-stats');
  const setCat = frame => { cat.innerHTML = sprite(CAT_FRAMES[frame], CAT_PALETTE); };
  const later = (callback, delay) => {
    const timer = setTimeout(() => { timers.delete(timer); if (!disposed) callback(); }, delay);
    timers.add(timer);
  };
  const clearTimers = () => { timers.forEach(clearTimeout); timers.clear(); };
  const makeSlots = () => { balls.innerHTML = Array.from({ length: PICK_SIZE }, () => '<div class="lotto-slot"><span>?</span></div>').join(''); };
  const showBall = i => {
    const slot = balls.children[i];
    const n = current[i];
    slot.innerHTML = `<div class="lotto-ball">${sprite(BALL, ballPalette(colorFor(n)))}<b>${n}</b></div>`;
  };
  const finish = () => {
    clearTimers();
    current.forEach((_, i) => showBall(i));
    revealing = false;
    generate.disabled = false;
    copy.disabled = false;
    skip.hidden = true;
    speech.textContent = 'ALL SET! GOOD LUCK!';
    result.textContent = current.join(' · ');
    const odd = current.filter(n => n % 2).length;
    stats.textContent = `SUM ${current.reduce((a, b) => a + b, 0)}  ·  ${odd} ODD / ${PICK_SIZE - odd} EVEN  ·  RANDOM PICK`;
    setCat('happy');
    later(() => setCat('idle'), 1500);
  };
  const renderHistory = () => {
    find('.lotto-history-count').textContent = String(history.length);
    find('.lotto-empty').hidden = history.length > 0;
    find('.lotto-history').innerHTML = history.map((pick, i) => `<li><span>${i === 0 ? 'LATEST' : `PICK ${history.length - i}`}</span><strong>${pick.map(n => String(n).padStart(2, '0')).join(' · ')}</strong></li>`).join('');
  };
  const chooseView = view => {
    find('.lotto-generate-view').hidden = view !== 'generate';
    find('.lotto-history-view').hidden = view !== 'history';
    app.querySelectorAll('[data-view]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.view === view)));
  };
  app.addEventListener('click', async event => {
    const button = event.target.closest('button');
    if (!button || button.disabled) return;
    if (button.dataset.view) { chooseView(button.dataset.view); return; }
    switch (button.dataset.action) {
      case 'generate': {
        clearTimers();
        current = randomLottoPick();
        history.unshift([...current]);
        history = history.slice(0, 5);
        renderHistory();
        makeSlots();
        copy.textContent = 'COPY NUMBERS';
        copy.disabled = true;
        generate.disabled = true;
        revealing = true;
        skip.hidden = reducedMotion;
        speech.textContent = 'BOMI IS PICKING...';
        result.textContent = '';
        stats.textContent = 'A fresh random pick, made right here.';
        if (reducedMotion) { finish(); break; }
        setCat('swipe');
        current.forEach((_, i) => later(() => { showBall(i); }, 130 + i * 165));
        later(finish, 1330);
        break;
      }
      case 'skip': if (revealing) finish(); break;
      case 'copy':
        try {
          await navigator.clipboard.writeText(current.join(', '));
          if (!disposed) copy.textContent = 'COPIED!';
        } catch {
          if (!disposed) speech.textContent = 'SELECT THE NUMBERS BELOW TO COPY.';
        }
        break;
    }
  }, { signal: controller.signal });
  makeSlots();
  return () => { disposed = true; controller.abort(); clearTimers(); app.remove(); };
}
