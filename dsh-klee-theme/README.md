# dsh-klee-theme

A DSH Web theme: Klee artwork as the shell background, picked by viewport shape,
a replaced hero brand mark, and a palette sampled from the artwork itself.

## What it does

| Surface | Implementation |
| --- | --- |
| Background | A fixed `#dsh-klee-theme-backdrop` layer behind the shell. The 16:9 artwork by default, the 4:3 one under `@media (max-aspect-ratio: 13/10)`, both `background-size: cover`. |
| Shell transparency | The app's own surfaces (`--dsw-alias-bg-base` on `.BynINW_frame`, `--dsw-specific-sidebar-fill` on the sidebar column) are switched to transparent, so the layer shows through the translucent panels. |
| Hero brand mark | The headline glyph — an inline `<svg aria-hidden="true">` inside an inline-flex `<span>` — is hidden and the artwork painted on that span. |
| Composer send button | The round primary button whose `aria-label` is the send action: its arrow svg is hidden and the artwork painted inside the button. |
| Palette | `ctx.theme.overrideTokens()` stacks a light **and** dark alias-token layer over the active theme; `ctx.theme.register()` additionally makes `dsh-klee-theme` a selectable Appearance theme. |

## Why both icon swaps are pure CSS

A slot registration or a React element can fail silently: a refused registration,
a component the host renders into a hidden cell, a rejected `<img>`. An earlier
revision registered the hero mark into `conversation.hero.brand.mark` **and**
painted a CSS fallback, which produced two failures in turn — both mechanisms
painting at once (two marks side by side), then, once they were made mutually
exclusive, a blank hole whenever the slot half did not render.

The swap is therefore unconditional CSS, and the plugin does not inject `slots`
at all:

| Target | Selector | Effect |
| --- | --- | --- |
| Hero mark | `span:has(> svg[aria-hidden="true"]):not(:has(button, a))` | host svg hidden, artwork painted on the span via `::after` |
| Send button | `button[aria-label*="发送"]` (and `Send`/`Steer`/`Queue`/`排队`/`插话`) | arrow svg hidden, artwork painted inside the round button |

Selectors are structural — never the host's CSS-module class hashes
(`Hqq-bq_fish`, `RlGAzG_primary` in the build this was written against), which
change per build. `:not(:has(button, a))` keeps the hero rule off icons inside
interactive wrappers. A `MutationObserver` publishes the hero match count to
`data-dsh-klee-theme-hero-marks` on `<html>` for diagnostics only — no
stylesheet rule reads it, so bookkeeping can never blank an icon.

The send button keeps its own fill, hover and disabled styling; only the glyph
changes. The stop button carries a different `aria-label`, so it is untouched.

## Artwork format is discovered, not assumed

The build finds artwork by **base name** (`bg-16x9`, `bg-4x3`, `hero-mark`,
`send-icon`) and accepts whatever extension is present — `.png`, `.jpg`,
`.webp`, `.avif`, `.gif`, `.svg`. The declared media type comes from the file's
**magic bytes**, so a file whose extension lies about its format is still
embedded correctly. Everything is inlined as a data URI, which is why the served
bundle is the whole plugin: no runtime route, no fetch, no per-profile asset
path.

## DSH surfaces it uses

- `dsh.client` in `package.json` → the package is a browser-visible client plugin
  (`@deepseek-ai/dsh-client-modules` serves `exports["./client"]`).
- `dsh.bundle.patch` + `cordis.patch.yml` → the bundle mounts a Loader row.
- `lib/index.js` → an intentionally empty Host half that keeps the plugin on the
  host roster.
- Client context: `theme`, `locale`. Deliberately **not** `slots` — see the icon
  swap note above.

## Build and verify

```sh
node scripts/build.mjs
node scripts/build.mjs --bump                          # raise the patch version
node scripts/build.mjs --sync "<profile dir>"          # also refresh the installed copy
node scripts/verify-install.cjs "<dir>" dsh-klee-theme
node scripts/verify-runtime.cjs "<client.js>"          # runs the bundle in a stub DOM
```

`--sync` exists because a `file:` dependency is copied into the profile's
`node_modules`, while pnpm answers "Already up to date" for a directory spec
whose version it already recorded — including after `--force`. `--sync` copies
the runtime files outright, and `--bump` is what makes a plain `pnpm add` see the
new bytes too. The bump is opt-in so a release version stays put.

`verify-runtime.cjs` executes the real bundle against a stub DOM and asserts what
a browser would actually get: the artwork data URIs, the media query, both icon
swaps, the palette layer and the registered theme.

## Customising

- **Backdrop strength** — set `--dsh-klee-backdrop-strength` (on `<body>`); `0`
  keeps the palette and drops the artwork.
- **Artwork** — drop a replacement in `assets/` under the same base name
  (any extension) and delete the old one, then rebuild and `--sync`.
- **Hero icon size** — the `1.7em` size on the hero span's `::after`.
- **Send icon size** — the `22px` size on the send button's `::after`.
- **Palette** — `KLEE_TOKENS` (light) and `KLEE_TOKENS_DARK` (dark) in
  `scripts/client.template.js`.
- **Shape breakpoint** — the `max-aspect-ratio: 13/10` media query.

## Layout

```
package.json          dsh.client + dsh.bundle declarations
cordis.patch.yml      mounts the row into the profile tree
lib/index.js          empty Host half
client/client.js      built bundle (artwork inlined, ~389 KB)
assets/               the artworks, discovered by base name
scripts/              template, build, install verifier, runtime verifier, uninstall
LICENSE               MIT
```
