import { vi, describe, it, expect, beforeEach } from "vitest";
import { prisma } from "../../../src/lib/prisma.js";
import { createProductReviewService } from "../../../src/modules/users/product-review/product-review.service.js";

vi.mock("../../../src/lib/prisma.js", () => ({
  prisma: {
    products: { findUnique: vi.fn() },
    users: { findUnique: vi.fn() },
    orders: { findFirst: vi.fn() },
    productReviews: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

const mockProduct = { id_product: 1, status: true };
const mockBuyer = { id_user: 2, role: "CUSTOMER", status: true };
const mockOrder = { id_order: 10 };

const validData = { rating: 4, comment: "Muy bueno" };

const mockCreatedReview = {
  id_product_review: 5,
  rating: 4,
  comment: "Muy bueno",
  approved: true,
  created_at: new Date("2026-01-01"),
  user: { name: "Carlos" },
};

describe("createProductReviewService", () => {
  beforeEach(() => vi.clearAllMocks());

  // ── Validaciones de entrada ───────────────────────────────────────────────

  it("lanza 400 cuando productId no es entero positivo", async () => {
    await expect(createProductReviewService(-1, 2, validData)).rejects.toMatchObject({
      status: 400,
      message: expect.stringContaining("producto"),
    });
  });

  it("lanza 400 cuando customerId no es entero positivo", async () => {
    await expect(createProductReviewService(1, 0, validData)).rejects.toMatchObject({
      status: 400,
      message: expect.stringContaining("comprador"),
    });
  });

  it("lanza 400 cuando rating es menor que 1", async () => {
    await expect(createProductReviewService(1, 2, { rating: 0 })).rejects.toMatchObject({
      status: 400,
      message: expect.stringContaining("calificación"),
    });
  });

  it("lanza 400 cuando rating es mayor que 5", async () => {
    await expect(createProductReviewService(1, 2, { rating: 6 })).rejects.toMatchObject({
      status: 400,
    });
  });

  it("lanza 400 cuando comment no es string (pero no null)", async () => {
    await expect(createProductReviewService(1, 2, { rating: 4, comment: 123 })).rejects.toMatchObject({
      status: 400,
      message: expect.stringContaining("comentario"),
    });
  });

  it("lanza 400 cuando comment supera 2000 caracteres", async () => {
    await expect(
      createProductReviewService(1, 2, { rating: 4, comment: "x".repeat(2001) })
    ).rejects.toMatchObject({ status: 400 });
  });

  // ── Verificaciones de base de datos ─────────────────────────────────────

  it("lanza 404 cuando el producto no existe", async () => {
    prisma.products.findUnique.mockResolvedValue(null);
    await expect(createProductReviewService(1, 2, validData)).rejects.toMatchObject({
      status: 404,
      message: "Producto no encontrado",
    });
  });

  it("lanza 404 cuando el producto está inactivo", async () => {
    prisma.products.findUnique.mockResolvedValue({ id_product: 1, status: false });
    await expect(createProductReviewService(1, 2, validData)).rejects.toMatchObject({
      status: 404,
    });
  });

  it("lanza 404 cuando el usuario no existe", async () => {
    prisma.products.findUnique.mockResolvedValue(mockProduct);
    prisma.users.findUnique.mockResolvedValue(null);
    await expect(createProductReviewService(1, 2, validData)).rejects.toMatchObject({
      status: 404,
      message: "Usuario no encontrado",
    });
  });

  it("lanza 403 cuando el usuario no es CUSTOMER", async () => {
    prisma.products.findUnique.mockResolvedValue(mockProduct);
    prisma.users.findUnique.mockResolvedValue({ ...mockBuyer, role: "SELLER" });
    await expect(createProductReviewService(1, 2, validData)).rejects.toMatchObject({
      status: 403,
      message: expect.stringContaining("compradores"),
    });
  });

  it("lanza 403 cuando no tiene un pedido DELIVERED con ese producto", async () => {
    prisma.products.findUnique.mockResolvedValue(mockProduct);
    prisma.users.findUnique.mockResolvedValue(mockBuyer);
    prisma.orders.findFirst.mockResolvedValue(null);
    await expect(createProductReviewService(1, 2, validData)).rejects.toMatchObject({
      status: 403,
      message: expect.stringContaining("reseñar"),
    });
  });

  it("lanza 400 cuando ya existe una reseña activa para ese producto", async () => {
    prisma.products.findUnique.mockResolvedValue(mockProduct);
    prisma.users.findUnique.mockResolvedValue(mockBuyer);
    prisma.orders.findFirst.mockResolvedValue(mockOrder);
    prisma.productReviews.findFirst.mockResolvedValue({ id_product_review: 3, status: true });
    await expect(createProductReviewService(1, 2, validData)).rejects.toMatchObject({
      status: 400,
      message: expect.stringContaining("reseña"),
    });
  });

  // ── Flujo exitoso ────────────────────────────────────────────────────────

  it("crea nueva reseña y retorna datos mapeados correctamente", async () => {
    prisma.products.findUnique.mockResolvedValue(mockProduct);
    prisma.users.findUnique.mockResolvedValue(mockBuyer);
    prisma.orders.findFirst.mockResolvedValue(mockOrder);
    prisma.productReviews.findFirst.mockResolvedValue(null);
    prisma.productReviews.create.mockResolvedValue(mockCreatedReview);

    const result = await createProductReviewService(1, 2, validData);

    expect(result.id).toBe(5);
    expect(result.rating).toBe(4);
    expect(result.comment).toBe("Muy bueno");
    expect(result.customerName).toBe("Carlos");
    expect(result.isVerified).toBe(true);
  });

  it("reactiva reseña eliminada en lugar de crear nueva", async () => {
    prisma.products.findUnique.mockResolvedValue(mockProduct);
    prisma.users.findUnique.mockResolvedValue(mockBuyer);
    prisma.orders.findFirst.mockResolvedValue(mockOrder);
    prisma.productReviews.findFirst.mockResolvedValue({ id_product_review: 3, status: false });
    prisma.productReviews.update.mockResolvedValue(mockCreatedReview);

    const result = await createProductReviewService(1, 2, validData);

    expect(prisma.productReviews.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id_product_review: 3 } })
    );
    expect(prisma.productReviews.create).not.toHaveBeenCalled();
    expect(result.id).toBe(5);
  });

  it("lanza 400 en race condition P2002 al crear", async () => {
    prisma.products.findUnique.mockResolvedValue(mockProduct);
    prisma.users.findUnique.mockResolvedValue(mockBuyer);
    prisma.orders.findFirst.mockResolvedValue(mockOrder);
    prisma.productReviews.findFirst.mockResolvedValue(null);
    const prismaErr = new Error("Unique constraint");
    prismaErr.code = "P2002";
    prisma.productReviews.create.mockRejectedValue(prismaErr);

    await expect(createProductReviewService(1, 2, validData)).rejects.toMatchObject({
      status: 400,
    });
  });

  it("propaga errores no P2002 sin atraparlos", async () => {
    prisma.products.findUnique.mockResolvedValue(mockProduct);
    prisma.users.findUnique.mockResolvedValue(mockBuyer);
    prisma.orders.findFirst.mockResolvedValue(mockOrder);
    prisma.productReviews.findFirst.mockResolvedValue(null);
    const genericErr = new Error("DB error");
    prisma.productReviews.create.mockRejectedValue(genericErr);

    await expect(createProductReviewService(1, 2, validData)).rejects.toBe(genericErr);
  });

  it("acepta comment null", async () => {
    prisma.products.findUnique.mockResolvedValue(mockProduct);
    prisma.users.findUnique.mockResolvedValue(mockBuyer);
    prisma.orders.findFirst.mockResolvedValue(mockOrder);
    prisma.productReviews.findFirst.mockResolvedValue(null);
    prisma.productReviews.create.mockResolvedValue({ ...mockCreatedReview, comment: null });

    const result = await createProductReviewService(1, 2, { rating: 5, comment: null });
    expect(result.comment).toBeNull();
  });
});