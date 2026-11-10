type HsConfig = {
  portalId: string
  formId: string
  region?: string
  onFormSubmit?: (form: unknown) => void
}

function decodeWeirdQuotes(code: string) {
  // Some exported scripts mangled \u0022 into u0022
  return code.replace(/u0022/g, '"')
}

export function parseHubSpotConfigs(inlineScripts: string[]): HsConfig[] {
  const configs: HsConfig[] = []
  for (const raw of inlineScripts) {
    const code = decodeWeirdQuotes(raw)
    if (!/hbspt\.forms\.create/.test(code)) continue
    const portalId = code.match(/portalId:\s*["']([^"']+)["']/)?.[1]
    const formId = code.match(/formId:\s*["']([^"']+)["']/)?.[1]
    const region = code.match(/region:\s*["']([^"']+)["']/)?.[1]
    if (!portalId || !formId) continue
    const cfg: HsConfig = { portalId, formId }
    if (region) cfg.region = region
    if (/requestdemoFormSubmitted/.test(code)) {
      cfg.onFormSubmit = () => {
        window.requestdemoFormSubmitted = true
      }
    }
    configs.push(cfg)
  }
  return configs
}

export function runInlineScriptsWithoutHubSpotCreate(inlineScripts: string[]) {
  for (const raw of inlineScripts) {
    const code = decodeWeirdQuotes(raw)
      // create() is handled by mountHubSpotForms with an explicit target
      .replace(/hbspt\.forms\.create\([\s\S]*?\}\s*\);?/g, '')
      .trim()
    if (!code) continue
    try {
      new Function(code)()
    } catch {
      /* ignore */
    }
  }
}

export function mountHubSpotForms(configs: HsConfig[]) {
  const create = window.hbspt?.forms?.create
  if (!create || !configs.length) return

  // Forms created without a target land on <body> — remove orphans
  document.querySelectorAll('body > .hbspt-form').forEach((node) => node.remove())

  const targets = [...document.querySelectorAll<HTMLElement>('.yellow-hubspot')]
  if (!targets.length) return

  targets.forEach((target, index) => {
    const cfg = configs[index] ?? configs[0]
    if (!cfg) return

    let mount = target.querySelector<HTMLElement>('.yellow-hubspot-loader')
    if (!mount) {
      mount = document.createElement('div')
      mount.className = 'yellow-hubspot-loader'
      target.appendChild(mount)
    }

    const id = mount.id || `yt-hs-target-${index}`
    mount.id = id
    mount.replaceChildren()

    try {
      create({
        ...cfg,
        target: `#${id}`,
      })
    } catch {
      /* ignore */
    }
  })
}
