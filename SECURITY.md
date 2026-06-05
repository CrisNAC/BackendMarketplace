# OWASP Top 10 2021 — Checklist de Seguridad

## Evidencia npm audit

### Frontend (FrontendMarketplace)
- Fecha: 2026-05-30
- Resultado antes del fix: 6 vulnerabilidades (4 moderate, 2 high)
- Resultado después de `npm audit fix`: **0 vulnerabilities**
- Paquetes resueltos: axios, vite, follow-redirects, postcss, brace-expansion, ws

### Backend (BackendMarketplace)
- Fecha: 2026-05-30
- Resultado antes del fix: 9 vulnerabilidades (8 moderate, 1 high)
- Resultado después de `npm audit fix`: **3 moderate** (no resolubles sin breaking change)
- Paquetes resueltos: fast-uri, hono, postcss, qs, brace-expansion, ws
- Vulnerabilidades residuales: `@hono/node-server` < 1.19.13 vía cadena `@prisma/dev` → `prisma`
  - Justificación: el fix requiere downgrade de Prisma de 7.x a 6.19.3 (breaking change). `@hono/node-server` es una dependencia interna del CLI de Prisma, no expuesta en producción. Riesgo real: mínimo.

---

## Checklist OWASP Top 10 2021

### A01 — Broken Access Control (Mitigado)
Middleware `authenticate()` con JWT en todas las rutas protegidas. Roles verificados por endpoint (ADMIN, SELLER, CUSTOMER, DELIVERY). Ownership checks en comercios y productos (`fk_user` vs `req.user.id_user`).

### A02 — Cryptographic Failures (Mitigado)
`.env` excluido del repo via `.gitignore`. Secretos validados al arranque (`validateEnv()`). Contraseñas hasheadas con `bcrypt`. JWT firmado con `JWT_SECRET`. Ver OM-560.

### A03 — Injection (Mitigado)
Prisma ORM con queries parametrizadas — SQL injection no es posible. Validación de inputs con Zod en el frontend. Sanitización de strings en services del backend.

### A04 — Insecure Design (Mitigado)
Borrado lógico en todas las entidades (campo `status`). Roles con mínimo privilegio. Comercios requieren aprobación de admin antes de ser visibles.

### A05 — Security Misconfiguration (Mitigado)
Helmet.js configurado en Express (headers de seguridad HTTP). CORS restringido a origen configurado. Variables de entorno obligatorias validadas al arranque. `Permissions-Policy` header configurado.

### A06 — Vulnerable and Outdated Components (Parcial)
Frontend: 0 vulnerabilidades post-fix. Backend: 3 vulnerabilidades moderate residuales en dependencia interna de Prisma CLI (`@hono/node-server`), no expuesta en producción. Fix requeriría downgrade con breaking change. Monitoreo continuo con `npm audit`.

### A07 — Identification and Authentication Failures (Mitigado)
JWT con httpOnly cookies (no accesible desde JS). Expiración de tokens configurada. Bcrypt para hashing de contraseñas. Flujo de reset de contraseña por email con token temporal.

### A08 — Software and Data Integrity Failures (Mitigado)
`package-lock.json` en el repo garantiza integridad de dependencias. `.env.example` sin secretos reales. Migraciones de Prisma versionadas y commiteadas.

### A09 — Security Logging and Monitoring Failures (Mitigado)
Morgan logger activo en todas las requests. Errores capturados por `errorHandler` centralizado. Logs de arranque con estado de variables de entorno.

### A10 — Server-Side Request Forgery (SSRF) (Mitigado)
Axios actualizado post-fix (vulnerabilidades SSRF resueltas). El backend no realiza requests a URLs proporcionadas por usuarios directamente. Geocodificación usa coordenadas validadas, no URLs arbitrarias.