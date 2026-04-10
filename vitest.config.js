import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    testTimeout: 30000,
    coverage: {
      provider: "v8",
      // Formatos de reporte: texto en consola + HTML navegable + lcov para CI
      reporter: ["text", "html", "lcov"],
      // Solo medir cobertura del código fuente
      include: ["src/**/*.js"],
      exclude: [
        "src/server.js",      // entry point, no contiene lógica
        "src/lib/prisma.js",  // configuración de cliente, no lógica de negocio
      ],
    }
  }
});