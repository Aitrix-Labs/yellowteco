const BASE = '/yellowteco'

export function toAppPath(href: string): string | null {
  try {
    const url = new URL(href, window.location.origin)
    if (url.origin !== window.location.origin) return null
    let path = url.pathname
    if (!path.startsWith(BASE)) return null
    path = path.replace(new RegExp(`^${BASE}`), '') || '/'
    path = path.replace(/\/index\.html$/, '/').replace(/\.html$/, '')
    if (path.length > 1) path = path.replace(/\/$/, '')
    if (path === '/index') path = '/'
    return path + url.search + url.hash
  } catch {
    return null
  }
}

export function loadStylesheet(href: string) {
  const existing = document.querySelector<HTMLLinkElement>(`link[data-yt-href="${href}"]`)
  if (existing) return
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = href
  link.dataset.ytHref = href
  document.head.appendChild(link)
}

export function loadScript(src: string, { reload = false }: { reload?: boolean } = {}): Promise<void> {
  return new Promise((resolve, reject) => {
    const key = src.split('?')[0]
    const existing = document.querySelector<HTMLScriptElement>(`script[data-yt-src="${key}"]`)
    if (existing && !reload) {
      if (existing.dataset.loaded === '1') {
        resolve()
        return
      }
      existing.addEventListener('load', () => resolve(), { once: true })
      existing.addEventListener('error', () => reject(new Error(`Failed ${src}`)), { once: true })
      return
    }
    if (existing && reload) existing.remove()

    const script = document.createElement('script')
    script.src = reload ? `${key}${key.includes('?') ? '&' : '?'}r=${Date.now()}` : src
    script.async = false
    script.dataset.ytSrc = key
    script.onload = () => {
      script.dataset.loaded = '1'
      resolve()
    }
    script.onerror = () => reject(new Error(`Failed to load ${src}`))
    document.body.appendChild(script)
  })
}

export function isCoreScript(src: string) {
  return /\/(jquery[^/]*|slick\.min|gsap\.min|ScrollTrigger\.min|CustomEase\.min|language-cookie|script\.min)-/i.test(
    src,
  )
}

export async function ensureCoreScripts(srcs: string[]) {
  const core = srcs.filter(isCoreScript)
  // Stable order: cookie → wp script → jquery → migrate → jquery plugins → libs
  const rank = (src: string) => {
    if (/language-cookie/i.test(src)) return 0
    if (/\/script\.min-/i.test(src)) return 1
    if (/jquery\.min-/i.test(src) && !/migrate/i.test(src)) return 2
    if (/jquery-migrate/i.test(src)) return 3
    if (/jquery/i.test(src)) return 4
    if (/slick\.min/i.test(src)) return 5
    if (/gsap\.min/i.test(src)) return 6
    if (/ScrollTrigger|CustomEase/i.test(src)) return 7
    return 8
  }
  const ordered = [...new Set(core)].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b))
  for (const src of ordered) {
    try {
      await loadScript(src)
    } catch {
      /* continue */
    }
  }
}

export async function ensurePageScripts(srcs: string[]) {
  const pageScripts = srcs.filter((src) => !isCoreScript(src))
  for (const src of pageScripts) {
    try {
      // Re-run theme/block scripts so document.ready handlers bind to new DOM
      await loadScript(src, { reload: true })
    } catch {
      /* continue */
    }
  }
}
