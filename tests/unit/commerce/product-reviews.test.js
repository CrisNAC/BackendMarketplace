import { vi, describe, it, expect, beforeEach } from "vitest";
import { prisma } from "../../../src/lib/prisma.js";
import { getProductReviewsService } from "../../../src/modules/commerce/product-reviews/product-review.service.js";

vi.mock("../../../src/lib/prisma.js", () => ({
  prisma: {
    products: { findUnique: vi.fn() },
    productReviews: { findMany: vi.fn() },
  },
}));

const mockProduct = { id_product: 1, status: true };
const mockReviews = [
  {
    id_product_review: 1,
    rating: 5,
    comment: "Excelente",
    approved: true,
    created_at: new Date("2026-01-01"),
    user: { name: "Ana" },
  },
  {
    id_product_review: 2,
    rating: 3,
    comment: null,
    approved: false,
    created_at: new Date("2026-01-02"),
    user: { name: "Luis" },
  },
];

describe("getProductReviewsService", () => {
  beforeEach(() => vi.clearAllMocks());

  it("lanza 400 cuando productId no es entero positivo", async () => {
    await expect(getProductReviewsService(-1, {})).rejects.toMatchObject({ status: 400 });
  });

  it("lanza 400 cuando productId es 0", async () => {
    await expect(getProductReviewsService(0, {})).rejects.toMatchObject({ status: 400 });
  });

  it("lanza 400 cuando productId es texto no numérico", async () => {
    await expect(getProductReviewsService("abc", {})).rejects.toMatchObject({ status: 400 });
  });

  it("lanza 404 cuando el producto no existe", async () => {
    prisma.products.findUnique.mockResolvedValue(null);
    await expect(getProductReviewsService(1, {})).rejects.toMatchObject({
      status: 404,
      message: "Producto no encontrado",
    });
  });

  it("lanza 404 cuando el producto está inactivo", async () => {
    prisma.products.findUnique.mockResolvedValue({ id_product: 1, status: false });
    await expect(getProductReviewsService(1, {})).rejects.toMatchObject({ status: 404 });
  });

  it("retorna stats y reviews mapeados correctamente", async () => {
    prisma.products.findUnique.mockResolvedValue(mockProduct);
    prisma.productReviews.findMany
      .mockResolvedValueOnce(mockReviews)   // paginadas
      .mockResolvedValueOnce(mockReviews);  // allRatings

    const result = await getProductReviewsService(1, {});

    expect(result.stats.totalReviews).toBe(2);
    expect(result.stats.verifiedReviews).toBe(1);
    expect(result.stats.averageRating).toBe(4);
    expect(result.reviews).toHaveLength(2);
    expect(result.reviews[0]).toMatchObject({
      id: 1,
      customerName: "Ana",
      rating: 5,
      isVerified: true,
    });
  });

  it("retorna averageRating null cuando no hay reseñas", async () => {
    prisma.products.findUnique.mockResolvedValue(mockProduct);
    prisma.productReviews.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const result = await getProductReviewsService(1, {});

    expect(result.stats.averageRating).toBeNull();
    expect(result.stats.totalReviews).toBe(0);
  });

  it("aplica paginación correctamente (page y limit del query)", async () => {
    prisma.products.findUnique.mockResolvedValue(mockProduct);
    prisma.productReviews.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    await getProductReviewsService(1, { page: 2, limit: 5 });

    const firstCall = prisma.productReviews.findMany.mock.calls[0][0];
    expect(firstCall.skip).toBe(5);
    expect(firstCall.take).toBe(5);
  });

  it("usa limit 10 y page 1 por defecto", async () => {
    prisma.products.findUnique.mockResolvedValue(mockProduct);
    prisma.productReviews.findMany.mockResolvedValue([]).mockResolvedValue([]);

    await getProductReviewsService(1, {});

    const firstCall = prisma.productReviews.findMany.mock.calls[0][0];
    expect(firstCall.skip).toBe(0);
    expect(firstCall.take).toBe(10);
  });

  it("limita limit a 100 cuando se pasa un valor mayor", async () => {
    prisma.products.findUnique.mockResolvedValue(mockProduct);
    prisma.productReviews.findMany.mockResolvedValue([]).mockResolvedValue([]);

    await getProductReviewsService(1, { limit: 500 });

    const firstCall = prisma.productReviews.findMany.mock.calls[0][0];
    expect(firstCall.take).toBe(100);
  });

  it("calcula totalPages correctamente en paginación", async () => {
    const allRatings = Array(25).fill({ rating: 4, approved: true });
    prisma.products.findUnique.mockResolvedValue(mockProduct);
    prisma.productReviews.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(allRatings);

    const result = await getProductReviewsService(1, { limit: 10 });

    expect(result.pagination.totalPages).toBe(3);
  });
});