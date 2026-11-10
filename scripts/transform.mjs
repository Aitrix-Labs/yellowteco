import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const assetsDir = path.join(root, 'public', 'assets')
const outDir = path.join(root, 'site')
const base = '/yellowteco'

const localRoutes = new Set(['pricing', 'investors', 'request-demo'])

const pages = [
  {
    raw: '_raw.html',
    out: 'index.html',
    title: 'AI Agents for CX and EX Automation - Yellowteco',
    home: true,
    darkHero: false,
  },
  {
    raw: '_raw-pricing.html',
    out: path.join('pricing', 'index.html'),
    title: 'Pricing - Yellowteco',
    darkHero: true,
  },
  {
    raw: '_raw-investors.html',
    out: path.join('investors', 'index.html'),
    title: 'Investors - Yellowteco',
    darkHero: true,
  },
  {
    raw: '_raw-request-demo.html',
    out: path.join('request-demo', 'index.html'),
    title: 'Request a Demo - Yellowteco',
    darkHero: true,
  },
]

fs.mkdirSync(outDir, { recursive: true })
fs.mkdirSync(path.join(outDir, 'assets'), { recursive: true })

const map = JSON.parse(fs.readFileSync(path.join(assetsDir, 'asset-map.json'), 'utf8'))

for (const file of fs.readdirSync(assetsDir)) {
  if (file.startsWith('_raw') || file === 'asset-map.json') continue
  const full = path.join(assetsDir, file)
  const ext = path.extname(file).toLowerCase()
  if (!ext || ext === '.bin') {
    const head = fs.readFileSync(full).subarray(0, 64).toString('utf8')
    if (/<!DOCTYPE|<html/i.test(head)) continue
  }
  fs.copyFileSync(full, path.join(outDir, 'assets', file))
}

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

function isAssetLike(pathname) {
  return /\/wp-(?:content|includes)\//.test(pathname) ||
    /\.(?:webp|png|jpe?g|gif|svg|ico|css|js|mjs|mp4|webm|woff2?|ttf|eot|json|map)(?:$|\?)/i.test(pathname)
}

function rewriteYellowUrl(url) {
  const cleaned = url.replace(/&amp;/g, '&').replace(/&#038;/g, '&').replace(/[),;]+$/, '')

  try {
    const abs = cleaned.startsWith('http')
      ? cleaned
      : cleaned.startsWith('//')
        ? 'https:' + cleaned
        : 'https://yellow.ai' + (cleaned.startsWith('/') ? cleaned : '/' + cleaned)
    const u = new URL(abs)
    const isYellowHost =
      /(?:^|\.)yellow\.ai$/i.test(u.hostname) || /yellowmessenger\.com$/i.test(u.hostname)
    if (!isYellowHost) return url

    // Site routes first — asset-map also stores HTML page dumps as .bin
    if (!isAssetLike(u.pathname)) {
      const parts = u.pathname.replace(/\/+$/, '').split('/').filter(Boolean)
      if (parts.length === 0) return `${base}/`
      if (parts.length === 1 && localRoutes.has(parts[0])) return `${base}/${parts[0]}/`
      return `${base}/`
    }

    const local = resolveLocal(cleaned)
    if (local && !local.endsWith('.bin')) return `./assets/${local}`
    return url
  } catch {
    return `${base}/`
  }
}

function transformHtml(html, title) {
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
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, (block) => {
      if (/YellowMessenger|ymConfig|yellowmessenger\.com\/plugin\/widget|interactlabs\.ai/i.test(block)) {
        return ''
      }
      return block
    })
    .replace(/<noscript>[\s\S]*?<\/noscript>/gi, '')
    .replace(/<iframe[^>]*(googletagmanager|doubleclick|facebook|interactlabs|yellowmessenger)[^>]*>[\s\S]*?<\/iframe>/gi, '')

  // Absolute yellow.ai / messenger URLs → local assets or site routes
  html = html.replace(
    /https?:\/\/(?:www\.)?(?:yellow\.ai|cdn\.yellowmessenger\.com)[^"'\\\s)>]*/gi,
    rewriteYellowUrl,
  )

  // Root-absolute theme paths
  html = html.replace(/(["'])(\/wp-(?:content|includes)\/[^"']+)\1/g, (full, q, p) => {
    const local = resolveLocal(p)
    return local ? `${q}./assets/${local}${q}` : full
  })

  // Root-absolute site routes (not assets, not already prefixed)
  html = html.replace(
    /\b(href|src|action)=["']\/(?!\/|yellowteco\/|wp-)([^"']*)["']/gi,
    (full, attr, p) => {
      const clean = p.replace(/^\/+|\/+$/g, '')
      if (!clean) return `${attr}="${base}/"`
      const first = clean.split('/')[0]
      if (localRoutes.has(first)) return `${attr}="${base}/${first}/"`
      return `${attr}="${base}/"`
    },
  )

  // Display brand only (avoid mangling leftover asset hostnames)
  const brandPairs = [
    [/Yellow\.ai/g, 'Yellowteco'],
    [/Yellow\.AI/g, 'Yellowteco'],
    [/YELLOW\.AI/g, 'YELLOWTECO'],
    [/Yellowai/g, 'Yellowteco'],
    [/YellowAI/g, 'Yellowteco'],
  ]
  for (const [re, to] of brandPairs) html = html.replace(re, to)

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

  html = html.replace(/<title>[^<]*<\/title>/i, `<title>${title}</title>`)

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
  } else {
    html = html.replace(/<base\s+href=["'][^"']*["']\s*\/?>/i, `<base href="${base}/">`)
  }

  const overrides = `
<style id="yellowteco-overrides">
  #ymPluginDivContainerInitial,
  .ym-hide-body,
  iframe[src*="yellowmessenger"],
  iframe[src*="yellowteco.local"],
  .top-header-slider,
  .single-header-slider,
  [id*="ymPlugin"],
  [id*="ymFrame"],
  .ym-iframe,
  .ym-outer,
  .chat-bubble,
  .agent-alex,
  .il-launcher,
  [class*="il-launcher"],
  [class*="il-widget"],
  [id*="interactlabs"],
  div[class*="interactlabs"],
  iframe[src*="interactlabs"],
  iframe[src*="script.interactlabs"] { display: none !important; visibility: hidden !important; pointer-events: none !important; }
  html { scroll-behavior: smooth; }
  html, body { padding-top: 0 !important; margin-top: 0 !important; }
  body.hellobar-classname,
  body.admin-bar { padding-top: 0 !important; }
  .desktop-logo, .desktop-logo-dark, .mobile-logo, .logo img, footer .logo img {
    height: 33px !important;
    width: auto !important;
    max-width: 220px;
    object-fit: contain;
  }
  .mobile-logo { height: 22px !important; }
  img, video { max-width: 100%; height: auto; }

  /* Pricing page: purple hero + compact Free / Enterprise cards */
  .pricing-ai-chatbot .sec-1 .wp-block-group__inner-container {
    padding: 8.75rem 1.25rem 3.25rem !important;
  }
  body.yt-dark-hero.pricing-ai-chatbot .sec-1 {
    background: linear-gradient(180deg, #29165e 0%, #3b1f8e 55%, #5c42fc 100%) !important;
  }
  body.yt-dark-hero.pricing-ai-chatbot .sec-1 h1 {
    color: #fff !important;
    max-width: 36rem !important;
    margin: 0 auto 1rem !important;
    font-size: clamp(2rem, 4vw, 3rem) !important;
    line-height: 1.15 !important;
    text-align: center !important;
  }
  body.yt-dark-hero.pricing-ai-chatbot .sec-1 p {
    color: rgba(255,255,255,.88) !important;
    max-width: 34rem !important;
    margin: 0 auto !important;
    text-align: center !important;
  }
  body.yt-dark-hero.pricing-ai-chatbot .yt-plans {
    margin-top: -1.25rem;
  }
  .pricing-ai-chatbot .yt-plans {
    position: relative;
    z-index: 1;
    max-width: 920px;
    margin: 0 auto 3.5rem;
    padding: 0 1.25rem;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1.25rem;
  }
  @media (max-width: 720px) {
    .pricing-ai-chatbot .yt-plans { grid-template-columns: 1fr; }
  }
  .pricing-ai-chatbot .yt-plan {
    border-radius: 1.25rem;
    padding: 1.75rem 1.5rem 1.5rem;
    display: flex;
    flex-direction: column;
    min-height: 100%;
  }
  .pricing-ai-chatbot .yt-plan--free {
    background: #f4f2f8;
    border: 1px solid #e8e4f0;
    color: #111;
  }
  .pricing-ai-chatbot .yt-plan--enterprise {
    background: linear-gradient(160deg, #3b1f8e 0%, #5c42fc 100%);
    color: #fff;
    box-shadow: 0 18px 40px rgba(60, 35, 160, .28);
  }
  .pricing-ai-chatbot .yt-plan h2 {
    margin: 0 0 .35rem;
    font-size: 1.5rem;
    font-weight: 700;
    text-align: center;
    color: inherit !important;
  }
  .pricing-ai-chatbot .yt-plan .yt-plan-tag {
    text-align: center;
    opacity: .8;
    font-size: .9rem;
    margin: 0 0 1.1rem;
    color: inherit !important;
  }
  .pricing-ai-chatbot .yt-plan ul {
    list-style: none;
    margin: 0 0 1.5rem;
    padding: 0;
    display: grid;
    gap: .55rem;
    flex: 1;
  }
  .pricing-ai-chatbot .yt-plan li,
  .pricing-ai-chatbot .yt-plan li span,
  .pricing-ai-chatbot .yt-plan li strong {
    color: inherit !important;
  }
  .pricing-ai-chatbot .yt-plan li {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: .75rem;
    align-items: baseline;
    font-size: .95rem;
    line-height: 1.35;
    padding-bottom: .55rem;
    border-bottom: 1px solid rgba(0,0,0,.08);
  }
  .pricing-ai-chatbot .yt-plan--enterprise li {
    border-bottom-color: rgba(255,255,255,.18);
  }
  .pricing-ai-chatbot .yt-plan li strong {
    font-weight: 600;
    text-align: right;
    white-space: nowrap;
  }
  .pricing-ai-chatbot .yt-plan .yt-plan-cta {
    display: block;
    text-align: center;
    text-decoration: none;
    border-radius: 999px;
    padding: .8rem 1.25rem;
    font-weight: 600;
    font-size: .95rem;
  }
  .pricing-ai-chatbot .yt-plan--free .yt-plan-cta {
    background: #fff;
    color: #3b1f8e;
    border: 1px solid #d9d2ea;
  }
  .pricing-ai-chatbot .yt-plan--enterprise .yt-plan-cta {
    background: #fff;
    color: #3b1f8e;
  }
  .pricing-ai-chatbot .sec2a.sec2-pricing { display: none !important; }

  /* Non-sticky header */
  .new-header-main,
  .new-header-main.scroll,
  body.homeheader .new-header-main,
  body.yt-interior .new-header-main {
    position: relative !important;
    top: auto !important;
    left: auto !important;
    transform: none !important;
  }
  body.yt-dark-hero,
  body.homeheader.homepage-2025 { position: relative; }
  .menu-overlay { z-index: 100 !important; }
  body.yt-dark-hero .new-header-main,
  body.homeheader.homepage-2025 .new-header-main,
  .new-header-main {
    position: absolute !important;
    top: 0 !important;
    left: 0 !important;
    width: 100% !important;
    z-index: 110 !important;
  }
  /* Kill the default 2.25rem top gap on every page */
  .new-header-main .header-container,
  body.yt-dark-hero .new-header-main .header-container,
  body.homeheader.homepage-2025 .new-header-main .header-container,
  body.yt-interior .new-header-main .header-container {
    margin-top: 0.75rem !important;
  }
  body.yt-dark-hero .new-header-main .header-container,
  body.homeheader.homepage-2025 .new-header-main .header-container {
    background: rgba(12, 12, 16, 0.42) !important;
    border: 1px solid rgba(255, 255, 255, 0.2) !important;
    backdrop-filter: blur(18px) saturate(1.25);
    -webkit-backdrop-filter: blur(18px) saturate(1.25);
    box-shadow: 0 8px 28px rgba(0, 0, 0, 0.22);
  }

  /* Desktop: logo | center nav | CTAs */
  @media (min-width: 1024px) {
    .new-header-main .header-container {
      display: flex !important;
      align-items: center !important;
      justify-content: space-between !important;
      gap: 1.25rem !important;
    }
    .new-header-main .header-container > .logo-div {
      order: 0 !important;
      flex: 0 0 auto !important;
      width: auto !important;
      max-width: 8.6875rem !important;
      position: relative !important;
    }
    .new-header-main .menu-section,
    .new-header-main .header-container > .menu-section {
      order: 1 !important;
      flex: 1 1 auto !important;
      width: auto !important;
      max-width: none !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      gap: 1.5rem !important;
      visibility: visible !important;
      opacity: 1 !important;
      position: static !important;
      max-height: none !important;
      overflow: visible !important;
      background: transparent !important;
      pointer-events: auto !important;
    }
    .new-header-main .menu-section > .menu-single,
    .new-header-main .menu-section > a.menu-single-link:not(.menu-single-link-mobile) {
      display: flex !important;
      visibility: visible !important;
      opacity: 1 !important;
      flex: 0 0 auto !important;
    }
    .new-header-main .menu-section > a.menu-single-link-mobile {
      display: none !important;
    }
    .new-header-main .header-container > .button-div {
      order: 2 !important;
      display: flex !important;
      flex: 0 0 auto !important;
      align-items: center !important;
      justify-content: flex-end !important;
      gap: 0.75rem !important;
      width: auto !important;
      max-width: none !important;
      min-width: 0 !important;
      margin-left: auto !important;
    }
    .new-header-main .header-container > .button-div > .button {
      flex: 0 0 auto !important;
      white-space: nowrap !important;
    }
    .new-header-main .header-container > .mobile-only.hamburger {
      display: none !important;
    }
    .menu-overlay { display: none !important; }
    body.yt-dark-hero .menu-single > p,
    body.yt-dark-hero .menu-single-link > p,
    body.homeheader.homepage-2025 .menu-single > p,
    body.homeheader.homepage-2025 .menu-single-link > p {
      color: #fff !important;
    }
    body.yt-dark-hero .light-arrow,
    body.homeheader.homepage-2025 .light-arrow { opacity: 1 !important; display: inline-block !important; }
    body.yt-dark-hero .dark-arrow,
    body.homeheader.homepage-2025 .dark-arrow { opacity: 0 !important; }
  }

  body.yt-dark-hero .desktop-logo,
  body.homeheader.homepage-2025 .desktop-logo { opacity: 1 !important; }
  body.yt-dark-hero .desktop-logo-dark,
  body.homeheader.homepage-2025 .desktop-logo-dark { opacity: 0 !important; }
  body.yt-dark-hero #header-try-free.white-bordered,
  body.yt-dark-hero .button.white-bordered,
  body.homeheader.homepage-2025 #header-try-free.white-bordered,
  body.homeheader.homepage-2025 .button.white-bordered {
    color: #fff !important;
    border-color: rgba(255, 255, 255, 0.85) !important;
    background: transparent !important;
  }
  body.yt-dark-hero #header-request-demo.button.white,
  body.yt-dark-hero .button.white.new-book-a-demo-nav,
  body.homeheader.homepage-2025 #header-request-demo.button.white,
  body.homeheader.homepage-2025 .button.white.new-book-a-demo-nav {
    color: #111 !important;
    background: #fff !important;
    border-color: #fff !important;
  }

  /* Mobile header + accordion menu */
  @media (max-width: 1023px) {
    .new-header-main,
    body.yt-dark-hero .new-header-main,
    body.homeheader.homepage-2025 .new-header-main {
      background: transparent !important;
    }
    .new-header-main .header-container,
    body.yt-dark-hero .new-header-main .header-container,
    body.homeheader.homepage-2025 .new-header-main .header-container {
      width: calc(100% - 1.25rem) !important;
      max-width: 100% !important;
      margin: 0.75rem auto 0 !important;
      padding: 0.55rem 0.75rem !important;
      border-radius: 999px !important;
      display: flex !important;
      align-items: center !important;
      justify-content: flex-start !important;
      gap: 0.5rem !important;
      box-sizing: border-box !important;
      overflow: visible !important;
    }
    body.yt-dark-hero .new-header-main .header-container,
    body.homeheader.homepage-2025 .new-header-main .header-container {
      background: rgba(12, 12, 16, 0.55) !important;
      border: 1px solid rgba(255, 255, 255, 0.18) !important;
    }
    header.new-header-main .header-container > .logo-div,
    .new-header-main .header-container > .logo-div {
      flex: 1 1 auto !important;
      width: auto !important;
      max-width: none !important;
      min-width: 0 !important;
      position: relative !important;
      order: 0 !important;
    }
    header.new-header-main .header-container > .logo-div .logo,
    header.new-header-main .header-container > .logo-div .mobile-logo,
    .new-header-main .header-container > .logo-div .logo,
    .new-header-main .header-container > .logo-div .mobile-logo {
      position: relative !important;
      left: auto !important;
      right: auto !important;
      transform: none !important;
    }
    header.new-header-main .header-container > .button-div,
    .new-header-main .header-container > .button-div,
    .header-container > .button-div {
      display: none !important;
    }
    header.new-header-main .header-container > .mobile-only.hamburger,
    .new-header-main .header-container > .mobile-only.hamburger,
    .header-container > .mobile-only.hamburger {
      flex: 0 0 40px !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      width: 40px !important;
      height: 40px !important;
      min-width: 40px !important;
      margin: 0 0 0 auto !important;
      order: 2 !important;
      position: relative !important;
      cursor: pointer;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.12) !important;
    }
    .new-header-main .hamburger .line,
    .new-header-main .hamburger .line:before,
    .new-header-main .hamburger .line:after {
      content: '' !important;
      display: block !important;
      position: absolute !important;
      left: 50% !important;
      width: 18px !important;
      height: 2px !important;
      margin: 0 !important;
      border-radius: 2px !important;
      background: #fff !important;
      background-color: #fff !important;
      transform: translateX(-50%) !important;
      transition: transform .22s ease, opacity .18s ease, top .22s ease !important;
      box-shadow: none !important;
      opacity: 1 !important;
    }
    .new-header-main .hamburger .line {
      top: 50% !important;
      margin-top: -1px !important;
    }
    .new-header-main .hamburger .line:before { top: -6px !important; }
    .new-header-main .hamburger .line:after { top: 6px !important; }
    .new-header-main .hamburger.active .line {
      background: transparent !important;
      background-color: transparent !important;
    }
    .new-header-main .hamburger.active .line:before {
      top: 0 !important;
      transform: translateX(-50%) rotate(45deg) !important;
      background: #fff !important;
    }
    .new-header-main .hamburger.active .line:after {
      top: 0 !important;
      transform: translateX(-50%) rotate(-45deg) !important;
      background: #fff !important;
    }
    body.yt-dark-hero .menu-section,
    body.homeheader.homepage-2025 .menu-section,
    .new-header-main .menu-section {
      background: #fff !important;
      color: #111 !important;
      pointer-events: auto !important;
      z-index: 2 !important;
      max-height: min(75vh, 36rem);
      overflow-y: auto !important;
      -webkit-overflow-scrolling: touch;
    }
    .new-header-main .menu-section .menu-single,
    .new-header-main .menu-section a.menu-single-link {
      pointer-events: auto !important;
      cursor: pointer !important;
      position: relative;
      z-index: 1;
    }
    body.yt-dark-hero .menu-section .menu-single > p,
    body.yt-dark-hero .menu-section .menu-single-link > p,
    body.homeheader.homepage-2025 .menu-section .menu-single > p,
    body.homeheader.homepage-2025 .menu-section .menu-single-link > p,
    .new-header-main .menu-section .menu-single > p,
    .new-header-main .menu-section a.menu-single-link > p {
      color: #111 !important;
      opacity: 1 !important;
      visibility: visible !important;
    }
    body.yt-dark-hero .menu-section .dark-arrow,
    body.homeheader.homepage-2025 .menu-section .dark-arrow,
    .new-header-main .menu-section .dark-arrow {
      opacity: 1 !important;
      display: inline-block !important;
    }
    body.yt-dark-hero .menu-section .light-arrow,
    body.homeheader.homepage-2025 .menu-section .light-arrow,
    .new-header-main .menu-section .light-arrow {
      opacity: 0 !important;
      display: none !important;
    }
    .new-header-main .menu-single-content {
      position: static !important;
      pointer-events: auto !important;
      width: 100% !important;
      left: auto !important;
      top: auto !important;
    }
    .new-header-main .menu-single-content .menu-single-content-flex,
    .new-header-main .menu-single-content .wp-block-columns {
      display: flex !important;
      flex-direction: column !important;
      width: 100% !important;
      max-width: 100% !important;
    }
    .new-header-main .menu-single-content .wp-block-column,
    .new-header-main .menu-single-content .wp-block-column.w182,
    .new-header-main .menu-single-content .wp-block-column.w389,
    .new-header-main .menu-single-content .wp-block-column.w732 {
      flex-basis: 100% !important;
      width: 100% !important;
      max-width: 100% !important;
    }
    .new-header-main .menu-single-content .menu-single-content-wrap {
      width: 100% !important;
      max-width: 100% !important;
      padding: 0.75rem 0.25rem 1rem !important;
      box-shadow: none !important;
      border-radius: 0 !important;
      background: transparent !important;
    }
    .new-header-main .menu-single-content a {
      pointer-events: auto !important;
      color: #111 !important;
    }
    .new-header-main .menu-single-content .title,
    .new-header-main .menu-single-content .content,
    .new-header-main .menu-single-content .description,
    .new-header-main .menu-single-content p {
      color: #111 !important;
    }
    .mobile-logo {
      height: 20px !important;
      width: auto !important;
      max-width: 118px !important;
    }
  }
</style>
<script>
  document.documentElement.classList.add('js');
  document.addEventListener('DOMContentLoaded', function () {
    var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    var n;
    while ((n = walker.nextNode())) {
      if (n.nodeValue && /yellow\\.ai|Yellow\\.ai|Yellowai|yellowai/i.test(n.nodeValue)) {
        n.nodeValue = n.nodeValue
          .replace(/Yellow\\.ai/g, 'Yellowteco')
          .replace(/Yellowai/g, 'Yellowteco')
          .replace(/yellow\\.ai/g, 'yellowteco')
          .replace(/yellowai/g, 'yellowteco');
      }
    }

    // Mobile accordion clicks stay clickable; restore desktop nav on resize.
    (function setupMobileMenuClicks() {
      var section = document.querySelector('.new-header-main .menu-section');
      if (!section) return;

      section.querySelectorAll('.menu-single, a.menu-single-link').forEach(function (item) {
        item.addEventListener('click', function (e) {
          e.stopPropagation();
        });
      });

      function restoreDesktopNav() {
        if (window.innerWidth < 1024) return;
        var $ = window.jQuery;
        if ($) {
          $('.menu-section').stop(true, true).css({ display: '', visibility: '', opacity: '' }).show();
          $('.menu-overlay').stop(true, true).hide().css('display', '');
          $('.hamburger').removeClass('active');
          $('.menu-single').removeClass('active').css('display', '');
          $('.menu-single-content').stop(true, true).hide();
          $('a.menu-single-link-mobile').css('display', '');
        } else {
          section.style.display = '';
          section.querySelectorAll('.menu-single').forEach(function (el) {
            el.classList.remove('active');
            el.style.display = '';
          });
          section.querySelectorAll('a.menu-single-link:not(.menu-single-link-mobile)').forEach(function (el) {
            el.style.display = '';
          });
          section.querySelectorAll('a.menu-single-link-mobile').forEach(function (el) {
            el.style.display = '';
          });
          section.querySelectorAll('.menu-single-content').forEach(function (panel) {
            panel.style.display = 'none';
          });
          var overlay = document.querySelector('.menu-overlay');
          if (overlay) overlay.style.display = 'none';
          var ham = document.querySelector('.hamburger');
          if (ham) ham.classList.remove('active');
        }
      }

      restoreDesktopNav();
      window.addEventListener('resize', restoreDesktopNav);
    })();
  });
</script>
`
  html = html.replace(/<\/head>/i, overrides + '</head>')
  return html
}

const compactPlansHtml = `
<section class="yt-plans" aria-label="Pricing plans">
  <article class="yt-plan yt-plan--free">
    <h2>Free</h2>
    <p class="yt-plan-tag">Start building today</p>
    <ul>
      <li><span>AI Agents</span><strong>1</strong></li>
      <li><span>Chat sessions</span><strong>500 / mo</strong></li>
      <li><span>Channels</span><strong>Limited</strong></li>
      <li><span>Voice &amp; email agents</span><strong>Limited</strong></li>
      <li><span>Integrations</span><strong>Limited</strong></li>
      <li><span>Security</span><strong>Basic</strong></li>
    </ul>
    <a class="yt-plan-cta" href="${base}/request-demo/">Try for free</a>
  </article>
  <article class="yt-plan yt-plan--enterprise">
    <h2>Enterprise</h2>
    <p class="yt-plan-tag">Scale with full platform access</p>
    <ul>
      <li><span>AI Agents</span><strong>Unlimited</strong></li>
      <li><span>Chat sessions</span><strong>Unlimited</strong></li>
      <li><span>Channels</span><strong>35+</strong></li>
      <li><span>Voice &amp; email agents</span><strong>Unlimited</strong></li>
      <li><span>Integrations</span><strong>150+</strong></li>
      <li><span>Security</span><strong>SOC2 / GDPR / ISO</strong></li>
    </ul>
    <a class="yt-plan-cta" href="${base}/request-demo/">Contact us</a>
  </article>
</section>
`

function compactPricing(html) {
  html = html.replace(
    /Transparent\s*&amp;\s*Flexible Pricing Plans Tailored to Your Business Needs/i,
    'Flexible Pricing Plans',
  )
  html = html.replace(
    /Unlock enterprise-grade AI automation with flexible pricing built for your scale and objectives\./i,
    'Simple Free and Enterprise plans built for your scale.',
  )
  if (!html.includes('class="yt-plans"')) {
    html = html.replace(
      /(<\/section>\s*)(<div class="wp-block-group sec2a sec2-pricing")/i,
      `$1${compactPlansHtml}$2`,
    )
  }
  return html
}

function extractHeader(html) {
  const m = html.match(/<header[\s\S]*?<\/header>/i)
  return m ? m[0] : null
}

function extractFooter(html) {
  const m = html.match(/<footer[\s\S]*?<\/footer>/i)
  return m ? m[0] : null
}

function applyChrome(html, header, footer, { darkHero = false } = {}) {
  if (header) html = html.replace(/<header[\s\S]*?<\/header>/i, header)
  if (footer) html = html.replace(/<footer[\s\S]*?<\/footer>/i, footer)

  const prefix = darkHero ? 'yt-interior yt-dark-hero ' : 'yt-interior white-header '
  html = html.replace(/<body([^>]*)class="([^"]*)"/i, (_, attrs, cls) => {
    let next = cls
    if (darkHero) next = next.replace(/\bwhite-header\b/g, '')
    next = next.replace(/\s+/g, ' ').trim()
    return `<body${attrs}class="${prefix}${next}"`
  })
  if (!/class="/i.test(html.match(/<body[^>]*>/i)?.[0] || '')) {
    html = html.replace(/<body/i, `<body class="${prefix.trim()}"`)
  }
  return html
}

const homePage = pages.find((p) => p.home)
let homeHtml = transformHtml(
  fs.readFileSync(path.join(assetsDir, homePage.raw), 'utf8'),
  homePage.title,
)
const sharedHeader = extractHeader(homeHtml)
const sharedFooter = extractFooter(homeHtml)

let written = 0
for (const page of pages) {
  const rawPath = path.join(assetsDir, page.raw)
  if (!fs.existsSync(rawPath)) {
    console.warn('Missing', page.raw)
    continue
  }
  let html = page.home
    ? homeHtml
    : applyChrome(
        transformHtml(fs.readFileSync(rawPath, 'utf8'), page.title),
        sharedHeader,
        sharedFooter,
        { darkHero: !!page.darkHero },
      )

  if (String(page.out).includes('pricing')) html = compactPricing(html)

  // Logo swap again after chrome inject (header brings home logo paths)
  const logoLight = './assets/yellowteco-logo.svg'
  const logoDark = './assets/yellowteco-logo-dark.svg'
  html = html
    .replace(/src="\.\/assets\/yellow-logo-25-[^"]+"/g, `src="${logoDark}"`)
    .replace(/src="\.\/assets\/yellow-logo-dark-[^"]+"/g, `src="${logoLight}"`)
    .replace(/src="\.\/assets\/yellow-logo-[^"]+"/g, `src="${logoLight}"`)
    .replace(/src="\.\/assets\/footer-logo-new-[^"]+"/g, `src="${logoLight}"`)

  const outPath = path.join(outDir, page.out)
  fs.mkdirSync(path.dirname(outPath), { recursive: true })
  fs.writeFileSync(outPath, html)
  written++
  console.log('Wrote site/' + page.out.replace(/\\/g, '/') + ' (' + html.length + ' bytes)')
}

fs.copyFileSync(path.join(outDir, 'index.html'), path.join(outDir, '404.html'))
console.log('Wrote', written, 'pages + 404.html')
console.log('Shared header:', !!sharedHeader, 'footer:', !!sharedFooter)
