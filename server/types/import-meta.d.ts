// The server tsconfig also typechecks shared files under frontend/src/lib.
// A few of them read import.meta.env, so declare just those keys here rather
// than pulling vite's client types into the server build.
interface ImportMetaEnv {
  readonly VITE_API_BASE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
