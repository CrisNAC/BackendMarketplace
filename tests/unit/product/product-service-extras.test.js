import { vi, describe, it, expect, beforeEach } from "vitest";
import { prisma } from "../../../src/lib/prisma.js";
import {
  getProductsSearchService,
  deleteProductService,
} from "../../../src/modules/commerce/products/product.service.js";

vi.mock("../../../src/lib/prisma.js", () => ({
  prisma: {
    users: { findUnique: vi.fn() },
    stores: { findFirst: vi.fn() },
    products: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));

// ─── getProductsSearchService — validaciones de precio ────────────────────────

describe("getProductsSearchService — precio inválido", () => {
  beforeEach(() => vi.clearAllMocks());

  it("lanza 400 cuando minPrice no es un número finito positivo", async () => {
    await expect(
      getProductsSearchService({ minPrice: "abc" })
    ).rejects.toMatchObject({ status: 400, message: "minPrice debe ser un número mayor a 0" });
  });

  it("lanza 400 cuando minPrice es 0 o negativo", async () => {
    await expect(
      getProductsSearchService({ minPrice: "0" })
    ).rejects.toMatchObject({ status: 400 });

    await expect(
      getProductsSearchService({ minPrice: "-5" })
    ).rejects.toMatchObject({ status: 400 });
  });

  it("lanza 400 cuando maxPrice no es un número finito positivo", async () => {
    await expect(
      getProductsSearchService({ maxPrice: "xyz" })
    ).rejects.toMatchObject({ status: 400, message: "maxPrice debe ser un número mayor a 0" });
  });

  it("lanza 400 cuando categoryId no es un entero positivo", async () => {
    await expect(
      getProductsSearchService({ categoryId: "abc" })
    ).rejects.toMatchObject({ status: 400, message: "categoryId debe ser un entero mayor a 0" });

    await expect(
      getProductsSearchService({ categoryId: "-1" })
    ).rejects.toMatchObject({ status: 400 });
  });

  it("lanza 400 cuando minPrice es mayor que maxPrice", async () => {
    await expect(
      getProductsSearchService({ minPrice: "100", maxPrice: "10" })
    ).rejects.toMatchObject({ status: 400, message: "minPrice no puede ser mayor que maxPrice" });
  });
});

// ─── deleteProductService ──────────────────────────────────────────────────────

describe("deleteProductService", () => {
  beforeEach(() => vi.clearAllMocks());

  const mockSeller = {
    id_user: 1,
    role: "SELLER",
    status: true,
    store: { id_store: 5, status: true },
  };

  const mockProduct = { id_product: 10, fk_store: 5, status: true };

  it("lanza 401 cuando no se provee authenticatedUserId", async () => {
    await expect(deleteProductService(null, 10)).rejects.toMatchObject({ status: 401 });
  });

  it("lanza 404 cuando el usuario no existe", async () => {
    prisma.users.findUnique.mockResolvedValue(null);
    await expect(deleteProductService(1, 10)).rejects.toMatchObject({ status: 404 });
  });

  it("lanza 403 cuando el usuario no es SELLER", async () => {
    prisma.users.findUnique.mockResolvedValue({ ...mockSeller, role: "CUSTOMER" });
    await expect(deleteProductService(1, 10)).rejects.toMatchObject({ status: 403 });
  });

  it("lanza 404 cuando el producto no existe", async () => {
    prisma.users.findUnique.mockResolvedValue(mockSeller);
    prisma.products.findUnique.mockResolvedValue(null);
    await expect(deleteProductService(1, 10)).rejects.toMatchObject({ status: 404 });
  });

  it("lanza ForbiddenError cuando el producto no pertenece al comercio (count = 0)", async () => {
    prisma.users.findUnique.mockResolvedValue(mockSeller);
    prisma.products.findUnique.mockResolvedValue(mockProduct);
    prisma.products.updateMany.mockResolvedValue({ count: 0 });
    await expect(deleteProductService(1, 10)).rejects.toMatchObject({ statusCode: 403 });
  });

  it("elimina el producto correctamente cuando es del comercio", async () => {
    prisma.users.findUnique.mockResolvedValue(mockSeller);
    prisma.products.findUnique.mockResolvedValue(mockProduct);
    prisma.products.updateMany.mockResolvedValue({ count: 1 });
    await expect(deleteProductService(1, 10)).resolves.not.toThrow();
    expect(prisma.products.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { status: false, visible: false },
      })
    );
  });
});