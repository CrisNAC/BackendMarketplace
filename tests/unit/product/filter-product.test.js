import { vi, describe, it, expect, beforeEach, beforeAll } from "vitest";
import request from "supertest";
import app from "../../../src/app.js";
import { prisma } from "../../../src/lib/prisma.js";

vi.mock("../../../src/lib/prisma.js", () => ({
  prisma: {
    products: {
      count: vi.fn(),
      findMany: vi.fn()
    }
  }
}));

const mockListProduct = {
  id_product: 1,
  name: "Producto Test",
  description: "Descripcion de prueba",
  price: 25,
  offer_price: null,
  is_offer: false,
  quantity: 10,
  product_category: { id_product_category: 1, name: "Categoria Test" },
  store: { id_store: 1, name: "Tienda Test" }
};

const mockOfferProduct = {
  ...mockListProduct,
  id_product: 2,
  name: "Producto Oferta",
  price: 25,
  offer_price: 19.9,
  is_offer: true
};

describe("GET /products/filter", () => {
  beforeEach(() => vi.clearAllMocks());

  // ─── RESPUESTA BASE ───────────────────────────────────────────────
  it("devuelve 200 con lista vacia y estructura de paginacion correcta", async () => {
    prisma.products.count.mockResolvedValue(0);
    prisma.products.findMany.mockResolvedValue([]);

    const res = await request(app).get("/products/filter");

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("content");
    expect(Array.isArray(res.body.content)).toBe(true);
    expect(res.body).toMatchObject({
      total_elements: 0,
      page: 1
    });
  });

  it("devuelve productos con la estructura de campos esperada", async () => {
    prisma.products.count.mockResolvedValue(1);
    prisma.products.findMany.mockResolvedValue([mockListProduct]);

    const res = await request(app).get("/products/filter");

    expect(res.status).toBe(200);
    expect(res.body.content[0]).toMatchObject({
      id_product: 1,
      name: "Producto Test",
      price: 25,
      original_price: 25,
      offer_price: null,
      is_offer: false,
      category: { id_product_category: 1, name: "Categoria Test" },
      store: { id_store: 1, name: "Tienda Test" }
    });
  });

  // ─── FILTRO: SEARCH ───────────────────────────────────────────────
  it("filtra por search en name y description", async () => {
    prisma.products.count.mockResolvedValue(1);
    prisma.products.findMany.mockResolvedValue([mockListProduct]);

    const res = await request(app).get("/products/filter?search=Producto");

    expect(res.status).toBe(200);
    expect(res.body.content).toHaveLength(1);
    expect(prisma.products.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            expect.objectContaining({ name: expect.objectContaining({ contains: "Producto" }) }),
            expect.objectContaining({ description: expect.objectContaining({ contains: "Producto" }) })
          ])
        })
      })
    );
  });

  it("ignora search vacio y trae todos los productos", async () => {
    prisma.products.count.mockResolvedValue(2);
    prisma.products.findMany.mockResolvedValue([mockListProduct, mockOfferProduct]);

    const res = await request(app).get("/products/filter?search=");

    expect(res.status).toBe(200);
    expect(res.body.content).toHaveLength(2);
    expect(prisma.products.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.not.objectContaining({ OR: expect.anything() })
      })
    );
  });

  // ─── FILTRO: CATEGORY ─────────────────────────────────────────────
  it("filtra por categoryId valido", async () => {
    prisma.products.count.mockResolvedValue(1);
    prisma.products.findMany.mockResolvedValue([mockListProduct]);

    const res = await request(app).get("/products/filter?categoryId=1");

    expect(res.status).toBe(200);
    expect(prisma.products.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ fk_product_category: 1 })
      })
    );
  });

  it("devuelve 400 cuando categoryId no es entero positivo", async () => {
    const res = await request(app).get("/products/filter?categoryId=abc");

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("errors");
  });

  it("devuelve 400 cuando categoryId es 0", async () => {
    const res = await request(app).get("/products/filter?categoryId=0");

    expect(res.status).toBe(400);
  });

  // ─── FILTRO: ISOFFER ──────────────────────────────────────────────
  it("filtra productos en oferta con isOffer=true", async () => {
    prisma.products.count.mockResolvedValue(1);
    prisma.products.findMany.mockResolvedValue([mockOfferProduct]);

    const res = await request(app).get("/products/filter?isOffer=true");

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
    prisma.products.count.mockResolvedValue(1);
    prisma.products.findMany.mockResolvedValue([mockListProduct]);

    const res = await request(app).get("/products/filter?isOffer=false");

    expect(res.status).toBe(200);
    expect(prisma.products.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ is_offer: false })
      })
    );
  });

  // ─── FILTRO: PRECIO ───────────────────────────────────────────────
  it("filtra por minPrice correctamente", async () => {
    prisma.products.count.mockResolvedValue(1);
    prisma.products.findMany.mockResolvedValue([mockListProduct]);

    const res = await request(app).get("/products/filter?minPrice=10");

    expect(res.status).toBe(200);
    expect(prisma.products.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            expect.objectContaining({
              AND: expect.arrayContaining([
                expect.objectContaining({ price: expect.objectContaining({ gte: 10 }) })
              ])
            })
          ])
        })
      })
    );
  });

  it("filtra por maxPrice correctamente", async () => {
    prisma.products.count.mockResolvedValue(1);
    prisma.products.findMany.mockResolvedValue([mockListProduct]);

    const res = await request(app).get("/products/filter?maxPrice=50");

    expect(res.status).toBe(200);
    expect(prisma.products.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            expect.objectContaining({
              AND: expect.arrayContaining([
                expect.objectContaining({ price: expect.objectContaining({ lte: 50 }) })
              ])
            })
          ])
        })
      })
    );
  });

  it("filtra por rango de precio minPrice y maxPrice", async () => {
    prisma.products.count.mockResolvedValue(1);
    prisma.products.findMany.mockResolvedValue([mockListProduct]);

    const res = await request(app).get("/products/filter?minPrice=10&maxPrice=50");

    expect(res.status).toBe(200);
  });

  it("devuelve 400 cuando minPrice es mayor que maxPrice", async () => {
    const res = await request(app).get("/products/filter?minPrice=100&maxPrice=10");

    expect(res.status).toBe(400);
    expect(res.body.errors[0].field).toBe("minPrice");
  });

  it("devuelve 400 cuando minPrice no es numerico", async () => {
    const res = await request(app).get("/products/filter?minPrice=abc");

    expect(res.status).toBe(400);
  });

  // ─── FILTRO: PRECIO CON OFERTA ────────────────────────────────────
  it("cuando hay filtro de precio y no se especifica isOffer, considera ambas ramas (price y offer_price)", async () => {
    prisma.products.count.mockResolvedValue(2);
    prisma.products.findMany.mockResolvedValue([mockListProduct, mockOfferProduct]);

    const res = await request(app).get("/products/filter?minPrice=10&maxPrice=30");

    expect(res.status).toBe(200);
    const where = prisma.products.findMany.mock.calls[0][0].where;
    const branches = where.OR;
    const hasNonOfferBranch = branches.some(
      (b) => b.AND?.some((c) => c.is_offer === false)
    );
    const hasOfferBranch = branches.some(
      (b) => b.AND?.some((c) => c.is_offer === true)
    );
    expect(hasNonOfferBranch).toBe(true);
    expect(hasOfferBranch).toBe(true);
  });

  it("cuando isOffer=true y hay filtro de precio, solo filtra por offer_price", async () => {
    prisma.products.count.mockResolvedValue(1);
    prisma.products.findMany.mockResolvedValue([mockOfferProduct]);

    const res = await request(app).get("/products/filter?isOffer=true&minPrice=15");

    expect(res.status).toBe(200);
    const where = prisma.products.findMany.mock.calls[0][0].where;
    const branches = where.OR;
    const hasNonOfferBranch = branches?.some(
      (b) => b.AND?.some((c) => c.is_offer === false)
    );
    expect(hasNonOfferBranch).toBeFalsy();
  });

  // ─── ORDENAMIENTO ─────────────────────────────────────────────────
  it("ordena por price asc cuando se indica sortBy=price&sortOrder=asc", async () => {
    prisma.products.count.mockResolvedValue(1);
    prisma.products.findMany.mockResolvedValue([mockListProduct]);

    const res = await request(app).get("/products/filter?sortBy=price&sortOrder=asc");

    expect(res.status).toBe(200);
    expect(prisma.products.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { price: "asc" } })
    );
  });

  it("ordena por created_at desc por defecto", async () => {
    prisma.products.count.mockResolvedValue(1);
    prisma.products.findMany.mockResolvedValue([mockListProduct]);

    const res = await request(app).get("/products/filter");

    expect(res.status).toBe(200);
    expect(prisma.products.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { created_at: "desc" } })
    );
  });

  it("devuelve 400 cuando sortBy tiene un valor invalido", async () => {
    const res = await request(app).get("/products/filter?sortBy=invalido");

    expect(res.status).toBe(400);
  });

  it("devuelve 400 cuando sortOrder tiene un valor invalido", async () => {
    const res = await request(app).get("/products/filter?sortOrder=invalido");

    expect(res.status).toBe(400);
  });

  // ─── PAGINACION ───────────────────────────────────────────────────
  it("respeta page y limit en la paginacion", async () => {
    prisma.products.count.mockResolvedValue(50);
    prisma.products.findMany.mockResolvedValue([]);

    const res = await request(app).get("/products/filter?page=2&limit=10");

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

  it("no permite limit mayor a 100", async () => {
    const res = await request(app).get("/products/filter?limit=200");

    expect(res.status).toBe(400);
  });

  // ─── SIEMPRE FILTRA STATUS Y VISIBLE ──────────────────────────────
  it("siempre incluye status=true y visible=true en el where", async () => {
    prisma.products.count.mockResolvedValue(0);
    prisma.products.findMany.mockResolvedValue([]);

    await request(app).get("/products/filter");

    expect(prisma.products.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: true,
          visible: true
        })
      })
    );
  });
});