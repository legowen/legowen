// Two sports-data projects with no playable demo: a short case study with pictures, the method,
// an example chart and the skills used. Every chart number is EXAMPLE data (labelled as such on the page),
// except the swing-timing chart, which is simple physics from approximate average MLB pitch speeds.
const esc = text => String(text).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// Colours: dark-surface steps of a validated palette (diverging blue <-> red with a grey midpoint,
// and three categorical slots for pitch types).
const C = { win: '#3987e5', loss: '#e66767', mid: '#383835', ink: '#f1f0eb', muted: '#a7adb8', faint: '#ffffff1f', p1: '#3987e5', p2: '#d95926', p3: '#199e70' };

const mix = (a, b, t) => {
  const p = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const [x, y] = [p(a), p(b)];
  return `#${x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join('')}`;
};

/* ---------- Soccer: zone difference between won and lost matches ---------- */
// 6 zones along the pitch (own goal -> opponent goal) x 4 across. Percentage points of match time,
// wins minus losses. Positive = I spent more time there in matches we won.
const ZONES_RAW = [
  [-0.6, -0.9, -0.2, 0.4, 0.3, 0.1],
  [-1.4, -2.1, 0.6, 2.4, 1.6, 0.5],
  [-1.2, -1.8, 0.9, 2.1, 1.2, 0.4],
  [-0.5, -0.7, -0.1, 0.2, 0.3, 0.0],
];
const zoneMean = ZONES_RAW.flat().reduce((a, b) => a + b, 0) / 24;
const ZONES = ZONES_RAW.map(row => row.map(v => Math.round((v - zoneMean) * 10) / 10));
const MATCHES = [[6.8, 7.1], [7.4, 7.9], [6.1, 5.8], [8.0, 7.6], [7.2, 7.4], [5.9, 6.3], [7.7, 8.2], [6.5, 6.2], [8.3, 8.6], [7.0, 6.6], [6.4, 6.9], [7.9, 7.7]];

function zoneChart() {
  const W = 600, H = 400, fx = 20, fy = 20, fw = 560, fh = 330, cw = fw / 6, ch = fh / 4, max = 2.6;
  const color = v => (v >= 0 ? mix(C.mid, C.win, Math.min(1, v / max)) : mix(C.mid, C.loss, Math.min(1, -v / max)));
  let cells = '';
  ZONES.forEach((row, r) => row.forEach((v, c) => {
    const x = fx + c * cw, y = fy + r * ch;
    const label = `${v > 0 ? '+' : ''}${v.toFixed(1)}`;
    cells += `<g class="cs-cell"><rect x="${x + 1}" y="${y + 1}" width="${cw - 2}" height="${ch - 2}" rx="4" fill="${color(v)}"/><text x="${x + cw / 2}" y="${y + ch / 2 + 5}" text-anchor="middle">${label}</text><title>Zone ${c + 1} up the pitch, lane ${r + 1}: ${label} points of match time in wins vs losses</title></g>`;
  }));
  const lines = `<g fill="none" stroke="#ffffffb3" stroke-width="2" pointer-events="none"><rect x="${fx}" y="${fy}" width="${fw}" height="${fh}" rx="6"/><path d="M${fx + fw / 2} ${fy}v${fh}"/><circle cx="${fx + fw / 2}" cy="${fy + fh / 2}" r="46"/><rect x="${fx}" y="${fy + fh / 2 - 80}" width="70" height="160"/><rect x="${fx + fw - 70}" y="${fy + fh / 2 - 80}" width="70" height="160"/></g>`;
  const legend = `<defs><linearGradient id="cs-div"><stop offset="0" stop-color="${C.loss}"/><stop offset=".5" stop-color="${C.mid}"/><stop offset="1" stop-color="${C.win}"/></linearGradient></defs>
    <rect x="160" y="372" width="280" height="8" rx="4" fill="url(#cs-div)"/>
    <text class="cs-axis" x="152" y="381" text-anchor="end">More time in losses</text><text class="cs-axis" x="448" y="381">More time in wins</text>
    <text class="cs-axis" x="${fx + fw}" y="14" text-anchor="end">Attacking direction →</text>`;
  return `<svg class="cs-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Example heatmap of the pitch split into 24 zones, showing where I spent more time in won matches than in lost ones">${cells}${lines}${legend}</svg>`;
}

function projectionChart() {
  const W = 600, H = 330, x0 = 56, y0 = 20, w = 520, h = 250, lo = 5.5, hi = 9;
  const sx = v => x0 + (v - lo) / (hi - lo) * w, sy = v => y0 + h - (v - lo) / (hi - lo) * h;
  let grid = '', dots = '';
  for (let t = 6; t <= 9; t++) grid += `<path d="M${x0} ${sy(t)}H${x0 + w}" stroke="${C.faint}"/><text class="cs-axis" x="${x0 - 10}" y="${sy(t) + 4}" text-anchor="end">${t}</text><text class="cs-axis" x="${sx(t)}" y="${y0 + h + 22}" text-anchor="middle">${t}</text>`;
  MATCHES.forEach(([p, a], i) => { dots += `<g class="cs-dot"><circle cx="${sx(p)}" cy="${sy(a)}" r="6" fill="${C.win}" stroke="#171b25" stroke-width="2"/><circle cx="${sx(p)}" cy="${sy(a)}" r="14" fill="transparent"/><title>Match ${i + 1}: projected ${p.toFixed(1)}, actual ${a.toFixed(1)}</title></g>`; });
  const diag = `<path d="M${sx(lo)} ${sy(lo)}L${sx(hi)} ${sy(hi)}" stroke="${C.muted}" stroke-dasharray="5 6" stroke-width="1.5"/><text class="cs-axis" x="${sx(8.75)}" y="${sy(8.75) - 10}" text-anchor="end">projected = actual</text>`;
  const labels = `<text class="cs-axis" x="${x0 + w / 2}" y="${H - 6}" text-anchor="middle">Projected match rating</text><text class="cs-axis" transform="translate(14 ${y0 + h / 2}) rotate(-90)" text-anchor="middle">Actual rating</text>`;
  return `<svg class="cs-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Example scatter plot of projected against actual match ratings for 12 matches; the points sit close to the projected-equals-actual line">${grid}${diag}${dots}${labels}</svg>`;
}

/* ---------- Baseball: pitch choice by count, and swing timing ---------- */
const PITCH = { 'Four-seam': C.p1, Slider: C.p2, Changeup: C.p3 };
// Best pitch for the pitcher in each count (strikes = row, balls = column) and its run value per 100 pitches.
const COUNTS = [
  [['Four-seam', -0.4], ['Four-seam', -0.1], ['Four-seam', 0.3], ['Four-seam', 0.9]],
  [['Slider', -0.9], ['Changeup', -0.6], ['Four-seam', -0.2], ['Four-seam', 0.4]],
  [['Slider', -1.8], ['Slider', -1.5], ['Changeup', -1.1], ['Slider', -0.7]],
];
// Approximate average MLB speeds (mph). Time to the plate ≈ 54.5 ft / speed; shown as ms later than a four-seamer.
const SPEEDS = [['Four-seam', 94.2], ['Sinker', 93.3], ['Cutter', 89.5], ['Slider', 85.6], ['Changeup', 85.8], ['Curveball', 79.6]];
const ms = mph => 54.5 / (mph * 5280 / 3600) * 1000;
const TIMING = SPEEDS.map(([name, mph]) => [name, mph, Math.round(ms(mph) - ms(SPEEDS[0][1]))]).sort((a, b) => a[2] - b[2]);

function countChart() {
  const W = 600, H = 300, x0 = 92, y0 = 34, cw = 122, ch = 70;
  let cells = '', heads = '';
  for (let b = 0; b < 4; b++) heads += `<text class="cs-axis" x="${x0 + b * cw + cw / 2}" y="${y0 - 12}" text-anchor="middle">${b} ball${b === 1 ? '' : 's'}</text>`;
  COUNTS.forEach((row, s) => {
    heads += `<text class="cs-axis" x="${x0 - 12}" y="${y0 + s * ch + ch / 2 + 4}" text-anchor="end">${s} strike${s === 1 ? '' : 's'}</text>`;
    row.forEach(([pitch, rv], b) => {
      const x = x0 + b * cw, y = y0 + s * ch;
      cells += `<g class="cs-cell"><rect x="${x + 1}" y="${y + 1}" width="${cw - 2}" height="${ch - 2}" rx="6" fill="${PITCH[pitch]}"/><text x="${x + cw / 2}" y="${y + 31}" text-anchor="middle" class="cs-strong">${pitch}</text><text x="${x + cw / 2}" y="${y + 50}" text-anchor="middle">${rv > 0 ? '+' : ''}${rv.toFixed(1)} runs</text><title>${b}-${s} count: ${pitch}, ${rv > 0 ? '+' : ''}${rv.toFixed(1)} runs per 100 pitches</title></g>`;
    });
  });
  const legend = Object.entries(PITCH).map(([name, col], i) => `<rect x="${x0 + i * 140}" y="${H - 32}" width="12" height="12" rx="3" fill="${col}"/><text class="cs-axis" x="${x0 + i * 140 + 18}" y="${H - 22}">${name}</text>`).join('');
  return `<svg class="cs-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Example grid of the 12 ball-strike counts showing which pitch type to throw in each count">${heads}${cells}${legend}</svg>`;
}

function timingChart() {
  const W = 600, H = 300, x0 = 110, y0 = 16, bw = 440, bh = 30, gap = 14, max = 90;
  let bars = '';
  TIMING.forEach(([name, mph, late], i) => {
    const y = y0 + i * (bh + gap), w = Math.max(4, late / max * bw);
    bars += `<g class="cs-cell"><text class="cs-axis" x="${x0 - 12}" y="${y + bh / 2 + 4}" text-anchor="end">${name}</text><rect x="${x0}" y="${y}" width="${w}" height="${bh}" rx="4" fill="${C.p1}"/><text x="${x0 + w + 8}" y="${y + bh / 2 + 4}">${late === 0 ? 'baseline' : `+${late} ms`}</text><title>${name}, about ${mph} mph: start the swing ${late === 0 ? 'on the fastball timing' : `about ${late} ms later than for a four-seamer`}</title></g>`;
  });
  return `<svg class="cs-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Bar chart of how much later to start the swing for each pitch type compared with a four-seam fastball">${bars}<text class="cs-axis" x="${x0}" y="${H - 6}">How much later to start the swing than for a four-seamer</text></svg>`;
}

function table(caption, head, rows) {
  return `<details class="cs-numbers"><summary>Show the numbers</summary><table><caption>${esc(caption)}</caption><thead><tr>${head.map(h => `<th scope="col">${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${r.map(c => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></details>`;
}

const STUDIES = {
  soccer: {
    images: [
      { src: 'assets/projects/soccerbee.jpg', alt: 'A Soccerbee GPS tracker and its phone app showing a match summary and heat map.', w: 642, h: 427 },
      { src: 'assets/projects/soccerbee-analysis.jpg', alt: 'My own Soccerbee session analysis, played as a centre midfielder, with heat map and sprint map.', w: 172, h: 320, narrow: true },
    ],
    intro: 'A fantasy-style projection model built from my own Soccerbee GPS tracking data. It answers a simple question: where on the field am I most useful?',
    steps: [
      'Exported my match sessions from Soccerbee: position samples, speed and sprints.',
      'Split the field into an x–y grid of 24 zones and, with pandas and NumPy, measured time, distance and sprints in each zone.',
      'Compared won and lost matches zone by zone to find where my time made the biggest difference.',
      'Turned those differences into zone weights and used them to project a match rating for new sessions, as practice in applying a model to real data.',
    ],
    charts: [
      { title: 'Where my time differs between wins and losses', svg: zoneChart, note: 'Example data. Percentage points of match time, wins minus losses.', table: () => table('Zone difference, wins minus losses (percentage points). Rows are lanes, columns run toward the opponent goal.', ['Lane', ...[1, 2, 3, 4, 5, 6].map(n => `Zone ${n}`)], ZONES.map((row, i) => [`Lane ${i + 1}`, ...row.map(v => v.toFixed(1))])) },
      { title: 'Projected against actual match rating', svg: projectionChart, note: 'Example data. Twelve matches; points near the dashed line were projected well.', table: () => table('Projected and actual match ratings', ['Match', 'Projected', 'Actual'], MATCHES.map(([p, a], i) => [String(i + 1), p.toFixed(1), a.toFixed(1)])) },
    ],
    skills: ['Python', 'pandas', 'NumPy', 'GPS tracking data'],
  },
  baseball: {
    images: [
      { src: 'assets/projects/mlb-9innings.jpg', alt: 'MLB 9 Innings Rivals 26 key art.', w: 261, h: 391, narrow: true },
      { src: 'assets/projects/baseball-reference.png', alt: 'Baseball Reference logo.', w: 402, h: 80, logo: true },
    ],
    intro: 'A data system for MLB 9 Innings, the baseball game I play. It uses real MLB pitch data to decide what to throw and when to swing.',
    steps: [
      'Pulled pitch-by-pitch Statcast data and player stats with pybaseball (Baseball Savant, FanGraphs and Baseball Reference), and cleaned it with pandas.',
      'Pitching: for every ball-strike count and batter hand, ranked pitch types by average run value, so in the game I throw the pitch hitters did worst against.',
      'Batting: turned each pitch type’s average speed into time to the plate, giving a timing guide for how much later to start the swing than for a fastball.',
      'Applied both guides in real games and compared the results with my usual play.',
    ],
    charts: [
      { title: 'Which pitch to throw in each count', svg: countChart, note: 'Example values. Run value per 100 pitches; lower is better for the pitcher.', table: () => table('Suggested pitch by count', ['Count (balls-strikes)', 'Pitch', 'Run value per 100 pitches'], COUNTS.flatMap((row, s) => row.map(([p, rv], b) => [`${b}-${s}`, p, rv.toFixed(1)]))) },
      { title: 'Swing timing by pitch type', svg: timingChart, note: 'Approximate: 54.5 ft to the plate at average MLB speeds; real pitches slow down a little on the way.', table: () => table('Swing timing compared with a four-seam fastball', ['Pitch', 'Average speed (mph)', 'Later than a four-seamer (ms)'], TIMING.map(([n, mph, late]) => [n, mph.toFixed(1), String(late)])) },
    ],
    skills: ['Python', 'pandas', 'pybaseball', 'Statcast data'],
  },
};

function mountStudy(id, root) {
  const study = STUDIES[id];
  const section = document.createElement('section');
  section.className = `case-study case-${id}`;
  section.innerHTML = `
    <div class="cs-gallery">${study.images.map(img => `<figure class="cs-shot${img.narrow ? ' is-narrow' : ''}${img.logo ? ' is-logo' : ''}"><img src="${img.src}" alt="${esc(img.alt)}" width="${img.w}" height="${img.h}" loading="lazy" decoding="async"></figure>`).join('')}</div>
    <p class="cs-intro">${esc(study.intro)}</p>
    <h4 class="cs-heading">How it works</h4>
    <ol class="cs-steps">${study.steps.map(step => `<li>${esc(step)}</li>`).join('')}</ol>
    <div class="cs-charts">${study.charts.map(chart => `<figure class="cs-figure"><figcaption><strong>${esc(chart.title)}</strong><span>${esc(chart.note)}</span></figcaption>${chart.svg()}${chart.table()}</figure>`).join('')}</div>
    <p class="cs-skills"><b>Skills</b>${study.skills.map(s => `<span>${esc(s)}</span>`).join('')}</p>`;
  root.append(section);
  return () => root.replaceChildren();
}

export const mountSoccer = root => mountStudy('soccer', root);
export const mountBaseball = root => mountStudy('baseball', root);

// Used only to draw the card picture for the baseball project.
export const previewCharts = { zoneChart, countChart, timingChart };
