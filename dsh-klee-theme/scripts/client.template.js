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
     * Visibility comes from this alpha and nothing else — the theme deliberately
     * does not touch host layout classes, because those are CSS-module hashes
     * that change with every DSH build (`BynINW_*` in one, `mP3x-q_*` in the
     * next) and the rules would silently stop matching. The host paints these
     * tokens on its own panes, so the artwork layer behind them shows through by
     * exactly (1 − alpha):
     *
     *  - the two big panes sit at 0.55 / 0.52 (light) and 0.74 / 0.70 (dark), so
     *    roughly 45% / 28% of the picture is visible;
     *  - every surface that carries small text or floats above content (cards,
     *    menus, popovers, composer, bubbles) stays at 0.85+.
     *
     * The text tiers are darker than a plain cream theme would need, because they
     * must clear WCAG AA against artwork-composited panes rather than flat cream.
     * Those numbers live in the project README and are asserted in
     * scripts/verify-runtime.cjs.
     */
    const KLEE_TOKENS = {
      // The two big panes: the v1.0 look — translucent *coral*, not cream, so the
      // artwork reads through a warm wash instead of a beige one. Alphas are live
      // knobs (see :root) so "how much background" never needs a rebuild.
      //
      // v1.0 defaults: 0.34 / 0.76. They were raised while chasing readability,
      // which is exactly what made the picture disappear; the darker text tiers
      // below carry legibility instead.
      '--dsw-alias-bg-base': 'rgba(240, 169, 123, var(--dsh-klee-pane-alpha, 0.34))',
      '--dsw-specific-sidebar-fill': 'rgba(247, 202, 169, var(--dsh-klee-sidebar-alpha, 0.76))',
      // Surfaces that carry small text stay near-solid.
      '--dsw-alias-bg-layer-1': 'rgba(249, 214, 186, 0.88)',
      '--dsw-alias-bg-layer-2': 'rgba(246, 198, 163, 0.86)',
      '--dsw-alias-bg-layer-3': 'rgba(252, 226, 202, 0.94)',
      '--dsw-alias-bg-overlay': 'rgba(253, 238, 224, 0.97)',
      '--dsw-specific-menu': 'rgba(253, 240, 228, 0.95)',
      '--dsw-specific-input-major': 'rgba(253, 242, 231, 0.94)',
      '--dsw-specific-bubble': 'rgba(255, 208, 176, 0.92)',
      '--dsw-specific-selector': 'rgba(253, 234, 216, 0.94)',

      // Text and icons — deep warm brown, far darker than v1.0's #4a2a20,
      // because the pane is now a thin coral wash over a busy picture. These are
      // the darkest values that keep the coral wash thin *and* the text legible.
      '--dsw-alias-label-primary': '#140a05',
      '--dsw-alias-label-secondary': '#24120a',
      '--dsw-alias-label-tertiary': '#301810',
      '--dsw-alias-label-caption': '#301810',
      '--dsw-alias-label-primary-dimmed': '#1c0f07',
      '--dsw-alias-label-primary-inverted': '#fff7f1',
      '--dsw-alias-label-quaternary': '#8a5340',
      '--dsw-alias-label-dimmed': '#7a4a37',

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
     * instead of a washed-out light one.
     *
     * The glass alpha is higher than the light set on purpose: the artwork
     * behind it is a bright coral, so a thin dark veil would leave light text on
     * a mid-tone. 0.66 keeps the picture readable as a background while light
     * text still clears AA over it.
     */
    const KLEE_TOKENS_DARK = {
      // v1.0 dark alphas, same reasoning as the light set.
      '--dsw-alias-bg-base': 'rgba(30, 19, 16, var(--dsh-klee-pane-alpha-dark, 0.52))',
      '--dsw-specific-sidebar-fill': 'rgba(41, 25, 21, var(--dsh-klee-sidebar-alpha-dark, 0.76))',
      '--dsw-alias-bg-layer-1': 'rgba(44, 27, 22, 0.86)',
      '--dsw-alias-bg-layer-2': 'rgba(56, 34, 27, 0.86)',
      '--dsw-alias-bg-layer-3': 'rgba(66, 40, 32, 0.92)',
      '--dsw-alias-bg-overlay': 'rgba(38, 23, 19, 0.96)',
      '--dsw-specific-menu': 'rgba(44, 27, 22, 0.95)',
      '--dsw-specific-input-major': 'rgba(50, 30, 25, 0.94)',
      '--dsw-specific-bubble': 'rgba(120, 57, 40, 0.92)',
      '--dsw-specific-selector': 'rgba(52, 32, 26, 0.94)',

      '--dsw-alias-label-primary': '#fff8f3',
      '--dsw-alias-label-secondary': '#fff3ea',
      '--dsw-alias-label-tertiary': '#fdeee3',
      '--dsw-alias-label-caption': '#fdeee3',
      '--dsw-alias-label-primary-dimmed': '#fdf1ea',
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
     * Backdrop layer and the one structural rule this theme does keep.
     *
     * An earlier revision cleared the shell frame and frosted the reading column
     * by class name. Those classes are CSS-module hashes that change with every
     * DSH build (`BynINW_*` in one, `mP3x-q_*` in the next), so the rules
     * silently stopped matching and the theme's own layering disappeared with
     * them. The picture now rides on the palette's alpha instead — the host
     * paints `--dsw-alias-bg-base` over this layer, so the artwork shows through
     * with no reliance on any generated class name.
     *
     * Two consequences, both handled here:
     *
     *  - **Dialogs must not be translucent.** Any window that paints
     *    `var(--dsw-alias-bg-base)` inherits the glass and its text lands on live
     *    content underneath — unreadable. `role="dialog"` / `role="alertdialog"`
     *    are semantic, not build hashes, so they are a safe structural hook and
     *    they cover third-party plugin windows too. Note: `aria-modal` is
     *    deliberately NOT required — plugins ship dialogs without it
     *    (`ds-harness-remote`, `dsh-peerweave` both do), and requiring it left
     *    exactly those windows transparent.
     *  - **The picture stays sharp.** Any blur reads as "the background is gone";
     *    the pane alpha is what keeps text legible instead.
     *
     * Knobs: `--dsh-klee-artwork-blur`, `--dsh-klee-backdrop-strength` (0–1),
     * `--dsh-klee-pane-alpha*`, and `--dsh-klee-dialog-fill`.
     */
    const THEME_STYLE = `
:root,
body {
  --dsh-klee-backdrop-strength: 1;
  --dsh-klee-artwork-blur: none;
  /* Pane opacity. Lower = more artwork visible, higher = more contrast.
     Defaults are v1.0's values and are what the assertions are computed against. */
  --dsh-klee-pane-alpha: 0.34;
  --dsh-klee-sidebar-alpha: 0.76;
  --dsh-klee-pane-alpha-dark: 0.52;
  --dsh-klee-sidebar-alpha-dark: 0.76;
  /* Window surfaces are opaque by contract (see the rule below). */
  --dsh-klee-dialog-fill: rgba(250, 238, 226, 0.985);
}
body[data-ds-dark-theme] {
  --dsh-klee-dialog-fill: rgba(34, 22, 18, 0.985);
}
/* A window is never see-through: its text sits above whatever it covers.
   aria-modal is not required on purpose — see the note above. */
[role="dialog"],
[role="alertdialog"],
[aria-modal="true"] {
  background-color: var(--dsh-klee-dialog-fill, rgba(253, 246, 239, 0.985)) !important;
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
  filter: var(--dsh-klee-artwork-blur, none);
  transition: opacity 200ms ease;
}
/* Narrower than 13:10 switches to the 4:3 artwork, so the character is not
   cropped away by a tall, narrow window. */
@media (max-aspect-ratio: 13/10) {
  #${BACKDROP_ID} {
    background-image: url("${ASSETS.bgPortrait}");
  }
}
/* A light warm veil: just enough to lift the hottest highlights, not enough to
   flatten the picture the theme exists for. */
#${BACKDROP_ID}::after {
  content: '';
  position: absolute;
  inset: 0;
  background:
    radial-gradient(120% 90% at 50% 0%, rgba(255, 246, 238, 0.18) 0%, rgba(255, 246, 238, 0) 62%),
    linear-gradient(180deg, rgba(255, 246, 238, 0.10) 0%, rgba(255, 246, 238, 0.22) 100%);
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
