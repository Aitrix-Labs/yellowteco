import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const assetsDir = path.join(root, 'public', 'assets')
const outDir = path.join(root, 'site')
const base = '/yellowteco'

fs.mkdirSync(outDir, { recursive: true })
fs.mkdirSync(path.join(outDir, 'assets'), { recursive: true })

const map = JSON.parse(fs.readFileSync(path.join(assetsDir, 'asset-map.json'), 'utf8'))

// Ensure wordmarks + fonts are in assets
for (const extra of [
  'yellowteco-logo.svg',
  'yellowteco-logo-dark.svg',
  'founders-grotesk-bold.woff2',
  'founders-grotesk-light.woff2',
  'founders-grotesk-semibold.woff2',
  'founders-grotesk-medium.woff2',
  'founders-grotesk-regular.woff2',
]) {
  const src = path.join(assetsDir, extra)
  if (fs.existsSync(src)) {
    /* keep */
  }
}

for (const file of fs.readdirSync(assetsDir)) {
  if (file === '_raw.html' || file === 'asset-map.json') continue
  // Skip accidental HTML page dumps that aren't real assets
  const full = path.join(assetsDir, file)
  const ext = path.extname(file).toLowerCase()
  if (!ext || ext === '.bin') {
    const head = fs.readFileSync(full).subarray(0, 64).toString('utf8')
    if (/<!DOCTYPE|<html/i.test(head)) continue
  }
  fs.copyFileSync(full, path.join(outDir, 'assets', file))
}

let html = fs.readFileSync(path.join(assetsDir, '_raw.html'), 'utf8')

html = html
  .replace(/<!-- Google Tag Manager -->[\s\S]*?<!-- End Google Tag Manager -->/gi, '')
  .replace(/<!-- Google Tag Manager \(noscript\) -->[\s\S]*?<!-- End Google Tag Manager \(noscript\) -->/gi, '')
  .replace(/<script[^>]*googletagmanager[^>]*>[\s\S]*?<\/script>/gi, '')
  .replace(/<script[^>]*gtag\/js[^>]*><\/script>/gi, '')
  .replace(/<script[^>]*google-analytics[^>]*>[\s\S]*?<\/script>/gi, '')
  .replace(/<script[^>]*hotjar[^>]*>[\s\S]*?<\/script>/gi, '')
  .replace(/<script[^>]*clarity[^>]*>[\s\S]*?<\/script>/gi, '')
  .replace(/<script[^>]*facebook\.net[^>]*>[\s\S]*?<\/script>/gi, '')
  .replace(/<script[^>]*connect\.facebook[^>]*>[\s\S]*?<\/script>/gi, '')
  .replace(/<script[^>]*linkedin\.com[^>]*>[\s\S]*?<\/script>/gi, '')
  .replace(/<script[^>]*doubleclick[^>]*>[\s\S]*?<\/script>/gi, '')
  .replace(/<script[^>]*googleadservices[^>]*>[\s\S]*?<\/script>/gi, '')
  .replace(/<script[^>]*cdn\.yellowmessenger\.com\/plugin\/widget[^>]*><\/script>/gi, '')
  .replace(/<noscript>[\s\S]*?<\/noscript>/gi, '')
  .replace(/<iframe[^>]*(googletagmanager|doubleclick|facebook)[^>]*>[\s\S]*?<\/iframe>/gi, '')

function resolveLocal(urlLike) {
  try {
    const abs = urlLike.startsWith('http')
      ? urlLike
      : urlLike.startsWith('//')
        ? 'https:' + urlLike
        : 'https://yellow.ai' + (urlLike.startsWith('/') ? urlLike : '/' + urlLike)
    const u = new URL(abs.replace(/&amp;/g, '&').replace(/&#038;/g, '&'))
    const clean = u.origin + u.pathname
    return map[clean] || null
  } catch {
    return null
  }
}

// Replace any yellow.ai / cdn.yellowmessenger absolute URL (with optional query)
html = html.replace(
  /https?:\/\/(?:www\.)?(?:yellow\.ai|cdn\.yellowmessenger\.com)[^"'\\\s)>]*/gi,
  (url) => {
    const cleaned = url.replace(/&amp;/g, '&').replace(/&#038;/g, '&').replace(/[),;]+$/, '')
    const local = resolveLocal(cleaned)
    if (!local) return url.includes('/wp-') || url.includes('.webp') || url.includes('.css') || url.includes('.js') || url.includes('.mp4') || url.includes('.webm') || url.includes('.woff') || url.includes('.svg') || url.includes('.png') || url.includes('.ico')
      ? url
      : `${base}/`
    return `./assets/${local}`
  },
)

// Relative theme paths
html = html.replace(/(["'])(\/wp-(?:content|includes)\/[^"']+)\1/g, (full, q, p) => {
  const local = resolveLocal(p)
  return local ? `${q}./assets/${local}${q}` : full
})

// Brand renames (after asset rewrite so paths stay intact)
const brandPairs = [
  [/Yellow\.ai/g, 'Yellowteco'],
  [/Yellow\.AI/g, 'Yellowteco'],
  [/YELLOW\.AI/g, 'YELLOWTECO'],
  [/Yellowai/g, 'Yellowteco'],
  [/YellowAI/g, 'Yellowteco'],
  [/yellow\.ai/g, 'yellowteco'],
  [/yellowai/g, 'yellowteco'],
]

for (const [re, to] of brandPairs) html = html.replace(re, to)

// Swap logo images for Yellowteco wordmarks
const logoLight = './assets/yellowteco-logo.svg'
const logoDark = './assets/yellowteco-logo-dark.svg'
html = html.replace(
  /src="\.\/assets\/yellow-logo-25-[^"]+"(\s+alt="[^"]*")?/g,
  `src="${logoDark}" alt="yellowteco"`,
)
html = html.replace(
  /src="\.\/assets\/yellow-logo-dark-[^"]+"(\s+alt="[^"]*")?/g,
  `src="${logoLight}" alt="yellowteco"`,
)
html = html.replace(
  /src="\.\/assets\/yellow-logo-[^"]+"(\s+alt="[^"]*")?/g,
  `src="${logoLight}" alt="yellowteco"`,
)
html = html.replace(
  /src="\.\/assets\/footer-logo-new-[^"]+"(\s+alt="[^"]*")?/g,
  `src="${logoLight}" alt="yellowteco"`,
)

html = html.replace(/<title>[^<]*<\/title>/i, '<title>AI Agents for CX and EX Automation - Yellowteco</title>')

// Ensure full theme stylesheet is present (critical CSS is inlined; screen.min completes layout)
if (!html.includes('screen.min')) {
  const screenLocal = map['https://yellow.ai/wp-content/themes/yellow.ai/css/screen.min.css']
  if (screenLocal) {
    html = html.replace(
      /<\/head>/i,
      `<link rel="stylesheet" href="./assets/${screenLocal}" id="yellowteco-screen-css">\n</head>`,
    )
  }
}

if (!html.includes('<base ')) {
  html = html.replace(/<head[^>]*>/i, (h) => `${h}\n<base href="${base}/">`)
}

// Keep relative ./assets/* so Vite can rewrite with base; scripts stay classic (non-module)

const overrides = `
<style id="yellowteco-overrides">
  #ymPluginDivContainerInitial,
  .ym-hide-body,
  iframe[src*="yellowmessenger"],
  iframe[src*="yellowteco.local"] { display: none !important; }
  html { scroll-behavior: smooth; }
  .desktop-logo, .desktop-logo-dark, .mobile-logo, .logo img, footer .logo img {
    height: 33px !important;
    width: auto !important;
    max-width: 220px;
    object-fit: contain;
  }
  .mobile-logo { height: 22px !important; }
  img, video { max-width: 100%; }
</style>
<script>
  document.documentElement.classList.add('js');
  document.addEventListener('DOMContentLoaded', function () {
    var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    var n;
    while ((n = walker.nextNode())) {
      if (n.nodeValue && /yellow\\.ai|Yellow\\.ai|Yellowai/i.test(n.nodeValue)) {
        n.nodeValue = n.nodeValue
          .replace(/Yellow\\.ai/g, 'Yellowteco')
          .replace(/Yellowai/g, 'Yellowteco')
          .replace(/yellow\\.ai/g, 'yellowteco');
      }
    }
  });
</script>
`
html = html.replace(/<\/head>/i, overrides + '</head>')

fs.writeFileSync(path.join(outDir, 'index.html'), html)
fs.writeFileSync(path.join(outDir, '404.html'), html)

console.log('Wrote site/index.html (' + html.length + ' bytes)')
