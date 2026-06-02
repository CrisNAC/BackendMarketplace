# Excepciones de npm audit

Este archivo documenta las excepciones permitidas para el control de seguridad en CI.

- Política activa: el pipeline falla con vulnerabilidades `high` o `critical`.
- Estado actual: no hay excepciones aprobadas.

Si en el futuro se requiere una excepción, debe:

1. Agregarse en `security/audit-ci.json` dentro de `allowlist`.
2. Documentarse aquí con:
   - advisory/module afectado
   - justificación
   - fecha de aprobación
   - fecha de expiración
   - responsable
