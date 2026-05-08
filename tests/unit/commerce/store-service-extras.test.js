import { vi, describe, it, expect, beforeEach } from "vitest";
import { prisma } from "../../../src/lib/prisma.js";

vi.mock("../../../src/lib/prisma.js", () => ({
  prisma: {
    stores: { findUnique: vi.fn(), findMany: vi.fn() },
    products: { count: vi.fn(), findMany: vi.fn() },
  },
}));

vi.mock("../../../src/modules/commerce/store-categories/store-category.service.js", () => ({
  validateStoreCategoryService: vi.fn().mockResolvedValue(undefined),
}));

import {
  getAllProductsByStoreService,
  filterStoreProductsService,
  getStoresService,
} from "../../../src/modules/commerce/commerces/store.service.js";

const mockStore = { id_store: 1 };

const mockProduct = {
  id_product: 1,
  name: "Laptop",
  description: null,
  price: 1500000,
  offer_price: null,
  is_offer: false,
  quantity: 10,
  visible: true,
  created_at: "2026-01-01T00:00:00.000Z",
  product_category: { id_product_category: 1, name: "Electrónica" },
};

const mockPagination = { page: 1, limit: 20, skip: 0 };

// ─── getAllProductsByStoreService ─────────────────────────────────────────────

describe("getAllProductsByStoreService", () => {
  beforeEach(() => vi.clearAllMocks());

  it("lanza 400 cuando id está vacío", async () => {
    await expect(getAllProductsByStoreService(null)).rejects.toMatchObject({ status: 400 });
  });

  it("lanza 400 cuando id no es numérico", async () => {
    await expect(getAllProductsByStoreService("abc")).rejects.toMatchObject({ status: 400 });
  });

  it("lanza 404 cuando el comercio no existe", async () => {
    prisma.stores.findUnique.mockResolvedValue(null);
    await expect(getAllProductsByStoreService(999)).rejects.toMatchObject({ status: 404 });
  });

  it("lanza 404 cuando no hay productos en la tienda", async () => {
    prisma.stores.findUnique.mockResolvedValue(mockStore);
    prisma.products.findMany.mockResolvedValue([]);
    await expect(getAllProductsByStoreService(1)).rejects.toMatchObject({ status: 404 });
  });

  it("retorna productos mapeados con precios", async () => {
    prisma.stores.findUnique.mockResolvedValue(mockStore);
    prisma.products.findMany.mockResolvedValue([mockProduct]);
    const result = await getAllProductsByStoreService(1);
    expect(Array.isArray(result)).toBe(true);
    expect(result[0]).toHaveProperty("original_price");
  });

  it("lanza 500 genérico cuando prisma falla sin status (línea 1155)", async () => {
    prisma.stores.findUnique.mockResolvedValue(mockStore);
    prisma.products.findMany.mockRejectedValue(new Error("DB error"));
    await expect(getAllProductsByStoreService(1)).rejects.toMatchObject({
      status: 500,
      message: "Error al obtener la tienda",
    });
  });
});

// ─── filterStoreProductsService ──────────────────────────────────────────────

describe("filterStoreProductsService", () => {
  beforeEach(() => vi.clearAllMocks());

  it("lanza 400 cuando id es falsy (línea 1167)", async () => {
    await expect(filterStoreProductsService(null, {}, mockPagination)).rejects.toMatchObject({ status: 400 });
    await expect(filterStoreProductsService("", {}, mockPagination)).rejects.toMatchObject({ status: 400 });
  });

  it("lanza 400 cuando id no es numérico", async () => {
    await expect(filterStoreProductsService("abc", {}, mockPagination)).rejects.toMatchObject({ status: 400 });
  });

  it("lanza 404 cuando el comercio no existe", async () => {
    prisma.stores.findUnique.mockResolvedValue(null);
    await expect(filterStoreProductsService(1, {}, mockPagination)).rejects.toMatchObject({ status: 404 });
  });

  it("lanza 400 cuando category es inválido (línea 1209)", async () => {
    prisma.stores.findUnique.mockResolvedValue(mockStore);
    await expect(
      filterStoreProductsService(1, { category: "abc" }, mockPagination)
    ).rejects.toMatchObject({ status: 400, message: "category debe ser un entero mayor a 0" });

    await expect(
      filterStoreProductsService(1, { category: "-1" }, mockPagination)
    ).rejects.toMatchObject({ status: 400 });
  });

  it("lanza 404 cuando no hay productos con los filtros", async () => {
    prisma.stores.findUnique.mockResolvedValue(mockStore);
    prisma.products.count.mockResolvedValue(0);
    prisma.products.findMany.mockResolvedValue([]);
    await expect(filterStoreProductsService(1, {}, mockPagination)).rejects.toMatchObject({ status: 404 });
  });

  it("retorna productos y total cuando hay resultados", async () => {
    prisma.stores.findUnique.mockResolvedValue(mockStore);
    prisma.products.count.mockResolvedValue(1);
    prisma.products.findMany.mockResolvedValue([mockProduct]);
    const result = await filterStoreProductsService(1, {}, mockPagination);
    expect(result).toMatchObject({ totalProducts: 1 });
    expect(Array.isArray(result.products)).toBe(true);
  });

  it("lanza 500 genérico cuando prisma falla sin status (línea 1322)", async () => {
    prisma.stores.findUnique.mockResolvedValue(mockStore);
    prisma.products.count.mockRejectedValue(new Error("DB error"));
    await expect(filterStoreProductsService(1, {}, mockPagination)).rejects.toMatchObject({
      status: 500,
      message: "Error al obtener la tienda",
    });
  });

  it("filtra por visible=true explícito", async () => {
    prisma.stores.findUnique.mockResolvedValue(mockStore);
    prisma.products.count.mockResolvedValue(1);
    prisma.products.findMany.mockResolvedValue([mockProduct]);
    const result = await filterStoreProductsService(1, { visible: true }, mockPagination);
    expect(result.totalProducts).toBe(1);
  });
});

// ─── getStoresService ─────────────────────────────────────────────────────────

describe("getStoresService", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retorna listado de tiendas activas sin filtros", async () => {
    prisma.stores.findMany.mockResolvedValue([{ id_store: 1, name: "TiendaA" }]);
    const result = await getStoresService();
    expect(Array.isArray(result)).toBe(true);
    expect(result[0].name).toBe("TiendaA");
  });

  it("filtra por búsqueda de texto", async () => {
    prisma.stores.findMany.mockResolvedValue([]);
    await getStoresService({ search: "laptop" });
    expect(prisma.stores.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ OR: expect.any(Array) }) })
    );
  });

  it("filtra por storeCategoryId válido", async () => {
    prisma.stores.findMany.mockResolvedValue([]);
    await getStoresService({ storeCategoryId: "2" });
    expect(prisma.stores.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ fk_store_category: 2 }) })
    );
  });

  it("lanza 400 cuando storeCategoryId es inválido", async () => {
    await expect(getStoresService({ storeCategoryId: "abc" })).rejects.toMatchObject({ status: 400 });
    await expect(getStoresService({ storeCategoryId: "0" })).rejects.toMatchObject({ status: 400 });
  });
});