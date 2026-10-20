// Page wiring. The résumé, systems and project sections are ordinary HTML and work without the optional 3D office.
import { mountProjectCards, mountOriginalProject, projects } from './project-cards.js?v=5';
import { mountAboutPhotos } from './about-photos.js?v=1';
import { createClientGames } from './client-games.js?v=1';
import { mountSysadmin } from './sysadmin.js?v=5';
import { mountMicrosoft } from './microsoft.js?v=5';
import { createSiteCats } from './site-cats.js?v=5';

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const store = {
  get(key) { try { return localStorage.getItem(key); } catch { return null; } },
  set(key, value) { try { localStorage.setItem(key, value); } catch { /* storage can be blocked */ } },
};

/* ---------- Systems and Microsoft sections ---------- */
mountSysadmin($('#sys-root'));
mountMicrosoft($('#ms-root'));

/* ---------- Experience timeline ---------- */
const career = [
  ['SS', 'Mar 2026 — Sep 2026', 'Sprung Studios', 'IT Specialist', 'Vancouver, BC', 'Led Microsoft 365 migration, hybrid identity, endpoint management, and network security across the Vancouver and Brighton studios.'],
  ['FT', 'Mar 2025 — Mar 2026', 'Sunia Technology Inc.', 'IT Infrastructure Engineer', 'Burnaby, BC · Rebranded as FluxInk', 'Supported nine international offices at Tier 3, with Tier 4 vendor escalation. Operated Microsoft data platforms, cloud infrastructure, networks, and AI workload environments.'],
  ['RB', 'Aug 2023 — Feb 2025', 'Renu Bio Health Ltd.', 'IT Specialist', 'Burnaby, BC', 'Moved from full-stack development into IT operations, connecting cloud services, Microsoft 365, network infrastructure, and business systems.'],
  ['CN', 'Jun 2023 — Dec 2023', 'Code Ninjas', 'Coding Instructor', 'Burnaby, BC', 'Taught programming logic, problem solving, and debugging. Helped maintain the curriculum and track student progress.'],
  ['AU', 'Dec 2020 — Jul 2023', 'Audi Canada', 'Technician', 'North Vancouver, BC', 'Performed diagnostic programming and electric vehicle system setup, alongside workshop IT support and connectivity troubleshooting.'],
  ['DE', 'Jan 2016 — Aug 2016', 'Daesung Energy Co., Ltd.', 'IT Intern', 'Daegu, Korea', 'Built interactive components for internal web applications and supported system configuration and application testing.'],
];
const timeline = $('#timeline');
career.forEach(([mark, date, company, title, location, summary], i) => {
  const article = document.createElement('article');
  article.className = 'timeline-item'; article.dataset.mark = mark; article.dataset.date = date;
  article.innerHTML = `<span class="time-mobile">${date}</span><h3>${company}</h3><p class="timeline-role">${title}</p><p class="timeline-location">${location}</p><p>${summary}</p><details><summary>Read responsibilities</summary><ul id="career-${i}"></ul></details>`;
  timeline.append(article);
});
// Sprung's client game projects sit between the summary and the responsibilities list.
$('[data-mark="SS"] details', timeline)?.before(createClientGames());
fetch('./career.json')
  .then(response => { if (!response.ok) throw new Error('Résumé details unavailable'); return response.json(); })
  .then(data => data.forEach((bullets, i) => {
    const list = $(`#career-${i}`);
    bullets.forEach(text => { const item = document.createElement('li'); item.textContent = text; list.append(item); });
  }))
  .catch(() => $$('.timeline-item details').forEach(details => { details.hidden = true; }));

/* ---------- Résumé links appear only when the PDF is in assets/ ---------- */
const resumeLinks = $$('[data-resume]');
if (resumeLinks.length) {
  fetch(resumeLinks[0].getAttribute('href'), { method: 'HEAD' })
    .then(response => { if (response.ok) resumeLinks.forEach(link => { link.hidden = false; }); })
    .catch(() => { /* no résumé file: the links stay hidden */ });
}

/* ---------- Project viewer ---------- */
const dialog = $('#project-dialog'), demoContent = $('#demo-content'), catLayer = $('#cat-layer');
let cleanupDemo = () => {}, lastTrigger = null;
function openProject(project, trigger) {
  lastTrigger = trigger || document.activeElement;
  cleanupDemo(); demoContent.replaceChildren();
  cleanupDemo = mountOriginalProject(project, demoContent);
  dialog.showModal();
  document.body.classList.add('modal-open');
  catLayer.classList.add('in-dialog'); dialog.append(catLayer);
  dialog.scrollTop = 0; $('#close-demo').focus();
  syncRoomVisibility();
}
mountProjectCards($('#project-cards'), (project, button) => openProject(project, button));
$('#close-demo').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => {
  if (event.target !== dialog) return;
  const rect = dialog.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
});
dialog.addEventListener('close', () => {
  if (dialog.open) return; // a slow device can deliver this event after the viewer was opened again
  cleanupDemo(); cleanupDemo = () => {};
  document.body.classList.remove('modal-open');
  catLayer.classList.remove('in-dialog'); document.body.append(catLayer);
  syncRoomVisibility();
  lastTrigger?.focus?.({ preventScroll: true });
});
$('#year').textContent = new Date().getFullYear();

/* ---------- Navigation highlight and deep links ---------- */
const navObserver = new IntersectionObserver(entries => {
  for (const entry of entries) if (entry.isIntersecting) $$('.topbar nav a').forEach(a => a.classList.toggle('active', a.hash === `#${entry.target.id}`));
}, { rootMargin: '-20% 0px -50% 0px' });
$$('main>section').forEach(section => navObserver.observe(section));
addEventListener('load', () => { if (location.hash.length > 1) document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView(); });
function navigateTo(id) {
  const target = document.getElementById(id);
  if (!target) return;
  target.scrollIntoView({ behavior: reducedMotion.matches ? 'instant' : 'smooth' });
  history.replaceState(null, '', `#${id}`);
  const heading = $('h2', target);
  if (heading) { heading.tabIndex = -1; heading.focus({ preventScroll: true }); }
}

/* ---------- Bomi and Seoli at the page edge ---------- */
let catsMoving = !reducedMotion.matches;
const storedCats = store.get('owen-cats');
if (storedCats !== null) catsMoving = storedCats === 'on' && !reducedMotion.matches;
const siteCats = createSiteCats({ layer: catLayer, getMax: () => Math.max(0, dialog.open ? dialog.clientWidth - 85 : innerWidth - 165) });
const catToggle = $('#cat-toggle');
function updateCatToggle() {
  catToggle.innerHTML = `<span class="paw" aria-hidden="true">🐾</span><span class="cat-label">${catsMoving ? 'Cats on' : 'Cats resting'}</span>`;
  catToggle.setAttribute('aria-pressed', String(catsMoving));
  catToggle.setAttribute('aria-label', catsMoving ? 'Pause roaming cats' : 'Let cats roam');
}
function setCatsMoving(value) { catsMoving = value; siteCats.setMoving(value); roomController?.setCatsMoving(value); aboutPhotos.setMoving(value); updateCatToggle(); }
catToggle.addEventListener('click', () => { setCatsMoving(!catsMoving); store.set('owen-cats', catsMoving ? 'on' : 'off'); });
reducedMotion.addEventListener('change', event => { if (event.matches) setCatsMoving(false); });
siteCats.setMoving(catsMoving); updateCatToggle();

/* ---------- Photos of Bomi and Seoli floating around the About card ---------- */
const aboutPhotos = mountAboutPhotos($('.cat-family'), { moving: catsMoving });

/* ---------- The 3D office ---------- */
let roomController = null, roomAbort = null, roomLoading = false, heroRatio = 1;
const stage = $('#hero-stage'), roomHost = $('#room-canvas'), roomStatus = $('#room-status'), roomReset = $('#reset-room'), roomToggle = $('#toggle-3d');
const saveData = !!navigator.connection?.saveData;
let want3d = store.get('owen-3d') !== 'off' && !saveData;
const say = text => { roomStatus.textContent = text; };
function updateRoomToggle() {
  const on = !!roomController || roomLoading;
  roomToggle.textContent = on ? 'Turn off 3D' : 'Turn on 3D';
  roomToggle.setAttribute('aria-pressed', String(on));
}
function syncRoomVisibility() {
  const active = !!roomController && heroRatio > .08 && !dialog.open && !document.hidden;
  roomController?.setActive(active);
  // The page-edge cats fade away while the hero's cats are on screen.
  const heroLive = active && heroRatio > .35;
  document.body.classList.toggle('room-live', heroLive);
  siteCats.setVisible(!heroLive);
}
function releaseRoom() {
  roomAbort?.abort(); roomAbort = null;
  roomController?.dispose(); roomController = null; roomLoading = false;
  stage.classList.remove('is-live'); roomReset.hidden = true;
  syncRoomVisibility(); updateRoomToggle();
}
function handleRoute(route) {
  if (route.startsWith('project:')) {
    const project = projects.find(item => item.id === route.slice(8));
    if (project) openProject(project, $('canvas', roomHost));
    return;
  }
  navigateTo(route);
}
async function startRoom() {
  if (roomLoading || roomController) return;
  roomLoading = true; updateRoomToggle(); say('Opening the office…');
  const abort = new AbortController(); roomAbort = abort;
  try {
    const { mountRoom } = await import('./room3d.js?v=7');
    if (abort.signal.aborted) return;
    const controller = await mountRoom(roomHost, {
      signal: abort.signal, catsMoving, onNavigate: handleRoute,
      onPet: name => say(`${name} purrs.`),
      onError: () => say('3D paused. Reload the page if it does not come back.'),
    });
    if (abort.signal.aborted) { controller.dispose(); return; }
    roomController = controller;
    stage.classList.add('is-live'); roomReset.hidden = false;
    say('Drag to look around. Tap a glowing dot to jump. Tap the floor to call the cats.');
    syncRoomVisibility();
  } catch (error) {
    if (!abort.signal.aborted) { releaseRoom(); say('3D is not available on this device. Everything is still below.'); }
  } finally {
    if (roomAbort === abort) roomLoading = false;
    updateRoomToggle();
  }
}
roomToggle.addEventListener('click', () => {
  if (roomController || roomLoading) { store.set('owen-3d', 'off'); releaseRoom(); say('3D is off. Turn it on whenever you like.'); }
  else { store.set('owen-3d', 'on'); startRoom(); }
});
roomReset.addEventListener('click', () => roomController?.resetView());
new IntersectionObserver(([entry]) => { heroRatio = entry.isIntersecting ? entry.intersectionRatio : 0; syncRoomVisibility(); }, { threshold: [0, .08, .2, .35, .5, .75, 1] }).observe($('#home'));
document.addEventListener('visibilitychange', syncRoomVisibility);
addEventListener('pagehide', () => { roomAbort?.abort(); roomController?.dispose(); });
updateRoomToggle();
if (want3d) {
  // Let the first paint finish before the scene is built.
  const go = () => requestAnimationFrame(() => setTimeout(startRoom, 0));
  if (document.readyState === 'complete') go(); else addEventListener('load', go, { once: true });
} else say(saveData ? 'Data Saver is on, so the 3D office is off. Turn it on if you like.' : '3D is off. Turn it on whenever you like.');
