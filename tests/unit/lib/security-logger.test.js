import { describe, it, expect, vi, afterEach } from "vitest";
import {
  sanitizeForLog,
  logSecurityEvent,
  normalizeKey,
} from "../../../src/lib/security-logger.js";

describe("security-logger", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("normalizeKey", () => {
    it("convierte camelCase a snake_case", () => {
      expect(normalizeKey("accessToken")).toBe("access_token");
      expect(normalizeKey("passwordHash")).toBe("password_hash");
      expect(normalizeKey("refreshToken")).toBe("refresh_token");
    });
  });

  describe("sanitizeForLog", () => {
    it("redacta claves sensibles en snake_case y camelCase", () => {
      const input = {
        email: "user@test.com",
        password: "secret123",
        token: "abc",
        userToken: "cookie-token",
        accessToken: "at-123",
        refreshToken: "rt-456",
        passwordHash: "hash-value",
      };

      expect(sanitizeForLog(input)).toEqual({
        email: "user@test.com",
        password: "[REDACTED]",
        token: "[REDACTED]",
        userToken: "[REDACTED]",
        accessToken: "[REDACTED]",
        refreshToken: "[REDACTED]",
        passwordHash: "[REDACTED]",
      });
    });

    it("redacta JWT y Bearer en strings", () => {
      const jwt = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIn0.sig";
      const input = {
        message: `Login exitoso ${jwt}`,
        header: `Bearer ${jwt}`,
      };

      const sanitized = sanitizeForLog(input);
      expect(sanitized.message).not.toContain(jwt);
      expect(sanitized.header).not.toContain("Bearer eyJ");
      expect(sanitized.message).toContain("[REDACTED_JWT]");
    });

    it("elimina caracteres de control para evitar log injection", () => {
      const sanitized = sanitizeForLog({ path: "/api/test\nFAKE: injected" });
      expect(sanitized.path).not.toContain("\n");
      expect(sanitized.path).toBe("/api/testFAKE: injected");
    });
  });

  describe("logSecurityEvent", () => {
    it("escribe JSON sanitizado sin passwords ni tokens", () => {
      const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});

      logSecurityEvent("LOGIN_FAILED", {
        email: "user@test.com",
        password: "no-debe-aparecer",
        token: "no-debe-aparecer",
      });

      expect(infoSpy).toHaveBeenCalledOnce();
      const raw = infoSpy.mock.calls[0][1];
      expect(raw).not.toContain("no-debe-aparecer");
      const parsed = JSON.parse(raw);
      expect(parsed.event).toBe("LOGIN_FAILED");
      expect(parsed.password).toBe("[REDACTED]");
      expect(parsed.token).toBe("[REDACTED]");
      expect(parsed.email).toBe("user@test.com");
    });

    it("no permite que details sobrescriba event ni timestamp reservados", () => {
      const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});

      logSecurityEvent("ORDER_STATUS_CHANGED", {
        event: "MALICIOUS",
        timestamp: "1970-01-01T00:00:00.000Z",
        orderId: 1,
      });

      const parsed = JSON.parse(infoSpy.mock.calls[0][1]);
      expect(parsed.event).toBe("ORDER_STATUS_CHANGED");
      expect(parsed.timestamp).not.toBe("1970-01-01T00:00:00.000Z");
      expect(parsed.orderId).toBe(1);
    });

    it("no relanza si falla el logging", () => {
      const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {
        throw new Error("logging down");
      });
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      expect(() => logSecurityEvent("LOGIN_FAILED", { email: "a@b.com" })).not.toThrow();
      expect(errorSpy).toHaveBeenCalled();
      infoSpy.mockRestore();
    });
  });
});
