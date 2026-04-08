import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import app from "../../../src/app.js";
import { prisma } from "../../../src/lib/prisma.js";

// ─── SETUP ────────────────────────────────────────────────────────
// Estos tests golpean la BD real de Supabase.
// Requieren al menos una categoría, un comercio y productos activos/visibles en la BD.

let existingCategoryId;
let existingProductPrice;

beforeAll(async () => {
  // Busca una categoría activa real para usar en los filtros
  const category = await prisma.productCategories.findFirst({
    where: { status: true },
    select: { id_product_category: true }
  });
  existingCategoryId = category?.id_product_category ?? null;

  // Busca un producto activo real para tomar su precio como referencia
  const product = await prisma.products.findFirst({
    where: { status: true, visible: true },
    select: { price: true }
  });
  existingProductPrice = product ? Number(product.price) : null;
});

describe("E2E GET /products/filter", () => {

  // ─── RESPUESTA BASE ─────────────────────────────────────────────
  it("devuelve 200 con estructura de paginacion correcta", async () => {
    const res = await request(app).get("/products/filter");

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("content");
    expect(res.body).toHaveProperty("total_elements");
    expect(res.body).toHaveProperty("total_pages");
    expect(res.body).toHaveProperty("size");
    expect(res.body).toHaveProperty("page");
    expect(Array.isArray(res.body.content)).toBe(true);
  });

  it("cada producto tiene los campos esperados", async () => {
    const res = await request(app).get("/products/filter?limit=1");

    expect(res.status).toBe(200);
    if (res.body.content.length > 0) {
      const product = res.body.content[0];
      expect(product).toHaveProperty("id_product");
      expect(product).toHaveProperty("name");
      expect(product).toHaveProperty("price");
      expect(product).toHaveProperty("original_price");
      expect(product).toHaveProperty("offer_price");
      expect(product).toHaveProperty("is_offer");
      expect(product).toHaveProperty("quantity");
      expect(product).toHaveProperty("category");
      expect(product).toHaveProperty("store");
    }
  });

  it("solo devuelve productos con status=true y visible=true", async () => {
    const res = await request(app).get("/products/filter");

    expect(res.status).toBe(200);
    // Verifica que no haya productos ocultos o inactivos en la respuesta
    // (no podemos verlo directamente, pero el count de la BD debe coincidir)
    const totalEnBD = await prisma.products.count({
      where: { status: true, visible: true }
    });
    expect(res.body.total_elements).toBe(totalEnBD);
  });

  // ─── FILTRO: SEARCH ─────────────────────────────────────────────
  it("devuelve resultados cuando el search coincide con algun nombre", async () => {
    // Toma el primer producto real para buscar por su nombre
    const product = await prisma.products.findFirst({
      where: { status: true, visible: true },
      select: { name: true }
    });

    if (!product) return;

    const searchTerm = product.name.split(" ")[0]; // primera palabra
    const res = await request(app).get(`/products/filter?search=${searchTerm}`);

    expect(res.status).toBe(200);
    expect(res.body.content.length).toBeGreaterThan(0);
  });

  it("devuelve lista vacia cuando el search no coincide con nada", async () => {
    const res = await request(app).get(
      "/products/filter?search=xyzproductoquenoexiste999"
    );

    expect(res.status).toBe(200);
    expect(res.body.content).toHaveLength(0);
    expect(res.body.total_elements).toBe(0);
  });

  // ─── FILTRO: CATEGORIA ──────────────────────────────────────────
  it("filtra por categoryId y devuelve solo productos de esa categoria", async () => {
    if (!existingCategoryId) return;

    const res = await request(app).get(
      `/products/filter?categoryId=${existingCategoryId}`
    );

    expect(res.status).toBe(200);
    if (res.body.content.length > 0) {
      res.body.content.forEach((p) => {
        expect(p.category?.id_product_category).toBe(existingCategoryId);
      });
    }
  });

  it("devuelve 400 cuando categoryId es invalido", async () => {
    const res = await request(app).get("/products/filter?categoryId=abc");

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("errors");
  });

  // ─── FILTRO: ISOFFER ────────────────────────────────────────────
  it("filtra productos en oferta con isOffer=true", async () => {
    const res = await request(app).get("/products/filter?isOffer=true");

    expect(res.status).toBe(200);
    res.body.content.forEach((p) => {
      expect(p.is_offer).toBe(true);
      expect(p.offer_price).not.toBeNull();
      // El price efectivo debe ser el offer_price
      expect(p.price).toBe(p.offer_price);
    });
  });

  it("filtra productos fuera de oferta con isOffer=false", async () => {
    const res = await request(app).get("/products/filter?isOffer=false");

    expect(res.status).toBe(200);
    res.body.content.forEach((p) => {
      expect(p.is_offer).toBe(false);
      expect(p.price).toBe(p.original_price);
    });
  });

  // ─── FILTRO: PRECIO ─────────────────────────────────────────────
  it("filtra por minPrice y no trae productos mas baratos", async () => {
    if (!existingProductPrice) return;

    const minPrice = existingProductPrice;
    const res = await request(app).get(`/products/filter?minPrice=${minPrice}`);

    expect(res.status).toBe(200);
    res.body.content.forEach((p) => {
      expect(p.price).toBeGreaterThanOrEqual(minPrice);
    });
  });

  it("filtra por maxPrice y no trae productos mas caros", async () => {
    if (!existingProductPrice) return;

    const maxPrice = existingProductPrice * 2;
    const res = await request(app).get(`/products/filter?maxPrice=${maxPrice}`);

    expect(res.status).toBe(200);
    res.body.content.forEach((p) => {
      expect(p.price).toBeLessThanOrEqual(maxPrice);
    });
  });

  it("devuelve 400 cuando minPrice es mayor que maxPrice", async () => {
    const res = await request(app).get(
      "/products/filter?minPrice=1000&maxPrice=10"
    );

    expect(res.status).toBe(400);
    expect(res.body.errors[0].field).toBe("minPrice");
  });

  it("devuelve lista vacia cuando el rango de precio no coincide con ningun producto", async () => {
    const res = await request(app).get(
      "/products/filter?minPrice=99999999&maxPrice=99999999"
    );

    expect(res.status).toBe(200);
    expect(res.body.content).toHaveLength(0);
  });

  // ─── ORDENAMIENTO ───────────────────────────────────────────────
  it("ordena por price asc correctamente", async () => {
    const res = await request(app).get(
      "/products/filter?sortBy=price&sortOrder=asc"
    );

    expect(res.status).toBe(200);
    const prices = res.body.content.map((p) => p.price);
    const sorted = [...prices].sort((a, b) => a - b);
    expect(prices).toEqual(sorted);
  });

  it("ordena por price desc correctamente", async () => {
    const res = await request(app).get(
      "/products/filter?sortBy=price&sortOrder=desc"
    );

    expect(res.status).toBe(200);
    const prices = res.body.content.map((p) => p.price);
    const sorted = [...prices].sort((a, b) => b - a);
    expect(prices).toEqual(sorted);
  });

  it("devuelve 400 cuando sortBy tiene un valor invalido", async () => {
    const res = await request(app).get("/products/filter?sortBy=invalido");

    expect(res.status).toBe(400);
  });

  // ─── PAGINACION ─────────────────────────────────────────────────
  it("respeta el limit y devuelve la cantidad correcta de productos", async () => {
    const res = await request(app).get("/products/filter?limit=5");

    expect(res.status).toBe(200);
    expect(res.body.content.length).toBeLessThanOrEqual(5);
    expect(res.body.size).toBe(5);
  });

  it("la segunda pagina no repite productos de la primera", async () => {
    const page1 = await request(app).get("/products/filter?page=1&limit=5");
    const page2 = await request(app).get("/products/filter?page=2&limit=5");

    expect(page1.status).toBe(200);
    expect(page2.status).toBe(200);

    if (page1.body.total_pages > 1) {
      const ids1 = page1.body.content.map((p) => p.id_product);
      const ids2 = page2.body.content.map((p) => p.id_product);
      const intersection = ids1.filter((id) => ids2.includes(id));
      expect(intersection).toHaveLength(0);
    }
  });

  it("devuelve 400 cuando limit supera 100", async () => {
    const res = await request(app).get("/products/filter?limit=200");

    expect(res.status).toBe(400);
  });

  // ─── COMBINACION DE FILTROS ─────────────────────────────────────
  it("combina search y categoryId correctamente", async () => {
    if (!existingCategoryId) return;

    const res = await request(app).get(
      `/products/filter?search=a&categoryId=${existingCategoryId}`
    );

    expect(res.status).toBe(200);
    if (res.body.content.length > 0) {
      res.body.content.forEach((p) => {
        expect(p.category?.id_product_category).toBe(existingCategoryId);
      });
    }
  });
});