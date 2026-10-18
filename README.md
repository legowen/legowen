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

No backend, API keys, paid services, database, or build dependencies are required. Google Fonts is the only runtime third-party asset request; local system fonts are the fallback. The demo weather data is illustrative, not a current forecast. Vercel or Cloudflare Pages can also serve the same static folder with no build command, subject to their current free-plan limits.

## Content and editing

- `index.html`: page structure, project cards, and contact links.
- `app.js`: expertise examples, résumé timeline headers, navigation, and roaming cats.
- `career.json`: responsibilities copied from the supplied résumé, preserving its text. Summaries are condensed in the timeline; expand each role or read the original PDF for the full record. Dates and job titles follow the supplied résumé. LinkedIn was consulted for professional positioning and language skills.
- `demos.js` / `demos.css`: five independently authored portfolio previews. They do not include private project source code, user accounts, real client records, or production connections.
- `assets/`: user-provided cat sprite sheets and original résumé; original SVG workspace illustration and favicon.

Project sources: [Boso](https://github.com/legowen/Boso), [lottomax-ai](https://github.com/legowen/lottomax-ai), [legacy LottoMax](https://github.com/legowen/LottoMax), [Hope no Rain](https://github.com/legowen/weather_app). Myeongcat and Roshambo were verified through the owner's private repositories; their previews are freshly implemented and clearly labeled. The original private repositories remain private.

The LottoMax browser demo samples seven unique numbers from 1–52, matching the current research project. It does not run Python or TensorFlow in the browser, predict winning numbers, or claim improved odds. Model notes describe the source repository's experiments. Boso's optional photo picker only creates an in-browser object URL and does not upload or store the photo.

## Design and accessibility

Original illustrated workspace inspired by the exploratory feel of Jesse Zhou's portfolio, with a career timeline inspired by the user-supplied reference. No artwork or code copied from either reference. Cat artwork was supplied by Owen.

Responsive layouts, keyboard navigation, native modal focus management, reduced-motion support, visible focus states, accessible demo controls, and a persistent cat pause control are included. Cats stay near the bottom edge and never intercept pointer input.

## Lightweight manual checks

Check desktop/mobile layout, each project preview, keyboard and touch movement, local photo selection/reset, generated-number uniqueness, workout toggles, Roshambo scoring, timeline expansion, résumé and external links. Browser smoke checks and syntax checks were prioritized over a large test suite at the owner's request.
