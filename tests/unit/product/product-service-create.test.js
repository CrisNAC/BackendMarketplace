import { vi, describe, it, expect, beforeEach } from "vitest";
import { prisma } from "../../../src/lib/prisma.js";

vi.mock("../../../src/lib/prisma.js", () => ({
  prisma: {
    users: { findUnique: vi.fn() },
    products: { findUnique: vi.fn(), findFirst: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock(
  "../../../src/modules/global/categories/product-categories/product-category.service.js",
  () => ({ validateProductCategoryService: vi.fn().mockResolvedValue(undefined) })
);

vi.mock("../../../src/modules/commerce/product-tags/product-tag.service.js", () => ({
  parseProductTagIdsService: vi.fn().mockReturnValue([]),
  validateProductTagsService: vi.fn().mockResolvedValue(undefined),
}));

import {
  createProductService,
  updateProductService,
} from "../../../src/modules/commerce/products/product.service.js";
import { parseProductTagIdsService } from "../../../src/modules/commerce/product-tags/product-tag.service.js";

const mockSeller = {
  id_user: 1,
  role: "SELLER",
  status: true,
  store: { id_store: 5, status: true },
};

const mockExistingProduct = {
  id_product: 10,
  fk_store: 5,
  offer_price: null,
  is_offer: false,
  status: true,
};

const mockFullProduct = {
  id_product: 10,
  name: "Laptop",
  description: null,
  price: 1500000,
  offer_price: null,
  quantity: 10,
  fk_product_category: 1,
  fk_store: 5,
  visible: true,
  is_offer: false,
  image_url: null,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
  product_category: { id_product_category: 1, name: "Electrónica", status: true },
  store: { id_store: 5, name: "TiendaA" },
  product_tag_relations: [],
  product_reviews: [],
};

// ─── createProductService ─────────────────────────────────────────────────────

describe("createProductService", () => {
  let mockTx;

  beforeEach(() => {
    vi.clearAllMocks();
    parseProductTagIdsService.mockReturnValue([]);
    mockTx = {
      products: { create: vi.fn().mockResolvedValue({ id_product: 10 }), findFirst: vi.fn() },
      productTagRelations: { createMany: vi.fn().mockResolvedValue({}) },
    };
    prisma.$transaction.mockImplementation((fn) => fn(mockTx));
  });

  it("lanza 401 cuando no hay usuario autenticado", async () => {
    await expect(createProductService(null, {})).rejects.toMatchObject({ status: 401 });
  });

  it("lanza 404 cuando el usuario no existe", async () => {
    prisma.users.findUnique.mockResolvedValue(null);
    await expect(
      createProductService(1, { name: "Laptop", price: 1500000, categoryId: 1 })
    ).rejects.toMatchObject({ status: 404 });
  });

  it("crea producto sin tags y retorna respuesta mapeada", async () => {
    prisma.users.findUnique.mockResolvedValue(mockSeller);
    mockTx.products.findFirst.mockResolvedValue(mockFullProduct);

    const result = await createProductService(1, { name: "Laptop", price: 1500000, categoryId: 1 });
    expect(result).toMatchObject({ name: "Laptop" });
    expect(mockTx.productTagRelations.createMany).not.toHaveBeenCalled();
  });

  it("crea producto con tags — llama a productTagRelations.createMany (línea 622-623)", async () => {
    prisma.users.findUnique.mockResolvedValue(mockSeller);
    parseProductTagIdsService.mockReturnValue([1, 2]);
    mockTx.products.findFirst.mockResolvedValue(mockFullProduct);

    await createProductService(1, { name: "Laptop", price: 1500000, categoryId: 1, tags: "1,2" });
    expect(mockTx.productTagRelations.createMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.arrayContaining([expect.objectContaining({ fk_product_tag: 1 })]) })
    );
  });

  it("lanza 500 cuando getProductResponseByIdService retorna null (línea 635)", async () => {
    prisma.users.findUnique.mockResolvedValue(mockSeller);
    mockTx.products.findFirst.mockResolvedValue(null);

    await expect(
      createProductService(1, { name: "Laptop", price: 1500000, categoryId: 1 })
    ).rejects.toMatchObject({ status: 500, message: "No se pudo recuperar el producto creado" });
  });
});

// ─── updateProductService ─────────────────────────────────────────────────────

describe("updateProductService", () => {
  let mockTx;

  beforeEach(() => {
    vi.clearAllMocks();
    parseProductTagIdsService.mockReturnValue([]);
    mockTx = {
      products: { update: vi.fn().mockResolvedValue({}), findFirst: vi.fn() },
      productTagRelations: { findMany: vi.fn().mockResolvedValue([]), updateMany: vi.fn().mockResolvedValue({}), createMany: vi.fn().mockResolvedValue({}) },
    };
    prisma.$transaction.mockImplementation((fn) => fn(mockTx));
  });

  it("lanza 401 cuando no hay usuario autenticado", async () => {
    await expect(updateProductService(null, 10, {})).rejects.toMatchObject({ status: 401 });
  });

  it("lanza 404 cuando el producto no existe", async () => {
    prisma.users.findUnique.mockResolvedValue(mockSeller);
    prisma.products.findUnique.mockResolvedValue(null);
    await expect(updateProductService(1, 10, { name: "Nueva" })).rejects.toMatchObject({ status: 404 });
  });

  it("lanza 403 cuando el producto no pertenece al comercio del seller (línea 650)", async () => {
    prisma.users.findUnique.mockResolvedValue(mockSeller);
    prisma.products.findUnique.mockResolvedValue({ ...mockExistingProduct, fk_store: 99 });
    await expect(updateProductService(1, 10, { name: "Nueva" })).rejects.toMatchObject({ status: 403 });
  });

  it("lanza 400 cuando payload no tiene campos válidos", async () => {
    prisma.users.findUnique.mockResolvedValue(mockSeller);
    prisma.products.findUnique.mockResolvedValue(mockExistingProduct);
    await expect(updateProductService(1, 10, {})).rejects.toMatchObject({ status: 400 });
  });

  it("actualiza nombre correctamente y retorna producto mapeado", async () => {
    prisma.users.findUnique.mockResolvedValue(mockSeller);
    prisma.products.findUnique.mockResolvedValue(mockExistingProduct);
    mockTx.products.findFirst.mockResolvedValue(mockFullProduct);

    const result = await updateProductService(1, 10, { name: "Laptop Pro" });
    expect(result).toMatchObject({ name: "Laptop" });
    expect(mockTx.products.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ name: "Laptop Pro" }) })
    );
  });

  it("lanza 500 cuando el producto actualizado no se puede recuperar (línea 675)", async () => {
    prisma.users.findUnique.mockResolvedValue(mockSeller);
    prisma.products.findUnique.mockResolvedValue(mockExistingProduct);
    mockTx.products.findFirst.mockResolvedValue(null);

    await expect(updateProductService(1, 10, { name: "Laptop Pro" })).rejects.toMatchObject({
      status: 500,
      message: "No se pudo recuperar el producto actualizado",
    });
  });
});