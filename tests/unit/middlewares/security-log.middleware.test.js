import { describe, it, expect, vi, afterEach } from "vitest";
import { securityResponseLogger } from "../../../src/middlewares/security-log.middleware.js";
import * as securityLogger from "../../../src/lib/security-logger.js";

describe("securityResponseLogger", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("registra FORBIDDEN cuando la respuesta es 403", () => {
    const logSpy = vi.spyOn(securityLogger, "logSecurityEvent").mockImplementation(() => {});

    const req = {
      method: "PATCH",
      originalUrl: "/api/orders/1/status",
      user: { id_user: 5, role: "SELLER" },
    };

    const listeners = {};
    const res = {
      statusCode: 403,
      on: vi.fn((event, handler) => {
        listeners[event] = handler;
      }),
    };

    const next = vi.fn();
    securityResponseLogger(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    listeners.finish();

    expect(logSpy).toHaveBeenCalledWith("FORBIDDEN", {
      method: "PATCH",
      path: "/api/orders/1/status",
      userId: 5,
      role: "SELLER",
    });
  });

  it("no registra eventos para otros códigos HTTP", () => {
    const logSpy = vi.spyOn(securityLogger, "logSecurityEvent").mockImplementation(() => {});

    const req = { method: "GET", path: "/api/test" };
    const listeners = {};
    const res = {
      statusCode: 200,
      on: vi.fn((event, handler) => {
        listeners[event] = handler;
      }),
    };

    const next = vi.fn();
    securityResponseLogger(req, res, next);
    listeners.finish();

    expect(next).toHaveBeenCalledOnce();
    expect(logSpy).not.toHaveBeenCalled();
  });
});
