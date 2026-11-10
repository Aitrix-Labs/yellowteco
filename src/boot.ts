type Cleanup = () => void

function brandTextNodes(root: ParentNode) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  let node: Node | null
  while ((node = walker.nextNode())) {
    if (!node.nodeValue || !/yellow\.ai|Yellow\.ai|Yellowai|yellowai/i.test(node.nodeValue)) continue
    node.nodeValue = node.nodeValue
      .replace(/Yellow\.ai/g, 'Yellowteco')
      .replace(/Yellowai/g, 'Yellowteco')
      .replace(/yellow\.ai/g, 'yellowteco')
      .replace(/yellowai/g, 'yellowteco')
  }
}

function hideNativeSelect(sel: HTMLSelectElement) {
  sel.classList.add('yt-select__native')
  sel.setAttribute('aria-hidden', 'true')
  sel.tabIndex = -1
  sel.style.cssText =
    'position:absolute!important;width:1px!important;height:1px!important;opacity:0!important;pointer-events:none!important;visibility:hidden!important;margin:0!important;padding:0!important;border:0!important;clip:rect(0,0,0,0)!important;'
}

function enhanceSelect(sel: HTMLSelectElement) {
  if (sel.dataset.ytSelect === '1') {
    hideNativeSelect(sel)
    return
  }
  sel.dataset.ytSelect = '1'
  const wrap = document.createElement('div')
  wrap.className = 'yt-select'
  const btn = document.createElement('button')
  btn.type = 'button'
  btn.className = 'yt-select__btn'
  const list = document.createElement('ul')
  list.className = 'yt-select__list'
  list.setAttribute('role', 'listbox')

  let placeholder = 'Select'
  if (sel.name === 'account_size') placeholder = 'Company Size'
  else if (sel.closest('.hs-fieldtype-intl-phone')) placeholder = 'Country'
  else if (sel.options[0] && !sel.options[0].value && sel.options[0].text) {
    placeholder = sel.options[0].text
  }

  const syncBtn = () => {
    const opt = sel.options[sel.selectedIndex]
    const label = opt && opt.value ? opt.text : ''
    btn.textContent = label || placeholder
    btn.classList.toggle('is-placeholder', !sel.value)
    btn.title = btn.textContent
  }

  ;[...sel.options].forEach((opt, idx) => {
    if (!opt.value) return
    const li = document.createElement('li')
    li.className = 'yt-select__option'
    li.textContent = opt.text
    li.dataset.value = opt.value
    li.setAttribute('role', 'option')
    if (opt.selected) li.classList.add('is-active')
    li.addEventListener('click', () => {
      sel.selectedIndex = idx
      sel.dispatchEvent(new Event('change', { bubbles: true }))
      syncBtn()
      wrap.classList.remove('is-open')
      ;[...list.children].forEach((child) => {
        child.classList.toggle('is-active', child === li)
      })
    })
    list.appendChild(li)
  })

  btn.addEventListener('click', (event) => {
    event.preventDefault()
    event.stopPropagation()
    const willOpen = !wrap.classList.contains('is-open')
    document.querySelectorAll('.yt-select.is-open').forEach((el) => el.classList.remove('is-open'))
    if (willOpen) wrap.classList.add('is-open')
  })

  hideNativeSelect(sel)
  sel.parentNode?.insertBefore(wrap, sel)
  wrap.appendChild(btn)
  wrap.appendChild(list)
  wrap.appendChild(sel)
  syncBtn()
}

function enhanceDemoSelects(root: ParentNode) {
  root
    .querySelectorAll<HTMLSelectElement>(
      '.requestdemo-2025 select[name="account_size"], .requestdemo-2025 .hs-fieldtype-intl-phone select',
    )
    .forEach((sel) => enhanceSelect(sel))
}

function restoreDesktopNav() {
  if (window.innerWidth < 1024) return
  const $ = window.jQuery
  const section = document.querySelector<HTMLElement>('.new-header-main .menu-section')
  if ($) {
    $('.menu-section').stop(true, true).css({ display: '', visibility: '', opacity: '' }).show()
    $('.menu-overlay').stop(true, true).hide().css('display', '')
    $('.hamburger').removeClass('active')
    $('.menu-single').removeClass('active').css('display', '')
    $('.menu-single-content').stop(true, true).hide()
    $('a.menu-single-link-mobile').css('display', '')
    return
  }
  if (!section) return
  section.style.display = ''
  section.querySelectorAll<HTMLElement>('.menu-single').forEach((el) => {
    el.classList.remove('active')
    el.style.display = ''
  })
  section.querySelectorAll<HTMLElement>('a.menu-single-link:not(.menu-single-link-mobile)').forEach((el) => {
    el.style.display = ''
  })
  section.querySelectorAll<HTMLElement>('a.menu-single-link-mobile').forEach((el) => {
    el.style.display = ''
  })
  section.querySelectorAll<HTMLElement>('.menu-single-content').forEach((panel) => {
    panel.style.display = 'none'
  })
  const overlay = document.querySelector<HTMLElement>('.menu-overlay')
  if (overlay) overlay.style.display = 'none'
  document.querySelector('.hamburger')?.classList.remove('active')
}

function setupMobileMenu(root: ParentNode): Cleanup {
  const section = root.querySelector<HTMLElement>('.new-header-main .menu-section')
  if (!section) return () => undefined

  const onItemClick = (event: Event) => event.stopPropagation()
  section.querySelectorAll('.menu-single, a.menu-single-link').forEach((item) => {
    item.addEventListener('click', onItemClick)
  })

  restoreDesktopNav()
  window.addEventListener('resize', restoreDesktopNav)

  return () => {
    section.querySelectorAll('.menu-single, a.menu-single-link').forEach((item) => {
      item.removeEventListener('click', onItemClick)
    })
    window.removeEventListener('resize', restoreDesktopNav)
  }
}

function reinitSlick(root: ParentNode) {
  const $ = window.jQuery
  if (!$) return
  try {
    const $root = $(root as unknown as Element)
    $root.find('.slick-initialized').each(function () {
      try {
        $(this).slick?.('unslick')
      } catch {
        /* ignore */
      }
    })
  } catch {
    /* ignore */
  }
}

function refreshScrollTrigger() {
  try {
    window.ScrollTrigger?.getAll?.().forEach((t) => t.kill())
    window.ScrollTrigger?.refresh?.()
  } catch {
    /* ignore */
  }
}

export function bootYellowteco(root: HTMLElement): Cleanup {
  document.documentElement.classList.add('js')
  brandTextNodes(root)
  enhanceDemoSelects(root)

  const onDocClick = (event: MouseEvent) => {
    const target = event.target as Node | null
    document.querySelectorAll('.yt-select.is-open').forEach((el) => {
      if (target && !el.contains(target)) el.classList.remove('is-open')
    })
  }
  document.addEventListener('click', onDocClick)

  const menuCleanup = setupMobileMenu(root)
  reinitSlick(root)
  refreshScrollTrigger()

  let tries = 0
  const timer = window.setInterval(() => {
    enhanceDemoSelects(document)
    if (++tries > 80) window.clearInterval(timer)
  }, 250)

  const onHsReady = (event: MessageEvent) => {
    if (event.data?.type === 'hsFormCallback' && event.data?.eventName === 'onFormReady') {
      enhanceDemoSelects(document)
    }
  }
  window.addEventListener('message', onHsReady)

  return () => {
    document.removeEventListener('click', onDocClick)
    window.removeEventListener('message', onHsReady)
    menuCleanup()
    window.clearInterval(timer)
  }
}
