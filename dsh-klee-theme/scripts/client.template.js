/**
 * dsh-klee-theme — browser half.
 *
 * Built by scripts/build.mjs into client/client.js, the lazy-CJS bundle the host
 * serves to the page. The artwork data URIs below are placeholders the build
 * step replaces; this template is the authoring source and is not loaded by DSH.
 *
 * What it does, in order:
 *  1. registers a `klee` theme (light scheme) whose alias tokens are the
 *     artwork's own palette, and stacks the same palette as an override layer so
 *     it applies without disturbing the user's durable light/dark preference;
 *  2. installs a fixed backdrop layer behind the whole shell, with one artwork
 *     per viewport shape selected by a media query;
 *  3. replaces the hero brand mark — the glyph next to 「探索未至之境」 /
 *     "Into the Unknown" — with the Klee artwork;
 *  4. replaces the composer's round send button glyph with the Klee artwork.
 *
 * Design note for both icon swaps — why they are painted in CSS:
 * a slot registration or a React element can fail silently (a refused
 * registration, a component the host renders into a hidden cell, a rejected
 * `<img>`), and the earlier "slot first, CSS fallback second" arrangement left a
 * blank hole in exactly that case. Painting the glyph in CSS and hiding the
 * host's own glyph is unconditional: it works whether or not the host renders a
 * fallback, needs no React, and leaves exactly one mark on screen.
 */

const ASSETS = {
  bgLandscape: '__BG_16X9__',
  bgPortrait: '__BG_4X3__',
  heroMark: '__HERO_MARK__',
  sendIcon: '__SEND_ICON__',
}

window.__ModuleLoader__.load({
  id: 'dsh-klee-theme',
  factory: (require) => {
    const module = { exports: {} }
    const exports = module.exports
    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' })

    /** Theme id registered with the theme service. */
    const THEME_ID = 'dsh-klee-theme'

    /** This package's name; also the CSS id prefix and the slot-occupant id. */
    const ID = 'dsh-klee-theme'

    const THEME_STYLE_ID = `${ID}-theme-style`
    const ICONS_STYLE_ID = `${ID}-icons-style`
    const BACKDROP_ID = `${ID}-backdrop`
    const BACKDROP_ATTR = `data-${ID}-backdrop`

    /**
     * Root attribute publishing how many hero marks the plugin has painted.
     * Diagnostic only — nothing in the stylesheet depends on it, precisely so a
     * bookkeeping failure can never blank the icon. Read it in DevTools with
     * `document.documentElement.dataset` while tuning selectors.
     */
    const STATUS_ATTR = `data-${ID}-hero-marks`

    function copy() {
      const lang = `${document.documentElement?.lang || ''}${navigator.language || ''}`
      return lang.toLowerCase().startsWith('zh') ? ZH : EN
    }

    const ZH = {
      klee: '可莉 · 暖色调',
      kleeHint: '以可莉背景图的主色调重新配色',
    }
    const EN = {
      klee: 'Klee · Warm',
      kleeHint: 'Palette taken from the Klee artwork',
    }

    /**
     * The artwork's own palette, averaged off the warm coral washes of
     * 背景（16;9）.jpg and 背景（4;3）.jpg.
     *
     * Surface alpha is the readability lever, and it is deliberately high: the
     * backdrop is a busy illustration, so a translucent surface lets coral
     * shapes and cream characters sit directly under dark-brown text and the
     * contrast collapses. Above ~0.88 the artwork still tints the surface while
     * text keeps a stable ground. The backdrop itself is blurred and veiled
     * (see THEME_STYLE) so the small alpha that remains never reads as noise.
     */
    const KLEE_TOKENS = {
      // Surfaces — warm cream, near-opaque so text always has a quiet ground.
      '--dsw-alias-bg-base': 'rgba(253, 244, 236, 0.90)',
      '--dsw-alias-bg-layer-1': 'rgba(255, 249, 243, 0.95)',
      '--dsw-alias-bg-layer-2': 'rgba(250, 232, 216, 0.94)',
      '--dsw-alias-bg-layer-3': 'rgba(255, 251, 246, 0.96)',
      '--dsw-alias-bg-overlay': 'rgba(255, 250, 244, 0.97)',
      '--dsw-specific-sidebar-fill': 'rgba(250, 233, 217, 0.88)',
      '--dsw-specific-menu': 'rgba(255, 250, 244, 0.97)',
      '--dsw-specific-input-major': 'rgba(255, 250, 244, 0.96)',
      '--dsw-specific-bubble': 'rgba(255, 224, 200, 0.96)',
      '--dsw-specific-selector': 'rgba(255, 246, 237, 0.96)',

      // Text and icons — deep warm brown, so the copy stays readable on coral.
      '--dsw-alias-label-primary': '#4a2a20',
      '--dsw-alias-label-secondary': '#6f4132',
      '--dsw-alias-label-tertiary': '#8b5b48',
      '--dsw-alias-label-caption': '#96654f',
      '--dsw-alias-label-primary-dimmed': '#5c3527',
      '--dsw-alias-label-primary-inverted': '#fff7f1',
      '--dsw-alias-label-quaternary': '#a97f6a',
      '--dsw-alias-label-dimmed': '#9d7763',

      // Borders.
      '--dsw-alias-border-l1': 'rgba(122, 63, 41, 0.20)',
      '--dsw-alias-border-l2': 'rgba(122, 63, 41, 0.16)',
      '--dsw-alias-border-l3': 'rgba(122, 63, 41, 0.12)',
      '--dsw-alias-border-l4': 'rgba(122, 63, 41, 0.26)',
      '--dsw-alias-border-l2-darkmode-thin': 'rgba(122, 63, 41, 0.16)',

      // Brand and interactive accents — Klee's clover orange-red.
      '--dsw-alias-brand-primary': '#d4452f',
      '--dsw-alias-button-info-fill': '#d4452f',
      '--dsw-alias-button-info-hover': '#c03a26',
      '--dsw-alias-state-business-primary': '#c9542f',
      '--dsw-alias-interactive-bg-hover': 'rgba(122, 63, 41, 0.08)',
      '--dsw-alias-interactive-bg-hover-solid': 'rgba(233, 178, 143, 0.94)',
      '--dsw-alias-interactive-bg-hover-danger': 'rgba(200, 60, 40, 0.12)',
      '--dsw-alias-button-ghost-active-fill': 'rgba(122, 63, 41, 0.10)',

      // Semantics kept inside the warm family: they must read as states, not as
      // neutrals, while still sitting on the coral surfaces.
      '--dsw-alias-state-error-primary': '#c0392b',
      '--dsw-alias-state-warn-primary': '#b4690e',
      '--dsw-alias-state-warn-secondary': '#e0a35f',
      '--dsw-alias-state-warn-tertiary': '#fbe6cd',
      '--dsw-alias-state-warn-label': '#96601a',
      '--dsw-alias-state-success-primary': '#3f8f52',
      '--dsw-alias-state-idle-primary': '#9a6753',
      '--dsw-alias-onboarding-accent': '#d4452f',

      // Code and scrollbars.
      '--dsw-alias-markdown-code-block': 'rgba(255, 240, 226, 0.94)',
      '--dsw-alias-scrollbar-bg-l2': 'rgba(122, 63, 41, 0.22)',
      '--dsw-alias-scrollbar-hover-l2': 'rgba(122, 63, 41, 0.36)',
      '--dsw-alias-menu-icon': '#8a5540',
      '--dsw-alias-menu-group-header-fill': 'rgba(253, 241, 231, 0.97)',
      '--dsw-menu-surface-fill': 'rgba(255, 250, 244, 0.97)',

      // Elevation reads as a warm shadow rather than neutral grey.
      '--dsw-elevation-stroke-color': 'rgba(122, 63, 41, 0.22)',
    }

    /**
     * The dark counterpart: the same warm keys, pushed down into a warm brown so
     * a user whose shell is in dark mode still gets a coherent Klee palette
     * instead of a washed-out light one. Same alpha rule as the light set —
     * near-opaque surfaces, because the backdrop is busy.
     */
    const KLEE_TOKENS_DARK = {
      '--dsw-alias-bg-base': 'rgba(30, 19, 16, 0.90)',
      '--dsw-alias-bg-layer-1': 'rgba(44, 27, 22, 0.94)',
      '--dsw-alias-bg-layer-2': 'rgba(56, 34, 27, 0.94)',
      '--dsw-alias-bg-layer-3': 'rgba(66, 40, 32, 0.96)',
      '--dsw-alias-bg-overlay': 'rgba(38, 23, 19, 0.97)',
      '--dsw-specific-sidebar-fill': 'rgba(38, 23, 19, 0.90)',
      '--dsw-specific-menu': 'rgba(44, 27, 22, 0.97)',
      '--dsw-specific-input-major': 'rgba(50, 30, 25, 0.96)',
      '--dsw-specific-bubble': 'rgba(120, 57, 40, 0.95)',
      '--dsw-specific-selector': 'rgba(52, 32, 26, 0.96)',

      '--dsw-alias-label-primary': '#f6e3d8',
      '--dsw-alias-label-secondary': '#dcbfb0',
      '--dsw-alias-label-tertiary': '#bb9787',
      '--dsw-alias-label-caption': '#a58274',
      '--dsw-alias-label-primary-dimmed': '#e9cfc1',
      '--dsw-alias-label-primary-inverted': '#231410',
      '--dsw-alias-label-quaternary': '#8d6e62',
      '--dsw-alias-label-dimmed': '#9c7b6d',

      '--dsw-alias-border-l1': 'rgba(255, 214, 191, 0.22)',
      '--dsw-alias-border-l2': 'rgba(255, 214, 191, 0.18)',
      '--dsw-alias-border-l3': 'rgba(255, 214, 191, 0.13)',
      '--dsw-alias-border-l4': 'rgba(255, 214, 191, 0.28)',
      '--dsw-alias-border-l2-darkmode-thin': 'rgba(255, 214, 191, 0.18)',

      '--dsw-alias-brand-primary': '#ff8a5c',
      '--dsw-alias-button-info-fill': '#e2603f',
      '--dsw-alias-button-info-hover': '#ef7050',
      '--dsw-alias-state-business-primary': '#ff8a5c',
      '--dsw-alias-interactive-bg-hover': 'rgba(255, 214, 191, 0.10)',
      '--dsw-alias-interactive-bg-hover-solid': 'rgba(96, 55, 42, 0.92)',
      '--dsw-alias-interactive-bg-hover-danger': 'rgba(255, 120, 96, 0.16)',
      '--dsw-alias-button-ghost-active-fill': 'rgba(255, 214, 191, 0.12)',

      '--dsw-alias-state-error-primary': '#ff8f7a',
      '--dsw-alias-state-warn-primary': '#e6a95c',
      '--dsw-alias-state-warn-secondary': '#8a5c22',
      '--dsw-alias-state-warn-tertiary': 'rgba(120, 78, 28, 0.55)',
      '--dsw-alias-state-warn-label': '#e6b273',
      '--dsw-alias-state-success-primary': '#7fc58c',
      '--dsw-alias-state-idle-primary': '#bb9787',
      '--dsw-alias-onboarding-accent': '#ff8a5c',

      '--dsw-alias-markdown-code-block': 'rgba(32, 20, 16, 0.88)',
      '--dsw-alias-scrollbar-bg-l2': 'rgba(255, 214, 191, 0.24)',
      '--dsw-alias-scrollbar-hover-l2': 'rgba(255, 214, 191, 0.38)',
      '--dsw-alias-menu-icon': '#c9a595',
      '--dsw-alias-menu-group-header-fill': 'rgba(38, 23, 19, 0.94)',
      '--dsw-menu-surface-fill': 'rgba(44, 27, 22, 0.95)',

      '--dsw-elevation-stroke-color': 'rgba(255, 214, 191, 0.20)',
    }

    /**
     * Put the palette on the page.
     *
     *  - `ctx.theme.overrideTokens` stacks a partial token layer over whatever
     *    base theme is active. This is the load-bearing half: it applies the
     *    palette without touching the user's durable light/dark preference, and
     *    it is the documented path for a client plugin that is not itself the
     *    theme picker. Layers compose per active color scheme.
     *  - `ctx.theme.register` only makes Klee a *selectable* theme in
     *    Appearance. It activates nothing and persists nothing.
     *
     * Both halves are guarded: a host missing either surface loses that half and
     * keeps working, because the backdrop and both icon swaps are independent of
     * the theme service.
     */
    function applyPalette(ctx) {
      const theme = ctx.theme
      if (theme === undefined) return

      if (typeof theme.overrideTokens === 'function') {
        try {
          const modes = {}
          for (const [name, value] of Object.entries(KLEE_TOKENS)) {
            modes[name] = { light: value, dark: KLEE_TOKENS_DARK[name] ?? value }
          }
          const off = theme.overrideTokens(THEME_ID, modes)
          if (typeof off === 'function') ctx.effect(() => off, `${ID}: palette layer`)
        } catch (error) {
          console.warn(`[${ID}] token override refused:`, error)
        }
      }

      if (typeof theme.register === 'function') {
        try {
          const off = theme.register({
            id: THEME_ID,
            colorScheme: 'light',
            tokens: { ...KLEE_TOKENS },
          })
          if (typeof off === 'function') ctx.effect(() => off, `${ID}: theme registration`)
        } catch (error) {
          // Duplicate id means another copy is already live; that is not a fault.
          if (!String(error?.message ?? error).includes('already registered')) {
            console.warn(`[${ID}] theme registration refused:`, error)
          }
        }
        if (ctx.locale !== undefined && typeof ctx.locale.register === 'function') {
          try {
            const text = copy()
            ctx.effect(() => ctx.locale.register(`${ID}.theme`, {
              zh: { [THEME_ID]: text.klee },
              en: { [THEME_ID]: text.klee },
            }), `${ID}: theme label`)
          } catch {
            // A host without the theme-label convention keeps the raw id.
          }
        }
      }
    }

    /** The fixed backdrop layer; created once, then reused across re-applies. */
    function ensureBackdrop() {
      let node = document.getElementById(BACKDROP_ID)
      if (node === null) {
        node = document.createElement('div')
        node.id = BACKDROP_ID
        node.setAttribute(BACKDROP_ATTR, '')
        node.setAttribute('aria-hidden', 'true')
        document.body.insertBefore(node, document.body.firstChild)
      }
      return node
    }

    /**
     * Backdrop layer and the shell's transparent window.
     *
     * Layering, outermost first: the artwork layer sits behind everything; the
     * frame is cleared so the artwork shows at the frame edges and behind the
     * sidebar; the reading column keeps a solid surface. That last point is the
     * whole readability contract — **text never sits directly on the artwork**.
     * An earlier revision cleared the column too, which is why body text became
     * hard to read no matter how the palette was tuned.
     *
     * The artwork is blurred, slightly enlarged and veiled for the surfaces that
     * are still translucent (the sidebar): busy outlines stop competing with
     * small text, and the scale hides the soft edge blur leaves at the viewport
     * border. `--dsh-klee-backdrop-strength` (0–1) fades the layer;
     * `--dsh-klee-artwork-blur` overrides the blur (0 = sharp artwork).
     */
    const THEME_STYLE = `
:root,
body {
  --dsh-klee-backdrop-strength: 1;
  --dsh-klee-artwork-blur: blur(3px) saturate(0.94);
}
/* The reading column is opaque: this is what keeps copy legible. */
.BynINW_centerCol,
[data-windows-titlebar] .BynINW_centerCol {
  background: var(--dsw-alias-bg-base);
}
/* The frame stays clear so the artwork shows through the sidebar's own
   translucent fill and at the frame edges. */
html[data-windows-titlebar] .BynINW_frame,
.BynINW_frame {
  background: transparent;
}
#${BACKDROP_ID} {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  opacity: var(--dsh-klee-backdrop-strength, 1);
  background-image: url("${ASSETS.bgLandscape}");
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  filter: var(--dsh-klee-artwork-blur, blur(3px) saturate(0.94));
  transform: scale(1.03);
  transition: opacity 200ms ease;
}
/* Narrower than 13:10 switches to the 4:3 artwork, so the character is not
   cropped away by a tall, narrow window. */
@media (max-aspect-ratio: 13/10) {
  #${BACKDROP_ID} {
    background-image: url("${ASSETS.bgPortrait}");
  }
}
/* The warm veil: flattens the artwork's hottest highlights so the surfaces that
   are still translucent keep dark text readable. */
#${BACKDROP_ID}::after {
  content: '';
  position: absolute;
  inset: 0;
  background:
    radial-gradient(120% 90% at 50% 0%, rgba(255, 244, 234, 0.46) 0%, rgba(255, 244, 234, 0.12) 62%),
    linear-gradient(180deg, rgba(255, 246, 238, 0.30) 0%, rgba(255, 246, 238, 0.58) 100%);
}
@media (prefers-reduced-motion: reduce) {
  #${BACKDROP_ID} { transition: none; }
}
`

    /**
     * Both icon swaps.
     *
     * Selectors are structural — never the host's CSS-module class hashes
     * (`Hqq-bq_fish`, `RlGAzG_primary` in the build this was written against),
     * which change per build:
     *
     *  - the hero mark is the glyph beside the hero headline. The host draws it
     *    as an inline `<svg aria-hidden="true">` inside an inline-flex `<span>`;
     *    that span is the positioning context, painted with `::after`, and its
     *    svg is hidden. `:not(:has(button, a))` keeps the rule off icons that
     *    live inside interactive wrappers, and the whole swap is unconditional,
     *    so it does not depend on whether the host renders its own fallback.
     *  - the composer's primary button is the round one whose `aria-label` is
     *    the send action; the stop state is a different label, so it is left
     *    alone. Its svg is hidden and the artwork painted in its place — inside
     *    the round red button, so the send affordance stays recognisable.
     */
    const HERO_SPAN = 'span:has(> svg[aria-hidden="true"]):not(:has(button, a))'
    const SEND_LABELS = ['发送', 'Send', 'Steer', 'Queue', '排队', '插话']

    const ICONS_STYLE = `
${HERO_SPAN} {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
${HERO_SPAN} > svg[aria-hidden="true"] {
  display: none !important;
}
${HERO_SPAN}::after {
  content: '';
  display: block;
  width: 1.7em;
  height: 1.7em;
  background-image: url("${ASSETS.heroMark}");
  background-size: contain;
  background-position: center;
  background-repeat: no-repeat;
}
${SEND_LABELS.map((label) => `button[aria-label*="${label}"] > svg[aria-hidden="true"]`).join(',\n')} {
  display: none !important;
}
${SEND_LABELS.map((label) => `button[aria-label*="${label}"]::after`).join(',\n')} {
  content: '';
  width: 22px;
  height: 22px;
  background-image: url("${ASSETS.sendIcon}");
  background-size: contain;
  background-position: center;
  background-repeat: no-repeat;
}
`
    /**
     * Count the hero marks the plugin paints, for diagnostics only. The
     * stylesheet never reads this, so a failure here cannot blank an icon. If
     * the number is higher than the number of hero headlines on screen, the
     * selector above is reaching somewhere it should not — narrow it before
     * trusting the swap.
     */
    function watchHeroMarks() {
      const update = () => {
        try {
          const marks = document.querySelectorAll(HERO_SPAN).length
          document.documentElement.setAttribute(STATUS_ATTR, String(marks))
        } catch {
          // `:has()` unsupported or the selector threw: diagnostics are optional.
        }
      }
      update()
      if (typeof MutationObserver !== 'function') return () => {}
      const observer = new MutationObserver(update)
      try {
        observer.observe(document.body, { childList: true, subtree: true })
      } catch {
        return () => {}
      }
      return () => { observer.disconnect() }
    }

    /** Append a plugin-owned stylesheet once; the host removes it on unload. */
    function ensureStyle(id, css) {
      if (document.getElementById(id) !== null) return
      const node = document.createElement('style')
      node.id = id
      node.textContent = css
      document.head.append(node)
    }

    const apply = (ctx) => {
      const backdrop = ensureBackdrop()
      ctx.effect(() => () => { backdrop?.remove() }, `${ID}: backdrop teardown`)

      ensureStyle(THEME_STYLE_ID, THEME_STYLE)
      ensureStyle(ICONS_STYLE_ID, ICONS_STYLE)

      applyPalette(ctx)
      ctx.effect(() => watchHeroMarks(), `${ID}: brand mark observer`)
    }

    exports.apply = apply
    exports.name = ID
    exports.inject = ['theme', 'locale']
    return module.exports
  },
})
