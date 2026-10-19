// A self-contained slice adapted from the owner's local Myeongcat Home, Cat,
// petRoom and ExerciseEditor components. All records here are sample data.
const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const initialWeek = [true, true, false, true, true, false, false];
const characters = { seoli: 'Seoli', bomi: 'Bomi', cheese: 'Cheese tabby', white: 'White cat' };
const frames = { idle: [0, 0, 1, 0], walk: [2, 3, 4, 5], play: [9, 10, 11, 10, 9], stretch: [12, 13, 12, 13], groom: [6, 0, 6, 1], sleep: [14], greet: [15, 1, 15] };
const spriteURL = character => new URL(character === 'bomi' || character === 'seoli'
  ? `./assets/${character}.png` : `./assets/myeongcat-demo/${character}.png`, import.meta.url).href;

export function mountMyeongcat(root) {
  const controller = new AbortController();
  const signal = controller.signal;
  root.innerHTML = `<section class="mc-demo" lang="en" aria-label="Interactive Myeongcat app preview">
    <header class="mc-topbar"><strong class="mc-brand"><i aria-hidden="true"></i>Myeongcat</strong><span>Together between sessions</span><span class="mc-tag">EN · Sample day</span></header>
    <div class="mc-pagehead"><p class="mc-eyebrow">YOUR DAILY COMPANION</p><h3>Good to see you, Jihoon.</h3><p>A small note, a day of growing together.</p></div>
    <div class="mc-grid">
      <div><section class="mc-pixel-panel">
        <div class="mc-row mc-cat-head"><h4>Our growing room</h4><span class="mc-tag">Balance track</span></div>
        <div class="mc-toolbar"><label>Choose your companion<select data-mc="character">${Object.entries(characters).map(([key, name]) => `<option value="${key}">${name}</option>`).join('')}</select></label><button class="mc-button mc-secondary mc-small" data-mc="pause" aria-pressed="false">Ⅱ Pause movement</button></div>
        <div class="mc-room"><div class="mc-window" aria-hidden="true"></div><div class="mc-shelf" aria-hidden="true"></div><div class="mc-rug" aria-hidden="true"></div><div class="mc-yarn" aria-hidden="true"></div>
          <div class="mc-speech" data-mc="speech" role="status">You're here!</div>
          <button class="mc-cat" data-mc="cat" aria-label="Pet Seoli, no EXP reward"><span class="mc-sprite" aria-hidden="true"></span></button>
        </div>
        <p class="mc-help" data-mc="help">Tap your cat to chat. It takes little breaks, too.</p>
        <div class="mc-stats"><div class="mc-row"><b>Lv.3 Junior cat</b><small>320 / 800 EXP</small></div><div class="mc-exp" role="progressbar" aria-label="Progress to the next level" aria-valuenow="320" aria-valuemin="0" aria-valuemax="800"><div></div></div><div class="mc-row"><small>Ready for today's story.</small><span class="mc-tag">4-day streak</span></div></div>
      </section><button class="mc-button mc-log" data-mc="open-log" aria-expanded="false">＋ Log movement</button></div>
      <div class="mc-stack">
        <section class="mc-panel"><div class="mc-row"><h4>This week's footprints</h4><small data-mc="week-count">4 / 7 days</small></div><div class="mc-days">${days.map((day, index) => `<div><small>${day}</small><span class="mc-day ${initialWeek[index] ? 'mc-done' : ''}" data-day="${index}" aria-label="${day}: ${initialWeek[index] ? 'Recorded' : 'No record'}">${initialWeek[index] ? '✓' : '·'}</span></div>`).join('')}</div><p class="mc-note">Rest days are welcome. Go at your own pace.</p></section>
        <section class="mc-panel"><h4>Next session</h4><div class="mc-session"><div class="mc-date">Thursday<strong>24</strong></div><div><b>7:00 PM</b><small>With trainer Moran</small></div></div><div class="mc-ticket"><div><b>My session packages</b><small>Every session accounted for</small></div><span><strong>3</strong> sessions left</span></div></section>
        <section class="mc-panel"><h4>A note from your trainer</h4><p class="mc-message">You've kept a steady journal this week. Let's review it at our next session!</p></section>
      </div>
    </div>
    <section class="mc-panel mc-workout" data-mc="workout" hidden>
      <div class="mc-row"><div><p class="mc-eyebrow">MY WORKOUT JOURNAL</p><h4>Log movement</h4></div><span class="mc-tag">Wednesday · sample</span></div>
      <p class="mc-note">Record a few sets and leave a footprint in your week.</p>
      <form data-mc="form"><label class="mc-field">Exercise<select name="exercise"><option>Goblet squat</option><option>Dumbbell row</option><option>Bench press</option><option>Bodyweight squat</option></select></label><div class="mc-sets" data-mc="sets"></div>
        <button class="mc-button mc-secondary mc-small" type="button" data-mc="add-set">＋ Add set</button>
        <label class="mc-field">Workout note<textarea name="note" maxlength="180" rows="2" placeholder="How did your movement feel?"></textarea></label>
        <div class="mc-row mc-form-actions"><button type="submit" class="mc-button" data-mc="save">Save sample workout</button><button type="button" class="mc-button mc-secondary" data-mc="reset">Reset sample</button></div>
      </form>
      <p class="mc-save-status" data-mc="save-status" role="status"></p>
    </section>
    <p class="mc-disclaimer">Interactive excerpt from the local Myeongcat app. Sample records stay in this preview and reset when it closes.</p>
  </section>`;

  const find = name => root.querySelector(`[data-mc="${name}"]`);
  const room = root.querySelector('.mc-room');
  const cat = find('cat');
  const sprite = root.querySelector('.mc-sprite');
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  let character = 'seoli', paused = false, focused = false, hovered = false, inView = true;
  let motion = { x: 70, y: 140, tx: 70, ty: 140, elapsed: 0, duration: 900, behavior: 'idle', facing: 1 };
  let limits = { maxX: 300, maxY: 188 };
  let petUntil = 0, petCount = 0, restingIndex = 0, saved = false;
  let setCount = 0;
  sprite.style.backgroundImage = `url("${spriteURL(character)}")`;

  function draw() {
    const reduced = preference.matches;
    const sequence = frames[motion.behavior];
    const period = motion.behavior === 'walk' ? 160 : motion.behavior === 'idle' ? 650 : 380;
    const frame = reduced ? petUntil ? 15 : 0 : sequence[Math.floor(motion.elapsed / period) % sequence.length];
    cat.style.transform = `translate3d(${motion.x}px,${motion.y}px,0)`;
    sprite.style.backgroundPosition = `${-(frame % 4) * 96}px ${-Math.floor(frame / 4) * 96}px`;
    sprite.style.transform = `scale(.96) scaleX(${motion.behavior === 'walk' || motion.behavior === 'play' ? motion.facing : 1})`;
  }

  function resize() {
    limits = { maxX: Math.max(12, room.clientWidth - 108), maxY: Math.max(112, room.clientHeight - 112) };
    motion.x = Math.max(12, Math.min(limits.maxX, motion.x));
    motion.y = Math.max(112, Math.min(limits.maxY, motion.y));
    motion.tx = Math.max(12, Math.min(limits.maxX, motion.tx));
    motion.ty = Math.max(112, Math.min(limits.maxY, motion.ty));
    draw();
  }

  function syncMotion() {
    find('pause').disabled = preference.matches;
    find('pause').textContent = paused ? '▶ Resume movement' : 'Ⅱ Pause movement';
    find('pause').setAttribute('aria-pressed', String(paused));
    find('help').textContent = preference.matches ? 'Motion is reduced by your device settings. Tap your cat to chat.' : 'Tap your cat to chat. It takes little breaks, too.';
    draw();
  }

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(room);
  const intersectionObserver = new IntersectionObserver(([entry]) => { inView = entry.isIntersecting; }, { threshold: .05 });
  intersectionObserver.observe(room);
  preference.addEventListener('change', syncMotion, { signal });
  find('pause').addEventListener('click', () => { paused = !paused; syncMotion(); }, { signal });
  find('character').addEventListener('change', event => {
    character = event.target.value;
    if (!Object.hasOwn(characters, character)) return;
    sprite.style.backgroundImage = `url("${spriteURL(character)}")`;
    cat.setAttribute('aria-label', `Pet ${characters[character]}, no EXP reward`);
    petUntil = 0;
    motion.behavior = 'idle'; motion.elapsed = 0;
    find('speech').textContent = "You're here!";
    draw();
  }, { signal });
  cat.addEventListener('pointerenter', event => { hovered = event.pointerType === 'mouse'; }, { signal });
  cat.addEventListener('pointerleave', () => { hovered = false; }, { signal });
  cat.addEventListener('focus', () => { focused = cat.matches(':focus-visible'); }, { signal });
  cat.addEventListener('blur', () => { focused = false; }, { signal });
  cat.addEventListener('click', () => {
    find('speech').textContent = ["You kept showing up. I'm proud of you!", "Purr… glad you're here", 'Purr… that is my favorite spot.'][petCount++ % 3];
    petUntil = performance.now() + 3000;
    motion.behavior = 'greet'; motion.elapsed = 0;
    draw();
  }, { signal });
  const timer = setInterval(() => {
    if (petUntil && performance.now() >= petUntil) {
      petUntil = 0; motion.behavior = 'idle'; motion.elapsed = 0; motion.duration = 1000;
      find('speech').textContent = "You're here!";
      draw();
    }
    if (preference.matches || paused || document.hidden || !inView || ((focused || hovered) && !petUntil)) return;
    motion.elapsed += 80;
    if (!petUntil && motion.behavior === 'walk') {
      const dx = motion.tx - motion.x, dy = motion.ty - motion.y, distance = Math.hypot(dx, dy);
      if (distance <= 3.2) {
        motion.x = motion.tx; motion.y = motion.ty;
        motion.behavior = ['idle', 'play', 'groom', 'stretch', 'sleep'][restingIndex++ % 5];
        motion.elapsed = 0; motion.duration = motion.behavior === 'sleep' ? 4800 : 2200;
      } else {
        motion.x += dx / distance * 3.2; motion.y += dy / distance * 3.2;
        if (Math.abs(dx) > 1) motion.facing = dx < 0 ? -1 : 1;
      }
    } else if (!petUntil && motion.elapsed >= motion.duration) {
      motion.tx = 12 + Math.random() * (limits.maxX - 12);
      if (Math.abs(motion.tx - motion.x) < 48) motion.tx = motion.x > limits.maxX / 2 ? 12 : limits.maxX;
      motion.ty = 112 + Math.random() * (limits.maxY - 112);
      motion.behavior = 'walk'; motion.elapsed = 0;
    }
    draw();
  }, 80);

  function addSet() {
    if (setCount >= 5 || saved) return;
    setCount++;
    const row = document.createElement('div');
    row.className = 'mc-set';
    row.innerHTML = `<b>Set ${setCount}</b><label>Weight (kg)<input name="weight-${setCount}" type="number" min="0" max="500" step="0.5" inputmode="decimal" value="20" required></label><label>Reps<input name="reps-${setCount}" type="number" min="1" max="100" step="1" inputmode="numeric" value="10" required></label>`;
    find('sets').append(row);
    find('add-set').disabled = setCount >= 5;
  }
  function reset() {
    saved = false;
    find('form').reset();
    find('form').querySelectorAll('input,select,textarea').forEach(field => { field.disabled = false; });
    setCount = 0; find('sets').replaceChildren(); addSet();
    find('save').disabled = false; find('save').textContent = 'Save sample workout';
    find('save-status').textContent = '';
    find('week-count').textContent = '4 / 7 days';
    const day = root.querySelector('[data-day="2"]');
    day.textContent = '·'; day.classList.remove('mc-done'); day.setAttribute('aria-label', 'Wed: No record');
    find('speech').textContent = "You're here!";
  }
  find('open-log').addEventListener('click', () => {
    const opening = find('workout').hidden;
    find('workout').hidden = !opening;
    find('open-log').setAttribute('aria-expanded', String(opening));
    find('open-log').textContent = opening ? '− Close workout journal' : '＋ Log movement';
    if (opening) { find('workout').scrollIntoView({ behavior: preference.matches ? 'instant' : 'smooth', block: 'nearest' }); find('form').querySelector('select').focus({ preventScroll: true }); }
  }, { signal });
  find('add-set').addEventListener('click', addSet, { signal });
  find('reset').addEventListener('click', reset, { signal });
  find('form').addEventListener('submit', event => {
    event.preventDefault();
    if (saved || !event.currentTarget.reportValidity()) return;
    const exercise = event.currentTarget.elements.exercise.value;
    const reps = [...find('sets').querySelectorAll('[name^="reps-"]')].reduce((sum, field) => sum + Number(field.value), 0);
    saved = true;
    find('save-status').textContent = `Recorded: ${exercise} · ${setCount} ${setCount === 1 ? 'set' : 'sets'} · ${reps} reps. Wednesday's footprint is complete!`;
    find('form').querySelectorAll('input,select,textarea').forEach(field => { field.disabled = true; });
    find('save').disabled = true; find('save').textContent = '✓ Sample workout saved'; find('add-set').disabled = true;
    find('week-count').textContent = '5 / 7 days';
    const day = root.querySelector('[data-day="2"]');
    day.textContent = '✓'; day.classList.add('mc-done'); day.setAttribute('aria-label', 'Wed: Recorded');
    find('speech').textContent = 'Growing together, one little day at a time.';
  }, { signal });
  addSet(); resize(); syncMotion();
  return () => { controller.abort(); clearInterval(timer); resizeObserver.disconnect(); intersectionObserver.disconnect(); root.replaceChildren(); };
}
