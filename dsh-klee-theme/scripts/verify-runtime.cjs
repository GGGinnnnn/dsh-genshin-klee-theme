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

const checks = [
  ['factory id is the package name', loadCall.id === 'dsh-klee-theme'],
  ['module declares inject', Array.isArray(plugin.inject) && plugin.inject.includes('theme')],
  ['a theme style element was appended', themeStyle !== undefined],
  ['an icons style element was appended', iconsStyle !== undefined],
  ['backdrop layer was inserted', backdrop !== undefined],

  ['no unresolved placeholder survived in CSS', !themeCss.includes('__BG_') && !iconsCss.includes('__HERO_') && !iconsCss.includes('__SEND_')],
  ['backdrop carries the 16:9 artwork', themeCss.includes('data:image/jpeg;base64,') && jpegUris.length === 2],
  ['narrow-window media query swaps the artwork', themeCss.includes('max-aspect-ratio: 13/10')],
  ['shell surfaces are made transparent', themeCss.includes('.BynINW_frame') && themeCss.includes('background: transparent')],

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
