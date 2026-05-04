import { vi, describe, it, expect, beforeEach } from "vitest";
import { createProductReview } from "../../../src/modules/users/product-review/product-review.controller.js";

vi.mock("../../../src/modules/users/product-review/product-review.service.js", () => ({
  createProductReviewService: vi.fn(),
}));

import { createProductReviewService } from "../../../src/modules/users/product-review/product-review.service.js";

const makeCtx = (params = {}, body = {}, user = { id_user: 2 }) => {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
  const req = { user, params, body };
  return { req, res };
};

describe("createProductReview", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retorna 401 cuando no hay usuario autenticado", async () => {
    const { req, res } = makeCtx({ id: "1" }, {}, null);
    await createProductReview(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("retorna 201 con la reseña creada", async () => {
    const { req, res } = makeCtx({ id: "1" }, { rating: 5, comment: "Excelente" });
    createProductReviewService.mockResolvedValue({ id: 10, rating: 5 });
    await createProductReview(req, res);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ id: 10, rating: 5 });
  });

  it("retorna el status del error cuando el servicio lanza error con status < 500", async () => {
    const { req, res } = makeCtx({ id: "1" }, { rating: 5 });
    const err = { status: 400, message: "Ya existe una reseña activa" };
    createProductReviewService.mockRejectedValue(err);
    await createProductReview(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "Ya existe una reseña activa" });
  });

  it("usa mensaje genérico cuando el error < 500 no tiene message", async () => {
    const { req, res } = makeCtx({ id: "1" }, { rating: 5 });
    createProductReviewService.mockRejectedValue({ status: 400 });
    await createProductReview(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "Solicitud inválida" });
  });
});