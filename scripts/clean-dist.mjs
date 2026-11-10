import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dist = path.resolve(__dirname, '..', 'dist')

function rm(dir) {
  if (!fs.existsSync(dir)) return
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name)
    try {
      const st = fs.lstatSync(full)
      if (st.isDirectory()) rm(full)
      else fs.unlinkSync(full)
    } catch {
      // Ignore locked files; Vite emptyOutDir can retry after this pass
    }
  }
  try {
    fs.rmdirSync(dir)
  } catch {
    // leave for next pass / vite
  }
}

rm(dist)
console.log('Cleaned dist/')
