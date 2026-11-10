/// Vite environment types for the frontend.
///
/// Do not re-add `"vite/client"` to `compilerOptions.types` in
/// `frontend/tsconfig.json`. That fails with TS2688 in this repo because the
/// frontend install does not expose a standalone resolvable `vite/client` type
/// package in the way this config expects. Instead, reference the Vite type
/// shim directly from node_modules.
///
/// This file also types the static asset and CSS imports used by
/// `src/main.ts` so `tsc --noEmit` does not fail on them.

/// <reference types="vite/client" />

declare module '*.css' {
  const css: unknown;
  export default css;
}

declare module '*.png' {
  const src: string;
  export default src;
}

declare module '*.svg' {
  const src: string;
  export default src;
}
