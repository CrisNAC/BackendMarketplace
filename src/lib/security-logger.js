const SENSITIVE_KEY_NAMES = [
  "password",
  "password_hash",
  "token",
  "user_token",
  "authorization",
  "cookie",
  "cookies",
  "secret",
  "jwt",
  "refresh_token",
  "access_token",
];

const JWT_PATTERN = /eyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*/g;
const BEARER_PATTERN = /Bearer\s+\S+/gi;
const CONTROL_CHARS_PATTERN = /[\u0000-\u001F\u007F]/g;

/**
 * Normaliza nombres de clave (camelCase, kebab-case) a snake_case en minúsculas.
 */
export function normalizeKey(key) {
  if (typeof key !== "string") return "";
  return key
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/-/g, "_")
    .toLowerCase();
}

const SENSITIVE_KEYS = new Set(SENSITIVE_KEY_NAMES.map(normalizeKey));

function isSensitiveKey(key) {
  return SENSITIVE_KEYS.has(normalizeKey(key));
}

function sanitizeLogString(str) {
  return str
    .replace(CONTROL_CHARS_PATTERN, "")
    .replace(JWT_PATTERN, "[REDACTED_JWT]")
    .replace(BEARER_PATTERN, "Bearer [REDACTED]");
}

/**
 * Elimina datos sensibles antes de escribir en logs (tokens, passwords, etc.).
 */
export function sanitizeForLog(value, depth = 0) {
  if (depth > 6) return "[MaxDepth]";
  if (value == null) return value;

  if (typeof value === "string") {
    return sanitizeLogString(value);
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeForLog(item, depth + 1));
  }

  if (typeof value === "object") {
    const sanitized = {};
    for (const [key, val] of Object.entries(value)) {
      if (isSensitiveKey(key)) {
        sanitized[key] = "[REDACTED]";
      } else {
        sanitized[key] = sanitizeForLog(val, depth + 1);
      }
    }
    return sanitized;
  }

  return String(value);
}

/**
 * Registra un evento de seguridad en stdout (JSON). Nunca incluir passwords ni tokens.
 * No lanza errores: fallos de logging no afectan el flujo de negocio.
 */
export function logSecurityEvent(eventType, details = {}) {
  try {
    const { event: _ignoredEvent, timestamp: _ignoredTimestamp, ...safeDetails } = details;

    const payload = sanitizeForLog({
      ...safeDetails,
      timestamp: new Date().toISOString(),
      event: eventType,
    });

    console.info("[SECURITY]", JSON.stringify(payload));
  } catch (err) {
    console.error(
      "[SECURITY] Failed to log security event:",
      eventType,
      err?.message ?? err
    );
  }
}
