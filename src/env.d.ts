/* eslint-disable @typescript-eslint/no-empty-object-type */

/**
 * Augment ImportMeta with Node.js 20.11+ properties.
 * These are available at runtime via `tsx` but TypeScript's
 * built-in types don't include them yet.
 */
interface ImportMeta {
  /** Absolute path of the directory containing the current module (Node ≥ 20.11) */
  readonly dirname: string;
  /** Absolute path of the current module file (Node ≥ 20.11) */
  readonly filename: string;
}
