import { vi, describe, it, expect, beforeEach } from "vitest";
import {
  createOrder,
  getOrders,
  getStoreOrders,
  updateOrderStatus,
  getOrderShippingQuote,
  getPendingDeliveryReviews,
  createDeliveryReview,
} from "../../../src/modules/users/orders/order.controller.js";

vi.mock("../../../src/modules/users/orders/order.service.js", () => ({
  createOrderService: vi.fn(),
  getOrdersService: vi.fn(),
  getStoreOrdersService: vi.fn(),
  updateOrderStatusService: vi.fn(),
  getOrderShippingQuoteService: vi.fn(),
  getPendingDeliveryReviewsService: vi.fn(),
  createDeliveryReviewService: vi.fn(),
}));

import {
  createOrderService,
  getOrdersService,
  getStoreOrdersService,
  updateOrderStatusService,
  getOrderShippingQuoteService,
  getPendingDeliveryReviewsService,
  createDeliveryReviewService,
} from "../../../src/modules/users/orders/order.service.js";

const makeCtx = (params = {}, body = {}, query = {}, user = { id_user: 1 }) => {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
  const req = { user, params, body, query };
  const next = vi.fn();
  return { req, res, next };
};

describe("createOrder", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retorna 201 con la orden creada", async () => {
    const { req, res, next } = makeCtx({}, { items: [{ productId: 1, quantity: 2 }] });
    createOrderService.mockResolvedValue({ id_order: 10 });
    await createOrder(req, res, next);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ id_order: 10 });
  });

  it("llama next con el error cuando el servicio falla", async () => {
    const { req, res, next } = makeCtx();
    createOrderService.mockRejectedValue(new Error("fail"));
    await createOrder(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});

describe("getOrders", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retorna 200 con las órdenes del usuario", async () => {
    const { req, res, next } = makeCtx({ customerId: "2" });
    getOrdersService.mockResolvedValue([{ id_order: 1 }]);
    await getOrders(req, res, next);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("llama next con el error cuando el servicio falla", async () => {
    const { req, res, next } = makeCtx({ customerId: "2" });
    getOrdersService.mockRejectedValue(new Error("fail"));
    await getOrders(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});

describe("getStoreOrders", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retorna 200 con las órdenes del comercio", async () => {
    const { req, res, next } = makeCtx({ storeId: "1" }, {}, { page: "1" });
    getStoreOrdersService.mockResolvedValue([{ id_order: 1 }]);
    await getStoreOrders(req, res, next);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("llama next con el error cuando el servicio falla", async () => {
    const { req, res, next } = makeCtx({ storeId: "1" });
    getStoreOrdersService.mockRejectedValue(new Error("fail"));
    await getStoreOrders(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});

describe("updateOrderStatus", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retorna 200 con la orden actualizada", async () => {
    const { req, res, next } = makeCtx({ orderId: "5" }, { order_status: "SHIPPED" });
    updateOrderStatusService.mockResolvedValue({ id_order: 5 });
    await updateOrderStatus(req, res, next);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("llama next con el error cuando el servicio falla", async () => {
    const { req, res, next } = makeCtx({ orderId: "5" });
    updateOrderStatusService.mockRejectedValue(new Error("fail"));
    await updateOrderStatus(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});

describe("getOrderShippingQuote", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retorna 200 con la cotización de envío", async () => {
    const { req, res, next } = makeCtx({}, { storeId: 1 });
    getOrderShippingQuoteService.mockResolvedValue({ price: 15000 });
    await getOrderShippingQuote(req, res, next);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ price: 15000 });
  });

  it("llama next con el error cuando el servicio falla", async () => {
    const { req, res, next } = makeCtx();
    getOrderShippingQuoteService.mockRejectedValue(new Error("fail"));
    await getOrderShippingQuote(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});

describe("getPendingDeliveryReviews", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retorna 200 con las reseñas pendientes", async () => {
    const { req, res, next } = makeCtx();
    getPendingDeliveryReviewsService.mockResolvedValue([]);
    await getPendingDeliveryReviews(req, res, next);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("llama next con el error cuando el servicio falla", async () => {
    const { req, res, next } = makeCtx();
    getPendingDeliveryReviewsService.mockRejectedValue(new Error("fail"));
    await getPendingDeliveryReviews(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});

describe("createDeliveryReview", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retorna 201 con la reseña creada", async () => {
    const { req, res, next } = makeCtx({ orderId: "10" }, { rating: 5 });
    createDeliveryReviewService.mockResolvedValue({ id: 1 });
    await createDeliveryReview(req, res, next);
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it("llama next con el error cuando el servicio falla", async () => {
    const { req, res, next } = makeCtx({ orderId: "10" });
    createDeliveryReviewService.mockRejectedValue(new Error("fail"));
    await createDeliveryReview(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});