/**
 * Build client/client.js from scripts/client.template.js, and optionally sync
 * the result into an installed profile copy.
 *
 * Artwork is discovered by base name, so the extension is whatever you drop in
 * (`hero-mark.png`, `hero-mark.jpg`, `hero-mark.webp`, …), and the media type
 * comes from the file's own magic bytes rather than the extension. Everything is
 * inlined as a data URI, so the served bundle is the whole plugin: no runtime
 * route, no fetch, no per-profile asset path.
 *
 * Usage:
 *   node scripts/build.mjs
 *   node scripts/build.mjs --bump
 *   node scripts/build.mjs --sync "C:/Users/<you>/.dsh/profiles/desktop"
 *
 * About `--sync`: a `file:` dependency is *copied* into the profile's
 * node_modules, and pnpm reports "Already up to date" for a directory spec whose
 * version it already recorded — even after `--force` — which would silently
 * leave the previous bundle installed. So `--sync` copies the runtime files over
 * the installed copy itself. Only the runtime set travels; the profile's own
 * package.json is never touched. `--bump` raises the patch version, which is what
 * makes a plain `pnpm add` pick the new bytes up as well.
 */

import { readFile, writeFile, mkdir, cp, rm, readdir } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const PACKAGE_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const TEMPLATE = join(PACKAGE_ROOT, 'scripts', 'client.template.js')
const OUTPUT = join(PACKAGE_ROOT, 'client', 'client.js')
const MANIFEST = join(PACKAGE_ROOT, 'package.json')
const ASSETS = join(PACKAGE_ROOT, 'assets')
const PACKAGE_NAME = 'dsh-klee-theme'

/** Runtime files copied into an installed profile copy. */
const RUNTIME = ['package.json', 'cordis.patch.yml', 'README.md', 'LICENSE', 'lib', 'client', 'assets']

/** Extension preference when a base name has more than one candidate. */
const EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'avif', 'svg']

/** Artwork base names the template expects; the extension is discovered. */
const ARTWORK = {
  __BG_16X9__: 'bg-16x9',
  __BG_4X3__: 'bg-4x3',
  __HERO_MARK__: 'hero-mark',
  __SEND_ICON__: 'send-icon',
}

/**
 * Resolve one artwork by base name, whichever extension it carries.
 * @param base - file name without extension, e.g. `hero-mark`.
 * @returns {Promise<string>} the absolute path.
 */
async function findArtwork(base) {
  const entries = await readdir(ASSETS)
  const byLower = new Map(entries.map((name) => [name.toLowerCase(), name]))
  for (const ext of EXTENSIONS) {
    const hit = byLower.get(`${base}.${ext}`)
    if (hit !== undefined) return join(ASSETS, hit)
  }
  const matching = entries.filter((name) => name.toLowerCase().startsWith(`${base}.`))
  if (matching.length > 0) return join(ASSETS, matching[0])
  throw new Error(
    `no artwork for "${base}" in ${ASSETS} (looked for ${EXTENSIONS.map((e) => `${base}.${e}`).join(', ')})`,
  )
}

/**
 * The media type from the file's magic bytes. The extension is a hint, never
 * the authority: a mislabeled file (a `.png` holding WebP bytes) must not be
 * announced as something it is not.
 * @param bytes - the file's leading bytes.
 * @returns {string} a media type.
 */
function sniffMime(bytes) {
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes.toString('latin1', 1, 4) === 'PNG') return 'image/png'
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg'
  if (bytes.length >= 12 && bytes.toString('latin1', 0, 4) === 'RIFF' && bytes.toString('latin1', 8, 12) === 'WEBP') return 'image/webp'
  if (bytes.length >= 6 && ['GIF87a', 'GIF89a'].includes(bytes.toString('latin1', 0, 6))) return 'image/gif'
  if (bytes.length >= 12 && bytes.toString('latin1', 4, 8) === 'ftyp' && bytes.toString('latin1', 8, 12).startsWith('avif')) return 'image/avif'
  const head = bytes.subarray(0, 256).toString('utf8').trimStart()
  if (head.startsWith('<svg') || head.startsWith('<?xml')) return 'image/svg+xml'
  throw new Error(`unrecognised image format (leading bytes ${bytes.subarray(0, 4).toString('hex')})`)
}

/**
 * @param path - the artwork file.
 * @returns {Promise<{uri: string, mime: string, path: string, bytes: number}>}
 */
async function dataUri(path) {
  const bytes = await readFile(path)
  const mime = sniffMime(bytes)
  return {
    uri: `data:${mime};base64,${bytes.toString('base64')}`,
    mime,
    path,
    bytes: bytes.length,
  }
}

const argv = process.argv.slice(2)
const syncFlag = argv.indexOf('--sync')
const syncTarget = syncFlag === -1 ? undefined : argv[syncFlag + 1]
const bump = argv.includes('--bump')
if (syncFlag !== -1 && (syncTarget === undefined || syncTarget.startsWith('--'))) {
  throw new Error('--sync needs the profile directory, e.g. --sync "C:/Users/me/.dsh/profiles/desktop"')
}

/** @type {Record<string, {uri: string, mime: string, path: string, bytes: number}>} */
const artwork = {}
for (const [token, base] of Object.entries(ARTWORK)) {
  artwork[token] = await dataUri(await findArtwork(base))
}

let source = await readFile(TEMPLATE, 'utf8')
for (const [token, asset] of Object.entries(artwork)) {
  if (!source.includes(`'${token}'`)) throw new Error(`template is missing the ${token} placeholder`)
  source = source.replaceAll(`'${token}'`, `'${asset.uri}'`)
}

await mkdir(dirname(OUTPUT), { recursive: true })
await writeFile(OUTPUT, source, 'utf8')

// The version moves only when asked. A `file:` dependency is *copied* into a
// profile's node_modules and pnpm skips that copy while the version is unchanged,
// so the bump is what makes a later `pnpm add` install new bytes; `--sync` copies
// them outright. Opt-in keeps a release version stable across ordinary rebuilds.
const manifest = JSON.parse(await readFile(MANIFEST, 'utf8'))
if (bump) {
  const [major, minor, patch] = String(manifest.version ?? '0.0.0').split('.')
  manifest.version = `${major}.${minor}.${Number(patch) + 1}`
  await writeFile(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
}

const kb = (n) => `${(n / 1024).toFixed(1)} KB`
console.log(`built ${OUTPUT}`)
for (const [token, asset] of Object.entries(artwork)) {
  console.log(`  ${token.padEnd(14)} ${asset.mime.padEnd(11)} ${kb(asset.bytes).padStart(9)}  ${asset.path.slice(PACKAGE_ROOT.length + 1)}`)
}
console.log(`  bundle         ${' '.repeat(11)} ${kb(source.length).padStart(9)}`)
console.log(`version -> ${manifest.version}`)

if (syncTarget !== undefined) {
  const installed = resolve(syncTarget, 'node_modules', PACKAGE_NAME)
  await mkdir(installed, { recursive: true })
  for (const entry of RUNTIME) {
    const from = join(PACKAGE_ROOT, entry)
    const to = join(installed, entry)
    await rm(to, { recursive: true, force: true })
    await cp(from, to, { recursive: true })
    console.log(`synced ${entry} -> ${to}`)
  }
}
