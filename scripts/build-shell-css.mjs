/**
 * Pre-compiles Tailwind CSS + Nuxt UI into src/runtime/public/css/shell.css.
 * Wrapped in `@scope (.nuxt-stories-shell)` so even when Nuxt injects this
 * stylesheet into the frame page (FOUC prevention), it has ZERO effect there
 * — no .nuxt-stories-shell element exists in the frame document.
 *
 * Run: node scripts/build-shell-css.mjs
 */
import { compile } from '@tailwindcss/node'
import { Scanner } from '@tailwindcss/oxide'
import postcss from 'postcss'
import { writeFile, mkdir } from 'fs/promises'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')
const base = resolve(root, 'src/runtime')

// --- 1. Compile --------------------------------------------------------------
// @source directives configure the oxide Scanner's file scan paths.
const inputCss = `
@import "tailwindcss";
@import "@nuxt/ui";
@source "./components/**/*.vue";
@source "./layouts/**/*.vue";
@source "../../node_modules/@nuxt/ui/dist/runtime/**/*.{vue,js,mjs}";
`

const result = await compile(inputCss, { base, onDependency: () => {} })

// --- 2. Scan for candidates --------------------------------------------------
const scanner = new Scanner({ sources: result.sources })
const candidates = scanner.scan()

// --- 3. Build raw CSS --------------------------------------------------------
const rawCss = result.build(candidates)

// --- 4. Scope under `.nuxt-stories-shell` via PostCSS ------------------------
//
//  @layer X, Y;   → top level  (layer ordering declarations must be global)
//  @keyframes     → top level  (keyframes are globally scoped by spec)
//  @font-face     → top level
//  everything else → inside @scope (.nuxt-stories-shell)
//  :root / :host  → replaced with :scope inside the block so CSS variables
//                   land on .nuxt-stories-shell and still inherit downward.

const SCOPE = '.nuxt-stories-shell'
const topLevel = []
const scoped = []

postcss.parse(rawCss).each((node) => {
    if (node.type === 'atrule') {
        const name = node.name.toLowerCase()
        if ((name === 'layer' && !node.nodes) || name === 'keyframes' || name === 'font-face') {
            topLevel.push(node.clone())
            return
        }
    }
    scoped.push(node.clone())
})

function replaceRootSelectors(nodes) {
    for (const node of nodes) {
        if (node.type === 'rule') {
            node.selectors = [...new Set(node.selectors.map((sel) => {
                return /^(:root|:host)(\s*,\s*(:root|:host))*$/.test(sel.trim()) ? ':scope' : sel
            }))]
        }
        if (node.nodes) replaceRootSelectors(node.nodes)
    }
}
replaceRootSelectors(scoped)

const scopeBlock = postcss.atRule({ name: 'scope', params: `(${SCOPE})` })
for (const n of scoped) scopeBlock.append(n)

const output = postcss.root()
for (const n of topLevel) output.append(n)
output.append(scopeBlock)

const scopedCss = output.toResult().css

// --- 5. Write output ---------------------------------------------------------
const outDir = resolve(root, 'src/runtime/public/css')
await mkdir(outDir, { recursive: true })
await writeFile(resolve(outDir, 'shell.css'), scopedCss)
console.log(`shell.css  ${(scopedCss.length / 1024).toFixed(1)} KB  (${candidates.length} candidates)`)
