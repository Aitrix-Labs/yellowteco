import fs from 'node:fs'
import path from 'node:path'
import https from 'node:https'
import http from 'node:http'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const assetsDir = path.join(__dirname, '..', 'public', 'assets')
const mapPath = path.join(assetsDir, 'asset-map.json')
const map = JSON.parse(fs.readFileSync(mapPath, 'utf8'))

function sanitize(url) {
  const u = new URL(url)
  let name = path.basename(u.pathname) || 'asset.bin'
  name = name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const hash = Buffer.from(u.origin + u.pathname).toString('base64url').slice(0, 8)
  const ext = path.extname(name)
  const base = path.basename(name, ext)
  return `${base}-${hash}${ext || '.bin'}`
}

function fetchBuffer(url, redirects = 0) {
  return new Promise((resolve, reject) => {
    if (redirects > 8) return reject(new Error('too many redirects'))
    const lib = url.startsWith('https') ? https : http
    const req = lib.get(
      url,
      {
        headers: { 'User-Agent': 'Mozilla/5.0', Accept: '*/*' },
        timeout: 60000,
      },
      (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          const next = new URL(res.headers.location, url).href
          res.resume()
          return resolve(fetchBuffer(next, redirects + 1))
        }
        if (res.statusCode !== 200) {
          res.resume()
          return reject(new Error(`HTTP ${res.statusCode}`))
        }
        const chunks = []
        res.on('data', (c) => chunks.push(c))
        res.on('end', () => resolve(Buffer.concat(chunks)))
      },
    )
    req.on('error', reject)
    req.on('timeout', () => {
      req.destroy()
      reject(new Error('timeout'))
    })
  })
}

async function ensure(url) {
  const u = new URL(url)
  const clean = u.origin + u.pathname
  if (map[clean] && fs.existsSync(path.join(assetsDir, map[clean]))) return map[clean]
  const filename = sanitize(clean)
  const dest = path.join(assetsDir, filename)
  if (!fs.existsSync(dest)) {
    process.stdout.write(`GET ${clean}\n`)
    try {
      fs.writeFileSync(dest, await fetchBuffer(url))
    } catch (e) {
      console.error('FAIL', clean, e.message)
      return null
    }
  }
  map[clean] = filename
  return filename
}

function collectFromHtml(html) {
  const urls = new Set()
  const abs = /https?:\/\/(?:www\.)?yellow\.ai[^"'\\\s)>]+/gi
  let m
  while ((m = abs.exec(html))) {
    urls.add(m[0].replace(/&amp;/g, '&').replace(/[),;]+$/, '').split('?')[0])
  }
  const rel = /(?:src|href)=["'](\/wp-(?:content|includes)\/[^"']+)["']/gi
  while ((m = rel.exec(html))) {
    urls.add('https://yellow.ai' + m[1].replace(/&amp;/g, '&').split('?')[0])
  }
  return [...urls]
}

const seeds = [
  'https://yellow.ai/wp-content/themes/yellow.ai/css/screen.min.css',
  'https://yellow.ai/wp-content/themes/yellow.ai/css/above-the-fold.min.css',
  'https://yellow.ai/wp-content/themes/yellow.ai/css/v2-chatbot-pricing.min.css',
  'https://yellow.ai/wp-content/themes/yellow.ai/css/v2-block-roi-v2.min.css',
  'https://yellow.ai/wp-content/themes/yellow.ai/css/block-hubspot.min.css',
  'https://yellow.ai/wp-content/themes/yellow.ai/css/v2-block-frontpage-slider.min.css',
  'https://yellow.ai/wp-content/themes/yellow.ai/css/v2-block-industries-card.min.css',
  'https://yellow.ai/wp-content/themes/yellow.ai/css/v2-campaign-competitive.min.css',
  'https://yellow.ai/wp-content/themes/yellow.ai/css/block-download-button.min.css',
  'https://yellow.ai/wp-content/themes/yellow.ai/css/v2-block-video-div.min.css',
  'https://yellow.ai/wp-content/themes/yellow.ai/css/block-counter.min.css',
  'https://yellow.ai/wp-content/themes/yellow.ai/css/v2-block-testimonial-stats-slider.min.css',
  'https://yellow.ai/wp-content/themes/yellow.ai/img/v2/yellow-logo.svg',
  'https://yellow.ai/wp-content/themes/yellow.ai/img/v2/yellow-footer-logo.svg',
  'https://yellow.ai/wp-content/themes/yellow.ai/img/v2/yellow-black-logo.svg',
  'https://yellow.ai/wp-content/themes/yellow.ai/img/v2/logo-nexus.svg',
  'https://yellow.ai/wp-content/themes/yellow.ai/img/v2/yellow-logo-25.webp',
  'https://yellow.ai/wp-content/themes/yellow.ai/img/v2/yellow-logo-dark.webp',
  'https://yellow.ai/wp-content/themes/yellow.ai/img/v2/yellow-logo.webp',
  'https://yellow.ai/wp-content/themes/yellow.ai/img/v2/footer-logo-new.webp',
]

const raws = [
  '_raw.html',
  '_raw-pricing.html',
  '_raw-request-demo.html',
  '_raw-investors.html',
]

const queue = new Set(seeds)
for (const raw of raws) {
  const html = fs.readFileSync(path.join(assetsDir, raw), 'utf8')
  for (const u of collectFromHtml(html)) {
    if (/\.(css|js|webp|png|jpe?g|gif|svg|woff2?|mp4|webm|ico)(\?|$)/i.test(u) || u.includes('/wp-content/')) {
      if (!u.includes('xmlrpc') && !u.endsWith('.html')) queue.add(u.split('?')[0])
    }
  }
}

console.log('Fetching', queue.size, 'assets...')
for (const url of queue) {
  await ensure(url)
}

// Rewrite url() inside newly downloaded CSS
for (const file of fs.readdirSync(assetsDir).filter((f) => f.endsWith('.css'))) {
  let text = fs.readFileSync(path.join(assetsDir, file), 'utf8')
  let changed = false
  const re = /url\((['"]?)([^'")]+)\1\)/g
  const matches = [...text.matchAll(re)]
  for (const m of matches) {
    let ref = m[2].trim()
    if (ref.startsWith('data:')) continue
    let abs
    try {
      if (ref.startsWith('http')) abs = ref
      else if (ref.startsWith('/')) abs = 'https://yellow.ai' + ref
      else continue
      abs = abs.split('?')[0]
      if (!abs.includes('yellow.ai')) continue
      const local = await ensure(abs)
      if (local) {
        text = text.split(m[0]).join(`url(./${local})`)
        changed = true
      }
    } catch {
      /* ignore */
    }
  }
  if (changed) fs.writeFileSync(path.join(assetsDir, file), text)
}

fs.writeFileSync(mapPath, JSON.stringify(map, null, 2))
console.log('Mapped', Object.keys(map).length, 'assets')
