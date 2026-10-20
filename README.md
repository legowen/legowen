# Owen Kim — Systems & Modern Workplace

English portfolio for systems administration, endpoint engineering, Microsoft 365, Intune, Jamf, identity and infrastructure roles. A static site: no build step, no API keys, no backend, no paid service.

The first screen is a neon IT office in 3D (Three.js). It is optional. Everything below it is ordinary HTML and works without WebGL.

## Run and deploy

- Local preview: `python3 -m http.server 4173` in this folder, then open http://127.0.0.1:4173/. Use HTTP, not `file://`, because the page uses ES modules and `fetch`.
- GitHub Pages: publish `main` / root. `.nojekyll` is included.
- Three.js r186 is vendored in `vendor/` (MIT, see `vendor/VERSION.txt`). Google Fonts has system-font fallbacks.
- The link-preview image uses an absolute URL, `https://legowen.github.io/owen-portfolio/assets/og-card.jpg`. If the site moves to another address, update the two `og:image` lines in `index.html`.

## Page map

| Section | What it shows | Where to edit |
|---|---|---|
| Hero | 3D office, headline, four certification chips | `index.html` (copy, chips), `room3d.js` + `room-*.js` (scene) |
| 01 Systems & endpoints | Role chips, six areas, 12 field notes, working habits, career path | `sysadmin.js` (all text is data at the top of the file) |
| 02 Microsoft & certifications | Certification plaques, Microsoft stack tiles, other tools | `credentials.json`, `microsoft.js` |
| 03 Experience | Timeline with expandable responsibilities | `app.js` (`career` array), `career.json` (bullets, same order) |
| 04 Projects | Five cards that open playable slices | `project-cards.js`, `*-demo.js` |
| About, Contact | Short intro, Bomi and Seoli, email, links | `index.html` |

## Certifications

`credentials.json` drives the plaques. Each entry:

```json
{ "code": "MD-102", "name": "Official certification title", "short": "Short title",
  "level": "Associate", "covers": "One line on what it covers", "use": "Where I use it",
  "accent": "#4dff9a", "status": "earned", "issued": null, "verifyUrl": null }
```

- `status` is `earned` or `in-progress`. The section label counts them automatically.
- `issued` (`"2026-05"`) and `verifyUrl` (a Credly or Microsoft Learn share link, `https://` only) are optional. When set, the plaque shows the month and a Verify link. They are empty now because no dates or links were provided.
- The four chips in the hero and the `hasCredential` list in the JSON-LD block of `index.html` are written by hand. Keep them in step with this file.
- Associate certifications (MD-102, SC-300) renew every year. Microsoft also retires and replaces exams: MS-900 showed as retired on Microsoft Learn when this was last checked. Look at https://learn.microsoft.com/credentials/ before changing the wording.

## Résumé PDF

Put the current file at `assets/OwenKim_Resume.pdf`. The "Résumé" links stay hidden until the file exists, so nothing breaks without it. Check the PDF against `career.json` before publishing it.

## The 3D office

- `room3d.js` mounts the scene: camera fit, pins, quality tiers (high, medium, low) with a downgrade-only frame-rate guard, reflection and bloom on the higher tiers.
- `room-layout.js` is the floor plan, shared by the models, the cats' world and the tests. `room-props.js` builds the furniture, signs and lights, and holds the pins and where each one links. `room-screens.js` and `room-textures.js` paint the screens, signs and textures at runtime. `room-kit.js` merges boxes into few draw calls and tracks what to dispose. Apart from the two cat sheets, the Boso screenshot and the logo SVGs, the room loads no image files.
- Cats: `cat-brain.js` is the pure behaviour logic (pathfinding, perches, naps, play). `room-cats.js` draws them in 3D as upright sprites. `site-cats.js` runs the small page-edge cats, which hide while the room's cats are on screen.
- The poster images in `assets/room-poster-*.webp` are what visitors see before 3D loads or when 3D is off. After changing the scene, regenerate them: open `tests/room-lab.html?q=high`, call `window.__room.setCatsMoving(false)`, and capture at 1440×750 (wide), 800×571 (mid) and 390×359 (phone). The link-preview card is `assets/og-card.jpg` (1200×630).
- 3D is skipped when WebGL is missing, when Data Saver is on, or when the visitor turns it off. Reduced-motion settings pause the cats and pulses. The scene pauses when it is off screen, the tab is hidden, or a project preview is open.

## Interactive project slices

The owner asked for usable excerpts of the original apps, with English controls. Do not replace these with video, recordings, or external-app iframes. Do not create videos for this project.

- **Boso:** one Vacuum Closet / Vacuum King encounter adapted from the original game's map, artwork and boss mechanics. Keyboard and touch controls, cat selection, health, pause, victory/defeat and retry. Original game: https://github.com/legowen/Boso.
- **Myeongcat:** companion room and workout journal adapted from the latest local app. Four original cat sprites, movement and pet interactions, sample workout records. The private backend and real accounts are not included.
- **LottoMax:** original pixel artwork and interface with seven unique random numbers from 1–52, a reveal, copy, and recent picks. No Keras inference or backend calls. Python/FastAPI and TensorFlow/Keras research is described separately. Source: https://github.com/legowen/lottomax-ai.
- **Hope no Rain:** the original weather dashboard layout with sample city selection, temperature units and five-day cards. Clearly labelled sample data, not live weather. Source: https://github.com/legowen/weather_app.
- **Roshambo:** original hand images and a two-card game with a random computer choice and local score. Only this small slice of the owner's private project is included.

Preview records and scores last only while a preview is open. Cat preferences (`owen-cats`) and the 3D choice (`owen-3d`) are kept in the browser's local storage. Original application repositories are not modified by the portfolio.

## Writing rules for the content

- Plain, short sentences. Say what was done, not how impressive it was.
- The field notes in `sysadmin.js` are sanitised: no client names, hostnames, IPs, case numbers, configs or screenshots. Only items that were resolved or diagnosed appear, and anything unfinished is worded as "started" or "scoped".
- Do not attach NDA-sensitive details to client names. Do not publish incident details.
- Kubernetes and GPU servers were operated and maintained, not designed. Dataverse, Power BI and Fabric belong to the earlier role, not the studio role.

## Logos and trademarks

Logo files live in `assets/logos/` with their sources and notes in `assets/logos/LICENSES.txt`. The Microsoft section carries a trademark note. Plaques are original artwork, not official badges.

## Verification

- Pure cat logic: `node --test tests/*.test.mjs` (22 small tests, no packages to install).
- By hand: keyboard and touch boss controls, closing and reopening a preview, 3D on and off, reduced motion, and a phone-width layout (360–390 px) with no sideways scroll.
- The owner prefers to handle wide device testing, so keep automated tests small.
