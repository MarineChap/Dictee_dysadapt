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
2. **The pupil never sees the dictation text.** `ModeEleve` renders part numbers only — no
   segment text may reach the DOM. `src/pages/__tests__/ModeEleve.test.tsx` guards this.
3. **No login, no server.** Persistence is IndexedDB plus localStorage; transfer is a QR code.
4. **A received dictation is pupil-only.** `Dictation.origin` says where a copy comes from:
   `created` (photographed here — teacher screen, text, QR share) or `received` (scanned from a
   QR code — the parts and nothing else). `DicteeDetail` bounces a received copy to `/eleve/:id`,
   including on a hand-typed URL, and `ModeEleve` gives it a plain back arrow instead of the
   `ExitLock`: with no text behind the screen there is nothing to lock. Copies saved before the
   field existed have `origin` undefined and read as `created` — use `isReceived()`, never a raw
   comparison. `src/pages/__tests__/DicteeDetail.test.tsx` guards the routing. Anything a pupil
   must be able to do therefore belongs on `Accueil`, the one screen both modes reach: renaming
   lives there (`RenameDialog`), not only on the teacher screen.

## Stack

- **Build**: Vite 7 · React 19 · TypeScript (strict) · Tailwind CSS v4 (CSS-first, no config file)
- **Router**: `react-router-dom` with **HashRouter** — works under a GitHub Pages sub-path and
  under Capacitor's local scheme alike
- **Offline**: `vite-plugin-pwa` (`generateSW`)
- **OCR**: `tesseract.js` 6, French `best_int` model
- **Android**: Capacitor 7 (`android/` is committed; its generated files are gitignored)
- **Self-hosting**: `Dockerfile` (Vite build → nginx) + `docker/default.conf.template`

## Directory structure

```
src/
├── lib/            Pure logic, unit-tested first
│   ├── segment.ts    French splitting — the heart of the tool
│   ├── ocr.ts        Tesseract worker + French text cleanup
│   ├── image.ts      Canvas preprocessing (grey, Otsu, rotation)
│   ├── speech.ts     TTS adapter: Web Speech API / Capacitor native, paced reading
│   ├── share.ts      QR payload: deflate + base64url + multi-code splitting
│   ├── db.ts         IndexedDB (dictations, blobs, progress)
│   ├── storage.ts    localStorage settings
│   └── types.ts
├── pages/          Accueil · NouvelleDictee · DicteeDetail · ModeEleve · Scanner · Reglages
├── components/     Flat, PascalCase, one default export per file (DysAdapt convention)
├── hooks/          useDictations · useSettings · useTheme
└── styles/globals.css   Design tokens, copied from DysAdapt
```

## Key patterns

### Design system
`src/styles/globals.css` is a near-verbatim copy of `dysadapt/frontend/src/app/globals.css`.
Do not invent colours: use `bg-primary`, `text-primary`, `bg-surface`, `bg-primary-muted`.
The WCAG override at the bottom of the file (`bg-primary` → `#7e22ce` in dark mode) is load-bearing
— removing it makes every dark-mode button fail AA. Buttons carry
`transition-all active:scale-95`; cards are `rounded-3xl`; eyebrow labels are
`text-[10px] font-black uppercase tracking-widest`.

### Reading aloud
`speak()` is a chain, not one utterance: `speechChunks()` cuts the segment just before each spoken
mark and `speak` leaves `BREATH_PAUSE_MS / rate` of silence there, so the pupil finishes writing
the word before hearing "virgule". `onEnd` fires after the last piece, and a module-level
generation counter — bumped by `cancelSpeech()` and by the next `speak()` — makes every callback
still in flight (an `onend`, a pending pause, a native promise) return instead of speaking the
rest. Any new exit path from a reading must bump it too, or a stale chain will talk over the next.

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
