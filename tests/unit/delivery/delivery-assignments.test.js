// tests/unit/delivery/delivery-assignments.test.js
import { vi, describe, it, expect, beforeEach } from "vitest";
import { prisma } from "../../../src/lib/prisma.js";
import {
  createAssignmentService,
  respondToAssignmentService,
  getDeliveryOrderHistoryService,
  getOrderAssignmentsService,
  getDeliveryAssignmentsService,
  getDeliveryPendingAssignmentsService,
  getAcceptedAssignmentService,
} from "../../../src/modules/delivery/delivery-assignments/delivery-assignments.service.js";

// ─── MOCK DE PRISMA ──────────────────────────────────────────────────────────

const mockTx = {
  deliveryAssignments: {
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  orders: {
    update: vi.fn(),
  },
  deliveries: {
    findFirst: vi.fn(),
  },
};

vi.mock("../../../src/lib/prisma.js", () => ({
  prisma: {
    orders: {
      findUnique: vi.fn(),
    },
    deliveries: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
    },
    deliveryAssignments: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      count: vi.fn(),
    },
    $transaction: vi.fn((callbackOrArray) => {
      if (typeof callbackOrArray === "function") {
        return callbackOrArray(mockTx);
      }
      return Promise.all(callbackOrArray.map(p => Promise.resolve(p)));
    }),
  },
}));

// ─── DATOS DE PRUEBA ─────────────────────────────────────────────────────────

const mockOrder = {
  id_order: 1,
  fk_store: 10,
  order_status: "PENDING",
};

const mockDelivery = {
  id_delivery: 1,
  fk_store: 10,
  fk_user: 5,
  delivery_status: "ACTIVE",
  status: true,
};

const mockAssignmentPending = {
  id_delivery_assignment: 1,
  fk_order: 1,
  fk_delivery: 1,
  assignment_status: "PENDING",
  assignment_sequence: 1,
  delivery: { fk_user: 5 },
  order: { fk_store: 10 },
};

const mockPagination = { page: 1, limit: 20, skip: 0 };

const mockAssignmentHistory = {
  id_delivery_assignment: 1,
  assignment_status: "DELIVERED",
  assignment_sequence: 1,
  created_at: "2026-01-01T00:00:00.000Z",
  order: {
    id_order: 100,
    order_status: "DELIVERED",
    total: "150000",
    shipping_cost: "10000",
    created_at: "2026-01-01T00:00:00.000Z",
    user: { id_user: 1, name: "Juan Pérez" },
    store: { id_store: 10, name: "Mi Comercio" }
  }
};

const mockDeliveryForHistory = {
  id_delivery: 1,
  fk_user: 5,
  status: true
};

// ─── createAssignmentService ──────────────────────────────────────────────────

describe("createAssignmentService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTx.deliveryAssignments.findFirst.mockReset();
    mockTx.deliveryAssignments.create.mockReset();
    mockTx.orders.update.mockReset();
    mockTx.deliveries.findFirst.mockReset();
  });

  it("lanza error 404 cuando el pedido no existe", async () => {
    prisma.orders.findUnique.mockResolvedValue(null);

    await expect(
      createAssignmentService({ fk_order: 999, fk_delivery: 1 })
    ).rejects.toMatchObject({ status: 404, message: /pedido no encontrado/i });
  });

  it("lanza error 404 cuando se pasa fk_delivery y el delivery no existe", async () => {
    prisma.orders.findUnique.mockResolvedValue(mockOrder);
    prisma.deliveries.findUnique.mockResolvedValue(null);

    await expect(
      createAssignmentService({ fk_order: 1, fk_delivery: 999 })
    ).rejects.toMatchObject({ status: 404, message: /delivery no encontrado/i });
  });

  it("lanza error 404 cuando no se pasa fk_delivery y no hay deliveries disponibles", async () => {
    prisma.orders.findUnique.mockResolvedValue(mockOrder);
    prisma.deliveries.findFirst.mockResolvedValue(null);

    await expect(
      createAssignmentService({ fk_order: 1 })
    ).rejects.toMatchObject({ status: 404, message: /no hay deliveries disponibles/i });
  });

  it("lanza error 409 cuando ya hay una asignación PENDING para el pedido", async () => {
    prisma.orders.findUnique.mockResolvedValue(mockOrder);
    prisma.deliveries.findUnique.mockResolvedValue(mockDelivery);
    mockTx.deliveryAssignments.findFirst
      .mockResolvedValueOnce(null) // lastAssignment
      .mockResolvedValueOnce(mockAssignmentPending); // pendingAssignment

    await expect(
      createAssignmentService({ fk_order: 1, fk_delivery: 1 })
    ).rejects.toMatchObject({ status: 409 });
  });

  it("crea asignación correctamente con fk_delivery explícito", async () => {
    prisma.orders.findUnique.mockResolvedValue(mockOrder);
    prisma.deliveries.findUnique.mockResolvedValue(mockDelivery);
    mockTx.deliveryAssignments.findFirst
      .mockResolvedValueOnce(null) // lastAssignment
      .mockResolvedValueOnce(null); // pendingAssignment
    mockTx.deliveryAssignments.create.mockResolvedValue({
      id_delivery_assignment: 1,
      fk_order: 1,
      fk_delivery: 1,
      assignment_status: "PENDING",
      assignment_sequence: 1,
    });

    const result = await createAssignmentService({ fk_order: 1, fk_delivery: 1 });

    expect(mockTx.deliveryAssignments.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          fk_order: 1,
          fk_delivery: 1,
          assignment_status: "PENDING",
        }),
      })
    );
    expect(result.assignment_status).toBe("PENDING");
  });

  it("crea asignación correctamente sin fk_delivery (busca automáticamente)", async () => {
    prisma.orders.findUnique.mockResolvedValue(mockOrder);
    prisma.deliveries.findFirst.mockResolvedValue(mockDelivery);
    mockTx.deliveryAssignments.findFirst
      .mockResolvedValueOnce(null) // lastAssignment
      .mockResolvedValueOnce(null); // pendingAssignment
    mockTx.deliveryAssignments.create.mockResolvedValue({
      id_delivery_assignment: 1,
      fk_order: 1,
      fk_delivery: 1,
      assignment_status: "PENDING",
      assignment_sequence: 1,
    });

    const result = await createAssignmentService({ fk_order: 1 });

    expect(mockTx.deliveryAssignments.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          fk_delivery: mockDelivery.id_delivery,
          assignment_status: "PENDING",
        }),
      })
    );
    expect(result.assignment_status).toBe("PENDING");
  });
});

// ─── respondToAssignmentService ───────────────────────────────────────────────

describe("respondToAssignmentService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTx.deliveryAssignments.findFirst.mockReset();
    mockTx.deliveryAssignments.update.mockReset();
    mockTx.orders.update.mockReset();
    mockTx.deliveries.findFirst.mockReset();
  });

  it("lanza error 400 cuando el ID de orden es inválido", async () => {
    await expect(
      respondToAssignmentService("abc", 5, "ACCEPT")
    ).rejects.toMatchObject({ status: 400 });
  });

  it("lanza error 404 cuando no hay asignación PENDING para la orden", async () => {
    prisma.deliveryAssignments.findFirst.mockResolvedValue(null);

    await expect(
      respondToAssignmentService(1, 5, "ACCEPT")
    ).rejects.toMatchObject({ status: 404, message: /no hay asignación pendiente/i });
  });

  it("lanza error 403 cuando el delivery autenticado no es el asignado", async () => {
    prisma.deliveryAssignments.findFirst.mockResolvedValue({
      ...mockAssignmentPending,
      delivery: { fk_user: 99 }, // diferente al autenticado
    });

    await expect(
      respondToAssignmentService(1, 5, "ACCEPT")
    ).rejects.toMatchObject({ status: 403 });
  });

  // ─── ACCEPT ────────────────────────────────────────────────────────────────

  it("ACCEPT actualiza assignment_status a ACCEPTED y order_status a SHIPPED", async () => {
    prisma.deliveryAssignments.findFirst.mockResolvedValue(mockAssignmentPending);
    mockTx.deliveryAssignments.update.mockResolvedValue({
      ...mockAssignmentPending,
      assignment_status: "ACCEPTED",
    });
    mockTx.orders.update.mockResolvedValue({ id_order: 1, order_status: "SHIPPED" });

    const result = await respondToAssignmentService(1, 5, "ACCEPT");

    expect(mockTx.deliveryAssignments.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { assignment_status: "ACCEPTED" },
      })
    );
    expect(mockTx.orders.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { order_status: "SHIPPED" },
      })
    );
    expect(result.assignment_status).toBe("ACCEPTED");
  });

  // ─── REJECT ────────────────────────────────────────────────────────────────

  it("REJECT actualiza a REJECTED y asigna el siguiente delivery disponible", async () => {
    prisma.deliveryAssignments.findFirst.mockResolvedValue(mockAssignmentPending);
    mockTx.deliveryAssignments.update.mockResolvedValue({
      ...mockAssignmentPending,
      assignment_status: "REJECTED",
    });
    mockTx.deliveries.findFirst.mockResolvedValue({ id_delivery: 2 });
    mockTx.deliveryAssignments.findFirst.mockResolvedValue({ assignment_sequence: 1 });
    mockTx.deliveryAssignments.create.mockResolvedValue({
      id_delivery_assignment: 2,
      fk_order: 1,
      fk_delivery: 2,
      assignment_status: "PENDING",
      assignment_sequence: 2,
    });

    const result = await respondToAssignmentService(1, 5, "REJECT");

    expect(mockTx.deliveryAssignments.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { assignment_status: "REJECTED" },
      })
    );
    expect(mockTx.deliveryAssignments.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          fk_delivery: 2,
          assignment_status: "PENDING",
        }),
      })
    );
  });

  it("REJECT sin deliveries disponibles vuelve order_status a PENDING y lanza error", async () => {
    prisma.deliveryAssignments.findFirst.mockResolvedValue(mockAssignmentPending);
    mockTx.deliveryAssignments.update.mockResolvedValue({
      ...mockAssignmentPending,
      assignment_status: "REJECTED",
    });
    mockTx.deliveries.findFirst.mockResolvedValue(null);
    mockTx.orders.update.mockResolvedValue({ id_order: 1, order_status: "PENDING" });

    await expect(
      respondToAssignmentService(1, 5, "REJECT")
    ).rejects.toMatchObject({ status: 404, message: /no hay deliveries disponibles/i });

    expect(mockTx.orders.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { order_status: "PENDING" },
      })
    );
  });
});

// ─── getDeliveryOrderHistoryService ──────────────────────────────────────────

describe("getDeliveryOrderHistoryService", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    prisma.$transaction.mockImplementation((callbackOrArray) => {
      if (typeof callbackOrArray === "function") {
        return callbackOrArray(mockTx);
      }
      return Promise.all(callbackOrArray.map((p) => Promise.resolve(p)));
    });
  });

  // ─── VALIDACIONES ─────────────────────────────────────────────────────────

  it("lanza 400 cuando el ID de delivery es inválido", async () => {
    await expect(
      getDeliveryOrderHistoryService("abc", 5, {}, mockPagination)
    ).rejects.toMatchObject({ status: 400 });
  });

  it("lanza 404 cuando el delivery no existe", async () => {
    prisma.deliveries.findUnique.mockResolvedValue(null);

    await expect(
      getDeliveryOrderHistoryService(1, 5, {}, mockPagination)
    ).rejects.toMatchObject({ status: 404, message: /delivery no encontrado/i });
  });

  it("lanza 403 cuando el delivery no pertenece al usuario autenticado", async () => {
    prisma.deliveries.findUnique.mockResolvedValue({
      ...mockDeliveryForHistory,
      fk_user: 99
    });

    await expect(
      getDeliveryOrderHistoryService(1, 5, {}, mockPagination)
    ).rejects.toMatchObject({ status: 403 });
  });

  // ─── RESPUESTA BASE ───────────────────────────────────────────────────────

  it("retorna estructura de paginación correcta", async () => {
    prisma.deliveries.findUnique.mockResolvedValue(mockDeliveryForHistory);
    prisma.$transaction.mockResolvedValue([[mockAssignmentHistory], 1]);

    const result = await getDeliveryOrderHistoryService(1, 5, {}, mockPagination);

    expect(result).toMatchObject({
      total_elements: 1,
      total_pages: 1,
      page: 1,
      size: 20
    });
    expect(Array.isArray(result.content)).toBe(true);
  });

  it("retorna contenido con los campos esperados", async () => {
    prisma.deliveries.findUnique.mockResolvedValue(mockDeliveryForHistory);
    prisma.$transaction.mockResolvedValue([[mockAssignmentHistory], 1]);

    const result = await getDeliveryOrderHistoryService(1, 5, {}, mockPagination);
    const item = result.content[0];

    expect(item).toHaveProperty("id_delivery_assignment");
    expect(item).toHaveProperty("assignment_status");
    expect(item).toHaveProperty("assignment_sequence");
    expect(item).toHaveProperty("created_at");
    expect(item.order).toHaveProperty("id_order");
    expect(item.order).toHaveProperty("total");
    expect(item.order).toHaveProperty("user");
    expect(item.order).toHaveProperty("store");
  });

  // ─── FILTROS ──────────────────────────────────────────────────────────────

  it("filtra correctamente por period 7d", async () => {
    prisma.deliveries.findUnique.mockResolvedValue(mockDeliveryForHistory);
    prisma.deliveryAssignments.findMany.mockResolvedValue([mockAssignmentHistory]);
    prisma.deliveryAssignments.count.mockResolvedValue(1);

    await getDeliveryOrderHistoryService(1, 5, { period: "7d" }, mockPagination);

    expect(prisma.deliveryAssignments.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          created_at: expect.objectContaining({ gte: expect.any(Date) })
        })
      })
    );
  });

  it("filtra correctamente por period 15d", async () => {
    prisma.deliveries.findUnique.mockResolvedValue(mockDeliveryForHistory);
    prisma.deliveryAssignments.findMany.mockResolvedValue([mockAssignmentHistory]);
    prisma.deliveryAssignments.count.mockResolvedValue(1);

    await getDeliveryOrderHistoryService(1, 5, { period: "15d" }, mockPagination);

    expect(prisma.deliveryAssignments.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          created_at: expect.objectContaining({ gte: expect.any(Date) })
        })
      })
    );
  });

  it("filtra correctamente por period 1m", async () => {
    prisma.deliveries.findUnique.mockResolvedValue(mockDeliveryForHistory);
    prisma.deliveryAssignments.findMany.mockResolvedValue([mockAssignmentHistory]);
    prisma.deliveryAssignments.count.mockResolvedValue(1);

    await getDeliveryOrderHistoryService(1, 5, { period: "1m" }, mockPagination);

    expect(prisma.deliveryAssignments.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          created_at: expect.objectContaining({ gte: expect.any(Date) })
        })
      })
    );
  });

  it("filtra correctamente por assignment_status", async () => {
    prisma.deliveries.findUnique.mockResolvedValue(mockDeliveryForHistory);
    prisma.deliveryAssignments.findMany.mockResolvedValue([mockAssignmentHistory]);
    prisma.deliveryAssignments.count.mockResolvedValue(1);

    await getDeliveryOrderHistoryService(1, 5, { assignment_status: "DELIVERED" }, mockPagination);

    expect(prisma.deliveryAssignments.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ assignment_status: "DELIVERED" })
      })
    );
  });

  it("filtra correctamente por orderId", async () => {
    prisma.deliveries.findUnique.mockResolvedValue(mockDeliveryForHistory);
    prisma.deliveryAssignments.findMany.mockResolvedValue([mockAssignmentHistory]);
    prisma.deliveryAssignments.count.mockResolvedValue(1);

    await getDeliveryOrderHistoryService(1, 5, { orderId: 100 }, mockPagination);

    expect(prisma.deliveryAssignments.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ fk_order: 100 })
      })
    );
  });

  it("filtra correctamente por userName", async () => {
    prisma.deliveries.findUnique.mockResolvedValue(mockDeliveryForHistory);
    prisma.deliveryAssignments.findMany.mockResolvedValue([mockAssignmentHistory]);
    prisma.deliveryAssignments.count.mockResolvedValue(1);

    await getDeliveryOrderHistoryService(1, 5, { userName: "Juan" }, mockPagination);

    expect(prisma.deliveryAssignments.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          order: { user: { name: { contains: "Juan", mode: "insensitive" } } }
        })
      })
    );
  });

  it("sin filtros retorna todos los registros", async () => {
    prisma.deliveries.findUnique.mockResolvedValue(mockDeliveryForHistory);
    prisma.deliveryAssignments.findMany.mockResolvedValue([mockAssignmentHistory]);
    prisma.deliveryAssignments.count.mockResolvedValue(1);

    await getDeliveryOrderHistoryService(1, 5, {}, mockPagination);

    expect(prisma.deliveryAssignments.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.not.objectContaining({
          created_at: expect.anything()
        })
      })
    );
    expect(prisma.deliveryAssignments.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.not.objectContaining({
          assignment_status: expect.anything()
        })
      })
    );
  });
});

// ─── getOrderAssignmentsService ───────────────────────────────────────────────

describe("getOrderAssignmentsService", () => {
  beforeEach(() => vi.clearAllMocks());

  it("lanza 404 cuando el pedido no existe", async () => {
    prisma.orders.findUnique.mockResolvedValue(null);
    await expect(getOrderAssignmentsService(1)).rejects.toMatchObject({ status: 404, message: "Pedido no encontrado" });
  });

  it("retorna las asignaciones del pedido", async () => {
    prisma.orders.findUnique.mockResolvedValue(mockOrder);
    prisma.deliveryAssignments.findMany.mockResolvedValue([mockAssignmentPending]);
    const result = await getOrderAssignmentsService(1);
    expect(result).toEqual([mockAssignmentPending]);
  });
});

// ─── getDeliveryAssignmentsService ───────────────────────────────────────────

describe("getDeliveryAssignmentsService", () => {
  beforeEach(() => vi.clearAllMocks());

  it("lanza 404 cuando el delivery no existe", async () => {
    prisma.deliveries.findUnique.mockResolvedValue(null);
    await expect(getDeliveryAssignmentsService(1)).rejects.toMatchObject({ status: 404, message: "Delivery no encontrado" });
  });

  it("retorna asignaciones sin filtro de status", async () => {
    prisma.deliveries.findUnique.mockResolvedValue(mockDelivery);
    prisma.deliveryAssignments.findMany.mockResolvedValue([mockAssignmentPending]);
    const result = await getDeliveryAssignmentsService(1);
    expect(result).toEqual([mockAssignmentPending]);
  });

  it("retorna asignaciones filtradas por status", async () => {
    prisma.deliveries.findUnique.mockResolvedValue(mockDelivery);
    prisma.deliveryAssignments.findMany.mockResolvedValue([mockAssignmentPending]);
    await getDeliveryAssignmentsService(1, "PENDING");
    expect(prisma.deliveryAssignments.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ assignment_status: "PENDING" }) })
    );
  });
});

// ─── getDeliveryPendingAssignmentsService ────────────────────────────────────

describe("getDeliveryPendingAssignmentsService", () => {
  beforeEach(() => vi.clearAllMocks());

  it("lanza 404 cuando el delivery no existe", async () => {
    prisma.deliveries.findUnique.mockResolvedValue(null);
    await expect(getDeliveryPendingAssignmentsService(1)).rejects.toMatchObject({ status: 404, message: "Delivery no encontrado" });
  });

  it("retorna las asignaciones pendientes del delivery", async () => {
    prisma.deliveries.findUnique.mockResolvedValue(mockDelivery);
    prisma.deliveryAssignments.findMany.mockResolvedValue([mockAssignmentPending]);
    const result = await getDeliveryPendingAssignmentsService(1);
    expect(result).toEqual([mockAssignmentPending]);
    expect(prisma.deliveryAssignments.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ assignment_status: "PENDING" }) })
    );
  });
});

// ─── getAcceptedAssignmentService ────────────────────────────────────────────

describe("getAcceptedAssignmentService", () => {
  beforeEach(() => vi.clearAllMocks());

  it("lanza 404 cuando el pedido no existe", async () => {
    prisma.orders.findUnique.mockResolvedValue(null);
    await expect(getAcceptedAssignmentService(1)).rejects.toMatchObject({ status: 404, message: "Pedido no encontrado" });
  });

  it("lanza 404 cuando no hay asignación aceptada", async () => {
    prisma.orders.findUnique.mockResolvedValue(mockOrder);
    prisma.deliveryAssignments.findFirst.mockResolvedValue(null);
    await expect(getAcceptedAssignmentService(1)).rejects.toMatchObject({ status: 404, message: "No hay asignación aceptada para este pedido" });
  });

  it("retorna la asignación aceptada", async () => {
    const accepted = { ...mockAssignmentPending, assignment_status: "ACCEPTED" };
    prisma.orders.findUnique.mockResolvedValue(mockOrder);
    prisma.deliveryAssignments.findFirst.mockResolvedValue(accepted);
    const result = await getAcceptedAssignmentService(1);
    expect(result.assignment_status).toBe("ACCEPTED");
  });
});