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
const MAX_LOG_LINE_LENGTH = 8192;

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

function stripReservedDetailKeys(details) {
  if (details == null || typeof details !== "object" || Array.isArray(details)) {
    return {};
  }

  const safe = { ...details };
  delete safe.event;
  delete safe.timestamp;
  return safe;
}

/**
 * Construye la línea JSON del evento tras sanitizar y validar el contenido.
 */
export function buildSecurityLogLine(eventType, details = {}) {
  const payload = sanitizeForLog({
    ...stripReservedDetailKeys(details),
    timestamp: new Date().toISOString(),
    event: eventType,
  });

  return JSON.stringify(payload);
}

function isValidSecurityLogLine(line) {
  if (typeof line !== "string" || line.length === 0 || line.length > MAX_LOG_LINE_LENGTH) {
    return false;
  }

  if (CONTROL_CHARS_PATTERN.test(line)) {
    return false;
  }

  try {
    JSON.parse(line);
    return true;
  } catch {
    return false;
  }
}

function writeSecurityLogLine(line) {
  process.stdout.write(`[SECURITY] ${line}\n`);
}

/**
 * Registra un evento de seguridad en stdout (JSON). Nunca incluir passwords ni tokens.
 * No lanza errores: fallos de logging no afectan el flujo de negocio.
 */
export function logSecurityEvent(eventType, details = {}) {
  try {
    if (typeof eventType !== "string" || eventType.length === 0) {
      return;
    }

    const line = buildSecurityLogLine(eventType, details);
    if (!isValidSecurityLogLine(line)) {
      console.error("[SECURITY] Discarded invalid log line for event:", eventType);
      return;
    }

    writeSecurityLogLine(line);
  } catch (err) {
    console.error(
      "[SECURITY] Failed to log security event:",
      eventType,
      err?.message ?? err
    );
  }
}
