import { vi, describe, it, expect, beforeEach } from "vitest";

// ─── admin-stores.controller ──────────────────────────────────────────────────

vi.mock("../../../src/modules/admin/stores/admin-stores.service.js", () => ({
  approveStoreService: vi.fn(),
  getPendingStoresService: vi.fn(),
  rejectStoreService: vi.fn(),
}));

vi.mock("../../../src/modules/admin/products/admin-products.service.js", () => ({
  getProductsAdminService: vi.fn(),
  updateProductApprovalStatusService: vi.fn(),
}));

vi.mock("../../../src/modules/admin/users/admin-users.service.js", () => ({
  getUsersAdminService: vi.fn(),
}));

import {
  approveStore,
  getPendingStores,
  rejectStore,
} from "../../../src/modules/admin/stores/admin-stores.controller.js";

import {
  getProducts as getAdminProducts,
  updateProductStatus,
} from "../../../src/modules/admin/products/admin-products.controller.js";

import { getUsers as getAdminUsers } from "../../../src/modules/admin/users/admin-users.controller.js";

import {
  approveStoreService,
  getPendingStoresService,
  rejectStoreService,
} from "../../../src/modules/admin/stores/admin-stores.service.js";

import {
  getProductsAdminService,
  updateProductApprovalStatusService,
} from "../../../src/modules/admin/products/admin-products.service.js";

import { getUsersAdminService } from "../../../src/modules/admin/users/admin-users.service.js";

const makeCtx = (params = {}, body = {}, query = {}, user = { id_user: 1 }) => {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
  const req = { user, params, body, query, pagination: { page: 1, limit: 10, skip: 0 } };
  const next = vi.fn();
  return { req, res, next };
};

// ─── approveStore ─────────────────────────────────────────────────────────────

describe("approveStore", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retorna 200 al aprobar el comercio", async () => {
    const { req, res, next } = makeCtx({ id: "1" });
    approveStoreService.mockResolvedValue({ id_store: 1, store_status: "ACTIVE" });
    await approveStore(req, res, next);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, message: "Comercio aprobado exitosamente" })
    );
  });

  it("retorna error con status cuando el servicio lanza error con status", async () => {
    const { req, res, next } = makeCtx({ id: "999" });
    approveStoreService.mockRejectedValue({ status: 404, message: "Comercio no encontrado" });
    await approveStore(req, res, next);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: "Comercio no encontrado" });
  });

  it("llama next con el error cuando no tiene status", async () => {
    const { req, res, next } = makeCtx({ id: "1" });
    const err = new Error("DB error");
    approveStoreService.mockRejectedValue(err);
    await approveStore(req, res, next);
    expect(next).toHaveBeenCalledWith(err);
  });
});

// ─── getPendingStores ─────────────────────────────────────────────────────────

describe("getPendingStores", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retorna 200 con los comercios pendientes", async () => {
    const { req, res, next } = makeCtx();
    getPendingStoresService.mockResolvedValue({ data: [], pagination: {} });
    await getPendingStores(req, res, next);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("llama next con el error cuando el servicio falla", async () => {
    const { req, res, next } = makeCtx();
    getPendingStoresService.mockRejectedValue(new Error("fail"));
    await getPendingStores(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});

// ─── rejectStore ──────────────────────────────────────────────────────────────

describe("rejectStore", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retorna 200 al rechazar el comercio", async () => {
    const { req, res, next } = makeCtx({ id: "1" }, { reason: "No cumple requisitos" });
    rejectStoreService.mockResolvedValue({ id_store: 1, store_status: "SUSPENDED" });
    await rejectStore(req, res, next);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, message: "Comercio rechazado exitosamente" })
    );
  });

  it("retorna error con status cuando el servicio lanza error", async () => {
    const { req, res, next } = makeCtx({ id: "1" }, { reason: "motivo" });
    rejectStoreService.mockRejectedValue({ status: 400, message: "Motivo inválido" });
    await rejectStore(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("llama next cuando el error no tiene status", async () => {
    const { req, res, next } = makeCtx({ id: "1" }, { reason: "motivo" });
    rejectStoreService.mockRejectedValue(new Error("DB error"));
    await rejectStore(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});

// ─── getAdminProducts ─────────────────────────────────────────────────────────

describe("getAdminProducts", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retorna 200 con los productos del admin", async () => {
    const { req, res, next } = makeCtx({}, {}, { search: "test" });
    getProductsAdminService.mockResolvedValue({ data: [], pagination: {} });
    await getAdminProducts(req, res, next);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("llama next con el error cuando el servicio falla", async () => {
    const { req, res, next } = makeCtx();
    getProductsAdminService.mockRejectedValue(new Error("fail"));
    await getAdminProducts(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});

// ─── updateProductStatus ──────────────────────────────────────────────────────

describe("updateProductStatus", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retorna 401 cuando no hay usuario autenticado", async () => {
    const { req, res, next } = makeCtx({ id: "1" }, {}, {}, null);
    await updateProductStatus(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("retorna 200 al actualizar el estado del producto", async () => {
    const { req, res, next } = makeCtx({ id: "1" }, { approval_status: "APPROVED" });
    updateProductApprovalStatusService.mockResolvedValue({ id_product: 1 });
    await updateProductStatus(req, res, next);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("llama next con el error cuando el servicio falla", async () => {
    const { req, res, next } = makeCtx({ id: "1" }, {});
    updateProductApprovalStatusService.mockRejectedValue(new Error("fail"));
    await updateProductStatus(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});

// ─── getAdminUsers ────────────────────────────────────────────────────────────

describe("getAdminUsers", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retorna 200 con los usuarios", async () => {
    const { req, res, next } = makeCtx({}, {}, { role: "CUSTOMER" });
    getUsersAdminService.mockResolvedValue({ data: [], pagination: {} });
    await getAdminUsers(req, res, next);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("llama next con el error cuando el servicio falla", async () => {
    const { req, res, next } = makeCtx();
    getUsersAdminService.mockRejectedValue(new Error("fail"));
    await getAdminUsers(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});