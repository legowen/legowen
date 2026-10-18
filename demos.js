const sprite = (name) => new URL(`./assets/${name}.png`, import.meta.url).href;
const projectLink = (url, label = 'Explore the original project ↗') => `<a class="demo-source" href="${url}" target="_blank" rel="noopener noreferrer">${label}</a>`;

export function mountDemo(id, container) {
  container.classList.add('demo-host');
  const mounts = { boso, myeongcat, lotto, weather, roshambo };
  const cleanup = mounts[id]?.(container) || (() => {});
  return () => { cleanup(); container.replaceChildren(); container.classList.remove('demo-host'); };
}

function boso(root) {
  root.innerHTML = `<div class="demo-intro"><span class="demo-label">PLAYABLE PORTFOLIO MINI-GAME</span><h3>A little adventure with Seoli.</h3><p>Collect all five stars. Move with ← → or A / D, and jump with ↑, W or Space. On a phone, use the buttons below.</p></div><div class="demo-game-wrap"><canvas class="demo-canvas" width="720" height="360" tabindex="0" aria-label="Seoli star collection game. Use left and right arrows to move, up arrow or space to jump."></canvas><div class="demo-game-caption"><span class="demo-score" role="status">0 / 5 stars</span><span>A small game inspired by Boso</span></div></div><div class="demo-controls"><div class="demo-direction"><button type="button" data-control="left" aria-label="Move left">←</button><button type="button" data-control="right" aria-label="Move right">→</button><button type="button" data-control="jump">Jump ↑</button></div><button type="button" class="demo-secondary" data-reset>Start over</button></div><div class="demo-upload"><label class="demo-secondary">Play with your own photo<input type="file" accept="image/*" data-photo></label><button type="button" class="demo-text-button" data-seoli>Use Seoli</button><span data-photo-status role="status">Your image stays in this browser.</span></div>${projectLink('https://boso-mok0.vercel.app', 'Open the full Boso game ↗')}`;
  const canvas = root.querySelector('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return () => {};
  const seoli = new Image(); seoli.src = sprite('seoli');
  let photo = null, photoUrl = null, photoGeneration = 0, disposed = false;
  let x = 42, y = 244, vy = 0, facing = 1, stars = [], last = 0, frame = 0, time = 0, won = false;
  const keys = { left: false, right: false };
  const floor = 292, size = 54;
  const score = root.querySelector('.demo-score');
  function reset() {
    x = 42; y = floor - size; vy = 0; won = false;
    stars = [130, 245, 360, 495, 625].map((sx, i) => ({ x: sx, y: i % 2 ? 195 : 258, taken: false }));
    score.textContent = '0 / 5 stars';
    canvas.focus({ preventScroll: true });
  }
  function jump() { if (y >= floor - size - 1 && !won) vy = -510; }
  function keydown(e) {
    if (!root.contains(document.activeElement)) return;
    const key = e.key.toLowerCase();
    if (['arrowleft', 'arrowright', 'arrowup', 'a', 'd', 'w', ' '].includes(key) && !['INPUT', 'SELECT', 'BUTTON', 'A'].includes(e.target.tagName)) {
      e.preventDefault();
      if (['arrowleft', 'a'].includes(key)) keys.left = true;
      if (['arrowright', 'd'].includes(key)) keys.right = true;
      if (['arrowup', 'w', ' '].includes(key) && !e.repeat) jump();
    }
  }
  function keyup(e) {
    if (['arrowleft', 'a'].includes(e.key.toLowerCase())) keys.left = false;
    if (['arrowright', 'd'].includes(e.key.toLowerCase())) keys.right = false;
  }
  function clearKeys() { keys.left = false; keys.right = false; }
  const controls = root.querySelectorAll('[data-control]');
  controls.forEach(button => {
    button.addEventListener('pointerdown', e => {
      e.preventDefault(); button.setPointerCapture(e.pointerId); canvas.focus({ preventScroll: true });
      const direction = button.dataset.control;
      if (direction === 'jump') jump(); else keys[direction] = true;
    });
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(type => button.addEventListener(type, () => { if (button.dataset.control !== 'jump') keys[button.dataset.control] = false; }));
    button.addEventListener('click', e => {
      if (e.detail !== 0) return;
      if (button.dataset.control === 'jump') jump();
      else if (!won) { facing = button.dataset.control === 'left' ? -1 : 1; x = Math.max(0, Math.min(720 - size, x + facing * 28)); }
    });
  });
  root.querySelector('[data-reset]').addEventListener('click', reset);
  root.querySelector('[data-seoli]').addEventListener('click', () => {
    photoGeneration++; photo = null;
    if (photoUrl) URL.revokeObjectURL(photoUrl); photoUrl = null;
    root.querySelector('[data-photo]').value = '';
    root.querySelector('[data-photo-status]').textContent = 'Seoli is ready. Your image stays in this browser.';
  });
  root.querySelector('[data-photo]').addEventListener('change', e => {
    const file = e.target.files?.[0];
    if (!file) return;
    const status = root.querySelector('[data-photo-status]');
    if (!file.type.startsWith('image/') || file.size > 10 * 1024 * 1024) { status.textContent = 'Please choose an image under 10 MB.'; return; }
    const generation = ++photoGeneration;
    const nextUrl = URL.createObjectURL(file), next = new Image();
    next.onload = () => {
      if (disposed || generation !== photoGeneration) { URL.revokeObjectURL(nextUrl); return; }
      if (photoUrl) URL.revokeObjectURL(photoUrl);
      photoUrl = nextUrl; photo = next; status.textContent = 'Photo ready. It is never sent to a server.';
    };
    next.onerror = () => { URL.revokeObjectURL(nextUrl); if (!disposed && generation === photoGeneration) status.textContent = 'That image could not be opened. Try a PNG or JPEG.'; };
    next.src = nextUrl;
  });
  function drawStar(s) {
    const sy = s.y + Math.sin(time * 3 + s.x) * 4;
    ctx.save(); ctx.translate(s.x, sy); ctx.rotate(-Math.PI / 2); ctx.beginPath();
    for (let i = 0; i < 10; i++) { const angle = i * Math.PI / 5, r = i % 2 ? 5 : 12; ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r); }
    ctx.closePath(); ctx.fillStyle = '#f4be4f'; ctx.fill(); ctx.restore();
  }
  function draw(timestamp) {
    const dt = Math.min((timestamp - (last || timestamp)) / 1000, .035); last = timestamp; time += dt;
    const dx = Number(keys.right) - Number(keys.left);
    if (!won) { x = Math.max(0, Math.min(720 - size, x + dx * 230 * dt)); if (dx) facing = dx; vy += 1300 * dt; y = Math.min(floor - size, y + vy * dt); if (y === floor - size) vy = 0; }
    for (const star of stars) if (!star.taken && Math.abs(x + size / 2 - star.x) < 30 && Math.abs(y + size / 2 - star.y) < 35) {
      star.taken = true; const total = stars.filter(s => s.taken).length;
      score.textContent = `${total} / 5 stars${total === 5 ? ' · You did it!' : ''}`; won = total === 5;
    }
    ctx.fillStyle = '#e2f0e9'; ctx.fillRect(0, 0, 720, 360);
    ctx.fillStyle = '#fff7db'; ctx.beginPath(); ctx.arc(604, 65, 32, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#c5ddd2';
    for (const hill of [[50, 310, 170], [290, 320, 200], [620, 300, 180]]) { ctx.beginPath(); ctx.arc(...hill, Math.PI, 0); ctx.fill(); }
    ctx.fillStyle = '#a8c8a7'; ctx.fillRect(0, floor, 720, 68); ctx.fillStyle = '#5c896c'; ctx.fillRect(0, floor, 720, 6);
    ctx.fillStyle = '#789b75'; for (let i = 0; i < 18; i++) ctx.fillRect(i * 43 + 7, 312 + i % 3 * 9, 4, 6);
    ctx.fillStyle = '#365746'; ctx.font = '12px ui-monospace, monospace'; ctx.fillText('SEOLI’S STAR WALK', 24, 30);
    stars.filter(s => !s.taken).forEach(drawStar);
    ctx.fillStyle = '#123c2a20'; ctx.beginPath(); ctx.ellipse(x + size / 2, floor + 2, 20, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.save(); ctx.translate(x + size / 2, y); ctx.scale(facing, 1);
    if (photo?.complete) {
      ctx.save(); ctx.beginPath(); ctx.arc(0, size / 2, size / 2 - 3, 0, Math.PI * 2); ctx.clip();
      const side = Math.min(photo.width, photo.height); ctx.drawImage(photo, (photo.width - side) / 2, (photo.height - side) / 2, side, side, -size / 2, 0, size, size); ctx.restore();
    } else if (seoli.complete && seoli.naturalWidth) {
      const cell = seoli.naturalWidth / 4; const pose = won ? 15 : vy < 0 ? 6 : vy > 30 ? 7 : dx ? 2 + Math.floor(time * 10) % 4 : Math.floor(time / 3) % 5 === 4 ? 1 : 0;
      ctx.drawImage(seoli, pose % 4 * cell, Math.floor(pose / 4) * cell, cell, cell, -size / 2, 0, size, size);
    }
    ctx.restore();
    if (won) { ctx.fillStyle = '#173c30'; ctx.font = 'bold 27px system-ui'; ctx.textAlign = 'center'; ctx.fillText('Five stars. One happy cat.', 360, 108); ctx.font = '14px system-ui'; ctx.fillText('Play again, or open the full Boso adventure below.', 360, 135); ctx.textAlign = 'left'; }
    frame = requestAnimationFrame(draw);
  }
  window.addEventListener('keydown', keydown); window.addEventListener('keyup', keyup); window.addEventListener('blur', clearKeys);
  reset(); frame = requestAnimationFrame(draw);
  return () => { disposed = true; cancelAnimationFrame(frame); window.removeEventListener('keydown', keydown); window.removeEventListener('keyup', keyup); window.removeEventListener('blur', clearKeys); if (photoUrl) URL.revokeObjectURL(photoUrl); };
}

function myeongcat(root) {
  root.innerHTML = `<div class="demo-intro"><span class="demo-label">SAMPLE WORKOUT · IN DEVELOPMENT</span><h3>Small habits. Stronger you.</h3><p>Myeongcat brings personal training sessions, workout records and trainer feedback together. This interactive sample shows the idea, with fictional data.</p></div><div class="demo-fitness"><div class="demo-fitness-top"><span>MYEONGCAT / TODAY</span><span class="demo-pill">Sample member</span></div><div class="demo-fitness-summary"><div><span class="demo-muted">YOUR TRAINING BUDDY</span><h4>Let’s earn a little progress.</h4><p data-workout-message role="status">Log a set. Seoli is cheering you on.</p></div><div class="demo-xp"><strong data-xp>0</strong><span>sample XP</span></div></div><div class="demo-progress"><span data-progress></span></div><div class="demo-exercise-list"></div><div class="demo-cat-lane" aria-hidden="true"><span class="demo-roaming-cat"><span class="demo-cat-sprite" style="background-image:url('${sprite('seoli')}')"></span></span><span class="demo-cat-lane-label">A little encouragement goes a long way.</span></div></div><p class="demo-footnote">Product in development · Next.js / TypeScript / Supabase. Session scheduling, workout logs and feedback are part of the original project. This sample saves nothing.</p>`;
  const exercises = [{ name: 'Goblet squat', detail: '3 sets × 12 reps', sets: 0 }, { name: 'Dumbbell row', detail: '3 sets × 10 reps', sets: 0 }, { name: 'Plank', detail: '3 sets × 30 seconds', sets: 0 }];
  const list = root.querySelector('.demo-exercise-list');
  function render() {
    list.innerHTML = exercises.map((e, i) => `<div class="demo-exercise"><span class="demo-exercise-number">0${i + 1}</span><div><strong>${e.name}</strong><span>${e.detail}</span></div><button type="button" data-exercise="${i}" ${e.sets === 3 ? 'disabled' : ''}>${e.sets === 3 ? 'Complete ✓' : `Log set · ${e.sets}/3`}</button></div>`).join('');
    const count = exercises.reduce((n, e) => n + e.sets, 0);
    root.querySelector('[data-xp]').textContent = count * 10;
    root.querySelector('[data-progress]').style.width = `${count / 9 * 100}%`;
    root.querySelector('[data-workout-message]').textContent = count === 9 ? 'Workout complete. Seoli approves! ✨' : count ? `${count} of 9 sets logged. Keep your own pace.` : 'Log a set. Seoli is cheering you on.';
  }
  list.addEventListener('click', e => {
    const button = e.target.closest('[data-exercise]');
    if (button) {
      const index = Number(button.dataset.exercise); exercises[index].sets++; render();
      const next = exercises[index].sets < 3 ? list.querySelector(`[data-exercise="${index}"]`) : list.querySelector('button:not(:disabled)');
      next?.focus({ preventScroll: true });
    }
  });
  render(); return () => {};
}

function lotto(root) {
  root.innerHTML = `<div class="demo-intro"><span class="demo-label">LOTTOMAX AI · BROWSER SAMPLER</span><h3>Explore randomness, honestly.</h3><p>A hands-on sample from my Python research toolkit. Generate seven distinct numbers from the project’s 52-number pool.</p></div><div class="demo-lotto"><div class="demo-lotto-head"><span>YOUR NEXT SAMPLE</span><span class="demo-pill">7 / 52</span></div><div class="demo-balls" aria-label="Generated numbers" aria-live="polite">${Array.from({ length: 7 }, () => '<span>–</span>').join('')}</div><div class="demo-lotto-actions"><label for="lotto-mode">Sampling mode<select id="lotto-mode"><option value="random">Uniform random</option><option value="typical">Typical set</option></select></label><button type="button" data-generate>Generate numbers ↗</button></div><p class="demo-lotto-note" role="status">Ready when you are.</p></div><div class="demo-model"><span class="demo-label">BEHIND THE ORIGINAL PROJECT</span><p><strong>Python · FastAPI · TensorFlow / Keras</strong></p><p>20 multi-hot encoded draws → LSTM (32 units) → Dense (32, ReLU) → 52 sigmoid outputs. Dropout and L2 regularization limit overfitting; results are checked against a constant-probability baseline.</p><p class="demo-footnote">This preview uses browser sampling, not the Python model. Typical-set mode filters by sum, odd count and number spread. Neither it nor the experimental LSTM improves the chance of winning.</p></div>${projectLink('https://github.com/legowen/lottomax-ai')}`;
  function pick() {
    const pool = Array.from({ length: 52 }, (_, i) => i + 1);
    for (let i = 0; i < 7; i++) { const j = i + Math.floor(Math.random() * (52 - i)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
    return pool.slice(0, 7).sort((a, b) => a - b);
  }
  root.querySelector('[data-generate]').addEventListener('click', () => {
    const typical = root.querySelector('select').value === 'typical';
    let numbers = pick(), tries = 0;
    const valid = ns => { const sum = ns.reduce((a, b) => a + b, 0), odd = ns.filter(n => n % 2).length; return sum >= 124 && sum <= 247 && odd >= 2 && odd <= 5 && new Set(ns.map(n => Math.floor((n - 1) / 10))).size >= 4; };
    while (typical && !valid(numbers) && tries++ < 2000) numbers = pick();
    root.querySelectorAll('.demo-balls span').forEach((ball, i) => { ball.textContent = numbers[i]; ball.style.animation = 'none'; void ball.offsetWidth; ball.style.animation = `demo-pop .35s ${i * .035}s both`; });
    root.querySelector('.demo-lotto-note').textContent = `${typical ? 'Typical-set' : 'Uniform random'} sample · Sum ${numbers.reduce((a, b) => a + b, 0)} · ${numbers.filter(n => n % 2).length} odd numbers`;
  }); return () => {};
}

function weather(root) {
  const cities = {
    Vancouver: { temperature: 14, condition: 'A little rain, a little possibility.', icon: '☂', humidity: 78, wind: 12, temps: [14, 15, 13, 17, 16], conditions: ['Rain', 'Cloud', 'Rain', 'Sun', 'Cloud'] },
    Toronto: { temperature: 19, condition: 'Room for a walk in the sunshine.', icon: '☀', humidity: 54, wind: 9, temps: [19, 21, 18, 17, 20], conditions: ['Sun', 'Sun', 'Cloud', 'Rain', 'Sun'] },
    Seoul: { temperature: 23, condition: 'A clear sky kind of afternoon.', icon: '☀', humidity: 46, wind: 7, temps: [23, 24, 22, 21, 23], conditions: ['Sun', 'Sun', 'Cloud', 'Cloud', 'Sun'] },
  };
  root.innerHTML = `<div class="demo-intro"><span class="demo-label">HOPE NO RAIN · SAMPLE DATA</span><h3>A brighter way to check the weather.</h3><p>The original app uses city search, location access and weather APIs. Explore its idea here using illustrative weather data.</p></div><div class="demo-weather"><div class="demo-weather-head"><span>HOPE NO RAIN</span><label>Sample city<select aria-label="Choose a sample city">${Object.keys(cities).map(c => `<option>${c}</option>`).join('')}</select></label></div><div data-weather-body></div></div><p class="demo-footnote">Illustrative sample, not a live forecast · Original stack: React, Redux, JavaScript and SCSS.</p>${projectLink('https://hopenorain.netlify.app', 'Open the original weather app ↗')}`;
  function render(city) {
    const d = cities[city];
    root.querySelector('[data-weather-body]').innerHTML = `<div class="demo-current-weather"><div><span class="demo-muted">${city.toUpperCase()}</span><h4>${d.temperature}<sup>°C</sup></h4><p>${d.condition}</p></div><span class="demo-weather-icon" aria-hidden="true">${d.icon}</span></div><div class="demo-weather-meta"><span>Humidity <strong>${d.humidity}%</strong></span><span>Wind <strong>${d.wind} km/h</strong></span></div><div class="demo-forecast">${d.temps.map((t, i) => `<div><span>Day ${i + 1}</span><div class="demo-weather-bar" style="height:${t * 2}px"></div><strong>${t}°</strong><small>${d.conditions[i]}</small></div>`).join('')}</div>`;
  }
  root.querySelector('select').addEventListener('change', e => render(e.target.value)); render('Vancouver'); return () => {};
}

function roshambo(root) {
  root.innerHTML = `<div class="demo-intro"><span class="demo-label">ROSHAMBO · QUICK PLAY</span><h3>Your move.</h3><p>A small React project about state, interaction and clear feedback. Try a round against a random computer choice.</p></div><div class="demo-roshambo"><div class="demo-roshambo-score"><span>YOU <strong data-you-score>0</strong></span><span>ROCK / PAPER / SCISSORS</span><span>COMPUTER <strong data-computer-score>0</strong></span></div><div class="demo-duel"><div><span>YOU</span><strong data-you-hand>✊</strong></div><span class="demo-vs">vs</span><div><span>COMPUTER</span><strong data-computer-hand>✊</strong></div></div><p class="demo-result" role="status">Choose your move to begin.</p><div class="demo-hand-buttons"><button type="button" data-choice="rock">✊ <span>Rock</span></button><button type="button" data-choice="paper">✋ <span>Paper</span></button><button type="button" data-choice="scissors">✌️ <span>Scissors</span></button></div><button type="button" class="demo-text-button" data-clear-score>Reset score</button></div><p class="demo-footnote">Original project: React / JavaScript / CSS. This standalone portfolio demo recreates the game interaction.</p>`;
  const hands = { rock: '✊', paper: '✋', scissors: '✌️' }, beats = { rock: 'scissors', paper: 'rock', scissors: 'paper' };
  let you = 0, computer = 0;
  root.querySelectorAll('[data-choice]').forEach(button => button.addEventListener('click', () => {
    const chosen = button.dataset.choice, opponent = Object.keys(hands)[Math.floor(Math.random() * 3)];
    const result = chosen === opponent ? 'A tie. Great minds think alike.' : beats[chosen] === opponent ? 'You win. Nicely played!' : 'Computer wins. One more round?';
    if (chosen !== opponent) { if (beats[chosen] === opponent) you++; else computer++; }
    root.querySelector('[data-you-hand]').textContent = hands[chosen]; root.querySelector('[data-computer-hand]').textContent = hands[opponent];
    root.querySelector('[data-you-score]').textContent = you; root.querySelector('[data-computer-score]').textContent = computer;
    root.querySelector('.demo-result').textContent = `${result} You: ${chosen}. Computer: ${opponent}.`;
  }));
  root.querySelector('[data-clear-score]').addEventListener('click', () => {
    you = computer = 0; root.querySelector('[data-you-score]').textContent = root.querySelector('[data-computer-score]').textContent = '0';
    root.querySelector('.demo-result').textContent = 'Fresh start. Choose your move.';
  }); return () => {};
}
