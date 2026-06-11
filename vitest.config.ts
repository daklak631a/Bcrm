import path from "node:path"
import { defineConfig } from "vitest/config"

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  test: {
    environment: "node",
    include: ["**/*.test.ts", "**/*.test.tsx"],
    exclude: ["node_modules", ".next", "scratch", "gas-frontend"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      reportsDirectory: "coverage",
      include: [
        "lib/access-control.ts",
        "lib/api-errors.ts",
        "lib/api-validation.ts",
        "lib/errors.ts",
        "lib/logger.ts",
        "lib/middleware/rate-limit.ts",
        "lib/supabase/mappers.ts",
        "lib/workflow-config.ts",
      ],
      thresholds: {
        statements: 40,
        branches: 40,
        functions: 60,
        lines: 40,
      },
    },
  },
})
