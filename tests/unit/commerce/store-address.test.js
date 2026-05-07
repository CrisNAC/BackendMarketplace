import { vi, describe, it, expect, beforeEach } from "vitest";
import { prisma } from "../../../src/lib/prisma.js";
import {
  createStoreAddressService,
  getStoreAddressesService,
  getStoreAddressByIdService,
  updateStoreAddressService,
  deleteStoreAddressService,
} from "../../../src/modules/commerce/addresses/services/addresses.services.js";

vi.mock("../../../src/lib/prisma.js", () => ({
  prisma: {
    addresses: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("../../../src/modules/commerce/commerces/store.service.js", () => ({
  getAuthorizedStoreOwnerService: vi.fn(),
}));

import { getAuthorizedStoreOwnerService } from "../../../src/modules/commerce/commerces/store.service.js";

const mockStore = { id_store: 1, fk_user: 10 };
const mockAddress = {
  id_address: 5,
  fk_user: 10,
  fk_store: 1,
  address: "Calle Falsa 123",
  city: "Asunción",
  region: "Central",
  postal_code: null,
  status: true,
  created_at: new Date("2026-01-01"),
  updated_at: new Date("2026-01-01"),
};
const validPayload = { address: "Calle Falsa 123", city: "Asunción", region: "Central" };

// ─── createStoreAddressService ────────────────────────────────────────────────

describe("createStoreAddressService", () => {
  beforeEach(() => vi.clearAllMocks());

  it("lanza error cuando address está vacío", async () => {
    getAuthorizedStoreOwnerService.mockResolvedValue(mockStore);
    await expect(
      createStoreAddressService(1, 1, { address: "", city: "Asunción", region: "Central" })
    ).rejects.toMatchObject({ status: 400 });
  });

  it("lanza error cuando city supera 100 caracteres", async () => {
    getAuthorizedStoreOwnerService.mockResolvedValue(mockStore);
    await expect(
      createStoreAddressService(1, 1, { address: "Calle 1", city: "x".repeat(101), region: "Central" })
    ).rejects.toMatchObject({ status: 400 });
  });

  it("crea una dirección correctamente", async () => {
    getAuthorizedStoreOwnerService.mockResolvedValue(mockStore);
    prisma.addresses.create.mockResolvedValue(mockAddress);

    const result = await createStoreAddressService(1, 1, validPayload);

    expect(prisma.addresses.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ fk_store: 1, fk_user: 10 }),
      })
    );
    expect(result.id_address).toBe(5);
  });

  it("incluye postal_code null cuando no se provee", async () => {
    getAuthorizedStoreOwnerService.mockResolvedValue(mockStore);
    prisma.addresses.create.mockResolvedValue(mockAddress);

    await createStoreAddressService(1, 1, validPayload);

    expect(prisma.addresses.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ postal_code: null }),
      })
    );
  });

  it("acepta postal_code vacío como null", async () => {
    getAuthorizedStoreOwnerService.mockResolvedValue(mockStore);
    prisma.addresses.create.mockResolvedValue(mockAddress);

    await createStoreAddressService(1, 1, { ...validPayload, postal_code: "" });

    expect(prisma.addresses.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ postal_code: null }),
      })
    );
  });
});

// ─── getStoreAddressesService ──────────────────────────────────────────────────

describe("getStoreAddressesService", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retorna lista de direcciones del comercio", async () => {
    getAuthorizedStoreOwnerService.mockResolvedValue(mockStore);
    prisma.addresses.findMany.mockResolvedValue([mockAddress]);

    const result = await getStoreAddressesService(1, 1);

    expect(prisma.addresses.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ fk_store: 1, status: true }) })
    );
    expect(result).toHaveLength(1);
  });

  it("retorna array vacío cuando no hay direcciones", async () => {
    getAuthorizedStoreOwnerService.mockResolvedValue(mockStore);
    prisma.addresses.findMany.mockResolvedValue([]);

    const result = await getStoreAddressesService(1, 1);

    expect(result).toEqual([]);
  });
});

// ─── getStoreAddressByIdService ───────────────────────────────────────────────

describe("getStoreAddressByIdService", () => {
  beforeEach(() => vi.clearAllMocks());

  it("lanza 400 cuando addressId no es entero positivo", async () => {
    getAuthorizedStoreOwnerService.mockResolvedValue(mockStore);
    await expect(getStoreAddressByIdService(1, 1, -1)).rejects.toMatchObject({ status: 400 });
  });

  it("lanza 404 cuando la dirección no existe o no pertenece al comercio", async () => {
    getAuthorizedStoreOwnerService.mockResolvedValue(mockStore);
    prisma.addresses.findFirst.mockResolvedValue(null);

    await expect(getStoreAddressByIdService(1, 1, 99)).rejects.toMatchObject({
      status: 404,
      message: "Direccion del comercio no encontrada",
    });
  });

  it("retorna la dirección correctamente", async () => {
    getAuthorizedStoreOwnerService.mockResolvedValue(mockStore);
    prisma.addresses.findFirst.mockResolvedValue(mockAddress);

    const result = await getStoreAddressByIdService(1, 1, 5);

    expect(result.id_address).toBe(5);
  });
});

// ─── updateStoreAddressService ────────────────────────────────────────────────

describe("updateStoreAddressService", () => {
  beforeEach(() => vi.clearAllMocks());

  it("lanza 400 cuando no se envía ningún campo", async () => {
    getAuthorizedStoreOwnerService.mockResolvedValue(mockStore);
    prisma.addresses.findFirst.mockResolvedValue(mockAddress);

    await expect(updateStoreAddressService(1, 1, 5, {})).rejects.toMatchObject({ status: 400 });
  });

  it("lanza 400 cuando region supera 100 caracteres", async () => {
    getAuthorizedStoreOwnerService.mockResolvedValue(mockStore);
    prisma.addresses.findFirst.mockResolvedValue(mockAddress);

    await expect(
      updateStoreAddressService(1, 1, 5, { region: "x".repeat(101) })
    ).rejects.toMatchObject({ status: 400 });
  });

  it("actualiza la dirección correctamente", async () => {
    getAuthorizedStoreOwnerService.mockResolvedValue(mockStore);
    prisma.addresses.findFirst.mockResolvedValue(mockAddress);
    prisma.addresses.update.mockResolvedValue({ ...mockAddress, city: "Lambaré" });

    const result = await updateStoreAddressService(1, 1, 5, { city: "Lambaré" });

    expect(prisma.addresses.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id_address: 5 },
        data: { city: "Lambaré" },
      })
    );
    expect(result.city).toBe("Lambaré");
  });

  it("acepta postal_code null explícito en update", async () => {
    getAuthorizedStoreOwnerService.mockResolvedValue(mockStore);
    prisma.addresses.findFirst.mockResolvedValue(mockAddress);
    prisma.addresses.update.mockResolvedValue({ ...mockAddress, postal_code: null });

    await updateStoreAddressService(1, 1, 5, { postal_code: null });

    expect(prisma.addresses.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ postal_code: null }),
      })
    );
  });
});

// ─── deleteStoreAddressService ────────────────────────────────────────────────

describe("deleteStoreAddressService", () => {
  beforeEach(() => vi.clearAllMocks());

  it("lanza 404 cuando la dirección no existe", async () => {
    getAuthorizedStoreOwnerService.mockResolvedValue(mockStore);
    prisma.addresses.findFirst.mockResolvedValue(null);

    await expect(deleteStoreAddressService(1, 1, 99)).rejects.toMatchObject({ status: 404 });
  });

  it("realiza borrado lógico (status = false)", async () => {
    getAuthorizedStoreOwnerService.mockResolvedValue(mockStore);
    prisma.addresses.findFirst.mockResolvedValue(mockAddress);
    prisma.addresses.update.mockResolvedValue({ id_address: 5, status: false, updated_at: new Date() });

    const result = await deleteStoreAddressService(1, 1, 5);

    expect(prisma.addresses.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id_address: 5 },
        data: { status: false },
      })
    );
    expect(result.status).toBe(false);
  });

  it("lanza 400 cuando addressId es string no numérico", async () => {
    getAuthorizedStoreOwnerService.mockResolvedValue(mockStore);

    await expect(deleteStoreAddressService(1, 1, "abc")).rejects.toMatchObject({ status: 400 });
  });
});