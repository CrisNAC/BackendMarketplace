import { vi, describe, it, expect, beforeEach } from "vitest";
import {
  reportProductReview,
  getReviewReportsFiltered,
  resolveReviewReport,
} from "../../../src/modules/global/reports/review/review-report.controller.js";

vi.mock("../../../src/modules/global/reports/review/review-report.service.js", () => ({
  reportProductReviewService: vi.fn(),
  getReviewReportsFilteredService: vi.fn(),
  resolveReviewReportService: vi.fn(),
}));

import {
  reportProductReviewService,
  getReviewReportsFilteredService,
  resolveReviewReportService,
} from "../../../src/modules/global/reports/review/review-report.service.js";

const makeCtx = (params = {}, body = {}, query = {}, user = { id_user: 1 }) => {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
  const req = { user, params, body, query, pagination: { page: 1, limit: 10, skip: 0 } };
  const next = vi.fn();
  return { req, res, next };
};

describe("reportProductReview", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retorna 401 cuando no hay usuario autenticado", async () => {
    const { req, res, next } = makeCtx({ reviewId: "1" }, {}, {}, null);
    await reportProductReview(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("retorna 201 con el reporte creado", async () => {
    const { req, res, next } = makeCtx(
      { reviewId: "1" },
      { reason: "SPAM", description: "Contenido irrelevante" }
    );
    reportProductReviewService.mockResolvedValue({ id_review_report: 1 });
    await reportProductReview(req, res, next);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ report: { id_review_report: 1 } });
  });

  it("llama next con el error cuando el servicio falla", async () => {
    const { req, res, next } = makeCtx({ reviewId: "1" }, { reason: "SPAM" });
    reportProductReviewService.mockRejectedValue(new Error("fail"));
    await reportProductReview(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});

describe("getReviewReportsFiltered", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retorna 401 cuando no hay usuario autenticado", async () => {
    const { req, res, next } = makeCtx({}, {}, {}, null);
    await getReviewReportsFiltered(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("retorna 200 con los reportes filtrados", async () => {
    const { req, res, next } = makeCtx({}, {}, { report_status: "PENDING" });
    getReviewReportsFilteredService.mockResolvedValue({ data: [], meta: {} });
    await getReviewReportsFiltered(req, res, next);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      filteredReviewReports: { data: [], meta: {} },
    });
  });

  it("llama next con el error cuando el servicio falla", async () => {
    const { req, res, next } = makeCtx();
    getReviewReportsFilteredService.mockRejectedValue(new Error("fail"));
    await getReviewReportsFiltered(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});

describe("resolveReviewReport", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retorna 401 cuando no hay usuario autenticado", async () => {
    const { req, res, next } = makeCtx({ reportId: "1" }, {}, {}, null);
    await resolveReviewReport(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("retorna 200 con el resultado de la resolución", async () => {
    const { req, res, next } = makeCtx({ reportId: "1" }, { decision: "KEEP_REVIEW" });
    resolveReviewReportService.mockResolvedValue({ updatedReport: { id_review_report: 1 } });
    await resolveReviewReport(req, res, next);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("llama next con el error cuando el servicio falla", async () => {
    const { req, res, next } = makeCtx({ reportId: "1" }, { decision: "KEEP_REVIEW" });
    resolveReviewReportService.mockRejectedValue(new Error("fail"));
    await resolveReviewReport(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});