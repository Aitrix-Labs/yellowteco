# Yellowteco

Exact visual clone of [yellow.ai](https://yellow.ai/), rebranded to **Yellowteco**. React SPA (Vite + React Router) that injects the transformed yellow.ai markup.

## Setup

```bash
npm install
npm run fetch   # download CSS/JS/fonts/media from yellow.ai (first time)
npm run dev     # http://localhost:5191/yellowteco/
```

## Build

```bash
npm run build
npm run preview # http://127.0.0.1:4173/yellowteco/
```

Output lands in `dist/` with base path `/yellowteco/` (GitHub Pages style).
