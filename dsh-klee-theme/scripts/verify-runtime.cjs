/**
 * Execute the built browser bundle against a stub DOM and assert its real
 * behaviour — that is, the CSS and DOM state a browser would actually get.
 *
 * The bundle is the lazy-CJS factory format
 * `window.__ModuleLoader__.load({ id, factory })`, so this harness supplies a
 * `window`, a `document` with just the methods the plugin touches, a stub
 * `ctx`, and a tiny React shim; then it inspects the result.
 *
 * Usage: node scripts/verify-runtime.cjs [path/to/client.js]
 */

const fs = require('node:fs')
const path = require('node:path')

const bundlePath = process.argv[2] ?? path.join(__dirname, '..', 'client', 'client.js')

/** Minimal element stub: enough for style/attribute/child bookkeeping. */
function makeElement(tag, id) {
  const el = {
    tagName: String(tag).toUpperCase(),
    id: id ?? '',
    textContent: '',
    attributes: new Map(),
    children: [],
    style: { setProperty() {}, removeProperty() {} },
    setAttribute(name, value) { this.attributes.set(name, String(value)) },
    removeAttribute(name) { this.attributes.delete(name) },
    getAttribute(name) { return this.attributes.has(name) ? this.attributes.get(name) : null },
    append(node) { this.children.push(node) },
    insertBefore(node) { this.children.unshift(node); return node },
    remove() {},
    addEventListener() {},
    removeEventListener() {},
  }
  return el
}

const head = makeElement('head')
const body = makeElement('body')
const documentElement = makeElement('html')

const document = {
  documentElement,
  head,
  body,
  getElementById(id) {
    const all = [...head.children, ...body.children]
    return all.find((node) => node.id === id) ?? null
  },
  createElement: (tag) => makeElement(tag),
  querySelector: () => null,
  querySelectorAll: () => [],
}

/** The plugin installs a diagnostic observer; the stub only needs the shape. */
class MutationObserver {
  observe() {}
  disconnect() {}
  takeRecords() { return [] }
}

const registrations = []
let loadCall

const window = {
  __ModuleLoader__: {
    load(call) {
      loadCall = call
    },
  },
}

const React = {
  createElement(type, props, ...children) {
    return { type, props: props ?? {}, children }
  },
  useState: (initial) => [initial, () => {}],
  useEffect: () => {},
}

/** The slot/theme/effect surface a client plugin receives. */
const ctx = {
  effect(callback) {
    const result = callback()
    return typeof result === 'function' ? result : () => {}
  },
  slots: {
    register(meta, component) {
      registrations.push({ meta, component })
      return () => {}
    },
  },
  theme: {
    themes: [],
    overrides: [],
    register(definition) {
      ctx.theme.themes.push(definition)
      return () => {}
    },
    overrideTokens(source, tokens) {
      ctx.theme.overrides.push({ source, tokens })
      return () => {}
    },
    getTheme: () => ({ preference: 'light' }),
    setTheme() {},
  },
  locale: {
    dictionary: null,
    register(namespace, dicts) {
      ctx.locale.dictionary = { namespace, dicts }
      return () => {}
    },
  },
}

// Run the factory the way the module loader would.
const source = fs.readFileSync(bundlePath, 'utf8')
const run = new Function('window', 'document', 'React', 'navigator', 'console', 'MutationObserver', source)
run(window, document, null, { language: 'zh-CN' }, console, MutationObserver)

if (loadCall === undefined) throw new Error('bundle did not call __ModuleLoader__.load')
const plugin = loadCall.factory((specifier) => {
  throw new Error(`unexpected require("${specifier}")`)
})
if (typeof plugin.apply !== 'function') throw new Error('module exports no apply()')

plugin.apply(ctx)

// ---- assertions -----------------------------------------------------------

const styles = [...head.children].filter((node) => node.tagName === 'STYLE')
const themeStyle = styles.find((node) => node.id === 'dsh-klee-theme-theme-style')
const iconsStyle = styles.find((node) => node.id === 'dsh-klee-theme-icons-style')
const backdrop = body.children.find((node) => node.id === 'dsh-klee-theme-backdrop')

const themeCss = themeStyle?.textContent ?? ''
const iconsCss = iconsStyle?.textContent ?? ''
const pngUris = (themeCss + iconsCss).match(/data:image\/png;base64,/g) ?? []
const jpegUris = (themeCss + iconsCss).match(/data:image\/jpeg;base64,/g) ?? []

/**
 * Alpha of an `rgba(...)` token value, so readability can be asserted instead of
 * eyeballed. A surface below ~0.85 over the busy artwork is the configuration
 * that made text unreadable before.
 *
 * The pane tokens carry their alpha as `var(--dsh-klee-pane-alpha, 0.48)` so the
 * knob works at runtime; the assertion therefore resolves the fallback, which is
 * the value the contrast numbers are computed against.
 */
function alphaOf(value) {
  const text = String(value)
  const literal = /rgba\(\s*[\d.]+\s*,\s*[\d.]+\s*,\s*[\d.]+\s*,\s*([\d.]+)\s*\)/.exec(text)
  if (literal !== null) return Number(literal[1])
  const knob = /rgba\(\s*[\d.]+\s*,\s*[\d.]+\s*,\s*[\d.]+\s*,\s*var\([^,]+,\s*([\d.]+)\s*\)\s*\)/.exec(text)
  return knob === null ? 1 : Number(knob[1])
}

const lightTokens = ctx.theme.overrides[0]?.tokens ?? {}

/** Panes that are *meant* to be translucent glass — the artwork must show through. */
const GLASS_TOKENS = ['--dsw-alias-bg-base', '--dsw-specific-sidebar-fill']
/** Surfaces that carry small text or float above content — these must stay solid. */
const SOLID_TOKENS = [
  '--dsw-alias-bg-layer-1',
  '--dsw-alias-bg-layer-2',
  '--dsw-alias-bg-layer-3',
  '--dsw-alias-bg-overlay',
  '--dsw-specific-menu',
  '--dsw-specific-input-major',
  '--dsw-specific-bubble',
]
const thinSolids = SOLID_TOKENS.filter((name) => alphaOf(lightTokens[name]?.light) < 0.85)
const darkThinSolids = SOLID_TOKENS.filter((name) => alphaOf(lightTokens[name]?.dark) < 0.85)
/** Panes must stay see-through enough for the artwork to read as a background. */
const lightPaneAlpha = alphaOf(lightTokens['--dsw-alias-bg-base']?.light)
const lightSidebarAlpha = alphaOf(lightTokens['--dsw-specific-sidebar-fill']?.light)
const darkPaneAlpha = alphaOf(lightTokens['--dsw-alias-bg-base']?.dark)

/**
 * WCAG contrast of a text token over a composed surface: the surface at its own
 * alpha over a worst-case artwork pixel. This is the readable-on-artwork check —
 * the flat-cream number alone would hide exactly the bug this guards.
 * @returns {number} the contrast ratio.
 */
const ARTWORK_WORST_PIXELS = [[255, 245, 235], [240, 170, 125], [165, 60, 45], [120, 45, 35]]
function channelLuminance(value) {
  const c = value / 255
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}
function luminance(rgb) {
  return 0.2126 * channelLuminance(rgb[0]) + 0.7152 * channelLuminance(rgb[1]) + 0.0722 * channelLuminance(rgb[2])
}
function contrast(a, b) {
  const la = luminance(a)
  const lb = luminance(b)
  const [hi, lo] = la > lb ? [la, lb] : [lb, la]
  return (hi + 0.05) / (lo + 0.05)
}
function hexToRgb(hex) {
  const m = /^#([0-9a-f]{6})$/i.exec(String(hex).trim())
  if (m === null) return null
  return [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16))
}
function rgbaToRgb(value) {
  const m = /rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/.exec(String(value))
  return m === null ? null : [Number(m[1]), Number(m[2]), Number(m[3])]
}
function worstContrast(textToken, surfaceToken, mode) {
  const text = hexToRgb(lightTokens[textToken]?.[mode])
  const surface = rgbaToRgb(lightTokens[surfaceToken]?.[mode])
  const alpha = alphaOf(lightTokens[surfaceToken]?.[mode])
  if (text === null || surface === null) return 0
  let worst = Infinity
  for (const pixel of ARTWORK_WORST_PIXELS) {
    const composed = surface.map((c, i) => alpha * c + (1 - alpha) * pixel[i])
    worst = Math.min(worst, contrast(text, composed))
  }
  return worst
}
const TEXT_OVER_COLUMN = ['--dsw-alias-label-primary', '--dsw-alias-label-secondary', '--dsw-alias-label-tertiary']
const weakLightText = TEXT_OVER_COLUMN
  .map((token) => [token, worstContrast(token, '--dsw-alias-bg-base', 'light')])
  .filter(([, ratio]) => ratio < 4.5)
const weakDarkText = TEXT_OVER_COLUMN
  .map((token) => [token, worstContrast(token, '--dsw-alias-bg-base', 'dark')])
  .filter(([, ratio]) => ratio < 4.5)

const checks = [
  ['factory id is the package name', loadCall.id === 'dsh-klee-theme'],
  ['module declares inject', Array.isArray(plugin.inject) && plugin.inject.includes('theme')],
  ['a theme style element was appended', themeStyle !== undefined],
  ['an icons style element was appended', iconsStyle !== undefined],
  ['backdrop layer was inserted', backdrop !== undefined],

  ['no unresolved placeholder survived in CSS', !themeCss.includes('__BG_') && !iconsCss.includes('__HERO_') && !iconsCss.includes('__SEND_')],
  ['backdrop carries the 16:9 artwork', themeCss.includes('data:image/jpeg;base64,') && jpegUris.length === 2],
  ['narrow-window media query swaps the artwork', themeCss.includes('max-aspect-ratio: 13/10')],

  // Visibility + readability contract: no dependency on generated layout class
  // names, the artwork layer is softened, panes stay see-through, and text still
  // clears AA against the composed glass.
  ['no dependency on host layout class hashes', !/(BynINW_|_centerCol|_sidebarCol|_frame\b)/.test(themeCss)],
  ['artwork layer is wired to the blur knob', /#dsh-klee-theme-backdrop\s*\{[^}]*filter:\s*var\(--dsh-klee-artwork-blur/.test(themeCss)],
  ['artwork blur stays light enough to recognise the picture', /--dsh-klee-artwork-blur:\s*blur\(1px\)/.test(themeCss)],
  ['modals are forced opaque', /\[role="dialog"\]\[aria-modal="true"\][\s\S]{0,200}background-color:\s*var\(--dsh-klee-dialog-fill/.test(themeCss)],
  ['alertdialogs are forced opaque', /\[role="alertdialog"\]\[aria-modal="true"\]/.test(themeCss)],
  ['dark scheme gets its own dialog fill', /body\[data-ds-dark-theme\][\s\S]{0,120}--dsh-klee-dialog-fill/.test(themeCss)],
  ['artwork keeps only a light veil', /#dsh-klee-theme-backdrop::after\s*\{[^}]*rgba\(255,\s*246,\s*238/.test(themeCss)],
  ['light pane alpha keeps the artwork visible', lightPaneAlpha > 0 && lightPaneAlpha <= 0.55],
  ['light sidebar alpha keeps the artwork visible', lightSidebarAlpha > 0 && lightSidebarAlpha <= 0.55],
  ['dark pane alpha keeps the artwork visible', darkPaneAlpha > 0 && darkPaneAlpha <= 0.70],
  ['light solid surfaces stay opaque', thinSolids.length === 0],
  ['dark solid surfaces stay opaque', darkThinSolids.length === 0],
  ['light text clears WCAG AA over the glass', weakLightText.length === 0],
  ['dark text clears WCAG AA over the glass', weakDarkText.length === 0],

  // Hero brand mark: one mark, painted in CSS, host glyph hidden.
  ['hero mark: host svg is hidden', iconsCss.includes('> svg[aria-hidden="true"]') && iconsCss.includes('display: none !important')],
  ['hero mark: artwork is painted on the hitbox', /span:has\(> svg\[aria-hidden="true"\]\):not\(:has\(button, a\)\)::after/.test(iconsCss)],
  ['hero mark: artwork is a PNG data URI', /:not\(:has\(button, a\)\)::after\s*\{[^}]*data:image\/png;base64,/.test(iconsCss)],
  ['hero mark: painting is unconditional (no status gate)', !iconsCss.includes('[data-dsh-klee-theme-hero-mark=')],
  ['hero mark: icons inside buttons/links are excluded', iconsCss.includes(':not(:has(button, a))')],

  // Send button: the arrow glyph is swapped, the button itself is untouched.
  ['send button: send arrow is hidden', /button\[aria-label\*="发送"\] > svg\[aria-hidden="true"\]/.test(iconsCss)],
  ['send button: english label also covered', /button\[aria-label\*="Send"\]/.test(iconsCss)],
  ['send button: artwork is painted on the button', /button\[aria-label\*="发送"\]::after[^}]*data:image\/png;base64,/.test(iconsCss)],
  ['send button: button background is left to the host', !iconsCss.includes('RlGAzG')],
  ['send button: stop/other buttons are not targeted by position', !iconsCss.includes('nth-child') && !iconsCss.includes('last-child')],

  ['exactly two PNG artworks are embedded (hero + send)', pngUris.length === 2],

  ['palette override layer registered once', ctx.theme.overrides.length === 1],
  ['override source is the package name', ctx.theme.overrides[0]?.source === 'dsh-klee-theme'],
  ['override carries light and dark values per token', Object.values(ctx.theme.overrides[0]?.tokens ?? {}).every((v) => v && typeof v.light === 'string' && typeof v.dark === 'string')],
  ['override covers the base background token', '--dsw-alias-bg-base' in (ctx.theme.overrides[0]?.tokens ?? {})],
  ['selectable theme registered', ctx.theme.themes.length === 1 && ctx.theme.themes[0].id === 'dsh-klee-theme'],
  ['registered theme is a light scheme', ctx.theme.themes[0]?.colorScheme === 'light'],
  ['plugin does not require the slots service', !(Array.isArray(plugin.inject) && plugin.inject.includes('slots'))],
]

let failed = 0
for (const [name, ok] of checks) {
  if (!ok) failed += 1
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`)
}

const tokenCount = Object.keys(ctx.theme.overrides[0]?.tokens ?? {}).length
console.log(`\nartwork: ${jpegUris.length} JPEG in CSS, ${pngUris.length} PNG in CSS`)
console.log(`palette: ${tokenCount} tokens overridden, ${Object.keys(ctx.theme.themes[0]?.tokens ?? {}).length} in the registered theme`)
console.log(`css: theme ${themeCss.length} B, icons ${iconsCss.length} B`)
console.log(failed === 0 ? '\nALL RUNTIME CHECKS PASSED' : `\n${failed} CHECK(S) FAILED`)
process.exit(failed === 0 ? 0 : 1)
