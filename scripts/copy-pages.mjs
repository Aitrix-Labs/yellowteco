import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const site = path.join(root, 'site')
const dist = path.join(root, 'dist')

function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true })
  for (const name of fs.readdirSync(from)) {
    const src = path.join(from, name)
    const dest = path.join(to, name)
    if (fs.statSync(src).isDirectory()) copyDir(src, dest)
    else fs.copyFileSync(src, dest)
  }
}

// Interior routes (skip homepage — Vite already built it)
for (const name of fs.readdirSync(site)) {
  if (name === 'index.html' || name === '404.html' || name === 'assets') continue
  const src = path.join(site, name)
  if (!fs.statSync(src).isDirectory()) continue
  copyDir(src, path.join(dist, name))
}

// Unhashed assets for relative ./assets/* + <base> links on interior pages
copyDir(path.join(site, 'assets'), path.join(dist, 'assets'))

fs.copyFileSync(path.join(dist, 'index.html'), path.join(dist, '404.html'))

console.log('Copied interior pages + assets into dist/')
