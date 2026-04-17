import { vi, describe, it, expect, beforeEach } from "vitest";
import { prisma } from "../../../src/lib/prisma.js";
import {
  approveStoreService,
  getPendingStoresService
} from "../../../src/modules/admin/stores/admin-stores.service.js";

// ─── MOCK DE PRISMA ──────────────────────────────────────────────────────────

vi.mock("../../../src/lib/prisma.js", () => ({
  prisma: {
    stores: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    products: {
      updateMany: vi.fn(),
    },
    $transaction: vi.fn(),
  }
}));

// ─── DATOS DE PRUEBA ─────────────────────────────────────────────────────────

const mockInactiveStore = {
  id_store: 1,
  name: "Comercio Test",
  store_status: "INACTIVE",
  status: true,
};

const mockActiveStore = {
  ...mockInactiveStore,
  store_status: "ACTIVE",
};

const mockDeletedStore = {
  ...mockInactiveStore,
  status: false,
};

const mockPagination = { page: 1, limit: 10, skip: 0 };

// ─── approveStoreService ─────────────────────────────────────────────────────

describe("approveStoreService", () => {
  beforeEach(() => vi.clearAllMocks());

  it("aprueba correctamente un comercio INACTIVE → ACTIVE", async () => {
    prisma.stores.findUnique
      .mockResolvedValueOnce(mockInactiveStore)   // primera llamada: validación
      .mockResolvedValueOnce(mockActiveStore);     // segunda llamada: retorno post-update
    prisma.$transaction.mockResolvedValue([{}, {}]);

    const result = await approveStoreService(1);

    expect(result.store_status).toBe("ACTIVE");
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it("lanza error 404 cuando el comercio no existe", async () => {
    prisma.stores.findUnique.mockResolvedValue(null);

    await expect(approveStoreService(999)).rejects.toMatchObject({
      status: 404,
      message: "Comercio no encontrado"
    });
  });

  it("lanza error 404 cuando el comercio está eliminado (status: false)", async () => {
    prisma.stores.findUnique.mockResolvedValue(mockDeletedStore);

    await expect(approveStoreService(1)).rejects.toMatchObject({
      status: 404,
      message: "Comercio no encontrado"
    });
  });

  it("lanza error 400 cuando el comercio ya está ACTIVE", async () => {
    prisma.stores.findUnique.mockResolvedValue(mockActiveStore);

    await expect(approveStoreService(1)).rejects.toMatchObject({
      status: 400,
      message: "El comercio ya está aprobado"
    });
  });

  it("lanza error 400 cuando el ID es inválido", async () => {
    await expect(approveStoreService("abc")).rejects.toMatchObject({
      status: 400,
      message: "ID de comercio inválido"
    });

    await expect(approveStoreService(-1)).rejects.toMatchObject({
      status: 400,
      message: "ID de comercio inválido"
    });

    await expect(approveStoreService(0)).rejects.toMatchObject({
      status: 400,
      message: "ID de comercio inválido"
    });
  });

  it("actualiza la visibilidad de productos al aprobar", async () => {
    prisma.stores.findUnique
      .mockResolvedValueOnce(mockInactiveStore)
      .mockResolvedValueOnce(mockActiveStore);
    prisma.$transaction.mockResolvedValue([{}, {}]);

    await approveStoreService(1);

    // Verificar que $transaction fue llamada con los dos updates
    const transactionArgs = prisma.$transaction.mock.calls[0][0];
    expect(transactionArgs).toHaveLength(2);
  });
});

// ─── getPendingStoresService ────────────────────────────────────────────────

describe("getPendingStoresService", () => {
  beforeEach(() => vi.clearAllMocks());

  it("lista correctamente los comercios pendientes", async () => {
    const pendingStores = [
      {
        id_store: 1,
        name: "Tienda A",
        email: "tiendaa@test.com",
        phone: "123456",
        description: "Una tienda",
        logo: null,
        store_status: "INACTIVE",
        status: true,
        created_at: new Date("2024-01-15"),
        user: { id_user: 1, name: "Juan", email: "juan@test.com" },
        store_category: { id_store_category: 1, name: "Tecnología" }
      }
    ];

    prisma.stores.count.mockResolvedValue(1);
    prisma.stores.findMany.mockResolvedValue(pendingStores);

    const result = await getPendingStoresService(mockPagination);

    expect(result.data).toHaveLength(1);
    expect(result.data[0].store_status).toBe("INACTIVE");
    expect(result.pagination).toMatchObject({
      total: 1,
      page: 1,
      limit: 10,
      totalPages: 1,
    });

    // Verificar que se filtró por store_status INACTIVE y status true
    expect(prisma.stores.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          store_status: "INACTIVE",
          status: true,
        })
      })
    );
  });

  it("retorna lista vacía cuando no hay comercios pendientes", async () => {
    prisma.stores.count.mockResolvedValue(0);
    prisma.stores.findMany.mockResolvedValue([]);

    const result = await getPendingStoresService(mockPagination);

    expect(result.data).toEqual([]);
    expect(result.pagination.total).toBe(0);
    expect(result.pagination.totalPages).toBe(0);
  });

  it("calcula totalPages correctamente", async () => {
    prisma.stores.count.mockResolvedValue(25);
    prisma.stores.findMany.mockResolvedValue([]);

    const result = await getPendingStoresService({ page: 1, limit: 10, skip: 0 });

    expect(result.pagination.totalPages).toBe(3);
  });
});
