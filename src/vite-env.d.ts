/// <reference types="vite/client" />

interface Window {
  jQuery?: JQueryStatic
  $?: JQueryStatic
  requestdemoFormSubmitted?: boolean
  hbspt?: {
    forms?: {
      create?: (opts: Record<string, unknown>) => void
    }
  }
  gsap?: {
    registerPlugin: (...args: unknown[]) => void
    killTweensOf?: (target: Element | string) => void
  }
  ScrollTrigger?: {
    refresh?: () => void
    getAll?: () => Array<{ kill: () => void }>
  }
}

interface JQueryStatic {
  (selector?: unknown): JQuery
  (ready: () => void): void
}

interface JQuery {
  length: number
  each: (fn: (this: HTMLElement, index: number) => void) => JQuery
  on: (...args: unknown[]) => JQuery
  off: (...args: unknown[]) => JQuery
  find: (selector: string) => JQuery
  addClass: (name: string) => JQuery
  removeClass: (name: string) => JQuery
  hasClass: (name: string) => boolean
  css: (props: string | Record<string, string>, value?: string) => JQuery
  show: () => JQuery
  hide: () => JQuery
  stop: (clearQueue?: boolean, jumpToEnd?: boolean) => JQuery
  slick?: (action?: string | Record<string, unknown>) => JQuery
}
