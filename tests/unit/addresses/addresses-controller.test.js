import { vi, describe, it, expect, beforeEach } from "vitest";
import {
  createAddress,
  getAddressesByUser,
  getAddressById,
  updateAddress,
  deleteAddress,
} from "../../../src/modules/users/addresses/controllers/addresses.controllers.js";

vi.mock("../../../src/modules/users/addresses/services/addresses.services.js", () => ({
  createAddressService: vi.fn(),
  getAddressesByUserService: vi.fn(),
  getAddressByIdService: vi.fn(),
  updateAddressService: vi.fn(),
  deleteAddressService: vi.fn(),
}));

import {
  createAddressService,
  getAddressesByUserService,
  getAddressByIdService,
  updateAddressService,
  deleteAddressService,
} from "../../../src/modules/users/addresses/services/addresses.services.js";

const makeCtx = (params = {}, body = {}, user = { id_user: 1 }) => {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
  const req = { user, params, body };
  return { req, res };
};

const mockAddress = { id_address: 5, address: "Calle 1", city: "Asunción", region: "Central", status: true };

describe("createAddress", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retorna 201 con la dirección creada", async () => {
    const { req, res } = makeCtx({ id: "2" }, { address: "Calle 1", city: "Asunción", region: "Central" });
    createAddressService.mockResolvedValue(mockAddress);
    await createAddress(req, res);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, data: mockAddress })
    );
  });

  it("retorna error status cuando el servicio falla", async () => {
    const { req, res } = makeCtx({ id: "2" });
    createAddressService.mockRejectedValue({ status: 400, message: "Datos inválidos" });
    await createAddress(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: "Datos inválidos" })
    );
  });

  it("usa status 500 cuando el error no tiene status", async () => {
    const { req, res } = makeCtx({ id: "2" });
    createAddressService.mockRejectedValue(new Error("DB error"));
    await createAddress(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe("getAddressesByUser", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retorna 200 con la lista de direcciones", async () => {
    const { req, res } = makeCtx({ id: "2" });
    getAddressesByUserService.mockResolvedValue([mockAddress]);
    await getAddressesByUser(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, data: [mockAddress] })
    );
  });

  it("retorna error status cuando el servicio falla", async () => {
    const { req, res } = makeCtx({ id: "2" });
    getAddressesByUserService.mockRejectedValue({ status: 403, message: "Sin permiso" });
    await getAddressesByUser(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
  });
});

describe("getAddressById", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retorna 200 con la dirección solicitada", async () => {
    const { req, res } = makeCtx({ id: "2", id_address: "5" });
    getAddressByIdService.mockResolvedValue(mockAddress);
    await getAddressById(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it("retorna error cuando la dirección no existe", async () => {
    const { req, res } = makeCtx({ id: "2", id_address: "99" });
    getAddressByIdService.mockRejectedValue({ status: 404, message: "No encontrada" });
    await getAddressById(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });
});

describe("updateAddress", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retorna 200 con la dirección actualizada", async () => {
    const { req, res } = makeCtx({ id: "2", id_address: "5" }, { city: "Luque" });
    updateAddressService.mockResolvedValue({ ...mockAddress, city: "Luque" });
    await updateAddress(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, message: "Direccion actualizada exitosamente" })
    );
  });

  it("retorna error cuando el servicio falla", async () => {
    const { req, res } = makeCtx({ id: "2", id_address: "5" });
    updateAddressService.mockRejectedValue({ status: 400, message: "Sin campos" });
    await updateAddress(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});

describe("deleteAddress", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retorna 200 al desactivar la dirección", async () => {
    const { req, res } = makeCtx({ id: "2", id_address: "5" });
    deleteAddressService.mockResolvedValue({ id_address: 5, status: false });
    await deleteAddress(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Direccion desactivada correctamente" })
    );
  });

  it("retorna error cuando el servicio falla", async () => {
    const { req, res } = makeCtx({ id: "2", id_address: "99" });
    deleteAddressService.mockRejectedValue({ status: 404, message: "No encontrada" });
    await deleteAddress(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });
});