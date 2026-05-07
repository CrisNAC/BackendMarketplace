import { vi, describe, it, expect, beforeEach } from "vitest";
import {
  createStoreAddress,
  getStoreAddresses,
  getStoreAddressById,
  updateStoreAddress,
  deleteStoreAddress,
} from "../../../src/modules/commerce/addresses/controllers/addresses.controllers.js";

vi.mock("../../../src/modules/commerce/addresses/services/addresses.services.js", () => ({
  createStoreAddressService: vi.fn(),
  getStoreAddressesService: vi.fn(),
  getStoreAddressByIdService: vi.fn(),
  updateStoreAddressService: vi.fn(),
  deleteStoreAddressService: vi.fn(),
}));

import {
  createStoreAddressService,
  getStoreAddressesService,
  getStoreAddressByIdService,
  updateStoreAddressService,
  deleteStoreAddressService,
} from "../../../src/modules/commerce/addresses/services/addresses.services.js";

const makeCtx = (params = {}, body = {}, user = { id_user: 1 }) => {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
  const req = { user, params, body };
  return { req, res };
};

const mockAddress = { id_address: 5, address: "Calle 1", city: "Asunción", region: "Central" };

describe("createStoreAddress", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retorna 201 con la dirección creada", async () => {
    const { req, res } = makeCtx({ id: "1" }, { address: "Calle 1", city: "Asunción", region: "Central" });
    createStoreAddressService.mockResolvedValue(mockAddress);
    await createStoreAddress(req, res);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, message: "Direccion del comercio creada exitosamente", data: mockAddress })
    );
  });

  it("retorna error status cuando el servicio falla", async () => {
    const { req, res } = makeCtx({ id: "1" });
    createStoreAddressService.mockRejectedValue({ status: 403, message: "Sin permisos" });
    await createStoreAddress(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
  });

  it("retorna 500 cuando el error no tiene status", async () => {
    const { req, res } = makeCtx({ id: "1" });
    createStoreAddressService.mockRejectedValue(new Error("DB error"));
    await createStoreAddress(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe("getStoreAddresses", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retorna 200 con la lista de direcciones", async () => {
    const { req, res } = makeCtx({ id: "1" });
    getStoreAddressesService.mockResolvedValue([mockAddress]);
    await getStoreAddresses(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, data: [mockAddress] }));
  });

  it("retorna error cuando el servicio falla", async () => {
    const { req, res } = makeCtx({ id: "1" });
    getStoreAddressesService.mockRejectedValue({ status: 404, message: "No encontrado" });
    await getStoreAddresses(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });
});

describe("getStoreAddressById", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retorna 200 con la dirección solicitada", async () => {
    const { req, res } = makeCtx({ id: "1", id_address: "5" });
    getStoreAddressByIdService.mockResolvedValue(mockAddress);
    await getStoreAddressById(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, data: mockAddress }));
  });

  it("retorna error cuando la dirección no existe", async () => {
    const { req, res } = makeCtx({ id: "1", id_address: "99" });
    getStoreAddressByIdService.mockRejectedValue({ status: 404, message: "No encontrada" });
    await getStoreAddressById(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });
});

describe("updateStoreAddress", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retorna 200 con la dirección actualizada", async () => {
    const { req, res } = makeCtx({ id: "1", id_address: "5" }, { city: "Luque" });
    updateStoreAddressService.mockResolvedValue({ ...mockAddress, city: "Luque" });
    await updateStoreAddress(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Direccion del comercio actualizada exitosamente" })
    );
  });

  it("retorna error cuando el servicio falla", async () => {
    const { req, res } = makeCtx({ id: "1", id_address: "5" });
    updateStoreAddressService.mockRejectedValue({ status: 400, message: "Sin campos" });
    await updateStoreAddress(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});

describe("deleteStoreAddress", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retorna 200 al desactivar la dirección", async () => {
    const { req, res } = makeCtx({ id: "1", id_address: "5" });
    deleteStoreAddressService.mockResolvedValue({ id_address: 5, status: false });
    await deleteStoreAddress(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Direccion del comercio desactivada correctamente" })
    );
  });

  it("retorna error cuando el servicio falla", async () => {
    const { req, res } = makeCtx({ id: "1", id_address: "99" });
    deleteStoreAddressService.mockRejectedValue({ status: 404, message: "No encontrada" });
    await deleteStoreAddress(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });
});