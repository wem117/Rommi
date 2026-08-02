// Test-only stand-in for the `server-only` package, which throws when imported
// outside a server bundle. Aliased in vitest.config.ts so unit tests can import
// pure exports (constants, mappers) from server modules.
export {};
