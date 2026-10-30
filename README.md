# Owen Kim — Systems, Endpoints & Microsoft 365

IT professional in Vancouver, BC. Systems administration, endpoint engineering, Microsoft 365, Intune, Jamf and identity.

**Portfolio: https://legowen.github.io/legowen/**

A neon 3D IT office, field notes from real support work, four Microsoft certifications (AZ-900, MS-900, MD-102, SC-300), four small playable app slices (Boso, PT w Kitty, LottoMax, Hope no Rain), two sports-data case studies (Soccerbee, MLB 9 Innings), and the live company site and online store from Renu Bio Health. [LinkedIn](https://www.linkedin.com/in/owensykim/)

---

## About this repository

English portfolio for systems administration, endpoint engineering, Microsoft 365, Intune, Jamf, identity and infrastructure roles. A static site: no build step, no API keys, no backend, no paid service.

The first screen is a neon IT office in 3D (Three.js). It is optional. Everything below it is ordinary HTML and works without WebGL.

Before that, an opening screen shows a cat napping on a monitor while the office boots, with a percentage that follows real loading (page, fonts, the 3D module and its first frame). At 100% a START button appears and the visitor enters the site with it. It shows once per browser tab (`sessionStorage` key `owen-intro`), `?intro=0` skips it, and if `intro.js` fails to load the overlay removes itself after five seconds. Files: `intro.js`, `intro.css`, the `#intro` markup at the top of `index.html`.

## Run and deploy

- Local preview: `python3 -m http.server 4173` in this folder, then open http://127.0.0.1:4173/. Use HTTP, not `file://`, because the page uses ES modules and `fetch`.
- GitHub Pages: publish `main` / root. `.nojekyll` is included.
- The repository is named `legowen`, the same as the GitHub username. GitHub therefore also shows this README on the profile page, and the site address is `https://legowen.github.io/legowen/`. To get the shorter `https://legowen.github.io/`, name the repository `legowen.github.io` instead.
- Three.js r186 is vendored in `vendor/` (MIT, see `vendor/VERSION.txt`). Google Fonts has system-font fallbacks.
- The link-preview image uses an absolute URL, `https://legowen.github.io/legowen/assets/og-card.jpg`. If the site moves to another address, update the `og:image` line in `index.html`.

## Page map

| Section | What it shows | Where to edit |
|---|---|---|
| Opening screen | Loading cat, percentage, START | `intro.js`, `intro.css`, `#intro` in `index.html` |
| Hero | 3D office, headline, four certification chips | `index.html` (copy, chips), `room3d.js` + `room-*.js` (scene) |
| 01 Systems & endpoints | Role chips, six areas, 12 field notes, working habits, career path | `sysadmin.js` (all text is data at the top of the file) |
| 02 Microsoft & certifications | Certification plaques, Microsoft stack tiles, other tools | `credentials.json`, `microsoft.js` |
| 03 Experience | Timeline with expandable responsibilities and the client game projects | `app.js` (`career` array), `career.json` (bullets, same order), `client-games.js` + `client-games.css` (game cards) |
| 04 Projects | Seven cards: four playable slices, two sports-data case studies, the Renu Bio Health sites | `project-cards.js`, `*-demo.js`, `case-studies.js` + `case-studies.css`, `renu-sites.js` + `renu-sites.css` |
| About, Contact | Short intro, Bomi and Seoli with floating photos, email, links | `index.html`, `about-photos.js` + `about-photos.css` (photos in `assets/about/`) |

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
- Associate certifications (MD-102, SC-300) renew every year. Microsoft also retires and replaces exams: the Microsoft 365 Certified: Fundamentals page on Microsoft Learn showed "retired" when this was last checked (October 2026). Look at https://learn.microsoft.com/credentials/ before changing the wording.

## Client game projects

The Experience timeline shows three client games under the Sprung Studios entry: an unannounced Krafton project, the Plants vs. Zombies 3 series (EA) and Minecraft Dungeons II (Mojang Studios, Microsoft). The Plants vs. Zombies 3 and Minecraft Dungeons II pictures (`assets/games/ea-pvz3.jpg`, `mojang-dungeons-ii.jpg`) are key art the owner supplied; they belong to EA / PopCap and Mojang Studios / Microsoft. The Krafton card is original artwork because the project is unannounced. The owner's part was IT, access and security support, so the text says that and does not claim game development.

To change a card, edit the list at the top of `client-games.js`. To use another picture, point `image` at a file and set `position` to choose which part of the picture the small portrait frame shows. Check the publisher's usage rules before using official art.

## Résumé PDF

Put the current file at `assets/OwenKim_Resume.pdf`. The "Résumé" links stay hidden until the file exists, so nothing breaks without it. Check the PDF against `career.json` before publishing it.

## The 3D office

- `room3d.js` mounts the scene: camera fit, pins, quality tiers (high, medium, low), reflection and bloom on the higher tiers. A frame-time guard first lowers the render resolution (down to 60%) when frames take longer than about 21 ms, drops a tier only when they pass about 34 ms, and raises the resolution again when there is headroom. There is no frame-rate cap on any tier.
- Smoothness: the six canvas screens repaint at 2–6 fps, at most one per frame, and not at all while the camera is turning, so a drag never waits for a texture upload. Pins only touch the page when their position or visibility changes.
- `room-layout.js` is the floor plan, shared by the models, the cats' world and the tests. `room-props.js` builds the furniture, signs and lights, and holds the pins and where each one links. `room-screens.js` and `room-textures.js` paint the screens, signs and textures at runtime. `room-kit.js` merges boxes into few draw calls and tracks what to dispose. Apart from the two cat sheets, the Boso screenshot, the desk photo and the logo SVGs, the room loads no image files.
- Desk and hobbies: a photo frame stands on the desk beside the monitor and shows `assets/room/family-portrait.jpg` (the approved couple illustration: Owen in long sleeves holding Seoli, partner holding Bomi; contained on a cream matte so the full square image is visible; if the file is missing the frame shows a neon heart). A soccer ball, a baseball and a tennis racket with a ball sit in the corner by the kettlebell. The photo, the racket and the balls are hotspots: the photo and the racket go to About, the soccer ball and the baseball open their case studies. The frame has its own pin, "Curious by nature", which goes to About. `room-layout.js` has an obstacle for the ball so the cats walk around it.
- Cats: `cat-brain.js` is the pure behaviour logic (pathfinding, perches, naps, play). `room-cats.js` draws them in 3D as upright sprites. `site-cats.js` runs the small page-edge cats, which hide while the room's cats are on screen.
- The poster images in `assets/room-poster-*.webp` are what visitors see before 3D loads or when 3D is off. After changing the scene, regenerate them: open `tests/room-lab.html?q=high`, call `window.__room.setCatsMoving(false)`, and capture at 1440×750 (wide), 800×571 (mid) and 390×359 (phone). The link-preview card is `assets/og-card.jpg` (1200×630).
- Desk pins: the pin above the two monitors goes to Experience, the frame's pin goes to About, and the rack's pin ("Systems & endpoints") goes to Systems. The résumé clipboard still opens Experience when clicked but has no pin of its own, so the desk shows one dot per section.
- On phones and tablets, a drag that starts sideways turns and tilts the room. A swipe that starts up or down scrolls the page as usual, and the view sways a little by itself because touch screens have no hover.
- 3D is skipped when WebGL is missing, when Data Saver is on, or when the visitor turns it off. Reduced-motion settings pause the cats and pulses. The scene pauses when it is off screen, the tab is hidden, or a project preview is open.

## Interactive project slices

The owner asked for usable excerpts of the original apps, with English controls. Do not replace these with video, recordings, or external-app iframes. Do not create videos for this project.

- **Boso:** one Vacuum Closet / Vacuum King encounter adapted from the original game's map, artwork and boss mechanics. The boss uses the pattern engine from the game's `src/data/bossPatterns.js`: three phases (below 50% and 25% health), each opened by a roar during which he cannot be hurt, and six attacks, each with a red warning first: Suction, Dust Balls, Floor Sweep, Call Flies, Bag Burst and Full Power Suction. Later phases add attacks, let some overlap and shorten the gaps. Keyboard and touch controls, cat selection, health, pause, victory/defeat and retry. Original game: https://github.com/legowen/Boso.
- **PT w Kitty:** companion room and workout journal adapted from the latest local app. Four original cat sprites, movement and pet interactions, sample workout records. The app's repository (`PTwithKitty`) is private, so the card has no source link. The private backend and real accounts are not included.
- **LottoMax:** original pixel artwork and interface with seven unique random numbers from 1–52, a reveal, copy, and recent picks. No Keras inference or backend calls. Python/FastAPI and TensorFlow/Keras research is described separately. Source: https://github.com/legowen/lottomax-ai.
- **Hope no Rain:** the original weather dashboard layout with sample city selection, temperature units and five-day cards. Clearly labelled sample data, not live weather. Source: https://github.com/legowen/weather_app.

Preview records and scores last only while a preview is open. Cat preferences (`owen-cats`) and the 3D choice (`owen-3d`) are kept in the browser's local storage. Original application repositories are not modified by the portfolio.

## Sports-data case studies

Cards 04 and 05 have no demo. They open a short case study (`case-studies.js`, `case-studies.css`) with the owner's pictures, the steps, two charts and the skills used. The charts are inline SVG with hover titles and a "Show the numbers" table under each.

- **Soccerbee · Zone projection model:** Soccerbee GPS tracking sessions exported and processed with Python, pandas and NumPy. The pitch is split into an x–y grid of 24 zones, time in each zone is compared between won and lost matches, and the differences become zone weights for a simple projected match rating. Described as practice in applying a model to real data. Pictures: `assets/projects/soccerbee*.jpg`.
- **MLB 9 Innings · Pitch & timing model:** Statcast data pulled with pybaseball and summarised with pandas, then applied while playing MLB 9 Innings: which pitch type to throw in each count (average run value) and how much later to start a swing against slower pitches (time to the plate).
- The zone, projection and count charts use example values and say so. The swing-timing chart is worked out from the 54.5 ft release distance and average MLB pitch speeds. Replace the arrays at the top of each chart builder in `case-studies.js` with real results if they should be shown.
- The MLB 9 Innings key art belongs to Com2uS and the Baseball Reference logo to Sports Reference; both were supplied by the owner. `assets/projects/mlb-9innings-card.jpg` is a composite made for the card.

## Renu Bio Health sites

The last project card (07) is work, not an app slice. It opens two screenshots, the company website (https://www.renubiohealth.com/) and the Royal Canadian store on Shopify (https://www.royal-canadian.ca/collections/shop-all), with links that open in a new tab. The text sticks to what the résumé says: the owner managed both sites, built and maintained the B2B and B2C e-commerce, and automated order handling and reporting. The screenshots are from October 2026; the live sites may have changed since. Files: `renu-sites.js`, `renu-sites.css`, `assets/projects/renu-*.jpg`. In the 3D office, the bench cards marked WEB, SHOP and CART link to this card.

## About photos

Five photos of Bomi, Seoli and Owen float around the two pixel cats in heart and star frames (`assets/about/heart.svg`, `assets/about/star.svg`). They stay inside the cat card, pause while a photo is hovered, when the section is off screen or the tab is hidden, and stand still with reduced motion or when the visitor pauses the cats. On phones a tap shows a photo larger. The photos were cropped and re-encoded as WebP, which removes camera data such as location. To change a photo, replace the file and its line at the top of `about-photos.js`.

The PT w Kitty card picture (`assets/projects/ptwithkitty.jpg`) is a screenshot of the in-site preview, not of the private app. Retake it after changing the preview.

## Writing rules for the content

- Plain, short sentences. Say what was done, not how impressive it was.
- The field notes in `sysadmin.js` are sanitised: no client names, hostnames, IPs, case numbers, configs or screenshots. Only items that were resolved or diagnosed appear, and anything unfinished is worded as "started" or "scoped".
- Client names (Krafton, EA, Mojang Studios) appear only in the Experience section, with the owner's approval. Before adding contract terms, configurations or incident details next to a client name, check the NDA. Do not publish incident details.
- Titles follow the owner's choice. Sprung Studios is shown as "IT Specialist".
- Kubernetes and GPU servers were operated and maintained, not designed. Dataverse, Power BI and Fabric belong to the earlier role, not the studio role.

## Logos and trademarks

Logo files live in `assets/logos/` with their sources and notes in `assets/logos/LICENSES.txt`. The Microsoft section carries a trademark note. Plaques are original artwork, not official badges. Client and game names (Krafton, EA, Mojang Studios, Microsoft, Plants vs. Zombies, Minecraft) belong to their owners and are used only to say which projects the studio worked on. The Plants vs. Zombies 3, Minecraft Dungeons II and MLB 9 Innings key art and the Baseball Reference logo were supplied by the owner and belong to their publishers; they are shown only to say which projects or tools are meant. The Krafton picture is original artwork.

## Verification

- Pure cat logic: `node --test tests/*.test.mjs` (22 small tests, no packages to install).
- Browser checks and screenshots should open the page with `?intro=0` (or set `sessionStorage['owen-intro'] = 'done'`) so the opening screen does not cover it.
- By hand: keyboard and touch boss controls, closing and reopening a preview, 3D on and off, reduced motion, and a phone-width layout (360–390 px) with no sideways scroll.
- The owner prefers to handle wide device testing, so keep automated tests small.
