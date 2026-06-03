import { describe, it, expect, beforeEach } from "vitest";
import express from "express";
import request from "supertest";
import { rateLimit } from "express-rate-limit";

function buildApp(limiter) {
  const app = express();
  app.use(express.json());
  app.post("/test", limiter, (_req, res) => res.status(200).json({ ok: true }));
  return app;
}

function makeTestLimiter(limit, message) {
  return rateLimit({
    windowMs: 60 * 1000,
    limit,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { success: false, message },
  });
}

describe("loginRateLimiter — lógica de rate limit", () => {
  let app;

  beforeEach(() => {
    app = buildApp(makeTestLimiter(5, "Demasiados intentos de inicio de sesión. Esperá 15 minutos e intentá de nuevo."));
  });

  it("permite hasta 5 intentos", async () => {
    for (let i = 0; i < 5; i++) {
      const res = await request(app).post("/test").send({});
      expect(res.status).toBe(200);
    }
  });

  it("bloquea el 6° intento con 429", async () => {
    for (let i = 0; i < 5; i++) {
      await request(app).post("/test").send({});
    }
    const res = await request(app).post("/test").send({});
    expect(res.status).toBe(429);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/demasiados intentos/i);
  });

  it("incluye el header RateLimit en la respuesta", async () => {
    const res = await request(app).post("/test").send({});
    expect(res.headers).toHaveProperty("ratelimit");
  });
});

describe("passwordResetRateLimiter — lógica de rate limit", () => {
  let app;

  beforeEach(() => {
    app = buildApp(makeTestLimiter(3, "Demasiadas solicitudes de recuperación de contraseña. Esperá 1 hora e intentá de nuevo."));
  });

  it("permite hasta 3 solicitudes", async () => {
    for (let i = 0; i < 3; i++) {
      const res = await request(app).post("/test").send({});
      expect(res.status).toBe(200);
    }
  });

  it("bloquea la 4° solicitud con 429", async () => {
    for (let i = 0; i < 3; i++) {
      await request(app).post("/test").send({});
    }
    const res = await request(app).post("/test").send({});
    expect(res.status).toBe(429);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/demasiadas solicitudes/i);
  });

  it("incluye el header RateLimit en la respuesta", async () => {
    const res = await request(app).post("/test").send({});
    expect(res.headers).toHaveProperty("ratelimit");
  });
});
