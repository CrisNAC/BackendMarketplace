import { vi, describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import app from "../../../src/app.js";
import { prisma } from "../../../src/lib/prisma.js";

vi.mock("../../../src/lib/prisma.js", () => ({
  prisma: {
    productCategories: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  }
}));

vi.mock("jsonwebtoken", async () => {
  const actual = await vi.importActual("jsonwebtoken");
  return {
    default: {
      ...actual.default,
      verify: vi.fn((token, secret, callback) => {
        callback(null, { 
          id_user: 1, 
          email: "seller@test.com", 
          role: "SELLER" 
        });
      }),
    }
  };
});

const mockCategoryRequest = {
  id_product_category: 1,
  name: "Electrónica",
  visible: false,
  status: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const authCookie = "userToken=mock-token";

// ─── Tests: POST /api/commerces/category-requests ────────────────────────────
describe("POST /api/commerces/category-requests — Crear solicitud de categoría", () => {
  beforeEach(() => vi.clearAllMocks());

  it("devuelve 201 Created cuando la solicitud es válida", async () => {
    prisma.productCategories.findFirst.mockResolvedValue(null);
    prisma.productCategories.create.mockResolvedValue(mockCategoryRequest);

    const res = await request(app)
      .post("/api/commerces/category-requests")
      .set("Cookie", authCookie)
      .send({ name: "Electrónica" });

    expect(res.status).toBe(201);
    expect(res.body.message).toMatch(/solicitud de categoría creada exitosamente/i);
    expect(res.body.data).toHaveProperty("id");
    expect(res.body.data).toHaveProperty("name", "Electrónica");
    expect(res.body.data).toHaveProperty("visible", false);
    expect(res.body.data).toHaveProperty("status", true);
  });

  it("devuelve 400 cuando el nombre está vacío", async () => {
    const res = await request(app)
      .post("/api/commerces/category-requests")
      .set("Cookie", authCookie)
      .send({ name: "" });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/nombre de la categoría no puede estar vacío/i);
  });

  it("devuelve 400 cuando el nombre es solo espacios en blanco", async () => {
    const res = await request(app)
      .post("/api/commerces/category-requests")
      .set("Cookie", authCookie)
      .send({ name: "   " });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/nombre de la categoría no puede estar vacío/i);
  });

  it("devuelve 400 cuando el nombre no está presente en el cuerpo", async () => {
    const res = await request(app)
      .post("/api/commerces/category-requests")
      .set("Cookie", authCookie)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/nombre de la categoría no puede estar vacío/i);
  });

  it("devuelve 400 cuando el nombre excede 100 caracteres", async () => {
    const longName = "a".repeat(101);

    const res = await request(app)
      .post("/api/commerces/category-requests")
      .set("Cookie", authCookie)
      .send({ name: longName });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/no puede exceder 100 caracteres/i);
  });

  it("devuelve 409 Conflict cuando la categoría ya existe (aprobada)", async () => {
    prisma.productCategories.findFirst.mockResolvedValue({
      id_product_category: 1,
      name: "Electrónica",
      visible: true,
      status: true,
    });

    const res = await request(app)
      .post("/api/commerces/category-requests")
      .set("Cookie", authCookie)
      .send({ name: "Electrónica" });

    expect(res.status).toBe(409);
    expect(res.body.error.message).toMatch(/categoría.*ya existe/i);
  });

  it("devuelve 409 Conflict cuando ya existe una solicitud pendiente con ese nombre", async () => {
    prisma.productCategories.findFirst.mockResolvedValue({
      id_product_category: 2,
      name: "Electrónica",
      visible: false,
      status: true,
    });

    const res = await request(app)
      .post("/api/commerces/category-requests")
      .set("Cookie", authCookie)
      .send({ name: "Electrónica" });

    expect(res.status).toBe(409);
    expect(res.body.error.message).toMatch(/solicitud pendiente/i);
  });

  it("detecta categorías existentes sin importar mayúsculas/minúsculas", async () => {
    prisma.productCategories.findFirst.mockResolvedValue({
      id_product_category: 1,
      name: "ELECTRÓNICA",
      visible: true,
      status: true,
    });

    const res = await request(app)
      .post("/api/commerces/category-requests")
      .set("Cookie", authCookie)
      .send({ name: "electrónica" });

    expect(res.status).toBe(409);
    expect(res.body.error.message).toMatch(/categoría.*ya existe/i);
  });

  it("devuelve 401 Unauthorized cuando no está autenticado", async () => {
    const res = await request(app)
      .post("/api/commerces/category-requests")
      .send({ name: "Electrónica" });

    expect(res.status).toBe(401);
  });

  it("devuelve 403 Forbidden cuando el rol no es comercio", async () => {
    const jwt = await import("jsonwebtoken");
    jwt.default.verify.mockImplementationOnce((token, secret, callback) => {
      callback(null, {
        id_user: 1,
        email: "admin@test.com",
        role: "ADMIN"
      });
    });

    const res = await request(app)
      .post("/api/commerces/category-requests")
      .set("Cookie", authCookie)
      .send({ name: "Electrónica" });

    expect(res.status).toBe(403);
    expect(res.body.error.message).toMatch(/permisos/i);
  });

  it("trimea espacios en blanco del nombre", async () => {
    prisma.productCategories.findFirst.mockResolvedValue(null);
    prisma.productCategories.create.mockResolvedValue({
      ...mockCategoryRequest,
      name: "Electrónica"
    });

    const res = await request(app)
      .post("/api/commerces/category-requests")
      .set("Cookie", authCookie)
      .send({ name: "  Electrónica  " });

    expect(res.status).toBe(201);
    expect(prisma.productCategories.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: "Electrónica",
          visible: false,
          status: true
        })
      })
    );
  });

  it("devuelve la estructura correcta de respuesta", async () => {
    prisma.productCategories.findFirst.mockResolvedValue(null);
    prisma.productCategories.create.mockResolvedValue(mockCategoryRequest);

    const res = await request(app)
      .post("/api/commerces/category-requests")
      .set("Cookie", authCookie)
      .send({ name: "Electrónica" });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("message");
    expect(res.body).toHaveProperty("data");
    expect(res.body.data).toHaveProperty("id");
    expect(res.body.data).toHaveProperty("name");
    expect(res.body.data).toHaveProperty("visible");
    expect(res.body.data).toHaveProperty("status");
    expect(res.body.data).toHaveProperty("createdAt");
    expect(res.body.data).toHaveProperty("updatedAt");
  });
});