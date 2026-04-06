import { vi, describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import app from "../../../src/app.js";
import { prisma } from "../../../src/lib/prisma.js";

vi.mock("../../../src/lib/prisma.js", () => ({
  prisma: {
    products: {
      findFirst: vi.fn()
    }
  }
}));

// Producto base sin oferta
const mockProduct = {
  id_product: 1,
  name: "Mouse Logitech",
  description: "Mouse inalámbrico",
  price: 150000,
  offer_price: null,
  is_offer: false,
  quantity: 20,
  visible: true,
  status: true,
  created_at: new Date("2025-01-01"),
  updated_at: new Date("2025-01-01"),
  fk_product_category: 1,
  product_category: { id_product_category: 1, name: "Periféricos", status: true },
  store: { id_store: 1, name: "TechStore" },
  product_tag_relations: [],
  product_reviews: []
};

// Producto con oferta activa
const mockOfferProduct = {
  ...mockProduct,
  id_product: 2,
  name: "Teclado Mecánico",
  price: 300000,
  offer_price: 220000,
  is_offer: true
};

describe("GET /products/:id", () => {
  beforeEach(() => vi.clearAllMocks());

  // ─── CASO EXITOSO ─────────────────────────────────────────────────
  it("devuelve 200 con la estructura correcta cuando el producto existe", async () => {
    prisma.products.findFirst.mockResolvedValue(mockProduct);

    const res = await request(app).get("/products/1");

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      id: 1,
      name: "Mouse Logitech",
      description: "Mouse inalámbrico",
      price: 150000,
      isOffer: false,
      quantity: 20,
      visible: true,
      status: "active"
    });
  });

  it("devuelve la categoría y el comercio anidados correctamente", async () => {
    prisma.products.findFirst.mockResolvedValue(mockProduct);

    const res = await request(app).get("/products/1");

    expect(res.status).toBe(200);
    expect(res.body.category).toMatchObject({ id: 1, name: "Periféricos" });
    expect(res.body.commerce).toMatchObject({ id: 1, name: "TechStore" });
  });

  it("devuelve tags vacío cuando el producto no tiene tags activos", async () => {
    prisma.products.findFirst.mockResolvedValue(mockProduct);

    const res = await request(app).get("/products/1");

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.tags)).toBe(true);
    expect(res.body.tags).toHaveLength(0);
  });

  it("devuelve averageRating null cuando no hay reseñas", async () => {
    prisma.products.findFirst.mockResolvedValue(mockProduct);

    const res = await request(app).get("/products/1");

    expect(res.status).toBe(200);
    expect(res.body.averageRating).toBeNull();
    expect(res.body.reviewCount).toBe(0);
  });

  // ─── OFERTA ───────────────────────────────────────────────────────
  it("cuando is_offer=true devuelve price igual a offer_price", async () => {
    prisma.products.findFirst.mockResolvedValue(mockOfferProduct);

    const res = await request(app).get("/products/2");

    expect(res.status).toBe(200);
    expect(res.body.isOffer).toBe(true);
    expect(res.body.price).toBe(220000);
    expect(res.body.originalPrice).toBe(300000);
    expect(res.body.offerPrice).toBe(220000);
  });

  it("cuando is_offer=false devuelve price igual al precio base", async () => {
    prisma.products.findFirst.mockResolvedValue(mockProduct);

    const res = await request(app).get("/products/1");

    expect(res.status).toBe(200);
    expect(res.body.isOffer).toBe(false);
    expect(res.body.price).toBe(150000);
    expect(res.body.originalPrice).toBe(150000);
    expect(res.body.offerPrice).toBeNull();
  });

  // ─── NO ENCONTRADO ────────────────────────────────────────────────
  it("devuelve 404 cuando el producto no existe", async () => {
    prisma.products.findFirst.mockResolvedValue(null);

    const res = await request(app).get("/products/999");

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty("message");
  });

  it("devuelve 404 cuando el producto existe pero no está visible", async () => {
    // findFirst retorna null porque el service usa requireVisible: true
    prisma.products.findFirst.mockResolvedValue(null);

    const res = await request(app).get("/products/1");

    expect(res.status).toBe(404);
  });

  // ─── ID INVÁLIDO ──────────────────────────────────────────────────
  it("devuelve 400 cuando el id no es numérico", async () => {
    const res = await request(app).get("/products/abc");

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("message");
  });

  it("devuelve 400 cuando el id es 0", async () => {
    const res = await request(app).get("/products/0");

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("message");
  });

  it("devuelve 400 cuando el id es negativo", async () => {
    const res = await request(app).get("/products/-5");

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("message");
  });

  // ─── SIEMPRE FILTRA STATUS Y VISIBLE ─────────────────────────────
  it("siempre consulta con status=true y visible=true", async () => {
    prisma.products.findFirst.mockResolvedValue(mockProduct);

    await request(app).get("/products/1");

    expect(prisma.products.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: true,
          visible: true
        })
      })
    );
  });

  it("consulta con el id correcto en el where", async () => {
    prisma.products.findFirst.mockResolvedValue(mockProduct);

    await request(app).get("/products/1");

    expect(prisma.products.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id_product: 1
        })
      })
    );
  });
});