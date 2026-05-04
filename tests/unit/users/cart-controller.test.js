import { vi, describe, it, expect, beforeEach } from "vitest";
import {
  getCarts,
  addCartItem,
  getCartItemsById,
  removeCartItem,
  updateCartItemQuantity,
} from "../../../src/modules/users/cart/cart.controller.js";

vi.mock("../../../src/modules/users/cart/cart.service.js", () => ({
  getActiveCartsForUserService: vi.fn(),
  addCartItemService: vi.fn(),
  getCartItemsByIdService: vi.fn(),
  removeCartItemService: vi.fn(),
  updatedCartItemQuantityService: vi.fn(),
}));

import {
  getActiveCartsForUserService,
  addCartItemService,
  getCartItemsByIdService,
  removeCartItemService,
  updatedCartItemQuantityService,
} from "../../../src/modules/users/cart/cart.service.js";

const makeCtx = (params = {}, body = {}, user = { id_user: 1 }) => {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
  };
  const req = { user, params, body, query: {} };
  const next = vi.fn();
  return { req, res, next };
};

describe("getCarts", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retorna 401 cuando no hay usuario autenticado", async () => {
    const { req, res, next } = makeCtx({}, {}, null);
    await getCarts(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("retorna 200 con los carritos del usuario", async () => {
    const { req, res, next } = makeCtx({ customerId: "2" });
    getActiveCartsForUserService.mockResolvedValue([{ id_cart: 1 }]);
    await getCarts(req, res, next);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ carts: [{ id_cart: 1 }] });
  });

  it("llama next con el error cuando el servicio falla", async () => {
    const { req, res, next } = makeCtx({ customerId: "2" });
    const err = new Error("fail");
    getActiveCartsForUserService.mockRejectedValue(err);
    await getCarts(req, res, next);
    expect(next).toHaveBeenCalledWith(err);
  });
});

describe("addCartItem", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retorna 401 cuando no hay usuario autenticado", async () => {
    const { req, res, next } = makeCtx({}, {}, null);
    await addCartItem(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("retorna 201 con el carrito creado", async () => {
    const { req, res, next } = makeCtx({ customerId: "2" }, { productId: 1 });
    addCartItemService.mockResolvedValue({ id_cart: 5 });
    await addCartItem(req, res, next);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ id_cart: 5 });
  });

  it("llama next con el error cuando el servicio falla", async () => {
    const { req, res, next } = makeCtx({ customerId: "2" });
    const err = new Error("fail");
    addCartItemService.mockRejectedValue(err);
    await addCartItem(req, res, next);
    expect(next).toHaveBeenCalledWith(err);
  });
});

describe("getCartItemsById", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retorna 401 cuando no hay usuario autenticado", async () => {
    const { req, res, next } = makeCtx({}, {}, null);
    await getCartItemsById(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("retorna 200 con los items del carrito", async () => {
    const { req, res, next } = makeCtx({ cartId: "10" });
    getCartItemsByIdService.mockResolvedValue([{ id_cart_item: 1 }]);
    await getCartItemsById(req, res, next);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("llama next con el error cuando el servicio falla", async () => {
    const { req, res, next } = makeCtx({ cartId: "10" });
    getCartItemsByIdService.mockRejectedValue(new Error("fail"));
    await getCartItemsById(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});

describe("removeCartItem", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retorna 401 cuando no hay usuario autenticado", async () => {
    const { req, res, next } = makeCtx({}, {}, null);
    await removeCartItem(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("retorna 200 con el carrito actualizado", async () => {
    const { req, res, next } = makeCtx({ cartItemId: "3" });
    removeCartItemService.mockResolvedValue({ id_cart: 1 });
    await removeCartItem(req, res, next);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("llama next con el error cuando el servicio falla", async () => {
    const { req, res, next } = makeCtx({ cartItemId: "3" });
    removeCartItemService.mockRejectedValue(new Error("fail"));
    await removeCartItem(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});

describe("updateCartItemQuantity", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retorna 401 cuando no hay usuario autenticado", async () => {
    const { req, res, next } = makeCtx({}, {}, null);
    await updateCartItemQuantity(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("retorna 200 con el carrito actualizado", async () => {
    const { req, res, next } = makeCtx({ cartItemId: "3" }, { quantity: 2 });
    updatedCartItemQuantityService.mockResolvedValue({ id_cart: 1 });
    await updateCartItemQuantity(req, res, next);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("llama next con el error cuando el servicio falla", async () => {
    const { req, res, next } = makeCtx({ cartItemId: "3" }, { quantity: 2 });
    updatedCartItemQuantityService.mockRejectedValue(new Error("fail"));
    await updateCartItemQuantity(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});