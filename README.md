# Owen Kim — Systems & Modern Workplace

An English portfolio focused on systems administration, endpoint engineering, Microsoft 365, network infrastructure, Power Platform, and governed AI enablement.

## Run locally

No install or build step. Serve this folder with any static HTTP server, for example:

```sh
python -m http.server 4173
```

Open `http://localhost:4173`. Opening `index.html` directly with `file://` will not run ES modules or fetch résumé data.

## Hosting

Designed for free GitHub Pages from `main` / root. All asset paths are relative and support project subpaths. In repository Settings → Pages, select **Deploy from a branch**, **main**, **/(root)**. `.nojekyll` disables Jekyll processing. Future pushes update the site.

The portfolio needs no backend, API keys, paid services, database, or build dependencies. Three.js is vendored locally with its MIT license. Google Fonts has a local system-font fallback. Original Boso and weather applications load from their existing hosts only when a visitor chooses to launch them. Those applications retain their own service requirements.

## Content and editing

- `index.html`: page structure, room fallback, and contact links.
- `app.js`: expertise examples, résumé timeline headers, navigation, and roaming cats.
- `career.json`: responsibilities copied from the supplied résumé, preserving its text. Summaries are condensed in the timeline; expand each role or read the original PDF for the full record. Dates and job titles follow the supplied résumé. LinkedIn was consulted for professional positioning and language skills.
- `room3d.js`: procedural Three.js workspace, clickable objects, and upright sprite-sheet cats. No Blender files or external models are required.
- `project-cards.js` / `projects.css`: reusable project cards, original media galleries, and optional live-app embeds.
- `assets/`: user-provided cat sprite sheets and original résumé; fallback workspace illustration, favicon, and original project captures.
- `vendor/`: Three.js 0.186.1 browser modules, version record, and MIT license.

Project sources: [Boso](https://github.com/legowen/Boso), [lottomax-ai](https://github.com/legowen/lottomax-ai), and [Hope no Rain](https://github.com/legowen/weather_app). Boso launches its actual [production game](https://snowbom.vercel.app/); weather launches its [original deployment](https://hopenorain.netlify.app/).

Myeongcat uses screenshots and a companion-room recording from the owner's latest local application preview, with sample data. It is still in development and has no public interactive deployment. Its private application source is not included. LottoMax displays the owner's original screenshot and describes the repository's Python/FastAPI and TensorFlow/Keras research; its local backend/model is not executed on GitHub Pages. Sampling experiments do not establish improved lottery odds. Roshambo is identified as private and not deployed, pending original media or a public app URL. No replacement games or simulated app interfaces are included.

## Design and accessibility

Original low-poly workspace inspired by the exploratory feel of Jesse Zhou's portfolio, with a career timeline inspired by the user-supplied reference. No artwork or code copied from either reference. Cat artwork was supplied by Owen. The first screen uses Three.js; expertise, projects, and experience remain ordinary HTML. Desktop loads the room when idle; mobile and reduced-motion visitors explicitly choose to start it. Skip 3D releases the renderer and takes visitors directly to experience.

Responsive layouts, keyboard navigation, native modal focus management, reduced-motion support, visible focus states, and a persistent cat pause control are included. Cats have no floating name labels. They walk inside the 3D room on the first screen, and along the viewport edge elsewhere without intercepting pointer input. The room pauses when offscreen, hidden, or covered by a project viewer.

## Lightweight manual checks

Check desktop/mobile layout, room loading and Skip 3D, cat pause, original project media and live embeds, keyboard navigation, timeline expansion, résumé and external links. Basic browser and syntax checks were prioritized over a large test suite at the owner's request.
