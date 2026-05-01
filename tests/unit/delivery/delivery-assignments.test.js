// tests/unit/delivery/delivery-assignments.test.js
import { vi, describe, it, expect, beforeEach } from "vitest";
import { prisma } from "../../../src/lib/prisma.js";
import {
  createAssignmentService,
  respondToAssignmentService,
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
      create: vi.fn(),
    },
    $transaction: vi.fn((callback) => callback(mockTx)),
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