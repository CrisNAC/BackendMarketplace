import { vi, describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import { prisma } from "../../src/lib/prisma.js";

vi.mock("../../src/lib/prisma.js", () => ({
  prisma: {
    products: {
      findUnique: vi.fn(),
      findMany: vi.fn()
    }
  }
}));

const mockCurrentProduct = {
  id_product: 1,
  product_categories: [
    { fk_category: 5 },
    { fk_category: 10 }
  ]
};

const mockRelatedProduct1 = {
  id_product: 2,
  name: "Teclado Mecánico",
  description: "Teclado con switches mecánicos RGB",
  price: 300000,
  offer_price: 220000,
  is_offer: true,
  quantity: 15,
  visible: true,
  status: true,
  image_url: "https://example.com/teclado.jpg",
  created_at: "2025-01-05T00:00:00.000Z",
  updated_at: "2025-01-05T00:00:00.000Z",
  product_categories: [
    { category: { id_category: 5, name: "Periféricos", status: true } }
  ],
  store: { id_store: 1, name: "TechStore" },
  product_tag_relations: [
    { product_tag: { id_product_tag: 1, name: "Gamer" } }
  ],
  product_reviews: [{ rating: 4.5 }, { rating: 4.8 }]
};

const mockRelatedProduct2 = {
  id_product: 3,
  name: "Mouse Inalámbrico",
  description: "Mouse de alta precisión",
  price: 150000,
  offer_price: null,
  is_offer: false,
  quantity: 50,
  visible: true,
  status: true,
  image_url: "https://example.com/mouse.jpg",
  created_at: "2025-01-03T00:00:00.000Z",
  updated_at: "2025-01-03T00:00:00.000Z",
  product_categories: [
    { category: { id_category: 5, name: "Periféricos", status: true } }
  ],
  store: { id_store: 2, name: "ElectroHub" },
  product_tag_relations: [],
  product_reviews: [{ rating: 4.2 }]
};

describe("GET /products/:id/related", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retorna 200 con productos relacionados cuando existen", async () => {
    prisma.products.findUnique.mockResolvedValue(mockCurrentProduct);
    prisma.products.findMany.mockResolvedValue([mockRelatedProduct1, mockRelatedProduct2]);

    const res = await request(app).get("/products/1/related");

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(2);
  });

  it("excluye el producto actual de los resultados", async () => {
    prisma.products.findUnique.mockResolvedValue(mockCurrentProduct);
    prisma.products.findMany.mockResolvedValue([]);

    await request(app).get("/products/1/related");

    expect(prisma.products.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id_product: { not: 1 }
        })
      })
    );
  });

  it("respeta el parámetro limit y el default/max (8 y 20)", async () => {
    prisma.products.findUnique.mockResolvedValue(mockCurrentProduct);

    // limit=2
    prisma.products.findMany.mockResolvedValue([mockRelatedProduct1, mockRelatedProduct2]);
    await request(app).get("/products/1/related?limit=2");
    expect(prisma.products.findMany).toHaveBeenLastCalledWith(expect.objectContaining({ take: 2 }));

    // default 8
    prisma.products.findMany.mockResolvedValue([mockRelatedProduct1]);
    await request(app).get("/products/1/related");
    expect(prisma.products.findMany).toHaveBeenLastCalledWith(expect.objectContaining({ take: 8 }));

    // limit mayor que 20
    prisma.products.findMany.mockResolvedValue([mockRelatedProduct1]);
    await request(app).get("/products/1/related?limit=50");
    expect(prisma.products.findMany).toHaveBeenLastCalledWith(expect.objectContaining({ take: 20 }));
  });

  it("retorna array vacío si el producto no tiene categorías", async () => {
    prisma.products.findUnique.mockResolvedValue({ id_product: 1, product_categories: [] });

    const res = await request(app).get("/products/1/related");

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(0);
    expect(prisma.products.findMany).not.toHaveBeenCalled();
  });

  it("retorna 404 cuando el producto no existe", async () => {
    prisma.products.findUnique.mockResolvedValue(null);

    const res = await request(app).get("/products/999/related");

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty("message");
    expect(String(res.body.message).toLowerCase()).toContain("no encontrado");
  });

  it("retorna 400 cuando el id no es numérico o inválido", async () => {
    let res = await request(app).get("/products/abc/related");
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("message");

    res = await request(app).get("/products/0/related");
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("message");
  });

  it("solo retorna productos visibles y activos", async () => {
    prisma.products.findUnique.mockResolvedValue(mockCurrentProduct);
    prisma.products.findMany.mockResolvedValue([mockRelatedProduct1]);

    await request(app).get("/products/1/related");

    expect(prisma.products.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          visible: true,
          status: true
        })
      })
    );
  });
});