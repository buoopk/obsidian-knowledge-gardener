/**
 * Compile-time constant injected by esbuild via `define`.
 *
 * - `true`  in the Pro build   (`dist-pro/main.js`)
 * - `false` in the Free build  (`dist-free/main.js`)
 *
 * esbuild replaces every occurrence of `IS_PRO` with a literal
 * boolean (`true` / `false`).  Dead-code elimination then strips
 * the unreachable branch, and tree-shaking removes any imports
 * that were only referenced inside the eliminated branch.
 *
 * Usage:
 *   if (IS_PRO) {
 *       // This entire block — and its imports — are removed
 *       // from the Free build automatically.
 *   }
 */
declare const IS_PRO: boolean;