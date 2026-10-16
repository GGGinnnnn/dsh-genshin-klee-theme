// Structural dry-run of the checks @deepseek-ai/dsh-client-modules performs
// when it turns a package's `dsh.client` declaration into a served bundle.
const fs = require('node:fs')
const path = require('node:path')
const { createRequire } = require('node:module')

const profile = process.argv[2]
const name = process.argv[3]
const requireFrom = createRequire(path.join(profile, 'package.json'))

const pkgPath = requireFrom.resolve(`${name}/package.json`)
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))
console.log('1. loader entry resolves  :', pkgPath)

const decl = pkg.dsh && pkg.dsh.client
if (!decl || typeof decl.platform !== 'string') throw new Error('dsh.client.platform missing')
if (decl.inject !== undefined) {
  if (!Array.isArray(decl.inject) || decl.inject.some((x) => typeof x !== 'string')) throw new Error('dsh.client.inject must be a string array')
}
console.log('2. dsh.client declaration : ok ->', decl.platform, JSON.stringify(decl.inject))

const ex = pkg.exports && pkg.exports['./client']
const rel = typeof ex === 'string' ? ex : ex && typeof ex.default === 'string' ? ex.default : undefined
if (rel === undefined) throw new Error('exports["./client"] is not a resolvable string')
const bundle = createRequire(pkgPath).resolve(`${name}/client`)
console.log('3. client bundle resolves :', bundle, `${fs.statSync(bundle).size} bytes`)

const text = fs.readFileSync(bundle, 'utf8')
if (!text.includes(`id: '${name}'`)) throw new Error('bundle factory id does not match the package name')
console.log('4. factory id matches name: yes')

const patch = fs.readFileSync(path.join(path.dirname(pkgPath), pkg.dsh.bundle.patch.replace('./', '')), 'utf8')
if (!patch.includes(`name: ${name}`)) throw new Error('bundle patch does not insert the package name')
console.log('5. bundle patch inserts   :', name)

if (!fs.readFileSync(path.join(path.dirname(pkgPath), 'lib/index.js'), 'utf8').includes('export function apply')) {
  throw new Error('host half exports no apply()')
}
console.log('6. host half exports apply: yes')
console.log('ALL STRUCTURAL CHECKS PASSED')
