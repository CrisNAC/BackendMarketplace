const SENSITIVE_KEYS = new Set([
  "password",
  "password_hash",
  "token",
  "usertoken",
  "authorization",
  "cookie",
  "cookies",
  "secret",
  "jwt",
  "refresh_token",
  "access_token",
]);

const JWT_PATTERN = /eyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*/g;
const BEARER_PATTERN = /Bearer\s+\S+/gi;

/**
 * Elimina datos sensibles antes de escribir en logs (tokens, passwords, etc.).
 */
export function sanitizeForLog(value, depth = 0) {
  if (depth > 6) return "[MaxDepth]";
  if (value == null) return value;

  if (typeof value === "string") {
    return value
      .replace(JWT_PATTERN, "[REDACTED_JWT]")
      .replace(BEARER_PATTERN, "Bearer [REDACTED]");
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeForLog(item, depth + 1));
  }

  if (typeof value === "object") {
    const sanitized = {};
    for (const [key, val] of Object.entries(value)) {
      if (SENSITIVE_KEYS.has(key.toLowerCase())) {
        sanitized[key] = "[REDACTED]";
      } else {
        sanitized[key] = sanitizeForLog(val, depth + 1);
      }
    }
    return sanitized;
  }

  return value;
}

/**
 * Registra un evento de seguridad en stdout (JSON). Nunca incluir passwords ni tokens.
 */
export function logSecurityEvent(eventType, details = {}) {
  const payload = sanitizeForLog({
    timestamp: new Date().toISOString(),
    event: eventType,
    ...details,
  });

  console.info("[SECURITY]", JSON.stringify(payload));
}
