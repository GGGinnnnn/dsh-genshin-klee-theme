/**
 * dsh-klee-theme — Host half.
 *
 * The theme is a browser-side feature: all artwork and every style override
 * live in the `./client` bundle that @deepseek-ai/dsh-client-modules serves to
 * the page. This Host entry exists so the bundle patch has a mountable row and
 * so `dsh.client` is scanned from a live Loader entry — it intentionally
 * registers nothing and touches no service.
 */

export const name = 'dsh-klee-theme'

export function apply() {
  // Intentionally empty: see the module doc comment.
}
