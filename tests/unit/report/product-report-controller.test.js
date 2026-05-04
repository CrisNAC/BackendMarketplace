import { vi, describe, it, expect, beforeEach } from "vitest";
import {
  getProductsReports,
  updateProductReport,
  getProductsReportsFiltered,
  getProductReportReasons,
  createProductReport,
  checkProductReport,
  resolveProductReport,
} from "../../../src/modules/global/reports/product/product-report.controller.js";

vi.mock("../../../src/modules/global/reports/product/product-report.service.js", () => ({
  getProductsReportsService: vi.fn(),
  updateProductReportService: vi.fn(),
  getProductsReportsFilteredService: vi.fn(),
  getProductReportReasonsService: vi.fn(),
  createProductReportService: vi.fn(),
  checkProductReportService: vi.fn(),
  resolveProductReportAdminService: vi.fn(),
}));

import {
  getProductsReportsService,
  updateProductReportService,
  getProductsReportsFilteredService,
  getProductReportReasonsService,
  createProductReportService,
  checkProductReportService,
  resolveProductReportAdminService,
} from "../../../src/modules/global/reports/product/product-report.service.js";

const makeCtx = (params = {}, body = {}, query = {}, user = { id_user: 1 }) => {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
  const req = { user, params, body, query, pagination: { page: 1, limit: 10, skip: 0 } };
  const next = vi.fn();
  return { req, res, next };
};

describe("getProductsReports", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retorna 401 cuando no hay usuario autenticado", async () => {
    const { req, res, next } = makeCtx({}, {}, {}, null);
    await getProductsReports(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("retorna 200 con los reportes de productos", async () => {
    const { req, res, next } = makeCtx();
    getProductsReportsService.mockResolvedValue([{ id_product_report: 1 }]);
    await getProductsReports(req, res, next);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ productsReports: [{ id_product_report: 1 }] });
  });

  it("llama next con el error cuando el servicio falla", async () => {
    const { req, res, next } = makeCtx();
    getProductsReportsService.mockRejectedValue(new Error("fail"));
    await getProductsReports(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});

describe("updateProductReport", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retorna 401 cuando no hay usuario autenticado", async () => {
    const { req, res, next } = makeCtx({ reportId: "1" }, {}, {}, null);
    await updateProductReport(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("retorna 200 con el reporte actualizado", async () => {
    const { req, res, next } = makeCtx({ reportId: "1" }, { report_status: "IN_PROGRESS" });
    updateProductReportService.mockResolvedValue({ id_product_report: 1 });
    await updateProductReport(req, res, next);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ updatedReport: { id_product_report: 1 } });
  });

  it("llama next con el error cuando el servicio falla", async () => {
    const { req, res, next } = makeCtx({ reportId: "1" });
    updateProductReportService.mockRejectedValue(new Error("fail"));
    await updateProductReport(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});

describe("getProductsReportsFiltered", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retorna 401 cuando no hay usuario autenticado", async () => {
    const { req, res, next } = makeCtx({}, {}, {}, null);
    await getProductsReportsFiltered(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("retorna 200 con los reportes filtrados", async () => {
    const { req, res, next } = makeCtx({}, {}, { report_status: "PENDING" });
    getProductsReportsFilteredService.mockResolvedValue({ data: [], meta: {} });
    await getProductsReportsFiltered(req, res, next);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ filteredReports: { data: [], meta: {} } });
  });

  it("llama next con el error cuando el servicio falla", async () => {
    const { req, res, next } = makeCtx();
    getProductsReportsFilteredService.mockRejectedValue(new Error("fail"));
    await getProductsReportsFiltered(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});

describe("getProductReportReasons", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retorna 200 con los motivos de reporte", () => {
    const { req, res, next } = makeCtx();
    getProductReportReasonsService.mockReturnValue(["FAKE", "SPAM"]);
    getProductReportReasons(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(["FAKE", "SPAM"]);
  });
});

describe("createProductReport", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retorna 401 cuando no hay usuario autenticado", async () => {
    const { req, res, next } = makeCtx({}, {}, {}, null);
    await createProductReport(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("retorna 201 con el reporte creado", async () => {
    const { req, res, next } = makeCtx({}, { productId: 1, reason: "FAKE", description: "Es falso" });
    createProductReportService.mockResolvedValue({ id_product_report: 1 });
    await createProductReport(req, res, next);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ id_product_report: 1 });
  });

  it("llama next con el error cuando el servicio falla", async () => {
    const { req, res, next } = makeCtx({}, { productId: 1 });
    createProductReportService.mockRejectedValue(new Error("fail"));
    await createProductReport(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});

describe("checkProductReport", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retorna 401 cuando no hay usuario autenticado", async () => {
    const { req, res, next } = makeCtx({}, {}, {}, null);
    await checkProductReport(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("retorna 200 con el resultado de la verificación", async () => {
    const { req, res, next } = makeCtx({}, {}, { productId: "1" });
    checkProductReportService.mockResolvedValue({ hasReported: false });
    await checkProductReport(req, res, next);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ hasReported: false });
  });

  it("llama next con el error cuando el servicio falla", async () => {
    const { req, res, next } = makeCtx({}, {}, { productId: "1" });
    checkProductReportService.mockRejectedValue(new Error("fail"));
    await checkProductReport(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});

describe("resolveProductReport", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retorna 401 cuando no hay usuario autenticado", async () => {
    const { req, res, next } = makeCtx({ reportId: "1" }, {}, {}, null);
    await resolveProductReport(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("retorna 200 con el resultado de la resolución", async () => {
    const { req, res, next } = makeCtx({ reportId: "1" }, { status: "RESOLVED", notes: "OK" });
    resolveProductReportAdminService.mockResolvedValue({ id_product_report: 1 });
    await resolveProductReport(req, res, next);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ id_product_report: 1 });
  });

  it("llama next con el error cuando el servicio falla", async () => {
    const { req, res, next } = makeCtx({ reportId: "1" }, { status: "RESOLVED" });
    resolveProductReportAdminService.mockRejectedValue(new Error("fail"));
    await resolveProductReport(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});