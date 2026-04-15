import { vi, describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import app from "../../../src/app.js";
import { prisma } from "../../../src/lib/prisma.js";

// ─── MOCKS ────────────────────────────────────────────────────────
vi.mock("../../../src/lib/prisma.js", () => ({
  prisma: {
    productCategories: { findUnique: vi.fn() }
  }
}));

vi.mock("../../../src/config/jwt.config.js", () => ({
  default: (req, res, next) => {
    const role = req.headers["x-test-role"];

    if (!role) {
      return res.status(401).json({ errors: { auth: { message: "No autenticado" } } });
    }

    const users = {
      admin: { id_user: 1, role: "ADMIN" },
      seller: { id_user: 10, role: "SELLER" },
      customer: { id_user: 2, role: "CUSTOMER" },
    };

    req.user = users[role] ?? null;

    if (!req.user) {
      return res.status(401).json({ errors: { auth: { message: "No autenticado" } } });
    }

    next();
  }
}));

// ─── HELPERS ──────────────────────────────────────────────────────
const asRole = (req, role) => req.set("x-test-role", role);

const mockCategory = {
  id_product_category: 1,
  name: "Electrónica",
  status: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  _count: { products: 5 }
};

// ─── GET /api/admin/categories/:id ────────────────────────────────
describe("GET /api/admin/categories/:id", () => {
  beforeEach(() => vi.resetAllMocks());

  it("devuelve 401 cuando no hay token", async () => {
    const res = await request(app).get("/api/admin/categories/1");

    expect(res.status).toBe(401);
  });

  it("devuelve 403 cuando el usuario no es ADMIN", async () => {
    const res = await asRole(
      request(app).get("/api/admin/categories/1"),
      "seller"
    );

    expect(res.status).toBe(403);
  });

  it("devuelve 403 cuando el usuario es CUSTOMER", async () => {
    const res = await asRole(
      request(app).get("/api/admin/categories/1"),
      "customer"
    );

    expect(res.status).toBe(403);
  });

  it("devuelve 400 cuando el id no es un entero válido", async () => {
    const res = await asRole(
      request(app).get("/api/admin/categories/abc"),
      "admin"
    );

    expect(res.status).toBe(400);
  });

  it("devuelve 404 cuando la categoría no existe", async () => {
    prisma.productCategories.findUnique.mockResolvedValue(null);

    const res = await asRole(
      request(app).get("/api/admin/categories/999"),
      "admin"
    );

    expect(res.status).toBe(404);
  });

  it("devuelve 200 con la categoría y productCount", async () => {
    prisma.productCategories.findUnique.mockResolvedValue(mockCategory);

    const res = await asRole(
      request(app).get("/api/admin/categories/1"),
      "admin"
    );

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      id: 1,
      name: "Electrónica",
      status: true,
      productCount: 5
    });
  });

  it("devuelve la categoría aunque status sea false (admin ve todo)", async () => {
    prisma.productCategories.findUnique.mockResolvedValue({
      ...mockCategory,
      status: false
    });

    const res = await asRole(
      request(app).get("/api/admin/categories/1"),
      "admin"
    );

    expect(res.status).toBe(200);
    expect(res.body.status).toBe(false);
  });

  it("retorna productCount en 0 cuando la categoría no tiene productos", async () => {
    prisma.productCategories.findUnique.mockResolvedValue({
      ...mockCategory,
      _count: { products: 0 }
    });

    const res = await asRole(
      request(app).get("/api/admin/categories/1"),
      "admin"
    );

    expect(res.status).toBe(200);
    expect(res.body.productCount).toBe(0);
  });
});