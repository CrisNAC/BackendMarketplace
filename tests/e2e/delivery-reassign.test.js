import request from "supertest";
import { vi, describe, it, beforeEach, expect } from "vitest";
import { prisma } from "../../src/lib/prisma.js";

// Mock nodemailer para evitar envíos reales de emails durante las pruebas
vi.mock("nodemailer", () => ({
  default: {
    createTransport: vi.fn(() => ({ sendMail: vi.fn() })),
  },
}));

const pastDeadline = new Date(Date.now() - 10 * 60 * 1000);

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
    findFirst: vi.fn(),
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
      findFirst: vi.fn(),
    },
    deliveries: {
      findMany: vi.fn(),
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

// Mock jwt middleware used by the app (cookie-based)
vi.mock("../../src/config/jwt.config.js", () => ({
  default: vi.fn((req, res, next) => {
    const cookie = req.cookies?.userToken;
    if (!cookie) return res.status(401).json({ error: { code: 401, message: "No autenticado" } });
    if (cookie === "seller-token") {
      req.user = { id_user: 1, email: "seller@test.com", role: "SELLER" };
    } else if (cookie === "delivery-token") {
      req.user = { id_user: 5, email: "delivery@test.com", role: "DELIVERY" };
    } else {
      req.user = { id_user: 99, email: "other@test.com", role: "SELLER" };
    }
    next();
  }),
}));

import app from "../../src/app.js";

const sellerCookie = "userToken=seller-token";

describe("E2E OM-522: Timeout → Reasignación", () => {
  beforeEach(() => {
    vi.resetAllMocks();

    prisma.$transaction.mockImplementation((callbackOrArray) => {
      if (typeof callbackOrArray === "function") {
        return callbackOrArray(mockTx);
      }
      return Promise.all(callbackOrArray.map((operation) => Promise.resolve(operation)));
    });

    // Store ownership
    mockTx.stores.findUnique.mockResolvedValue({ id_store: 10, fk_user: 1, status: true, user: { id_user: 1, status: true } });
    // Order exists and belongs to store 10
    mockTx.orders.findFirst.mockResolvedValue({ id_order: 100, order_status: "PROCESSING", fk_address: 5, fk_store: 10, address: null });

    // There is a stale PENDING assignment (deadline in the past)
    mockTx.deliveryAssignments.findMany.mockResolvedValue([
      {
        id_delivery_assignment: 1,
        fk_order: 100,
        fk_delivery: 5,
        assignment_status: "PENDING",
        status: true,
        response_deadline: pastDeadline,
        assigned_at: new Date(Date.now() - 20 * 60 * 1000),
        delivery: { fk_user: 5 },
        order: { fk_store: 10 },
      },
    ]);

    // Simulate that findNextActiveDeliveryForOrder finds delivery 6
    mockTx.deliveries.findFirst.mockResolvedValue({ id_delivery: 6, fk_user: 6, delivery_status: "ACTIVE", status: true });
    prisma.deliveries.findFirst.mockResolvedValue({ id_delivery: 6, fk_user: 6, delivery_status: "ACTIVE", status: true });

    // Mock updates/creates
    mockTx.deliveryAssignments.update.mockResolvedValue({ id_delivery_assignment: 1, assignment_status: "EXPIRED" });
    mockTx.deliveryAssignments.create.mockResolvedValue({ id_delivery_assignment: 2, fk_order: 100, fk_delivery: 6, assignment_status: "PENDING" });
    mockTx.orders.update.mockResolvedValue({ id_order: 100, delivery_unavailable: false });
    mockTx.notifications.create.mockResolvedValue({ id_notification: 1 });

    prisma.deliveryAssignments.update.mockImplementation((args) => mockTx.deliveryAssignments.update(args));
    prisma.deliveryAssignments.create.mockImplementation((args) => mockTx.deliveryAssignments.create(args));
    prisma.orders.update.mockImplementation((args) => mockTx.orders.update(args));
    prisma.notifications.create.mockImplementation((args) => mockTx.notifications.create(args));

    // Top-level prisma mocks (helpful if code reads from prisma directly)
    prisma.stores.findUnique.mockImplementation((args) => mockTx.stores.findUnique(args));
    prisma.orders.findFirst.mockImplementation((args) => mockTx.orders.findFirst(args));
    prisma.deliveryAssignments.findMany.mockImplementation((args) => mockTx.deliveryAssignments.findMany(args));
    prisma.deliveries.findMany.mockImplementation((args) => Promise.resolve([]));
  });

  it("retorna 200 y reasigna cuando la asignación expira", async () => {
    const res = await request(app)
      .get("/api/stores/10/orders/100/deliveries")
      .set("Cookie", sellerCookie);

    expect(res.status).toBe(200);
    expect(res.body.order_id).toBe(100);

    // Verificar que se intentó cerrar la asignación stale y crear una nueva
    expect(prisma.deliveryAssignments.findMany).toHaveBeenCalled();
    expect(prisma.deliveryAssignments.update).toHaveBeenCalled();
    expect(prisma.deliveryAssignments.create).toHaveBeenCalled();
  });

  it("retorna 200 y reasigna cuando el delivery rechaza manualmente", async () => {
    // Prepare a pending assignment assigned to delivery 5
    const pendingAssignment = {
      id_delivery_assignment: 10,
      fk_order: 100,
      fk_delivery: 5,
      assignment_status: "PENDING",
      status: true,
      response_deadline: new Date(Date.now() + 10 * 60 * 1000),
      assigned_at: new Date(),
      delivery: { fk_user: 5 },
      order: { fk_store: 10 },
    };

    // When endpoint looks up the current pending assignment
    prisma.deliveryAssignments.findFirst.mockResolvedValue(pendingAssignment);
    // Implement findFirst to return appropriate values based on the query shape
    mockTx.deliveryAssignments.findFirst.mockImplementation((params) => {
      // lookup pending assignment
      if (params && params.where && params.where.fk_order === 100 && params.where.assignment_status === "PENDING") {
        return Promise.resolve(pendingAssignment);
      }
      // last assignment query uses orderBy
      if (params && params.orderBy) {
        return Promise.resolve({ assignment_sequence: 1 });
      }
      return Promise.resolve(null);
    });

    // Expect update to mark REJECTED and create to add new pending for delivery 6
    mockTx.deliveryAssignments.update.mockResolvedValue({ ...pendingAssignment, assignment_status: "REJECTED" });
    mockTx.deliveryAssignments.create.mockResolvedValue({ id_delivery_assignment: 11, fk_order: 100, fk_delivery: 6, assignment_status: "PENDING" });
    prisma.deliveryAssignments.update.mockImplementation((args) => mockTx.deliveryAssignments.update(args));
    prisma.deliveryAssignments.create.mockImplementation((args) => mockTx.deliveryAssignments.create(args));

    // notification should be created for REJECTED path
    mockTx.notifications.create.mockResolvedValue({ id_notification: 2 });
    prisma.notifications.create.mockImplementation((args) => mockTx.notifications.create(args));

    // Deliveries search returns next active delivery
    prisma.deliveries.findFirst.mockResolvedValue({ id_delivery: 6, fk_user: 6, delivery_status: "ACTIVE", status: true });

    const res = await request(app)
      .post("/api/assignments/orders/100/delivery-response")
      .set("Cookie", "userToken=delivery-token")
      .send({ action: "REJECT" });

    if (res.status !== 200) console.error("DEBUG RESPONSE BODY:", res.body);
    expect(res.status).toBe(200);
    // Verify DB interactions (transactional mocks)
    expect(mockTx.deliveryAssignments.update).toHaveBeenCalled();
    expect(mockTx.deliveryAssignments.create).toHaveBeenCalled();
    expect(mockTx.notifications.create).toHaveBeenCalled();
  });

  it("retorna 200 y reasigna cuando el delivery se desconecta (INACTIVE)", async () => {
    // Mock delivery row owned by user 5
    const mockDelivery = { id_delivery: 5, fk_user: 5, delivery_status: "ACTIVE", status: true };
    prisma.deliveries.findUnique = vi.fn().mockResolvedValue(mockDelivery);

    // When transaction updates delivery status to INACTIVE
    mockTx.deliveries.update = vi.fn().mockResolvedValue({ ...mockDelivery, delivery_status: "INACTIVE" });
    prisma.deliveries.update = mockTx.deliveries.update;

    // Pending assignment assigned to this delivery
    const pendingAssignment = {
      id_delivery_assignment: 20,
      fk_order: 200,
      fk_delivery: 5,
      assignment_status: "PENDING",
      status: true,
      response_deadline: new Date(Date.now() + 10 * 60 * 1000),
      assigned_at: new Date(),
      delivery: { fk_user: 5 },
      order: { fk_store: 10 },
    };

    // expireStalePendingAssignments will be called but return empty
    mockTx.deliveryAssignments.findMany.mockResolvedValueOnce([]);

    // Then find pending assignments for this delivery
    mockTx.deliveryAssignments.findMany.mockResolvedValueOnce([pendingAssignment]);

    // closePendingAndReassign will try to find next active delivery
    mockTx.deliveries.findFirst.mockResolvedValue({ id_delivery: 6, fk_user: 6, delivery_status: "ACTIVE", status: true });

    mockTx.deliveryAssignments.update.mockResolvedValue({ ...pendingAssignment, assignment_status: "REJECTED" });
    mockTx.deliveryAssignments.create.mockResolvedValue({ id_delivery_assignment: 21, fk_order: 200, fk_delivery: 6, assignment_status: "PENDING" });
    mockTx.notifications.create.mockResolvedValue({ id_notification: 3 });

    // Bind prisma transaction methods to mockTx
    prisma.deliveryAssignments.findMany.mockImplementation((args) => mockTx.deliveryAssignments.findMany(args));
    prisma.deliveries.findFirst.mockImplementation((args) => mockTx.deliveries.findFirst(args));

    const res = await request(app)
      .patch("/api/deliveries/5/status")
      .set("Cookie", "userToken=delivery-token")
      .send({ delivery_status: "INACTIVE" });

    expect(res.status).toBe(200);
    // Verify the transactional handlers were invoked
    expect(mockTx.deliveries.update).toHaveBeenCalled();
    expect(mockTx.deliveryAssignments.findMany).toHaveBeenCalled();
    expect(mockTx.deliveryAssignments.update).toHaveBeenCalled();
    expect(mockTx.deliveryAssignments.create).toHaveBeenCalled();
  });

  it("marca order.delivery_unavailable y crea notificación cuando no hay delivery disponible", async () => {
    // Mock delivery row owned by user 5
    const mockDelivery = { id_delivery: 5, fk_user: 5, delivery_status: "ACTIVE", status: true };
    prisma.deliveries.findUnique = vi.fn().mockResolvedValue(mockDelivery);

    // When transaction updates delivery status to INACTIVE
    mockTx.deliveries.update = vi.fn().mockResolvedValue({ ...mockDelivery, delivery_status: "INACTIVE" });
    prisma.deliveries.update = mockTx.deliveries.update;

    // Pending assignment assigned to this delivery
    const pendingAssignment = {
      id_delivery_assignment: 30,
      fk_order: 300,
      fk_delivery: 5,
      assignment_status: "PENDING",
      status: true,
      response_deadline: new Date(Date.now() + 10 * 60 * 1000),
      assigned_at: new Date(),
      delivery: { fk_user: 5 },
      order: { fk_store: 10 },
    };

    // expireStalePendingAssignments will be called but return empty
    mockTx.deliveryAssignments.findMany.mockResolvedValueOnce([]);

    // Then find pending assignments for this delivery
    mockTx.deliveryAssignments.findMany.mockResolvedValueOnce([pendingAssignment]);

    // No next active delivery available
    mockTx.deliveries.findFirst.mockResolvedValue(null);
    prisma.deliveries.findFirst.mockImplementation((args) => mockTx.deliveries.findFirst(args));

    // Expect order to be updated to delivery_unavailable = true
    mockTx.orders.update.mockResolvedValue({ id_order: 300, delivery_unavailable: true });
    prisma.orders.update.mockImplementation((args) => mockTx.orders.update(args));

    // Notification for no delivery available
    mockTx.notifications.create.mockResolvedValue({ id_notification: 4 });
    prisma.notifications.create.mockImplementation((args) => mockTx.notifications.create(args));

    // Bind prisma transaction methods to mockTx
    prisma.deliveryAssignments.findMany.mockImplementation((args) => mockTx.deliveryAssignments.findMany(args));

    const res = await request(app)
      .patch("/api/deliveries/5/status")
      .set("Cookie", "userToken=delivery-token")
      .send({ delivery_status: "INACTIVE" });

    expect(res.status).toBe(200);
    // Verify order flagged and notification created
    expect(mockTx.orders.update).toHaveBeenCalled();
    expect(mockTx.notifications.create).toHaveBeenCalled();
  });
});