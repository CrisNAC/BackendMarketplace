import { describe, it, expect, vi, afterEach } from "vitest";
import { sanitizeForLog, logSecurityEvent } from "../../../src/lib/security-logger.js";

describe("security-logger", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("sanitizeForLog", () => {
    it("redacta claves sensibles", () => {
      const input = {
        email: "user@test.com",
        password: "secret123",
        token: "abc",
        userToken: "cookie-token",
      };

      expect(sanitizeForLog(input)).toEqual({
        email: "user@test.com",
        password: "[REDACTED]",
        token: "[REDACTED]",
        userToken: "[REDACTED]",
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
  });
});
