import { vi, describe, it, expect, beforeEach } from "vitest";
import {
  createProduct,
  updateProduct,
  getProductsSearch,
  deleteProduct,
  getProductById,
  compareProducts,
  filterProducts,
} from "../../../src/modules/commerce/products/product.controller.js";

vi.mock("../../../src/modules/commerce/products/product.service.js", () => ({
  createProductService: vi.fn(),
  updateProductService: vi.fn(),
  getProductsSearchService: vi.fn(),
  getProductByIdService: vi.fn(),
  deleteProductService: vi.fn(),
  filterProductsService: vi.fn(),
}));

import {
  createProductService,
  updateProductService,
  getProductsSearchService,
  getProductByIdService,
  deleteProductService,
  filterProductsService,
} from "../../../src/modules/commerce/products/product.service.js";

const makeCtx = (params = {}, body = {}, query = {}, user = { id_user: 1 }) => {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
  };
  const req = { user, params, body, query, pagination: { page: 1, limit: 20, skip: 0 } };
  const next = vi.fn();
  return { req, res, next };
};

const mockProduct = { id_product: 1, name: "Laptop", price: 1500000 };

describe("createProduct", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retorna 401 cuando no hay usuario autenticado", async () => {
    const { req, res } = makeCtx({}, {}, {}, null);
    await createProduct(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("retorna 201 con el producto creado", async () => {
    const { req, res } = makeCtx({}, { name: "Laptop", price: 1500000 });
    createProductService.mockResolvedValue(mockProduct);
    await createProduct(req, res);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(mockProduct);
  });

  it("retorna error status cuando el servicio falla", async () => {
    const { req, res } = makeCtx({}, { name: "" });
    createProductService.mockRejectedValue({ status: 400, message: "Nombre requerido" });
    await createProduct(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("retorna 500 cuando el error no tiene status", async () => {
    const { req, res } = makeCtx({}, { name: "Laptop" });
    createProductService.mockRejectedValue(new Error("DB error"));
    await createProduct(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe("updateProduct", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retorna 401 cuando no hay usuario autenticado", async () => {
    const { req, res } = makeCtx({ id: "1" }, {}, {}, null);
    await updateProduct(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("retorna 200 con el producto actualizado", async () => {
    const { req, res } = makeCtx({ id: "1" }, { name: "Laptop Pro" });
    updateProductService.mockResolvedValue({ ...mockProduct, name: "Laptop Pro" });
    await updateProduct(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("retorna error status cuando el servicio falla", async () => {
    const { req, res } = makeCtx({ id: "1" }, { name: "" });
    updateProductService.mockRejectedValue({ status: 404, message: "Producto no encontrado" });
    await updateProduct(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });
});

describe("getProductsSearch", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retorna 200 con la lista de productos", async () => {
    const { req, res } = makeCtx({}, {}, { search: "laptop" });
    getProductsSearchService.mockResolvedValue({ products: [mockProduct], pagination: {} });
    await getProductsSearch(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("retorna error status cuando el servicio falla", async () => {
    const { req, res } = makeCtx({}, {}, {});
    getProductsSearchService.mockRejectedValue({ status: 400, message: "Parámetro inválido" });
    await getProductsSearch(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("retorna 500 cuando el error no tiene status", async () => {
    const { req, res } = makeCtx();
    getProductsSearchService.mockRejectedValue(new Error("fail"));
    await getProductsSearch(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe("deleteProduct", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retorna 401 cuando no hay usuario autenticado", async () => {
    const { req, res, next } = makeCtx({ id: "1" }, {}, {}, null);
    await deleteProduct(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("retorna 204 al eliminar el producto", async () => {
    const { req, res, next } = makeCtx({ id: "1" });
    deleteProductService.mockResolvedValue();
    await deleteProduct(req, res, next);
    expect(res.status).toHaveBeenCalledWith(204);
    expect(res.send).toHaveBeenCalled();
  });

  it("llama next con el error cuando el servicio falla", async () => {
    const { req, res, next } = makeCtx({ id: "1" });
    deleteProductService.mockRejectedValue(new Error("fail"));
    await deleteProduct(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});

describe("getProductById", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retorna 200 con el producto encontrado", async () => {
    const { req, res } = makeCtx({ id: "1" });
    getProductByIdService.mockResolvedValue(mockProduct);
    await getProductById(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(mockProduct);
  });

  it("retorna 404 cuando el producto no existe (retorna null)", async () => {
    const { req, res } = makeCtx({ id: "999" });
    getProductByIdService.mockResolvedValue(null);
    await getProductById(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("retorna error status cuando el servicio lanza excepción", async () => {
    const { req, res } = makeCtx({ id: "1" });
    getProductByIdService.mockRejectedValue({ status: 500, message: "DB error" });
    await getProductById(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe("compareProducts", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retorna 200 con lista vacía cuando no hay productos", async () => {
    const { req, res } = makeCtx({}, {}, { search: "inexistente" });
    getProductsSearchService.mockResolvedValue({ products: [], pagination: null });
    await compareProducts(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ product: null, offers: [], pagination: null });
  });

  it("retorna 200 con producto y ofertas cuando hay resultados", async () => {
    const products = [
      { id_product: 1, name: "Laptop", price: "1500000", original_price: "1800000", offer_price: "1500000", is_offer: true, store: { id_store: 1, name: "TiendaA", logo: null } },
      { id_product: 2, name: "Laptop", price: "1600000", original_price: undefined, offer_price: null, is_offer: false, store: null },
    ];
    const { req, res } = makeCtx({}, {}, { search: "laptop" });
    getProductsSearchService.mockResolvedValue({ products, pagination: { page: 1, total: 2 } });
    await compareProducts(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    const call = res.json.mock.calls[0][0];
    expect(call.offers).toHaveLength(2);
    expect(call.offers[0].store).toMatchObject({ id: 1, name: "TiendaA" });
    expect(call.offers[1].store).toBeNull();
  });

  it("retorna error status cuando el servicio falla", async () => {
    const { req, res } = makeCtx({}, {}, { search: "laptop" });
    getProductsSearchService.mockRejectedValue({ status: 500, message: "fail" });
    await compareProducts(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe("filterProducts", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retorna 200 con productos paginados", async () => {
    const { req, res } = makeCtx({}, {}, { categoryId: "1" });
    filterProductsService.mockResolvedValue({ products: [mockProduct], totalProducts: 1 });
    await filterProducts(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("retorna error status válido cuando el servicio falla con status en rango", async () => {
    const { req, res } = makeCtx();
    filterProductsService.mockRejectedValue({ status: 400, message: "Parámetros inválidos" });
    await filterProducts(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("retorna 500 cuando el error tiene status fuera de rango", async () => {
    const { req, res } = makeCtx();
    filterProductsService.mockRejectedValue({ status: 200, message: "ok" });
    await filterProducts(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});