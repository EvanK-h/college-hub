// Vitest swaps the "server-only" package for this empty module (see vitest.config.mts).
// The real package throws when imported outside a Next.js server build, which would stop
// unit tests from loading server modules. The build-time protection is unaffected.
export {};
