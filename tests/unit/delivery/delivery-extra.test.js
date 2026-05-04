import { vi, describe, it, expect, beforeEach } from "vitest";

// Tests para getProductReviews (commerce) y funciones no cubiertas de delivery controller

vi.mock("../../../src/modules/commerce/product-reviews/product-review.service.js", () => ({
  getProductReviewsService: vi.fn(),
}));

vi.mock("../../../src/modules/delivery/delivery/delivery.service.js", () => ({
  registerDeliveryService: vi.fn(),
  updateDeliveryStatusService: vi.fn(),
  getPendingAssignmentsService: vi.fn(),
  getDeliveryByIdService: vi.fn(),
  updateDeliveryProfileService: vi.fn(),
}));

vi.mock("../../../src/modules/delivery/delivery/delivery.validation.js", () => ({
  registerDeliverySchema: { parse: vi.fn((d) => d) },
  updateDeliveryStatusSchema: { parse: vi.fn((d) => d) },
  updateDeliveryProfileSchema: { parse: vi.fn((d) => d) },
}));

import { getProductReviews } from "../../../src/modules/commerce/product-reviews/product-review.controller.js";
import {
  getPendingAssignments,
  getDeliveryById,
  updateDeliveryStatus,
} from "../../../src/modules/delivery/delivery/delivery.controller.js";
import { getProductReviewsService } from "../../../src/modules/commerce/product-reviews/product-review.service.js";
import {
  getPendingAssignmentsService,
  getDeliveryByIdService,
  updateDeliveryStatusService,
} from "../../../src/modules/delivery/delivery/delivery.service.js";
import { updateDeliveryStatusSchema } from "../../../src/modules/delivery/delivery/delivery.validation.js";

const makeCtx = (params = {}, body = {}, query = {}, user = { id_user: 1 }) => {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
  const req = { user, params, body, query };
  return { req, res };
};

// ─── getProductReviews (commerce) ────────────────────────────────────────────

describe("getProductReviews (commerce controller)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retorna 200 con las reseñas y estadísticas", async () => {
    const { req, res } = makeCtx({ id: "1" }, {}, { page: "1" });
    getProductReviewsService.mockResolvedValue({ stats: {}, reviews: [] });
    await getProductReviews(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("retorna el status del error cuando el servicio lanza error con status válido", async () => {
    const { req, res } = makeCtx({ id: "1" });
    getProductReviewsService.mockRejectedValue({ status: 404, message: "Producto no encontrado" });
    await getProductReviews(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: "Producto no encontrado" });
  });

  it("retorna 500 cuando el error tiene status fuera del rango 400-599", async () => {
    const { req, res } = makeCtx({ id: "1" });
    getProductReviewsService.mockRejectedValue({ status: 200, message: "ok" });
    await getProductReviews(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it("retorna 500 para errores genéricos sin status", async () => {
    const { req, res } = makeCtx({ id: "1" });
    getProductReviewsService.mockRejectedValue(new Error("DB"));
    await getProductReviews(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: "Error interno del servidor" });
  });
});

// ─── getPendingAssignments (delivery controller) ──────────────────────────────

describe("getPendingAssignments (delivery controller)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retorna 400 cuando el ID de delivery es inválido", async () => {
    const { req, res } = makeCtx({ id: "abc" });
    await getPendingAssignments(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("retorna las asignaciones pendientes con status por defecto", async () => {
    const { req, res } = makeCtx({ id: "2" });
    getPendingAssignmentsService.mockResolvedValue([{ id_delivery_assignment: 1 }]);
    await getPendingAssignments(req, res);
    expect(res.json).toHaveBeenCalledWith([{ id_delivery_assignment: 1 }]);
  });

  it("retorna error status cuando el servicio falla", async () => {
    const { req, res } = makeCtx({ id: "2" });
    getPendingAssignmentsService.mockRejectedValue({ status: 404, message: "No encontrado" });
    await getPendingAssignments(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });
});

// ─── getDeliveryById (delivery controller) ───────────────────────────────────

describe("getDeliveryById (delivery controller)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retorna 400 cuando el ID es inválido", async () => {
    const { req, res } = makeCtx({ id: "xyz" });
    await getDeliveryById(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("retorna los datos del delivery con status por defecto", async () => {
    const { req, res } = makeCtx({ id: "3" });
    getDeliveryByIdService.mockResolvedValue({ id_delivery: 3, name: "Juan" });
    await getDeliveryById(req, res);
    expect(res.json).toHaveBeenCalledWith({ id_delivery: 3, name: "Juan" });
  });

  it("retorna error status cuando el servicio falla", async () => {
    const { req, res } = makeCtx({ id: "3" });
    getDeliveryByIdService.mockRejectedValue({ status: 404, message: "No encontrado" });
    await getDeliveryById(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });
});

// ─── updateDeliveryStatus NaN branch ─────────────────────────────────────────

describe("updateDeliveryStatus NaN branch", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retorna 400 cuando el ID es un string no numérico", async () => {
    const { req, res } = makeCtx({ id: "noid" }, { delivery_status: "ACTIVE" });
    await updateDeliveryStatus(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.objectContaining({ message: "ID inválido" }) })
    );
  });
});