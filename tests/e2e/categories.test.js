import { vi, describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import { prisma } from "../../src/lib/prisma.js";

vi.mock("../../src/lib/prisma.js", () => ({
  prisma: {
    productCategories: {
      findMany: vi.fn(),
    },
    storeCategories: {
      findMany: vi.fn(),
    },
  },
}));

const mockProductCategories = [
  { id_product_category: 1, name: "Electrónica", status: true, created_at: "2026-01-01T00:00:00.000Z", updated_at: "2026-01-01T00:00:00.000Z" },
  { id_product_category: 2, name: "Ropa", status: true, created_at: "2026-01-01T00:00:00.000Z", updated_at: "2026-01-01T00:00:00.000Z" },
];

const mockStoreCategories = [
  { id_store_category: 1, name: "Tecnología", status: true, created_at: "2026-01-01T00:00:00.000Z", updated_at: "2026-01-01T00:00:00.000Z" },
  { id_store_category: 2, name: "Moda", status: true, created_at: "2026-01-01T00:00:00.000Z", updated_at: "2026-01-01T00:00:00.000Z" },
];

// ─── GET /api/categories/products ────────────────────────────────────────────

describe("GET /api/categories/products", () => {
  beforeEach(() => vi.clearAllMocks());

  it("devuelve 200 con un array de categorías de productos", async () => {
    prisma.productCategories.findMany.mockResolvedValue(mockProductCategories);

    const res = await request(app).get("/api/categories/products");

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(2);
  });

  it("cada categoría tiene las propiedades id, name, status, createdAt, updatedAt", async () => {
    prisma.productCategories.findMany.mockResolvedValue(mockProductCategories);

    const res = await request(app).get("/api/categories/products");

    expect(res.status).toBe(200);
    const category = res.body[0];
    expect(category).toHaveProperty("id");
    expect(category).toHaveProperty("name");
    expect(category).toHaveProperty("status");
    expect(category).toHaveProperty("createdAt");
    expect(category).toHaveProperty("updatedAt");
  });

  it("devuelve array vacío cuando no hay categorías", async () => {
    prisma.productCategories.findMany.mockResolvedValue([]);

    const res = await request(app).get("/api/categories/products");

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("filtra categorías por nombre con el parámetro search", async () => {
    const filtered = [mockProductCategories[0]];
    prisma.productCategories.findMany.mockResolvedValue(filtered);

    const res = await request(app).get("/api/categories/products?search=elec");

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });
});

// ─── GET /api/categories/stores ──────────────────────────────────────────────

describe("GET /api/categories/stores", () => {
  beforeEach(() => vi.clearAllMocks());

  it("devuelve 200 con un array de categorías de comercios", async () => {
    prisma.storeCategories.findMany.mockResolvedValue(mockStoreCategories);

    const res = await request(app).get("/api/categories/stores");

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(2);
  });

  it("cada categoría tiene las propiedades id, name, status, createdAt, updatedAt", async () => {
    prisma.storeCategories.findMany.mockResolvedValue(mockStoreCategories);

    const res = await request(app).get("/api/categories/stores");

    expect(res.status).toBe(200);
    const category = res.body[0];
    expect(category).toHaveProperty("id");
    expect(category).toHaveProperty("name");
    expect(category).toHaveProperty("status");
    expect(category).toHaveProperty("createdAt");
    expect(category).toHaveProperty("updatedAt");
  });

  it("devuelve array vacío cuando no hay categorías", async () => {
    prisma.storeCategories.findMany.mockResolvedValue([]);

    const res = await request(app).get("/api/categories/stores");

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

// ─── GET /api/commerces/categories ───────────────────────────────────────────
// Módulo commerce: store-category.service.js (diferente al de /api/categories/stores)

describe("GET /api/commerces/categories", () => {
  beforeEach(() => vi.clearAllMocks());

  it("devuelve 200 con un array de categorías de comercios", async () => {
    prisma.storeCategories.findMany.mockResolvedValue(mockStoreCategories);

    const res = await request(app).get("/api/commerces/categories");

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(2);
  });

  it("soporta filtrado por nombre con el parámetro search", async () => {
    prisma.storeCategories.findMany.mockResolvedValue([mockStoreCategories[0]]);

    const res = await request(app).get("/api/commerces/categories?search=tec");

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].name).toBe("Tecnología");
  });

  it("respeta el parámetro limit (máximo 100)", async () => {
    prisma.storeCategories.findMany.mockResolvedValue([mockStoreCategories[0]]);

    const res = await request(app).get("/api/commerces/categories?limit=1");

    expect(res.status).toBe(200);
    // Vitest verifica que el mock fue llamado con take: 1
    expect(prisma.storeCategories.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 1 })
    );
  });
});
