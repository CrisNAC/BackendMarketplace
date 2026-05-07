import { vi, describe, it, expect, beforeEach } from "vitest";
import {
  getWishlists,
  createWishlist,
  deleteWishlist,
  getWishlistItems,
  addWishlistItem,
  updateWishlistItemQuantity,
  removeWishlistItem,
} from "../../../src/modules/users/wishlist/wishlist.controller.js";

vi.mock("../../../src/modules/users/wishlist/wishlist.service.js", () => ({
  getWishlistsService: vi.fn(),
  createWishlistService: vi.fn(),
  deleteWishlistService: vi.fn(),
  getWishlistItemsService: vi.fn(),
  addWishlistItemService: vi.fn(),
  updateWishlistItemQuantityService: vi.fn(),
  removeWishlistItemService: vi.fn(),
}));

import {
  getWishlistsService,
  createWishlistService,
  deleteWishlistService,
  getWishlistItemsService,
  addWishlistItemService,
  updateWishlistItemQuantityService,
  removeWishlistItemService,
} from "../../../src/modules/users/wishlist/wishlist.service.js";

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

const noUser = (params = {}) => makeCtx(params, {}, null);

describe("getWishlists", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retorna 401 cuando no hay usuario autenticado", async () => {
    const { req, res, next } = noUser({ customerId: "2" });
    await getWishlists(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(getWishlistsService).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it("retorna 200 con las wishlists", async () => {
    const { req, res, next } = makeCtx({ customerId: "2" });
    getWishlistsService.mockResolvedValue([{ id_wishlist: 1 }]);
    await getWishlists(req, res, next);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("llama next con el error cuando el servicio falla", async () => {
    const { req, res, next } = makeCtx({ customerId: "2" });
    const error = new Error("fail");
    getWishlistsService.mockRejectedValue(error);
    await getWishlists(req, res, next);
    expect(next).toHaveBeenCalledWith(error);
  });
});

describe("createWishlist", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retorna 401 cuando no hay usuario autenticado", async () => {
    const { req, res, next } = noUser({ customerId: "2" });
    await createWishlist(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(createWishlistService).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it("retorna 201 con la wishlist creada", async () => {
    const { req, res, next } = makeCtx({ customerId: "2" }, { name: "Favoritos" });
    createWishlistService.mockResolvedValue({ id_wishlist: 1, name: "Favoritos" });
    await createWishlist(req, res, next);
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it("llama next con el error cuando el servicio falla", async () => {
    const { req, res, next } = makeCtx({ customerId: "2" });
    const error = new Error("fail");
    createWishlistService.mockRejectedValue(error);
    await createWishlist(req, res, next);
    expect(next).toHaveBeenCalledWith(error);
  });
});

describe("deleteWishlist", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retorna 401 cuando no hay usuario autenticado", async () => {
    const { req, res, next } = noUser({ customerId: "2", wishlistId: "1" });
    await deleteWishlist(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(deleteWishlistService).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it("retorna 204 al eliminar la wishlist", async () => {
    const { req, res, next } = makeCtx({ customerId: "2", wishlistId: "1" });
    deleteWishlistService.mockResolvedValue();
    await deleteWishlist(req, res, next);
    expect(res.status).toHaveBeenCalledWith(204);
  });

  it("llama next con el error cuando el servicio falla", async () => {
    const { req, res, next } = makeCtx({ customerId: "2", wishlistId: "1" });
    const error = new Error("fail");
    deleteWishlistService.mockRejectedValue(error);
    await deleteWishlist(req, res, next);
    expect(next).toHaveBeenCalledWith(error);
  });
});

describe("getWishlistItems", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retorna 401 cuando no hay usuario autenticado", async () => {
    const { req, res, next } = noUser({ customerId: "2", wishlistId: "1" });
    await getWishlistItems(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(getWishlistItemsService).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it("retorna 200 con los items", async () => {
    const { req, res, next } = makeCtx({ customerId: "2", wishlistId: "1" });
    getWishlistItemsService.mockResolvedValue({ items: [] });
    await getWishlistItems(req, res, next);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("llama next con el error cuando el servicio falla", async () => {
    const { req, res, next } = makeCtx({ customerId: "2", wishlistId: "1" });
    const error = new Error("fail");
    getWishlistItemsService.mockRejectedValue(error);
    await getWishlistItems(req, res, next);
    expect(next).toHaveBeenCalledWith(error);
  });
});

describe("addWishlistItem", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retorna 401 cuando no hay usuario autenticado", async () => {
    const { req, res, next } = noUser({ customerId: "2", wishlistId: "1" });
    await addWishlistItem(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(addWishlistItemService).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it("retorna 201 con el item agregado", async () => {
    const { req, res, next } = makeCtx({ customerId: "2", wishlistId: "1" }, { productId: 5 });
    addWishlistItemService.mockResolvedValue({ id_wishlist_item: 1 });
    await addWishlistItem(req, res, next);
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it("llama next con el error cuando el servicio falla", async () => {
    const { req, res, next } = makeCtx({ customerId: "2", wishlistId: "1" });
    const error = new Error("fail");
    addWishlistItemService.mockRejectedValue(error);
    await addWishlistItem(req, res, next);
    expect(next).toHaveBeenCalledWith(error);
  });
});

describe("updateWishlistItemQuantity", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retorna 401 cuando no hay usuario autenticado", async () => {
    const { req, res, next } = noUser({ customerId: "2", wishlistId: "1", productId: "5" });
    await updateWishlistItemQuantity(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(updateWishlistItemQuantityService).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it("retorna 200 con la wishlist actualizada", async () => {
    const { req, res, next } = makeCtx(
      { customerId: "2", wishlistId: "1", productId: "5" },
      { quantity: 3 }
    );
    updateWishlistItemQuantityService.mockResolvedValue({ id_wishlist_item: 1 });
    await updateWishlistItemQuantity(req, res, next);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("llama next con el error cuando el servicio falla", async () => {
    const { req, res, next } = makeCtx({ customerId: "2", wishlistId: "1", productId: "5" });
    const error = new Error("fail");
    updateWishlistItemQuantityService.mockRejectedValue(error);
    await updateWishlistItemQuantity(req, res, next);
    expect(next).toHaveBeenCalledWith(error);
  });
});

describe("removeWishlistItem", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retorna 401 cuando no hay usuario autenticado", async () => {
    const { req, res, next } = noUser({ customerId: "2", wishlistId: "1", productId: "5" });
    await removeWishlistItem(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(removeWishlistItemService).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it("retorna 204 al eliminar el item", async () => {
    const { req, res, next } = makeCtx({ customerId: "2", wishlistId: "1", productId: "5" });
    removeWishlistItemService.mockResolvedValue();
    await removeWishlistItem(req, res, next);
    expect(res.status).toHaveBeenCalledWith(204);
  });

  it("llama next con el error cuando el servicio falla", async () => {
    const { req, res, next } = makeCtx({ customerId: "2", wishlistId: "1", productId: "5" });
    const error = new Error("fail");
    removeWishlistItemService.mockRejectedValue(error);
    await removeWishlistItem(req, res, next);
    expect(next).toHaveBeenCalledWith(error);
  });
});