import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ensureCoreScripts,
  ensurePageScripts,
  loadStylesheet,
  toAppPath,
} from '../assets'
import { bootYellowteco } from '../boot'
import type { YellowtecoPage as Page } from '../generated/pages'
import {
  mountHubSpotForms,
  parseHubSpotConfigs,
  runInlineScriptsWithoutHubSpotCreate,
} from '../hubspot'

export default function YellowtecoPage({ page }: { page: Page }) {
  const hostRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const coreReady = useRef(false)

  useEffect(() => {
    document.title = page.title
    document.body.className = page.bodyClass

    const styleNodes: HTMLElement[] = []
    if (page.styles) {
      const wrap = document.createElement('div')
      wrap.innerHTML = page.styles
      ;[...wrap.querySelectorAll('style')].forEach((node) => {
        const style = document.createElement('style')
        style.setAttribute('data-yt-page', page.route)
        style.textContent = node.textContent
        document.head.appendChild(style)
        styleNodes.push(style)
      })
    }

    page.cssHrefs.forEach((href) => loadStylesheet(href))

    const host = hostRef.current
    if (!host) {
      return () => styleNodes.forEach((node) => node.remove())
    }

    const onClick = (event: MouseEvent) => {
      const target = event.target as Element | null
      const anchor = target?.closest?.('a')
      if (!anchor) return
      if (event.defaultPrevented || event.button !== 0) return
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
      const href = anchor.getAttribute('href')
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return
      const next = toAppPath(href)
      if (!next) return
      event.preventDefault()
      navigate(next)
    }

    host.addEventListener('click', onClick)

    let stopBoot: (() => void) | undefined
    let cancelled = false

    const run = async () => {
      try {
        if (!coreReady.current) {
          await ensureCoreScripts(page.scriptSrcs)
          coreReady.current = true
        }
        await ensurePageScripts(page.scriptSrcs)
        const hsConfigs = parseHubSpotConfigs(page.inlineScripts)
        runInlineScriptsWithoutHubSpotCreate(page.inlineScripts)
        mountHubSpotForms(hsConfigs)
      } catch {
        /* continue with boot anyway */
      }
      if (cancelled || !hostRef.current) return
      stopBoot = bootYellowteco(hostRef.current)
      window.dispatchEvent(new Event('resize'))
    }

    const timer = window.setTimeout(() => {
      void run()
    }, 30)

    return () => {
      cancelled = true
      host.removeEventListener('click', onClick)
      window.clearTimeout(timer)
      stopBoot?.()
      styleNodes.forEach((node) => node.remove())
    }
  }, [page, navigate])

  return (
    <div
      ref={hostRef}
      className="yellowteco-page"
      dangerouslySetInnerHTML={{ __html: page.body }}
    />
  )
}
