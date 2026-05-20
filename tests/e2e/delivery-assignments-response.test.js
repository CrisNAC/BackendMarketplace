import { vi, describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import { prisma } from "../../src/lib/prisma.js";

const futureDeadline = new Date(Date.now() + 10 * 60 * 1000);

const mockTx = {
  deliveryAssignments: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
    create: vi.fn(),
  },
  orders: {
    update: vi.fn(),
    findUnique: vi.fn(),
  },
  deliveries: {
    findFirst: vi.fn(),
  },
  stores: {
    findUnique: vi.fn(),
  },
  notifications: {
    create: vi.fn(),
  },
};

vi.mock("../../src/lib/prisma.js", () => ({
  prisma: {
    deliveryAssignments: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
    orders: {
      update: vi.fn(),
      findUnique: vi.fn(),
    },
    deliveries: {
      findFirst: vi.fn(),
    },
    stores: {
      findUnique: vi.fn(),
    },
    notifications: {
      create: vi.fn(),
    },
    $transaction: vi.fn((callbackOrArray) => {
      if (typeof callbackOrArray === "function") {
        return callbackOrArray(mockTx);
      }

      return Promise.all(callbackOrArray.map((operation) => Promise.resolve(operation)));
    }),
  },
}));

vi.mock("../../src/config/jwt.config.js", () => ({
  default: vi.fn((req, res, next) => {
    const cookie = req.cookies?.userToken;

    if (!cookie) {
      return res.status(401).json({
        error: { code: 401, message: "No autenticado" },
      });
    }

    req.user = cookie === "other-delivery"
      ? { id_user: 99, email: "other@test.com", role: "DELIVERY" }
      : { id_user: 5, email: "delivery@test.com", role: "DELIVERY" };

    next();
  }),
}));

const authCookie = "userToken=mock-token";
const otherDeliveryCookie = "userToken=other-delivery";

const mockPendingAssignment = {
  id_delivery_assignment: 1,
  fk_order: 100,
  fk_delivery: 5,
  assignment_status: "PENDING",
  status: true,
  response_deadline: futureDeadline,
  assigned_at: new Date(),
  delivery: {
    fk_user: 5,
  },
  order: {
    fk_store: 10,
  },
};

const mockRejectedAssignment = {
  id_delivery_assignment: 1,
  fk_order: 100,
  fk_delivery: 5,
  assignment_status: "REJECTED",
  status: true,
};

const mockAcceptedAssignment = {
  id_delivery_assignment: 1,
  fk_order: 100,
  fk_delivery: 5,
  assignment_status: "ACCEPTED",
  status: true,
};

function resetMocks() {
  vi.clearAllMocks();
  mockTx.deliveryAssignments.findMany.mockResolvedValue([]);
  mockTx.stores.findUnique.mockResolvedValue({ fk_user: 1 });
  mockTx.notifications.create.mockResolvedValue({ id_notification: 1 });
  mockTx.orders.findUnique.mockResolvedValue({ fk_store: 10 });
}

describe("POST /api/assignments/orders/:orderId/delivery-response", () => {
  beforeEach(() => {
    resetMocks();
  });

  it("retorna 403 cuando el delivery autenticado no es el asignado", async () => {
    mockTx.deliveryAssignments.findFirst.mockResolvedValue({
      ...mockPendingAssignment,
      delivery: { fk_user: 5 },
    });

    const res = await request(app)
      .post("/api/assignments/orders/100/delivery-response")
      .set("Cookie", otherDeliveryCookie)
      .send({ action: "ACCEPT" });

    expect(res.status).toBe(403);
    expect(res.body.error.message).toMatch(/no tienes permiso/i);
  });

  it("retorna 200 y acepta el pedido", async () => {
    mockTx.deliveryAssignments.findFirst.mockResolvedValue(mockPendingAssignment);
    mockTx.deliveryAssignments.update.mockResolvedValue(mockAcceptedAssignment);
    mockTx.orders.update.mockResolvedValue({ id_order: 100, order_status: "SHIPPED" });

    const res = await request(app)
      .post("/api/assignments/orders/100/delivery-response")
      .set("Cookie", authCookie)
      .send({ action: "ACCEPT" });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      id_delivery_assignment: 1,
      fk_order: 100,
      fk_delivery: 5,
      assignment_status: "ACCEPTED",
    });
    expect(mockTx.deliveryAssignments.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id_delivery_assignment: 1 },
        data: { assignment_status: "ACCEPTED" },
      })
    );
    expect(mockTx.orders.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id_order: 100 },
        data: { order_status: "SHIPPED", delivery_unavailable: false },
      })
    );
  });

  it("retorna 200 y reasigna el pedido cuando rechaza", async () => {
    mockTx.deliveryAssignments.findFirst
      .mockResolvedValueOnce(mockPendingAssignment)
      .mockResolvedValueOnce({ assignment_sequence: 1 });
    mockTx.deliveryAssignments.update.mockResolvedValue(mockRejectedAssignment);
    mockTx.deliveryAssignments.findMany
      .mockResolvedValueOnce([]) // expireStalePendingAssignments
      .mockResolvedValueOnce([{ fk_delivery: 5 }]); // getTriedDeliveryIdsForOrder
    mockTx.deliveries.findFirst.mockResolvedValue({ id_delivery: 8 });
    mockTx.deliveryAssignments.create.mockResolvedValue({
      id_delivery_assignment: 2,
      fk_order: 100,
      fk_delivery: 8,
      assignment_status: "PENDING",
      assignment_sequence: 2,
      status: true,
    });
    mockTx.orders.update.mockResolvedValue({ id_order: 100 });

    const res = await request(app)
      .post("/api/assignments/orders/100/delivery-response")
      .set("Cookie", authCookie)
      .send({ action: "REJECT" });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      id_delivery_assignment: 2,
      fk_order: 100,
      fk_delivery: 8,
      assignment_status: "PENDING",
      reassigned: true,
      delivery_unavailable: false,
    });
    expect(mockTx.deliveryAssignments.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id_delivery_assignment: 1 },
        data: { assignment_status: "REJECTED" },
      })
    );
    expect(mockTx.deliveryAssignments.create).toHaveBeenCalled();
  });

  it("retorna 200 cuando rechaza y no hay deliveries disponibles (comercio notificado)", async () => {
    mockTx.deliveryAssignments.findFirst.mockResolvedValue(mockPendingAssignment);
    mockTx.deliveryAssignments.update.mockResolvedValue(mockRejectedAssignment);
    mockTx.deliveryAssignments.findMany
      .mockResolvedValueOnce([]) // expireStalePendingAssignments
      .mockResolvedValueOnce([{ fk_delivery: 5 }]); // getTriedDeliveryIdsForOrder
    mockTx.deliveries.findFirst.mockResolvedValue(null);
    mockTx.orders.update.mockResolvedValue({ id_order: 100, delivery_unavailable: true });
    mockTx.stores.findUnique.mockResolvedValue({ fk_user: 99 });

    const res = await request(app)
      .post("/api/assignments/orders/100/delivery-response")
      .set("Cookie", authCookie)
      .send({ action: "REJECT" });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      assignment_status: "REJECTED",
      fk_order: 100,
      reassigned: false,
      delivery_unavailable: true,
    });
    expect(mockTx.orders.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id_order: 100 },
        data: { delivery_unavailable: true },
      })
    );
    expect(mockTx.notifications.create).toHaveBeenCalled();
  });
});
