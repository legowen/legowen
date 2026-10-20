// A self-contained slice adapted from the owner's local PT w Kitty Home, Cat,
// petRoom and ExerciseEditor components. All records here are sample data.
const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const initialWeek = [true, true, false, true, true, false, false];
const characters = { seoli: 'Seoli', bomi: 'Bomi', cheese: 'Cheese tabby', white: 'White cat' };
const frames = { idle: [0, 0, 1, 0], walk: [2, 3, 4, 5], play: [9, 10, 11, 10, 9], stretch: [12, 13, 12, 13], groom: [6, 0, 6, 1], sleep: [14], greet: [15, 1, 15] };
const spriteURL = character => new URL(character === 'bomi' || character === 'seoli'
  ? `./assets/${character}.png` : `./assets/ptwithkitty-demo/${character}.png`, import.meta.url).href;

export function mountPTwithKitty(root) {
  const controller = new AbortController();
  const signal = controller.signal;
  root.innerHTML = `<section class="pk-demo" lang="en" aria-label="Interactive PT w Kitty app preview">
    <header class="pk-topbar"><strong class="pk-brand"><i aria-hidden="true"></i>PT w Kitty</strong><span>Together between sessions</span><span class="pk-tag">EN · Sample day</span></header>
    <div class="pk-pagehead"><p class="pk-eyebrow">YOUR DAILY COMPANION</p><h3>Good to see you, Jihoon.</h3><p>A small note, a day of growing together.</p></div>
    <div class="pk-grid">
      <div><section class="pk-pixel-panel">
        <div class="pk-row pk-cat-head"><h4>Our growing room</h4><span class="pk-tag">Balance track</span></div>
        <div class="pk-toolbar"><label>Choose your companion<select data-pk="character">${Object.entries(characters).map(([key, name]) => `<option value="${key}">${name}</option>`).join('')}</select></label><button class="pk-button pk-secondary pk-small" data-pk="pause" aria-pressed="false">Ⅱ Pause movement</button></div>
        <div class="pk-room"><div class="pk-window" aria-hidden="true"></div><div class="pk-shelf" aria-hidden="true"></div><div class="pk-rug" aria-hidden="true"></div><div class="pk-yarn" aria-hidden="true"></div>
          <div class="pk-speech" data-pk="speech" role="status">You're here!</div>
          <button class="pk-cat" data-pk="cat" aria-label="Pet Seoli, no EXP reward"><span class="pk-sprite" aria-hidden="true"></span></button>
        </div>
        <p class="pk-help" data-pk="help">Tap your cat to chat. It takes little breaks, too.</p>
        <div class="pk-stats"><div class="pk-row"><b>Lv.3 Junior cat</b><small>320 / 800 EXP</small></div><div class="pk-exp" role="progressbar" aria-label="Progress to the next level" aria-valuenow="320" aria-valuemin="0" aria-valuemax="800"><div></div></div><div class="pk-row"><small>Ready for today's story.</small><span class="pk-tag">4-day streak</span></div></div>
      </section><button class="pk-button pk-log" data-pk="open-log" aria-expanded="false">＋ Log movement</button></div>
      <div class="pk-stack">
        <section class="pk-panel"><div class="pk-row"><h4>This week's footprints</h4><small data-pk="week-count">4 / 7 days</small></div><div class="pk-days">${days.map((day, index) => `<div><small>${day}</small><span class="pk-day ${initialWeek[index] ? 'pk-done' : ''}" data-day="${index}" aria-label="${day}: ${initialWeek[index] ? 'Recorded' : 'No record'}">${initialWeek[index] ? '✓' : '·'}</span></div>`).join('')}</div><p class="pk-note">Rest days are welcome. Go at your own pace.</p></section>
        <section class="pk-panel"><h4>Next session</h4><div class="pk-session"><div class="pk-date">Thursday<strong>24</strong></div><div><b>7:00 PM</b><small>With trainer Moran</small></div></div><div class="pk-ticket"><div><b>My session packages</b><small>Every session accounted for</small></div><span><strong>3</strong> sessions left</span></div></section>
        <section class="pk-panel"><h4>A note from your trainer</h4><p class="pk-message">You've kept a steady journal this week. Let's review it at our next session!</p></section>
      </div>
    </div>
    <section class="pk-panel pk-workout" data-pk="workout" hidden>
      <div class="pk-row"><div><p class="pk-eyebrow">MY WORKOUT JOURNAL</p><h4>Log movement</h4></div><span class="pk-tag">Wednesday · sample</span></div>
      <p class="pk-note">Record a few sets and leave a footprint in your week.</p>
      <form data-pk="form"><label class="pk-field">Exercise<select name="exercise"><option>Goblet squat</option><option>Dumbbell row</option><option>Bench press</option><option>Bodyweight squat</option></select></label><div class="pk-sets" data-pk="sets"></div>
        <button class="pk-button pk-secondary pk-small" type="button" data-pk="add-set">＋ Add set</button>
        <label class="pk-field">Workout note<textarea name="note" maxlength="180" rows="2" placeholder="How did your movement feel?"></textarea></label>
        <div class="pk-row pk-form-actions"><button type="submit" class="pk-button" data-pk="save">Save sample workout</button><button type="button" class="pk-button pk-secondary" data-pk="reset">Reset sample</button></div>
      </form>
      <p class="pk-save-status" data-pk="save-status" role="status"></p>
    </section>
    <p class="pk-disclaimer">Interactive excerpt from the local PT w Kitty app. Sample records stay in this preview and reset when it closes.</p>
  </section>`;

  const find = name => root.querySelector(`[data-pk="${name}"]`);
  const room = root.querySelector('.pk-room');
  const cat = find('cat');
  const sprite = root.querySelector('.pk-sprite');
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
    row.className = 'pk-set';
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
    day.textContent = '·'; day.classList.remove('pk-done'); day.setAttribute('aria-label', 'Wed: No record');
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
    day.textContent = '✓'; day.classList.add('pk-done'); day.setAttribute('aria-label', 'Wed: Recorded');
    find('speech').textContent = 'Growing together, one little day at a time.';
  }, { signal });
  addSet(); resize(); syncMotion();
  return () => { controller.abort(); clearInterval(timer); resizeObserver.disconnect(); intersectionObserver.disconnect(); root.replaceChildren(); };
}
