# Owen Kim — Systems & Modern Workplace

English portfolio for systems administration, endpoint engineering, Microsoft 365, infrastructure, Power Platform, and AI enablement.

## Run and deploy

Serve this folder with a static HTTP server. No installation, build, API keys, backend, or paid service is needed for the portfolio. GitHub Pages publishes `main` / root; `.nojekyll` is included. Use HTTP rather than opening `index.html` directly.

Three.js is vendored locally with its MIT license. Google Fonts has system-font fallbacks. Project interactions and their assets run locally, without connecting to production accounts or external app deployments.

## Interactive project slices

The owner requested usable excerpts of the original apps in this portfolio, with English controls. Do not replace these with video, recordings, or external-app iframes. Do not create videos for this project.

- **Boso:** one Vacuum Closet / Vacuum King encounter adapted from the original game's map, artwork and boss mechanics. Keyboard and mobile touch controls, cat selection, health, pause, victory/defeat and retry. Original game: https://github.com/legowen/Boso.
- **Myeongcat:** companion room and workout journal adapted from the latest local app's Home, Cat, petRoom and ExerciseEditor components. Four original cat sprites, movement/pet interactions and sample workout records. All labels are English. The private backend and real accounts are not included.
- **LottoMax:** original pixel artwork/interface with seven unique random numbers from 1–52, a reveal, copy, and recent picks. No Keras inference or backend calls. Python/FastAPI and TensorFlow/Keras research is described separately. Source: https://github.com/legowen/lottomax-ai.
- **Hope no Rain:** the original weather dashboard layout, with sample city selection, temperature units and five-day cards. Clearly labeled sample data, not live weather. Source: https://github.com/legowen/weather_app.
- **Roshambo:** original hand images and two-card game interaction, with random computer choice and local score. Only this small slice of the owner's private project is included.

Preview records and scores last only while a preview is open. Cat motion preferences remain local to the browser. Original application repositories are not modified by the portfolio.

## Editing

- `index.html`, `style.css`, `projects.css`: page structure and responsive layout.
- `app.js`: expertise, résumé timeline, navigation, cat companions and 3D lifecycle.
- `career.json`: responsibilities transcribed from the supplied résumé; the original PDF is in `assets/`.
- `room3d.js`: first-screen Three.js workspace with upright sprite cats. Skip 3D releases the renderer and takes visitors to experience. Mobile and reduced-motion visitors opt in; offscreen or hidden scenes pause.
- `project-cards.js`: reusable project cards and lazy-loaded interactive viewers.
- `boso-demo.*`, `myeongcat-demo.*`, `lotto-demo.*`, `utility-demos.*`: isolated local interactions and styles. Each mount function returns cleanup for timers and listeners.
- `assets/`: original artwork, project thumbnails, résumé and licensed fonts; provenance notes accompany adapted assets where relevant.

Experience and expertise stay ordinary HTML. All roaming cats have no floating name labels and never intercept navigation. Keyboard navigation, focus styles, reduced-motion preferences and a cat pause control are supported.

## Verification

Use small syntax, asset-path and interaction checks. The owner prefers to handle extensive playtesting and device testing, so avoid adding a large automated test suite. In particular check keyboard/touch boss controls, closing/reopening a preview, workout validation, random-number uniqueness, and small-screen layout.

## Blender materials

The room's wood, plaster walls and woven rug now use original color/roughness maps baked in Blender 4.5. The six maps total approximately 518 KiB and load only with the optional 3D room. Geometry and lighting remain in Three.js; this is material authoring, not a complete Blender-modeled room or a baked room-lighting pass. Reproduction instructions and the Blender script are in `assets/materials/`. No Blender executable is included in the website.
