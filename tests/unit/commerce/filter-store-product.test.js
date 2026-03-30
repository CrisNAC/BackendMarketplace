import { vi, describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import app from "../../../src/app.js";
import { prisma } from "../../../src/lib/prisma.js";

vi.mock("../../../src/lib/prisma.js", () => ({
  prisma: {
    stores: {
      findUnique: vi.fn()
    },
    products: {
      count: vi.fn(),
      findMany: vi.fn()
    }
  }
}));

// ─── HELPERS ──────────────────────────────────────────────────────
const mockStore = { id_store: 1 };

const mockProduct = {
  id_product: 1,
  name: "Producto Test",
  description: "Descripcion de prueba",
  price: 25,
  offer_price: null,
  is_offer: false,
  quantity: 10,
  visible: true,
  created_at: "2026-01-01T00:00:00.000Z",
  product_category: { id_product_category: 1, name: "Categoria Test" }
};

const mockOfferProduct = {
  ...mockProduct,
  id_product: 2,
  name: "Producto Oferta",
  price: 25,
  offer_price: 19.9,
  is_offer: true
};

const setupStore = () => prisma.stores.findUnique.mockResolvedValue(mockStore);

const setupProducts = (count, products) => {
  prisma.products.count.mockResolvedValue(count);
  prisma.products.findMany.mockResolvedValue(products);
};

describe("GET /api/commerces/products/filter/:id", () => {
  beforeEach(() => vi.clearAllMocks());

  // ─── COMERCIO ────────────────────────────────────────────────────
  it("devuelve 404 cuando el comercio no existe", async () => {
    prisma.stores.findUnique.mockResolvedValue(null);

    const res = await request(app).get("/api/commerces/products/filter/999");

    expect(res.status).toBe(404);
    expect(res.body.message).toMatch(/comercio no encontrado/i);
  });

  it("devuelve 400 cuando el id de comercio no es numerico", async () => {
    const res = await request(app).get("/api/commerces/products/filter/abc");

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/número/i);
  });

  // ─── RESPUESTA BASE ───────────────────────────────────────────────
  it("devuelve 200 con estructura de paginacion correcta", async () => {
    setupStore();
    setupProducts(1, [mockProduct]);

    const res = await request(app).get("/api/commerces/products/filter/1");

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("content");
    expect(res.body).toHaveProperty("total_elements");
    expect(res.body).toHaveProperty("total_pages");
    expect(res.body).toHaveProperty("size");
    expect(res.body).toHaveProperty("page");
    expect(Array.isArray(res.body.content)).toBe(true);
  });

  it("devuelve productos con la estructura de campos esperada", async () => {
    setupStore();
    setupProducts(1, [mockProduct]);

    const res = await request(app).get("/api/commerces/products/filter/1");

    expect(res.status).toBe(200);
    const product = res.body.content[0];
    expect(product).toHaveProperty("id_product");
    expect(product).toHaveProperty("name");
    expect(product).toHaveProperty("price");
    expect(product).toHaveProperty("original_price");
    expect(product).toHaveProperty("offer_price");
    expect(product).toHaveProperty("is_offer");
    expect(product).toHaveProperty("quantity");
    expect(product).toHaveProperty("visible");
    expect(product).toHaveProperty("product_category");
  });

  it("devuelve 404 cuando no hay productos con los filtros aplicados", async () => {
    setupStore();
    setupProducts(0, []);

    const res = await request(app).get("/api/commerces/products/filter/1");

    expect(res.status).toBe(404);
    expect(res.body.message).toMatch(/no se encontraron productos/i);
  });

  // ─── FILTRO: NAME ────────────────────────────────────────────────
  it("filtra por name correctamente", async () => {
    setupStore();
    setupProducts(1, [mockProduct]);

    const res = await request(app).get(
      "/api/commerces/products/filter/1?name=Producto"
    );

    expect(res.status).toBe(200);
    expect(prisma.products.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          name: { contains: "Producto", mode: "insensitive" }
        })
      })
    );
  });

  it("ignora name vacio y no agrega filtro de nombre", async () => {
    setupStore();
    setupProducts(1, [mockProduct]);

    const res = await request(app).get(
      "/api/commerces/products/filter/1?name="
    );

    expect(res.status).toBe(200);
    expect(prisma.products.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.not.objectContaining({ name: expect.anything() })
      })
    );
  });

  // ─── FILTRO: CATEGORY ────────────────────────────────────────────
  it("filtra por category correctamente", async () => {
    setupStore();
    setupProducts(1, [mockProduct]);

    const res = await request(app).get(
      "/api/commerces/products/filter/1?category=1"
    );

    expect(res.status).toBe(200);
    expect(prisma.products.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ fk_product_category: 1 })
      })
    );
  });

  it("devuelve 400 cuando category no es entero positivo", async () => {
    const res = await request(app).get(
      "/api/commerces/products/filter/1?category=abc"
    );

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("errors");
  });

  // ─── FILTRO: AVAILABLE ───────────────────────────────────────────
  it("filtra por available=true y agrega visible=true al where", async () => {
    setupStore();
    setupProducts(1, [mockProduct]);

    const res = await request(app).get(
      "/api/commerces/products/filter/1?available=true"
    );

    expect(res.status).toBe(200);
    expect(prisma.products.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ visible: true })
      })
    );
  });

  it("filtra por available=false y agrega visible=false al where", async () => {
    setupStore();
    setupProducts(1, [mockProduct]);

    const res = await request(app).get(
      "/api/commerces/products/filter/1?available=false"
    );

    expect(res.status).toBe(200);
    expect(prisma.products.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ visible: false })
      })
    );
  });

  // ─── FILTRO: ISOFFER ─────────────────────────────────────────────
  it("filtra productos en oferta con isOffer=true", async () => {
    setupStore();
    setupProducts(1, [mockOfferProduct]);

    const res = await request(app).get(
      "/api/commerces/products/filter/1?isOffer=true"
    );

    expect(res.status).toBe(200);
    expect(res.body.content[0]).toMatchObject({
      price: 19.9,
      original_price: 25,
      offer_price: 19.9,
      is_offer: true
    });
    expect(prisma.products.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ is_offer: true })
      })
    );
  });

  it("filtra productos fuera de oferta con isOffer=false", async () => {
    setupStore();
    setupProducts(1, [mockProduct]);

    const res = await request(app).get(
      "/api/commerces/products/filter/1?isOffer=false"
    );

    expect(res.status).toBe(200);
    expect(prisma.products.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ is_offer: false })
      })
    );
  });

  // ─── FILTRO: PRECIO ───────────────────────────────────────────────
  it("filtra por price_min correctamente en productos sin oferta", async () => {
    setupStore();
    setupProducts(1, [mockProduct]);

    const res = await request(app).get(
      "/api/commerces/products/filter/1?price_min=10"
    );

    expect(res.status).toBe(200);
    const where = prisma.products.findMany.mock.calls[0][0].where;
    const hasNonOfferBranch = where.OR?.some(
      (b) => b.AND?.some((c) => c.is_offer === false) &&
             b.AND?.some((c) => c.price?.gte === 10)
    );
    expect(hasNonOfferBranch).toBe(true);
  });

  it("filtra por price_max correctamente en productos sin oferta", async () => {
    setupStore();
    setupProducts(1, [mockProduct]);

    const res = await request(app).get(
      "/api/commerces/products/filter/1?price_max=50"
    );

    expect(res.status).toBe(200);
    const where = prisma.products.findMany.mock.calls[0][0].where;
    const hasNonOfferBranch = where.OR?.some(
      (b) => b.AND?.some((c) => c.is_offer === false) &&
             b.AND?.some((c) => c.price?.lte === 50)
    );
    expect(hasNonOfferBranch).toBe(true);
  });

  it("devuelve 400 cuando price_min es mayor que price_max", async () => {
    const res = await request(app).get(
      "/api/commerces/products/filter/1?price_min=100&price_max=10"
    );

    expect(res.status).toBe(400);
    expect(res.body.errors[0].field).toBe("price_min");
  });

  it("devuelve 400 cuando price_min no es numerico", async () => {
    const res = await request(app).get(
      "/api/commerces/products/filter/1?price_min=abc"
    );

    expect(res.status).toBe(400);
  });

  it("cuando hay filtro de precio sin isOffer, considera ambas ramas (price y offer_price)", async () => {
    setupStore();
    setupProducts(2, [mockProduct, mockOfferProduct]);

    const res = await request(app).get(
      "/api/commerces/products/filter/1?price_min=10&price_max=30"
    );

    expect(res.status).toBe(200);
    const where = prisma.products.findMany.mock.calls[0][0].where;
    const hasNonOfferBranch = where.OR?.some(
      (b) => b.AND?.some((c) => c.is_offer === false)
    );
    const hasOfferBranch = where.OR?.some(
      (b) => b.AND?.some((c) => c.is_offer === true)
    );
    expect(hasNonOfferBranch).toBe(true);
    expect(hasOfferBranch).toBe(true);
  });

  it("cuando isOffer=true y hay filtro de precio, solo filtra por offer_price", async () => {
    setupStore();
    setupProducts(1, [mockOfferProduct]);

    const res = await request(app).get(
      "/api/commerces/products/filter/1?isOffer=true&price_min=15"
    );

    expect(res.status).toBe(200);
    const where = prisma.products.findMany.mock.calls[0][0].where;
    const hasNonOfferBranch = where.OR?.some(
      (b) => b.AND?.some((c) => c.is_offer === false)
    );
    expect(hasNonOfferBranch).toBeFalsy();
  });

  it("cuando isOffer=false y hay filtro de precio, solo filtra por price", async () => {
    setupStore();
    setupProducts(1, [mockProduct]);

    const res = await request(app).get(
      "/api/commerces/products/filter/1?isOffer=false&price_max=30"
    );

    expect(res.status).toBe(200);
    const where = prisma.products.findMany.mock.calls[0][0].where;
    const hasOfferBranch = where.OR?.some(
      (b) => b.AND?.some((c) => c.is_offer === true)
    );
    expect(hasOfferBranch).toBeFalsy();
  });

  // ─── ORDENAMIENTO ─────────────────────────────────────────────────
  it("ordena por created_at desc por defecto", async () => {
    setupStore();
    setupProducts(1, [mockProduct]);

    const res = await request(app).get("/api/commerces/products/filter/1");

    expect(res.status).toBe(200);
    expect(prisma.products.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { created_at: "desc" } })
    );
  });

  it("ordena por price asc cuando se indica sortBy=price&sortOrder=asc", async () => {
    setupStore();
    setupProducts(1, [mockProduct]);

    const res = await request(app).get(
      "/api/commerces/products/filter/1?sortBy=price&sortOrder=asc"
    );

    expect(res.status).toBe(200);
    expect(prisma.products.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { price: "asc" } })
    );
  });

  it("ordena por name desc correctamente", async () => {
    setupStore();
    setupProducts(1, [mockProduct]);

    const res = await request(app).get(
      "/api/commerces/products/filter/1?sortBy=name&sortOrder=desc"
    );

    expect(res.status).toBe(200);
    expect(prisma.products.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { name: "desc" } })
    );
  });

  it("devuelve 400 cuando sortBy tiene un valor invalido", async () => {
    const res = await request(app).get(
      "/api/commerces/products/filter/1?sortBy=invalido"
    );

    expect(res.status).toBe(400);
  });

  it("devuelve 400 cuando sortOrder tiene un valor invalido", async () => {
    const res = await request(app).get(
      "/api/commerces/products/filter/1?sortOrder=invalido"
    );

    expect(res.status).toBe(400);
  });

  // ─── PAGINACION ───────────────────────────────────────────────────
  it("respeta page y limit en la paginacion", async () => {
    setupStore();
    setupProducts(50, [mockProduct]);

    const res = await request(app).get(
      "/api/commerces/products/filter/1?page=2&limit=10"
    );

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      total_elements: 50,
      size: 10,
      page: 2,
      total_pages: 5
    });
    expect(prisma.products.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 10, take: 10 })
    );
  });

  it("devuelve 400 cuando limit supera 100", async () => {
    const res = await request(app).get(
      "/api/commerces/products/filter/1?limit=200"
    );

    expect(res.status).toBe(400);
  });

  // ─── SIEMPRE FILTRA POR COMERCIO Y STATUS ────────────────────────
  it("siempre filtra por fk_store y status=true", async () => {
    setupStore();
    setupProducts(1, [mockProduct]);

    await request(app).get("/api/commerces/products/filter/1");

    expect(prisma.products.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          fk_store: 1,
          status: true
        })
      })
    );
  });
});