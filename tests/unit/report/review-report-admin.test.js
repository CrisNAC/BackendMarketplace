import { vi, describe, it, expect, beforeEach } from "vitest";
import { prisma } from "../../../src/lib/prisma.js";
import {
  getReviewReportsFilteredService,
  resolveReviewReportService,
} from "../../../src/modules/global/reports/review/review-report.service.js";
import {
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "../../../src/lib/errors.js";

vi.mock("../../../src/lib/prisma.js", () => ({
  prisma: {
    users: { findUnique: vi.fn() },
    productReviews: { findFirst: vi.fn(), update: vi.fn() },
    reviewReports: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      count: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

const mockAdmin = { role: "ADMIN" };
const mockNonAdmin = { role: "SELLER" };

const mockReport = {
  id_review_report: 1,
  report_status: "PENDING",
  fk_product_review: 10,
};

const mockUpdatedReport = {
  id_review_report: 1,
  report_status: "REJECTED",
};

// ─── getReviewReportsFilteredService ─────────────────────────────────────────

describe("getReviewReportsFilteredService", () => {
  beforeEach(() => vi.clearAllMocks());

  const pagination = { page: 1, limit: 10, skip: 0 };

  it("lanza NotFoundError cuando el usuario no existe", async () => {
    prisma.users.findUnique.mockResolvedValue(null);
    await expect(getReviewReportsFilteredService(1, {}, pagination)).rejects.toThrow(NotFoundError);
  });

  it("lanza ForbiddenError cuando el usuario no es ADMIN", async () => {
    prisma.users.findUnique.mockResolvedValue(mockNonAdmin);
    await expect(getReviewReportsFilteredService(1, {}, pagination)).rejects.toThrow(ForbiddenError);
  });

  it("lanza ValidationError cuando report_status es inválido", async () => {
    prisma.users.findUnique.mockResolvedValue(mockAdmin);
    await expect(
      getReviewReportsFilteredService(1, { report_status: "UNKNOWN" }, pagination)
    ).rejects.toThrow(ValidationError);
  });

  it("retorna data y meta correctamente sin filtros", async () => {
    prisma.users.findUnique.mockResolvedValue(mockAdmin);
    prisma.reviewReports.findMany.mockResolvedValue([{ id_review_report: 1 }]);
    prisma.reviewReports.count.mockResolvedValue(1);

    const result = await getReviewReportsFilteredService(1, {}, pagination);

    expect(result.data).toHaveLength(1);
    expect(result.meta).toMatchObject({ total: 1, page: 1, limit: 10 });
  });

  it("aplica filtro report_status válido al query", async () => {
    prisma.users.findUnique.mockResolvedValue(mockAdmin);
    prisma.reviewReports.findMany.mockResolvedValue([]);
    prisma.reviewReports.count.mockResolvedValue(0);

    await getReviewReportsFilteredService(1, { report_status: "PENDING" }, pagination);

    expect(prisma.reviewReports.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ report_status: "PENDING" }),
      })
    );
  });

  it("aplica búsqueda OR cuando se provee search", async () => {
    prisma.users.findUnique.mockResolvedValue(mockAdmin);
    prisma.reviewReports.findMany.mockResolvedValue([]);
    prisma.reviewReports.count.mockResolvedValue(0);

    await getReviewReportsFilteredService(1, { search: "Carlos" }, pagination);

    expect(prisma.reviewReports.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ OR: expect.any(Array) }),
      })
    );
  });

  it("calcula total_pages correctamente en meta", async () => {
    prisma.users.findUnique.mockResolvedValue(mockAdmin);
    prisma.reviewReports.findMany.mockResolvedValue([]);
    prisma.reviewReports.count.mockResolvedValue(25);

    const result = await getReviewReportsFilteredService(1, {}, { page: 1, limit: 10, skip: 0 });

    expect(result.meta.total_pages).toBe(3);
  });

  it("acepta todos los report_status válidos", async () => {
    prisma.users.findUnique.mockResolvedValue(mockAdmin);
    prisma.reviewReports.findMany.mockResolvedValue([]);
    prisma.reviewReports.count.mockResolvedValue(0);

    for (const status of ["PENDING", "IN_PROGRESS", "RESOLVED", "REJECTED"]) {
      await expect(
        getReviewReportsFilteredService(1, { report_status: status }, pagination)
      ).resolves.not.toThrow();
    }
  });
});

// ─── resolveReviewReportService ───────────────────────────────────────────────

describe("resolveReviewReportService", () => {
  beforeEach(() => vi.clearAllMocks());

  it("lanza ValidationError cuando decision es inválida", async () => {
    await expect(
      resolveReviewReportService(1, 1, { decision: "DELETE" })
    ).rejects.toThrow(ValidationError);
  });

  it("lanza NotFoundError cuando el usuario no existe", async () => {
    prisma.users.findUnique.mockResolvedValue(null);
    await expect(
      resolveReviewReportService(1, 1, { decision: "KEEP_REVIEW" })
    ).rejects.toThrow(NotFoundError);
  });

  it("lanza ForbiddenError cuando el usuario no es ADMIN", async () => {
    prisma.users.findUnique.mockResolvedValue(mockNonAdmin);
    await expect(
      resolveReviewReportService(1, 1, { decision: "KEEP_REVIEW" })
    ).rejects.toThrow(ForbiddenError);
  });

  it("lanza NotFoundError cuando el reporte no existe", async () => {
    prisma.users.findUnique.mockResolvedValue(mockAdmin);
    prisma.reviewReports.findFirst.mockResolvedValue(null);
    await expect(
      resolveReviewReportService(1, 1, { decision: "KEEP_REVIEW" })
    ).rejects.toThrow(NotFoundError);
  });

  it("lanza ValidationError cuando el reporte ya está RESOLVED", async () => {
    prisma.users.findUnique.mockResolvedValue(mockAdmin);
    prisma.reviewReports.findFirst.mockResolvedValue({ ...mockReport, report_status: "RESOLVED" });
    await expect(
      resolveReviewReportService(1, 1, { decision: "KEEP_REVIEW" })
    ).rejects.toThrow(ValidationError);
  });

  it("lanza ValidationError cuando el reporte ya está REJECTED", async () => {
    prisma.users.findUnique.mockResolvedValue(mockAdmin);
    prisma.reviewReports.findFirst.mockResolvedValue({ ...mockReport, report_status: "REJECTED" });
    await expect(
      resolveReviewReportService(1, 1, { decision: "REMOVE_REVIEW" })
    ).rejects.toThrow(ValidationError);
  });

  it("KEEP_REVIEW rechaza el reporte (report_status = REJECTED)", async () => {
    prisma.users.findUnique.mockResolvedValue(mockAdmin);
    prisma.reviewReports.findFirst.mockResolvedValue(mockReport);
    prisma.reviewReports.update.mockResolvedValue(mockUpdatedReport);

    const result = await resolveReviewReportService(1, 1, { decision: "KEEP_REVIEW" });

    expect(prisma.reviewReports.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ report_status: "REJECTED" }),
      })
    );
    expect(result.updatedReport).toEqual(mockUpdatedReport);
  });

  it("REMOVE_REVIEW ejecuta transacción y oculta la reseña", async () => {
    prisma.users.findUnique.mockResolvedValue(mockAdmin);
    prisma.reviewReports.findFirst
      .mockResolvedValueOnce(mockReport)         // primera llamada: verificar reporte
      .mockResolvedValueOnce(mockUpdatedReport); // segunda llamada: obtener reporte actualizado
    prisma.$transaction.mockImplementation(async (fn) => fn({
      productReviews: { update: vi.fn() },
      reviewReports: { updateMany: vi.fn() },
    }));

    const result = await resolveReviewReportService(1, 1, { decision: "REMOVE_REVIEW" });

    expect(prisma.$transaction).toHaveBeenCalled();
    expect(result.updatedReport).toEqual(mockUpdatedReport);
  });

  it("lanza ValidationError cuando productId de reportId no es entero positivo", async () => {
    await expect(
      resolveReviewReportService(1, -1, { decision: "KEEP_REVIEW" })
    ).rejects.toThrow(ValidationError);
  });
});