# Dictadapt

**Outil d'aide à la dictée pour les élèves en difficulté.** Fait partie de l'environnement
gratuit [dysadapt](https://dysadapt.com).

Une dictée de classe impose un rythme unique : l'élève dys décroche dès la première partie
manquée et ne rattrape plus jamais le train. Dictadapt lui rend le rythme.

1. L'enseignant **photographie** l'exercice.
2. Le texte est **reconnu sur l'appareil** (OCR), puis **vérifié et corrigé** par l'enseignant.
3. Il est **découpé en petites parties** — deux à quatre mots, jusqu'à la virgule ou au point.
4. L'élève voit une série de **gros boutons « Partie 1, Partie 2… »** et **écoute chaque partie
   autant de fois qu'il veut**. Le bouton **change de couleur** une fois écouté, pour qu'il sache
   toujours où il en est.

Le texte n'est **jamais affiché** à l'élève : c'est une dictée, il écoute et il écrit.

## Ce qui est garanti

- **Aucune connexion internet.** OCR, synthèse vocale, polices : tout est embarqué. Une fois
  l'application ouverte une première fois, elle fonctionne en mode avion, définitivement.
- **Aucun compte, aucun serveur.** Photos, textes et dictées restent sur l'appareil. Rien n'est
  envoyé nulle part — il n'y a pas de backend.
- **Aucune IA.** Un texte de dictée imprimé se reconnaît très bien avec Tesseract ; le découpage
  suit les règles de la ponctuation française.

## Installer

### Sur le web (PWA)

Ouvrez l'application dans le navigateur, puis « Ajouter à l'écran d'accueil » (Android) ou
« Sur l'écran d'accueil » (iOS). Elle s'installe comme une application et fonctionne hors ligne.

### Sur Android (APK, sans passer par le store)

Un APK est publié en pièce jointe de chaque [release](../../releases), et à chaque exécution du
workflow **APK Android** (onglet Actions → artefact `dictadapt-apk`).

Sur le téléphone ou la tablette : autoriser l'installation depuis cette source, puis ouvrir le
fichier `.apk`.

## Transmettre une dictée à l'élève

Deux façons, toutes les deux hors ligne :

- **Même appareil** — préparez la dictée, puis « Donner à l'élève ». L'écran se verrouille en mode
  élève : pour en sortir il faut garder le cadenas appuyé deux secondes, plus un code à quatre
  chiffres si vous en avez défini un dans les réglages.
- **QR code** — « Partager par QR » sur votre appareil, « Recevoir un QR code » sur celui de
  l'élève. Un texte long tient sur plusieurs codes, affichés à la suite ; l'application indique
  ceux qui manquent encore. La photo n'est jamais transmise.

## Développer

```bash
npm install
npm run dev          # http://localhost:5173
npm run lint
npm test
npm run build        # bundle statique dans dist/
npm run preview      # sert dist/, pour tester le hors-ligne
```

L'application est **statique et entièrement cliente** : `dist/` se dépose tel quel sur n'importe
quel hébergeur. `VITE_BASE` permet de servir depuis un sous-chemin (le workflow GitHub Pages
l'utilise).

### Avec Docker

Le `Dockerfile` construit le bundle et le sert avec nginx — c'est ainsi que la pile DysAdapt
publie Dictadapt sur `dysadapt.com/dictee/` :

```bash
docker build --build-arg VITE_BASE=/dictee/ -t dictadapt .
docker run --rm -p 8081:8081 dictadapt   # http://localhost:8081
```

`VITE_BASE` est un argument de **construction** : Vite l'inscrit dans le bundle (URLs des
ressources, `scope` du service worker, `start_url` du manifeste). Il doit correspondre au chemin
servi par le proxy, sinon l'application se charge hors de la portée de son service worker et ne
fonctionne plus hors ligne. `DICTEE_PORT` (défaut `8081`) est lui un argument d'exécution.

En pratique on ne lance pas cette image seule : le service `dictee` de
[`docker-compose.yml`](https://github.com/MarineChap/dysadapt) de DysAdapt la construit depuis un
clone voisin de ce dépôt.

### Android

```bash
npm run cap:sync     # build + copie dans android/
npm run cap:android  # ouvre Android Studio
```

Signer une release nécessite quatre secrets de dépôt : `ANDROID_KEYSTORE_BASE64`,
`ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`. Sans eux, le workflow
produit un APK de debug, installable de la même façon.

> L'APK déclare la permission `INTERNET` parce que Capacitor sert les fichiers de l'application
> depuis un serveur local dans la WebView. L'application elle-même n'émet aucune requête réseau.

## Choix techniques

| | |
|---|---|
| Base | Vite 7 · React 19 · TypeScript · Tailwind v4 |
| Hors ligne | `vite-plugin-pwa` (Workbox), tout est précaché (~10 Mo) |
| OCR | `tesseract.js` 6, modèle français `best_int`, worker et WASM servis localement |
| Voix | `speechSynthesis` sur le web, TTS système via Capacitor sur Android |
| Stockage | IndexedDB (dictées, photos, progression) et localStorage (préférences) |
| Partage | QR code — JSON compact, `deflate`, base64url, découpé si besoin |
| Android | Capacitor 7, `fr.dysadapt.dictadapt` |

Le design reprend **à l'identique** le système de DysAdapt : mêmes variables de couleur, même
palette sombre « Soft Amethyst », même correctif de contraste WCAG AA, mêmes rayons, mêmes
polices d'accessibilité (Andika, Marelle, OpenDyslexic, Luciole — toutes auto-hébergées).

## Feuille de route

Prévu pour une prochaine version :

- **Réglages d'accessibilité** — choix de la police parmi les quatre déjà embarquées, taille
  14–32 px, interligne, interlettrage. La v1 est fixée sur Andika en 20 px, interligne 1,8.
- **Auto-correction** — l'élève révèle le texte partie par partie une fois la dictée terminée
  (le réglage « Autoriser l'auto-correction » est déjà enregistré par dictée).
- **Enregistrement de la voix de l'enseignant** — une prise de son par partie, pour les appareils
  sans voix française installée, et parce qu'entendre sa maîtresse rassure un enfant.

## Licence

Les polices embarquées sont sous licence SIL Open Font License : Geist, Andika, OpenDyslexic,
Marelle et Luciole. Le modèle de langue Tesseract est sous licence Apache 2.0.
