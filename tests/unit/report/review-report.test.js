import { vi, describe, it, expect, beforeEach } from "vitest";
import { prisma } from "../../../src/lib/prisma.js";
import {
  reportProductReviewService,
} from "../../../src/modules/reports/review-report/review-report.service.js";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "../../../src/lib/errors.js";

// ─── MOCK DE PRISMA ──────────────────────────────────────────────────────────

vi.mock("../../../src/lib/prisma.js", () => ({
  prisma: {
    users: {
      findUnique: vi.fn(),
    },
    productReviews: {
      findFirst: vi.fn(),
    },
    reviewReports: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}));

// ─── DATOS DE PRUEBA ─────────────────────────────────────────────────────────

const mockUser = { id_user: 1 };

const mockReview = { id_product_review: 1, fk_user: 2 }; // pertenece a otro usuario

const mockReviewOwnedByReporter = { id_product_review: 1, fk_user: 1 }; // pertenece al mismo usuario que reporta

const mockReport = {
  id_review_report: 1,
  reason: "SPAM",
  description: null,
  report_status: "PENDING",
  created_at: new Date(),
};

// ─── reportProductReviewService ───────────────────────────────────────────────

describe("reportProductReviewService", () => {
  beforeEach(() => vi.clearAllMocks());

  it("lanza ValidationError cuando el userId no es un entero positivo", async () => {
    await expect(
      reportProductReviewService(-1, 1, { reason: "SPAM" })
    ).rejects.toThrow(ValidationError);
  });

  it("lanza ValidationError cuando el reviewId no es un entero positivo", async () => {
    await expect(
      reportProductReviewService(1, -1, { reason: "SPAM" })
    ).rejects.toThrow(ValidationError);
  });

  it("lanza NotFoundError cuando el usuario no existe", async () => {
    prisma.users.findUnique.mockResolvedValue(null);

    await expect(
      reportProductReviewService(1, 1, { reason: "SPAM" })
    ).rejects.toThrow(NotFoundError);
  });

  it("lanza NotFoundError cuando la reseña no existe o no está activa", async () => {
    prisma.users.findUnique.mockResolvedValue(mockUser);
    prisma.productReviews.findFirst.mockResolvedValue(null);

    await expect(
      reportProductReviewService(1, 1, { reason: "SPAM" })
    ).rejects.toThrow(NotFoundError);
  });

  it("lanza ForbiddenError cuando el usuario intenta reportar su propia reseña", async () => {
    prisma.users.findUnique.mockResolvedValue(mockUser);
    prisma.productReviews.findFirst.mockResolvedValue(mockReviewOwnedByReporter);

    await expect(
      reportProductReviewService(1, 1, { reason: "SPAM" })
    ).rejects.toThrow(ForbiddenError);
  });

  it("lanza ConflictError cuando el usuario ya reportó esta reseña", async () => {
    prisma.users.findUnique.mockResolvedValue(mockUser);
    prisma.productReviews.findFirst.mockResolvedValue(mockReview);
    prisma.reviewReports.findUnique.mockResolvedValue({ id_review_report: 1 });

    await expect(
      reportProductReviewService(1, 1, { reason: "SPAM" })
    ).rejects.toThrow(ConflictError);
  });

  it("lanza ValidationError cuando no se envía reason", async () => {
    prisma.users.findUnique.mockResolvedValue(mockUser);
    prisma.productReviews.findFirst.mockResolvedValue(mockReview);
    prisma.reviewReports.findUnique.mockResolvedValue(null);

    await expect(
      reportProductReviewService(1, 1, {})
    ).rejects.toThrow(ValidationError);
  });

  it("lanza ValidationError cuando reason no es un valor permitido", async () => {
    prisma.users.findUnique.mockResolvedValue(mockUser);
    prisma.productReviews.findFirst.mockResolvedValue(mockReview);
    prisma.reviewReports.findUnique.mockResolvedValue(null);

    await expect(
      reportProductReviewService(1, 1, { reason: "INVALIDO" })
    ).rejects.toThrow(ValidationError);
  });

  it("lanza ValidationError cuando reason es OTHER sin description", async () => {
    prisma.users.findUnique.mockResolvedValue(mockUser);
    prisma.productReviews.findFirst.mockResolvedValue(mockReview);
    prisma.reviewReports.findUnique.mockResolvedValue(null);

    await expect(
      reportProductReviewService(1, 1, { reason: "OTHER" })
    ).rejects.toThrow(ValidationError);
  });

  it("lanza ValidationError cuando reason es OTHER con description vacía", async () => {
    prisma.users.findUnique.mockResolvedValue(mockUser);
    prisma.productReviews.findFirst.mockResolvedValue(mockReview);
    prisma.reviewReports.findUnique.mockResolvedValue(null);

    await expect(
      reportProductReviewService(1, 1, { reason: "OTHER", description: "   " })
    ).rejects.toThrow(ValidationError);
  });

  it("acepta todos los valores válidos de reason", async () => {
    prisma.users.findUnique.mockResolvedValue(mockUser);
    prisma.productReviews.findFirst.mockResolvedValue(mockReview);
    prisma.reviewReports.findUnique.mockResolvedValue(null);
    prisma.reviewReports.create.mockResolvedValue(mockReport);

    const validReasons = ["SPAM", "OFFENSIVE", "FAKE"];

    for (const reason of validReasons) {
      await expect(
        reportProductReviewService(1, 1, { reason })
      ).resolves.toBeDefined();
    }
  });

  it("crea el reporte correctamente con reason válido sin description", async () => {
    prisma.users.findUnique.mockResolvedValue(mockUser);
    prisma.productReviews.findFirst.mockResolvedValue(mockReview);
    prisma.reviewReports.findUnique.mockResolvedValue(null);
    prisma.reviewReports.create.mockResolvedValue(mockReport);

    const result = await reportProductReviewService(1, 1, { reason: "SPAM" });

    expect(prisma.reviewReports.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          fk_product_review: 1,
          fk_reporter: 1,
          reason: "SPAM",
        }),
      })
    );
    expect(result).toMatchObject({ id_review_report: 1, reason: "SPAM", report_status: "PENDING" });
  });

  it("crea el reporte correctamente con reason OTHER y description válida", async () => {
    prisma.users.findUnique.mockResolvedValue(mockUser);
    prisma.productReviews.findFirst.mockResolvedValue(mockReview);
    prisma.reviewReports.findUnique.mockResolvedValue(null);
    prisma.reviewReports.create.mockResolvedValue({
      ...mockReport,
      reason: "OTHER",
      description: "Descripción del motivo",
    });

    const result = await reportProductReviewService(1, 1, {
      reason: "OTHER",
      description: "Descripción del motivo",
    });

    expect(prisma.reviewReports.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          reason: "OTHER",
          description: "Descripción del motivo",
        }),
      })
    );
    expect(result.description).toBe("Descripción del motivo");
  });

  it("aplica trim() a la description antes de guardar", async () => {
    prisma.users.findUnique.mockResolvedValue(mockUser);
    prisma.productReviews.findFirst.mockResolvedValue(mockReview);
    prisma.reviewReports.findUnique.mockResolvedValue(null);
    prisma.reviewReports.create.mockResolvedValue({
      ...mockReport,
      reason: "OTHER",
      description: "Descripción con espacios",
    });

    await reportProductReviewService(1, 1, {
      reason: "OTHER",
      description: "  Descripción con espacios  ",
    });

    expect(prisma.reviewReports.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          description: "Descripción con espacios",
        }),
      })
    );
  });

  it("no incluye description en data cuando no se envía", async () => {
    prisma.users.findUnique.mockResolvedValue(mockUser);
    prisma.productReviews.findFirst.mockResolvedValue(mockReview);
    prisma.reviewReports.findUnique.mockResolvedValue(null);
    prisma.reviewReports.create.mockResolvedValue(mockReport);

    await reportProductReviewService(1, 1, { reason: "SPAM" });

    const callData = prisma.reviewReports.create.mock.calls[0][0].data;
    expect(callData).not.toHaveProperty("description");
  });

  it("retorna el reporte con los campos correctos del select", async () => {
    prisma.users.findUnique.mockResolvedValue(mockUser);
    prisma.productReviews.findFirst.mockResolvedValue(mockReview);
    prisma.reviewReports.findUnique.mockResolvedValue(null);
    prisma.reviewReports.create.mockResolvedValue(mockReport);

    const result = await reportProductReviewService(1, 1, { reason: "FAKE" });

    expect(result).toHaveProperty("id_review_report");
    expect(result).toHaveProperty("reason");
    expect(result).toHaveProperty("report_status");
    expect(result).toHaveProperty("created_at");
  });
});