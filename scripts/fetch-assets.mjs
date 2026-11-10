import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import https from 'node:https'
import http from 'node:http'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const assetsDir = path.join(root, 'public', 'assets')
const rawPath = path.join(assetsDir, '_raw.html')

fs.mkdirSync(assetsDir, { recursive: true })

const mapPath = path.join(assetsDir, 'asset-map.json')
const map = fs.existsSync(mapPath) ? JSON.parse(fs.readFileSync(mapPath, 'utf8')) : {}

function sanitize(url) {
  try {
    const u = new URL(url)
    let name = path.basename(u.pathname)
    if (!name || name === '/' || !path.extname(name)) {
      name = `asset-${Buffer.from(u.pathname).toString('base64url').slice(0, 24)}.bin`
    }
    name = name.replace(/[^a-zA-Z0-9._-]/g, '_')
    // Keep uniqueness for same basename different paths
    const key = u.origin + u.pathname
    const hash = Buffer.from(key).toString('base64url').slice(0, 8)
    const ext = path.extname(name)
    const base = path.basename(name, ext)
    return `${base}-${hash}${ext}`
  } catch {
    return null
  }
}

function fetchBuffer(url, redirects = 0) {
  return new Promise((resolve, reject) => {
    if (redirects > 8) return reject(new Error('Too many redirects: ' + url))
    const lib = url.startsWith('https') ? https : http
    const req = lib.get(
      url,
      {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: '*/*',
        },
        timeout: 120000,
      },
      (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          const next = new URL(res.headers.location, url).href
          res.resume()
          return resolve(fetchBuffer(next, redirects + 1))
        }
        if (res.statusCode !== 200) {
          res.resume()
          return reject(new Error(`HTTP ${res.statusCode} for ${url}`))
        }
        const chunks = []
        res.on('data', (c) => chunks.push(c))
        res.on('end', () => resolve(Buffer.concat(chunks)))
        res.on('error', reject)
      },
    )
    req.on('error', reject)
    req.on('timeout', () => {
      req.destroy()
      reject(new Error('timeout ' + url))
    })
  })
}

function collectUrls(text) {
  const urls = new Set()
  const patterns = [
    /https?:\/\/(?:www\.)?yellow\.ai[^"'\\\s)>]+/gi,
    /https?:\/\/cdn\.yellowmessenger\.com[^"'\\\s)>]+/gi,
  ]
  for (const re of patterns) {
    let m
    while ((m = re.exec(text))) {
      let u = m[0]
        .replace(/&amp;/g, '&')
        .replace(/\\u0026/g, '&')
        .replace(/[),;]+$/, '')
      // strip trailing punctuation from CSS/url contexts
      u = u.replace(/['"]+$/, '')
      try {
        const parsed = new URL(u)
        parsed.hash = ''
        urls.add(parsed.href)
      } catch {
        /* ignore */
      }
    }
  }
  // relative theme/uploads
  const rel = /(?:src|href|content)=["'](\/wp-(?:content|includes)\/[^"']+)["']/gi
  let m
  while ((m = rel.exec(text))) {
    urls.add('https://yellow.ai' + m[1].replace(/&amp;/g, '&'))
  }
  const cssUrl = /url\((['"]?)(\/wp-(?:content|includes)\/[^'")]+)\1\)/gi
  while ((m = cssUrl.exec(text))) {
    urls.add('https://yellow.ai' + m[2].replace(/&amp;/g, '&'))
  }
  return [...urls]
}

function shouldSkip(url) {
  const skip = [
    'xmlrpc.php',
    'googleads',
    'doubleclick',
    'googletagmanager',
    'facebook.com',
    'linkedin.com',
    'hotjar',
    'segment',
    'sentry',
    'clarity',
    'gtag',
    'analytics',
    'wp-json',
    'plugin/widget-v2',
  ]
  return skip.some((s) => url.includes(s))
}

async function ensureAsset(url) {
  if (shouldSkip(url)) return null
  // Normalize query for caching key but keep useful cache-busters out of filename
  let parsed
  try {
    parsed = new URL(url)
  } catch {
    return null
  }
  const clean = parsed.origin + parsed.pathname
  if (map[clean]) {
    const existing = path.join(assetsDir, map[clean])
    if (fs.existsSync(existing)) return map[clean]
  }
  const filename = sanitize(clean)
  if (!filename) return null
  const dest = path.join(assetsDir, filename)
  if (!fs.existsSync(dest)) {
    process.stdout.write(`GET ${clean}\n`)
    try {
      const buf = await fetchBuffer(url)
      fs.writeFileSync(dest, buf)
    } catch (err) {
      console.error('FAIL', clean, err.message)
      return null
    }
  }
  map[clean] = filename
  return filename
}

async function rewriteCssUrls(filename) {
  const full = path.join(assetsDir, filename)
  if (!fs.existsSync(full)) return
  if (!/\.(css|js|html?)$/i.test(filename)) return
  let text = fs.readFileSync(full, 'utf8')
  const urls = collectUrls(text)
  let changed = false
  for (const url of urls) {
    if (shouldSkip(url)) continue
    const local = await ensureAsset(url)
    if (!local) continue
    const clean = new URL(url).origin + new URL(url).pathname
    // replace absolute and with query variants
    const variants = [url, clean]
    for (const v of variants) {
      if (text.includes(v)) {
        text = text.split(v).join(`./${local}`)
        changed = true
      }
    }
  }
  // relative url(/wp-content/...)
  const relRe = /url\((['"]?)(\/wp-(?:content|includes)\/[^'")]+)\1\)/gi
  const matches = [...text.matchAll(relRe)]
  for (const m of matches) {
    const abs = 'https://yellow.ai' + m[2].replace(/&amp;/g, '&')
    const local = await ensureAsset(abs)
    if (local) {
      text = text.split(m[0]).join(`url(./${local})`)
      changed = true
    }
  }
  if (changed) fs.writeFileSync(full, text)
}

async function main() {
  if (!fs.existsSync(rawPath)) {
    console.error('Missing _raw.html — download homepage first')
    process.exit(1)
  }

  let html = fs.readFileSync(rawPath, 'utf8')
  // Seed critical theme CSS/JS from known homepage set
  const seeds = [
    'https://yellow.ai/wp-content/themes/yellow.ai/fonts/stylesheet.css',
    'https://yellow.ai/wp-content/themes/yellow.ai/fonts/founders-grotesk-regular.woff2',
    'https://yellow.ai/wp-content/themes/yellow.ai/fonts/founders-grotesk-medium.woff2',
    'https://yellow.ai/wp-content/themes/yellow.ai/css/v2-home-25.min.css',
    'https://yellow.ai/wp-content/themes/yellow.ai/css/above-the-fold.min.css',
    'https://yellow.ai/wp-content/themes/yellow.ai/css/screen.min.css',
    'https://yellow.ai/wp-content/themes/yellow.ai/css/v2-block-menu-item-hover.min.css',
    'https://yellow.ai/wp-content/themes/yellow.ai/css/v2-block-menu-item.min.css',
    'https://yellow.ai/wp-content/themes/yellow.ai/css/v2-block-menu-submenu.min.css',
    'https://yellow.ai/wp-content/themes/yellow.ai/css/v2-block-menu-case-studies.min.css',
    'https://yellow.ai/wp-content/themes/yellow.ai/css/v2-block-logo-section.min.css',
    'https://yellow.ai/wp-content/themes/yellow.ai/css/v2-block-casestudy-tab.min.css',
    'https://yellow.ai/wp-content/themes/yellow.ai/css/v2-block-card-animation.min.css',
    'https://yellow.ai/wp-content/themes/yellow.ai/css/v2-block-card-rotation.min.css',
    'https://cdn.yellowmessenger.com/roboto.min.css',
    'https://yellow.ai/wp-includes/js/jquery/jquery.min.js',
    'https://yellow.ai/wp-includes/js/jquery/jquery-migrate.min.js',
    'https://yellow.ai/wp-content/themes/yellow.ai/js/vendor/slick.min.js',
    'https://yellow.ai/wp-content/themes/yellow.ai/js/main.js',
    'https://yellow.ai/wp-content/themes/yellow.ai/js/v2-blocks/block-casestudy-tab.js',
    'https://yellow.ai/wp-content/themes/yellow.ai/js/vendor/gsap.min.js',
    'https://yellow.ai/wp-content/themes/yellow.ai/js/vendor/ScrollTrigger.min.js',
    'https://yellow.ai/wp-content/themes/yellow.ai/js/vendor/CustomEase.min.js',
    'https://yellow.ai/wp-content/themes/yellow.ai/js/v2-blocks/block-card-animation.js',
    'https://yellow.ai/wp-content/themes/yellow.ai/js/v2-blocks/block-card-rotation.js',
    'https://yellow.ai/wp-content/uploads/2025/09/hero-video-25.mp4',
    'https://yellow.ai/wp-content/uploads/2025/09/Flow.webm',
    'https://yellow.ai/wp-content/uploads/2025/09/Flow.mp4',
    'https://yellow.ai/wp-content/uploads/2025/09/card-2.webm',
    'https://yellow.ai/wp-content/uploads/2025/09/card-2.mp4',
    'https://yellow.ai/wp-content/uploads/2025/09/card-3-1.webm',
    'https://yellow.ai/wp-content/uploads/2025/09/card-3.mp4',
    'https://yellow.ai/wp-content/uploads/2025/09/colorful-gradient-sphere-background-2025-08-04-21-09-18-utc-ezgif.com-rotate-video.webm',
  ]

  const fromHtml = collectUrls(html)
  const queue = [...new Set([...seeds, ...fromHtml])]
  console.log(`Downloading ${queue.length} assets...`)

  for (const url of queue) {
    if (shouldSkip(url)) continue
    // Skip huge non-homepage media later if needed; keep videos for exact look
    await ensureAsset(url)
  }

  // Pass 2: rewrite CSS and pull nested urls
  const files = fs.readdirSync(assetsDir).filter((f) => /\.(css|js)$/i.test(f))
  for (const f of files) {
    await rewriteCssUrls(f)
  }
  // Second pass for newly added css
  for (const f of fs.readdirSync(assetsDir).filter((x) => /\.css$/i.test(x))) {
    await rewriteCssUrls(f)
  }

  fs.writeFileSync(mapPath, JSON.stringify(map, null, 2))
  console.log(`Mapped ${Object.keys(map).length} assets`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
