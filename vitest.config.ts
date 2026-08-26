import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
  test: {
    globals: true,
    include: ["packages/*/src/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["packages/rules/src/**/*.ts"],
      exclude: ["**/*.test.ts", "**/index.ts"],
      // AGENTS.md §2: the rules engine is a merge gate, not a target.
      thresholds: { branches: 100, functions: 100, lines: 100, statements: 100 },
    },
  },
  resolve: {
    alias: {
      "@siteos/rules": resolve(__dirname, "packages/rules/src/index.ts"),
      "@siteos/domain": resolve(__dirname, "packages/domain/src/index.ts"),
    },
  },
});
