import { vi, describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import { prisma } from "../../src/lib/prisma.js";

const mockTx = {
  deliveryAssignments: {
    findFirst: vi.fn(),
    update: vi.fn(),
    create: vi.fn(),
  },
  orders: {
    update: vi.fn(),
  },
  deliveries: {
    findFirst: vi.fn(),
  },
};

vi.mock("../../src/lib/prisma.js", () => ({
  prisma: {
    deliveryAssignments: {
      findFirst: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
    orders: {
      update: vi.fn(),
    },
    deliveries: {
      findFirst: vi.fn(),
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

describe("POST /api/assignments/orders/:orderId/delivery-response", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockTx.deliveryAssignments.findFirst.mockReset();
    mockTx.deliveryAssignments.update.mockReset();
    mockTx.deliveryAssignments.create.mockReset();
    mockTx.orders.update.mockReset();
    mockTx.deliveries.findFirst.mockReset();

    prisma.deliveryAssignments.findFirst.mockReset();
    prisma.deliveryAssignments.update.mockReset();
    prisma.deliveryAssignments.create.mockReset();
    prisma.orders.update.mockReset();
    prisma.deliveries.findFirst.mockReset();
  });

  it("retorna 403 cuando el delivery autenticado no es el asignado", async () => {
    prisma.deliveryAssignments.findFirst.mockResolvedValue({
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
    prisma.deliveryAssignments.findFirst.mockResolvedValue(mockPendingAssignment);
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
        data: { order_status: "SHIPPED" },
      })
    );
  });

  it("retorna 200 y reasigna el pedido cuando rechaza", async () => {
    prisma.deliveryAssignments.findFirst.mockResolvedValue(mockPendingAssignment);
    mockTx.deliveryAssignments.update.mockResolvedValue(mockRejectedAssignment);
    mockTx.deliveries.findFirst.mockResolvedValue({ id_delivery: 8 });
    mockTx.deliveryAssignments.findFirst.mockResolvedValue({ assignment_sequence: 1 });
    mockTx.deliveryAssignments.create.mockResolvedValue({
      id_delivery_assignment: 2,
      fk_order: 100,
      fk_delivery: 8,
      assignment_status: "PENDING",
      assignment_sequence: 2,
      status: true,
    });

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
      assignment_sequence: 2,
      status: true,
    });
    expect(mockTx.deliveryAssignments.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id_delivery_assignment: 1 },
        data: { assignment_status: "REJECTED" },
      })
    );
    expect(mockTx.deliveryAssignments.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          fk_order: 100,
          fk_delivery: 8,
          assignment_status: "PENDING",
          assignment_sequence: 2,
          status: true,
        }),
      })
    );
  });

  it("retorna 404 cuando rechaza y no hay deliveries disponibles", async () => {
    prisma.deliveryAssignments.findFirst.mockResolvedValue(mockPendingAssignment);
    mockTx.deliveryAssignments.update.mockResolvedValue(mockRejectedAssignment);
    mockTx.deliveries.findFirst.mockResolvedValue(null);
    mockTx.orders.update.mockResolvedValue({ id_order: 100, order_status: "PENDING" });

    const res = await request(app)
      .post("/api/assignments/orders/100/delivery-response")
      .set("Cookie", authCookie)
      .send({ action: "REJECT" });

    expect(res.status).toBe(404);
    expect(res.body.error.message).toMatch(/no hay deliveries disponibles/i);
    expect(mockTx.orders.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id_order: 100 },
        data: { order_status: "PENDING" },
      })
    );
  });
});