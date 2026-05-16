import { vi, describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import app from "../../../src/app.js";
import { prisma } from "../../../src/lib/prisma.js";

vi.mock("../../../src/lib/prisma.js", () => ({
  prisma: {
    products: {
      findUnique: vi.fn(),
      findMany: vi.fn()
    }
  }
}));

// Producto base (el que se está viendo)
const mockCurrentProduct = {
  id_product: 1,
  product_categories: [
    { fk_category: 5 },  // Categoría "Periféricos"
    { fk_category: 10 }  // Categoría "Accesorios"
  ]
};

// Productos relacionados (misma categoría)
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
  created_at: new Date("2025-01-05"),
  updated_at: new Date("2025-01-05"),
  product_categories: [
    { category: { id_category: 5, name: "Periféricos", status: true } }
  ],
  store: { id_store: 1, name: "TechStore" },
  product_tag_relations: [
    { product_tag: { id_product_tag: 1, name: "Gamer" } },
    { product_tag: { id_product_tag: 2, name: "RGB" } }
  ],
  product_reviews: [
    { rating: 4.5 },
    { rating: 4.8 }
  ]
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
  created_at: new Date("2025-01-03"),
  updated_at: new Date("2025-01-03"),
  product_categories: [
    { category: { id_category: 5, name: "Periféricos", status: true } }
  ],
  store: { id_store: 2, name: "ElectroHub" },
  product_tag_relations: [],
  product_reviews: [
    { rating: 4.2 }
  ]
};

const mockRelatedProduct3 = {
  id_product: 4,
  name: "Monitor Curvo",
  description: "Monitor 144Hz para gaming",
  price: 800000,
  offer_price: null,
  is_offer: false,
  quantity: 5,
  visible: true,
  status: true,
  image_url: "https://example.com/monitor.jpg",
  created_at: new Date("2025-01-02"),
  updated_at: new Date("2025-01-02"),
  product_categories: [
    { category: { id_category: 10, name: "Accesorios", status: true } }
  ],
  store: { id_store: 1, name: "TechStore" },
  product_tag_relations: [
    { product_tag: { id_product_tag: 3, name: "Gaming" } }
  ],
  product_reviews: []
};

describe("GET /products/:id/related", () => {
  beforeEach(() => vi.clearAllMocks());

  // ─── CASOS EXITOSOS ──────────────────────────────────────────────

  it("devuelve 200 con productos relacionados cuando existen", async () => {
    prisma.products.findUnique.mockResolvedValue(mockCurrentProduct);
    prisma.products.findMany.mockResolvedValue([
      mockRelatedProduct1,
      mockRelatedProduct2
    ]);

    const res = await request(app).get("/products/1/related");

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(2);
  });

  it("retorna productos con estructura correcta", async () => {
    prisma.products.findUnique.mockResolvedValue(mockCurrentProduct);
    prisma.products.findMany.mockResolvedValue([mockRelatedProduct1]);

    const res = await request(app).get("/products/1/related");

    expect(res.status).toBe(200);
    expect(res.body[0]).toMatchObject({
      id: 2,
      name: "Teclado Mecánico",
      description: "Teclado con switches mecánicos RGB",
      price: 220000,  // precio de oferta porque is_offer = true
      originalPrice: 300000,
      offerPrice: 220000,
      isOffer: true,
      quantity: 15,
      visible: true,
      status: "active"
    });
  });

  it("incluye categorías en la respuesta", async () => {
    prisma.products.findUnique.mockResolvedValue(mockCurrentProduct);
    prisma.products.findMany.mockResolvedValue([mockRelatedProduct1]);

    const res = await request(app).get("/products/1/related");

    expect(res.status).toBe(200);
    expect(res.body[0].categories).toBeDefined();
    expect(res.body[0].categories[0]).toMatchObject({
      id: 5,
      name: "Periféricos",
      status: true
    });
  });

  it("incluye comercio en la respuesta", async () => {
    prisma.products.findUnique.mockResolvedValue(mockCurrentProduct);
    prisma.products.findMany.mockResolvedValue([mockRelatedProduct1]);

    const res = await request(app).get("/products/1/related");

    expect(res.status).toBe(200);
    expect(res.body[0].commerce).toMatchObject({
      id: 1,
      name: "TechStore"
    });
  });

  it("incluye tags en la respuesta", async () => {
    prisma.products.findUnique.mockResolvedValue(mockCurrentProduct);
    prisma.products.findMany.mockResolvedValue([mockRelatedProduct1]);

    const res = await request(app).get("/products/1/related");

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body[0].tags)).toBe(true);
    expect(res.body[0].tags).toHaveLength(2);
    expect(res.body[0].tags[0]).toMatchObject({
      id: 1,
      name: "Gamer"
    });
  });

  it("calcula averageRating correctamente", async () => {
    prisma.products.findUnique.mockResolvedValue(mockCurrentProduct);
    prisma.products.findMany.mockResolvedValue([mockRelatedProduct1]);

    const res = await request(app).get("/products/1/related");

    expect(res.status).toBe(200);
    expect(res.body[0].averageRating).toBe(4.65); // (4.5 + 4.8) / 2
    expect(res.body[0].reviewCount).toBe(2);
  });

  it("devuelve averageRating null cuando no hay reseñas", async () => {
    prisma.products.findUnique.mockResolvedValue(mockCurrentProduct);
    prisma.products.findMany.mockResolvedValue([mockRelatedProduct3]);

    const res = await request(app).get("/products/1/related");

    expect(res.status).toBe(200);
    expect(res.body[0].averageRating).toBeNull();
    expect(res.body[0].reviewCount).toBe(0);
  });

  // ─── PARÁMETRO LIMIT ─────────────────────────────────────────────

  it("respeta el parámetro limit de query", async () => {
    prisma.products.findUnique.mockResolvedValue(mockCurrentProduct);
    prisma.products.findMany.mockResolvedValue([mockRelatedProduct1, mockRelatedProduct2]);

    const res = await request(app).get("/products/1/related?limit=2");

    expect(res.status).toBe(200);
    expect(prisma.products.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 2
      })
    );
  });

  it("usa limit=8 por defecto si no se especifica", async () => {
    prisma.products.findUnique.mockResolvedValue(mockCurrentProduct);
    prisma.products.findMany.mockResolvedValue([mockRelatedProduct1]);

    await request(app).get("/products/1/related");

    expect(prisma.products.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 8
      })
    );
  });

  it("limita el máximo a 20 aunque se pase un limit mayor", async () => {
    prisma.products.findUnique.mockResolvedValue(mockCurrentProduct);
    prisma.products.findMany.mockResolvedValue([mockRelatedProduct1]);

    await request(app).get("/products/1/related?limit=50");

    expect(prisma.products.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 20  // máximo permitido
      })
    );
  });

  it("ignora limit=0 inválido y usa default de 8", async () => {
    prisma.products.findUnique.mockResolvedValue(mockCurrentProduct);
    prisma.products.findMany.mockResolvedValue([mockRelatedProduct1]);

    await request(app).get("/products/1/related?limit=0");

    expect(prisma.products.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 8  // vuelve al default
      })
    );
  });

  // ─── FILTROS DE QUERY (WHERE) ────────────────────────────────────

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

  it("solo retorna productos visibles (visible: true)", async () => {
    prisma.products.findUnique.mockResolvedValue(mockCurrentProduct);
    prisma.products.findMany.mockResolvedValue([]);

    await request(app).get("/products/1/related");

    expect(prisma.products.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          visible: true
        })
      })
    );
  });

  it("solo retorna productos activos (status: true)", async () => {
    prisma.products.findUnique.mockResolvedValue(mockCurrentProduct);
    prisma.products.findMany.mockResolvedValue([]);

    await request(app).get("/products/1/related");

    expect(prisma.products.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: true
        })
      })
    );
  });

  it("filtra por categorías del producto actual", async () => {
    prisma.products.findUnique.mockResolvedValue(mockCurrentProduct);
    prisma.products.findMany.mockResolvedValue([]);

    await request(app).get("/products/1/related");

    expect(prisma.products.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          product_categories: {
            some: {
              fk_category: { in: [5, 10] },
              status: true
            }
          }
        })
      })
    );
  });

  it("ordena por created_at descendente (más nuevos primero)", async () => {
    prisma.products.findUnique.mockResolvedValue(mockCurrentProduct);
    prisma.products.findMany.mockResolvedValue([]);

    await request(app).get("/products/1/related");

    expect(prisma.products.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { created_at: "desc" }
      })
    );
  });

  // ─── CASOS ESPECIALES ────────────────────────────────────────────

  it("retorna array vacío cuando el producto no tiene categorías", async () => {
    const productWithoutCategories = {
      id_product: 1,
      product_categories: []
    };
    prisma.products.findUnique.mockResolvedValue(productWithoutCategories);

    const res = await request(app).get("/products/1/related");

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(0);
    // No debe hacer la segunda query
    expect(prisma.products.findMany).not.toHaveBeenCalled();
  });

  it("retorna array vacío cuando no hay productos relacionados", async () => {
    prisma.products.findUnique.mockResolvedValue(mockCurrentProduct);
    prisma.products.findMany.mockResolvedValue([]);

    const res = await request(app).get("/products/1/related");

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(0);
  });

  // ─── PRODUCTO NO ENCONTRADO ──────────────────────────────────────

  it("devuelve 404 cuando el producto actual no existe", async () => {
    prisma.products.findUnique.mockResolvedValue(null);

    const res = await request(app).get("/products/999/related");

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty("message");
    expect(res.body.message).toContain("no encontrado");
  });

  // ─── ID INVÁLIDO ─────────────────────────────────────────────────

  it("devuelve 400 cuando el id no es numérico", async () => {
    const res = await request(app).get("/products/abc/related");

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("message");
  });

  it("devuelve 400 cuando el id es 0", async () => {
    const res = await request(app).get("/products/0/related");

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("message");
  });

  it("devuelve 400 cuando el id es negativo", async () => {
    const res = await request(app).get("/products/-1/related");

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("message");
  });

  // ─── OFERTAS EN PRODUCTOS RELACIONADOS ───────────────────────────

  it("calcula correctamente el precio cuando is_offer=true", async () => {
    prisma.products.findUnique.mockResolvedValue(mockCurrentProduct);
    prisma.products.findMany.mockResolvedValue([mockRelatedProduct1]);

    const res = await request(app).get("/products/1/related");

    expect(res.status).toBe(200);
    expect(res.body[0]).toMatchObject({
      isOffer: true,
      price: 220000,
      originalPrice: 300000,
      offerPrice: 220000
    });
  });

  it("calcula correctamente el precio cuando is_offer=false", async () => {
    prisma.products.findUnique.mockResolvedValue(mockCurrentProduct);
    prisma.products.findMany.mockResolvedValue([mockRelatedProduct2]);

    const res = await request(app).get("/products/1/related");

    expect(res.status).toBe(200);
    expect(res.body[0]).toMatchObject({
      isOffer: false,
      price: 150000,
      originalPrice: 150000,
      offerPrice: null
    });
  });

  // ─── MÚLTIPLES CATEGORÍAS ───────────────────────────────────────

  it("retorna productos de cualquiera de las categorías del producto actual", async () => {
    prisma.products.findUnique.mockResolvedValue(mockCurrentProduct);
    // mockRelatedProduct1 está en categoría 5
    // mockRelatedProduct3 está en categoría 10
    // El producto actual tiene ambas
    prisma.products.findMany.mockResolvedValue([
      mockRelatedProduct1,
      mockRelatedProduct3
    ]);

    const res = await request(app).get("/products/1/related");

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    // Verifica que se filtró por ambas categorías
    expect(prisma.products.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          product_categories: {
            some: {
              fk_category: { in: [5, 10] },
              status: true
            }
          }
        })
      })
    );
  });

  // ─── IMAGEN URL ──────────────────────────────────────────────────

  it("incluye imageUrl en la respuesta", async () => {
    prisma.products.findUnique.mockResolvedValue(mockCurrentProduct);
    prisma.products.findMany.mockResolvedValue([mockRelatedProduct1]);

    const res = await request(app).get("/products/1/related");

    expect(res.status).toBe(200);
    expect(res.body[0].imageUrl).toBe("https://example.com/teclado.jpg");
  });

  it("devuelve imageUrl como null si no existe", async () => {
    const productWithoutImage = {
      ...mockRelatedProduct1,
      image_url: null
    };
    prisma.products.findUnique.mockResolvedValue(mockCurrentProduct);
    prisma.products.findMany.mockResolvedValue([productWithoutImage]);

    const res = await request(app).get("/products/1/related");

    expect(res.status).toBe(200);
    expect(res.body[0].imageUrl).toBeNull();
  });
});