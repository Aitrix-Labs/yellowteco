import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const site = path.join(root, 'site')
const dist = path.join(root, 'dist')
const publicAssets = path.join(root, 'public', 'assets')

function copyDir(from, to) {
  if (!fs.existsSync(from)) return
  fs.mkdirSync(to, { recursive: true })
  for (const name of fs.readdirSync(from)) {
    if (name === '_raw.html' || name === 'asset-map.json') continue
    const src = path.join(from, name)
    const dest = path.join(to, name)
    if (fs.statSync(src).isDirectory()) copyDir(src, dest)
    else fs.copyFileSync(src, dest)
  }
}

// Ensure unhashed asset filenames match HTML absolute /yellowteco/assets/* refs
copyDir(path.join(site, 'assets'), path.join(dist, 'assets'))
copyDir(publicAssets, path.join(dist, 'assets'))

if (fs.existsSync(path.join(dist, 'index.html'))) {
  fs.copyFileSync(path.join(dist, 'index.html'), path.join(dist, '404.html'))
}

console.log('copy-pages: synced assets + 404.html')
