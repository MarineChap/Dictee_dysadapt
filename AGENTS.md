# AGENTS.md — Dictadapt

Guide for AI coding agents working in this codebase.

## Project

Dictadapt helps struggling pupils take a dictation at their own pace. A teacher photographs the
exercise, on-device OCR extracts the text, the teacher corrects it and splits it into small parts
(2–4 words, up to a comma or full stop). The pupil then gets a screen of large "Partie 1,
Partie 2…" buttons and listens to each part as often as they like; a part turns green once heard.

Sibling of [DysAdapt](https://dysadapt.com) and deliberately identical in look and feel, but a
completely different animal underneath: **no backend, no account, no network, no AI**.

## Hard constraints

These are the product, not implementation details. Do not break them:

1. **Everything runs client-side and offline.** No fetch to a third party, ever. OCR assets,
   fonts and the language model are served from `public/` and precached by the service worker.
   The one network use is the optional DysAdapt account, on DysAdapt's own origin.
2. **The pupil never sees the dictation text.** `ModeEleve` renders part numbers only — no
   segment text may reach the DOM. `src/pages/__tests__/ModeEleve.test.tsx` guards this.
3. **The account is optional.** Without a DysAdapt session nothing changes: IndexedDB plus
   localStorage, transfer by QR code, and no request at all. With one, `lib/library.ts` also
   saves dictations in the account (`/api/backend/services/dictations`, through DysAdapt's
   same-origin proxy — Dictadapt never handles a token) like a DysAdapt document: last save
   wins, deletion is final, offline changes are sent once back online. The source photo never
   leaves the device. A dictation can be put in students' DysAdapt lockers; the pupil opens it
   at `#/eleve/casier/:assignmentId` and their progress is saved in the account.

## Stack

- **Build**: Vite 7 · React 19 · TypeScript (strict) · Tailwind CSS v4 (CSS-first, no config file)
- **Router**: `react-router-dom` with **HashRouter** — works under any sub-path with no server
  rewrite
- **Offline**: `vite-plugin-pwa` (`generateSW`)
- **OCR**: `tesseract.js` 6, French `best_int` model
- **Android**: none on `main`. The Capacitor APK is parked on branch `apk-capacitor` (tag
  `apk-v1`) until a combined DysAdapt/Dictadapt app; do not reintroduce it here.
- **Self-hosting**: `Dockerfile` (Vite build → nginx) + `docker/default.conf.template`

## Directory structure

```
src/
├── lib/            Pure logic, unit-tested first
│   ├── segment.ts    French splitting — the heart of the tool
│   ├── ocr.ts        Tesseract worker + French text cleanup
│   ├── image.ts      Canvas preprocessing (grey, Otsu, rotation)
│   ├── speech.ts     TTS adapter: Web Speech API, local voices only
│   ├── share.ts      QR payload: deflate + base64url + multi-code splitting
│   ├── db.ts         IndexedDB (dictations, blobs, progress)
│   ├── account.ts    DysAdapt session (who is signed in, offline fallback)
│   ├── library.ts    Library: device + account (save, delete, mirror, offline queue)
│   ├── remote.ts     DysAdapt API calls (dictations, students, lockers)
│   ├── ids.ts        UUID dictation ids
│   ├── storage.ts    localStorage settings
│   └── types.ts
├── pages/          Accueil · NouvelleDictee · DicteeDetail · ModeEleve · Scanner · Reglages
├── components/     Flat, PascalCase, one default export per file (DysAdapt convention)
├── hooks/          useAccount · useDictations · useSettings · useTheme
└── styles/globals.css   Design tokens, copied from DysAdapt
```

## Key patterns

### Design system
DysAdapt's, as-is: one product, two tools. `src/styles/globals.css` copies DysAdapt's tokens,
closed theme and base layer verbatim (`dysadapt/frontend/src/app/globals.css`); `src/components/ui/`
copies its building blocks (`Button`, `ButtonLink` — with a react-router `to` —, `IconButton`, `Card`,
`SectionTitle`, `Notice`, `Field`/`Input`/`Textarea`/`Select`, `SeyesZone`…); `eslint-rules/` copies
its design-system lint. Keep the three in sync with DysAdapt rather than diverging here.

Screens compose `@/components/ui` and never restyle them with colours. The theme is closed: no
Tailwind palette colour (`slate-*`, `indigo-*`…), no `font-black`, no `uppercase`/`tracking-*`, no
`rounded-2xl` and above, no card shadows, blur or gradients, no text under 12 px —
`npm run lint` (zero warnings) rejects them. Interface font: Luciole; reading font (`.reading-text`):
Andika. Rules and rationale: `dysadapt/docs/frontend-design-system.md`.

Signed in, the bar is DysAdapt's (its logo leads to the teacher's dashboard), so Dictadapt reads as
one of its tools; without an account, Dictadapt's own logo, same look.

### Segmentation
`segmentText()` is pure and has no dependencies: break on punctuation (the mark stays glued to the
part before it), cut anything over `maxWords` without stranding a linking word, merge anything
under `minWords`. Change it only with a test that pins the new behaviour.

### Served under a sub-path
DysAdapt publishes this app at `dysadapt.com/dictee/`, so the `dictee` service in its
`docker-compose.yml` builds this repo with `--build-arg VITE_BASE=/dictee/` and the proxy strips
the prefix before nginx sees it. `VITE_BASE` is a **build** arg, not a runtime one: Vite inlines it
into the asset URLs, the manifest's `scope`/`start_url` and the service worker's registration scope
and navigate fallback. Two consequences worth remembering — the offline guarantee depends on both:

- the base must match the path the proxy serves, or the worker's scope won't cover the page;
- links in must carry the **trailing slash** (`/dictee/`, not `/dictee`), or the app loads outside
  its own scope, never registers, and silently stops working offline.

`DICTEE_PORT` (default `8081`) is the one genuine runtime knob — the nginx entrypoint renders it
into the config with envsubst.

### Offline assets
`public/tesseract/` and `public/fonts/` are vendored binaries, not npm dependencies at runtime.
If you bump `tesseract.js`, re-copy `worker.min.js` and the LSTM cores from `node_modules`, or the
worker and the core will disagree at runtime — and it will only fail in the browser.

### React lint rules
`eslint-plugin-react-hooks` v7 is strict: **never call `setState` synchronously in an effect body**
(write it in a promise callback instead), never read a ref during render, and never let a
`useCallback` reference itself. `useDictations` and `QrShare` show the patterns that satisfy it.

### UI language
The interface is **French**; code, comments and tests are in **English**. There is no i18n layer —
strings are inline.

## Run tests

```bash
npm run lint
npm test
npm run build
```

Manual check that matters most, and that the test suite cannot cover: `npm run build && npm run
preview`, load the page, switch the browser to Offline, reload, then run a photo through OCR.

## Roadmap (deliberately not built yet)

Accessibility settings (font picker, size, line height, letter spacing), pupil self-correction, and
teacher voice recording. The groundwork is in place: the four accessibility fonts already ship,
`allowReveal` is already stored per dictation, and the `blobs` IndexedDB store is ready for audio.
