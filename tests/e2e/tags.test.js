import { vi, describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import { prisma } from "../../src/lib/prisma.js";

vi.mock("../../src/lib/prisma.js", () => ({
  prisma: {
    productTags: {
      findMany: vi.fn(),
    },
    products: {
      count: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
  },
}));

const mockTags = [
  { id_product_tag: 1, name: "Oferta", created_at: "2026-01-01T00:00:00.000Z", updated_at: "2026-01-01T00:00:00.000Z" },
  { id_product_tag: 2, name: "Nuevo", created_at: "2026-01-01T00:00:00.000Z", updated_at: "2026-01-01T00:00:00.000Z" },
];

// ─── GET /products/tags ───────────────────────────────────────────────────────
describe("GET /products/tags", () => {
  beforeEach(() => vi.clearAllMocks());

  it("devuelve 200 con un array de tags", async () => {
    prisma.productTags.findMany.mockResolvedValue(mockTags);

    const res = await request(app).get("/products/tags");

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(mockTags.length);
  });

  it("cada tag tiene las propiedades id, name, created_at, updated_at", async () => {
    prisma.productTags.findMany.mockResolvedValue(mockTags);

    const res = await request(app).get("/products/tags");
    expect(res.status).toBe(200);

    const tag = res.body[0];
    expect(tag).toHaveProperty("id");
    expect(tag).toHaveProperty("name");
    expect(tag).toHaveProperty("createdAt");
    expect(tag).toHaveProperty("updatedAt");
  });

  it("devuelve array vacío cuando no hay tags", async () => {
    prisma.productTags.findMany.mockResolvedValue([]);

    const res = await request(app).get("/products/tags");

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("filtra tags por nombre con el parámetro search", async () => {
    const filtered = [mockTags[0]];
    prisma.productTags.findMany.mockResolvedValue(filtered);

    const res = await request(app).get("/products/tags?search=oferta");

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].name).toBe("Oferta");
  });

  it("respeta el parámetro limit (máximo 100)", async () => {
    prisma.productTags.findMany.mockResolvedValue([mockTags[0]]);

    const res = await request(app).get("/products/tags?limit=1");

    expect(res.status).toBe(200);
    expect(prisma.productTags.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 1 })
    );
  });
});