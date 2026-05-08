import { vi, describe, it, expect, beforeEach, beforeAll } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import { prisma } from "../../src/lib/prisma.js";

const mockTx = {
  deliveryAssignments: {
    update: vi.fn(),
  },
  orders: {
    update: vi.fn(),
  },
};

vi.mock("../../src/lib/prisma.js", () => ({
  prisma: {
    deliveryAssignments: {
      findUnique: vi.fn(),
    },
    orders: {
      update: vi.fn(),
    },
    $transaction: vi.fn((callbackOrArray) => {
      if (typeof callbackOrArray === "function") {
        return callbackOrArray(mockTx);
      }

      return Promise.all(callbackOrArray.map((operation) => Promise.resolve(operation)));
    }),
  },
}));

// Mock del middleware de autenticación para controlar req.user según cookie
vi.mock("../../src/config/jwt.config.js", () => ({
  default: vi.fn((req, res, next) => {
    const cookie = req.cookies?.userToken;

    if (!cookie) {
      return res.status(401).json({ error: { code: 401, message: "No autenticado" } });
    }

    // si la cookie es 'other-delivery' simulamos otro usuario
    req.user = cookie === "other-delivery" ? { id_user: 99, role: "DELIVERY" } : { id_user: 5, role: "DELIVERY" };
    next();
  }),
}));

const authCookie = "userToken=mock-token";
const otherDeliveryCookie = "userToken=other-delivery";

const mockAcceptedAssignment = {
  id_delivery_assignment: 1,
  fk_order: 100,
  fk_delivery: 5,
  assignment_status: "ACCEPTED",
  status: true,
  delivery: { fk_user: 5 },
};

const mockDeliveredAssignment = {
  id_delivery_assignment: 1,
  fk_order: 100,
  fk_delivery: 5,
  assignment_status: "DELIVERED",
  status: true,
};

describe("POST /api/assignments/:id/complete", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockTx.deliveryAssignments.update.mockReset();
    mockTx.orders.update.mockReset();

    prisma.deliveryAssignments.findUnique.mockReset();
    prisma.orders.update.mockReset();
    prisma.$transaction.mockReset();
  });

  it("retrona 200 tras completar asignación con exito", async () => {
    prisma.deliveryAssignments.findUnique.mockResolvedValue(mockAcceptedAssignment);
    mockTx.deliveryAssignments.update.mockResolvedValue(mockDeliveredAssignment);
    mockTx.orders.update.mockResolvedValue({ id_order: 100, order_status: "DELIVERED" });

    // prisma.$transaction mock invocado arriba devolverá el resultado de callback(mockTx)
    const res = await request(app)
      .post("/api/assignments/1/complete")
      .set("Cookie", authCookie)
      .send();

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ assignment_status: "DELIVERED", id_delivery_assignment: 1 });

    expect(mockTx.deliveryAssignments.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id_delivery_assignment: 1 }, data: { assignment_status: "DELIVERED" } })
    );

    expect(mockTx.orders.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id_order: 100 }, data: { order_status: "DELIVERED" } })
    );
  });

  it("retorna 403 tras rechazar por usuario no asignado)", async () => {
    prisma.deliveryAssignments.findUnique.mockResolvedValue(mockAcceptedAssignment);

    const res = await request(app)
      .post("/api/assignments/1/complete")
      .set("Cookie", otherDeliveryCookie)
      .send();

    expect(res.status).toBe(403);
    expect(res.body.error.message).toMatch(/permiso/i);
    // Asegurarse de que no se actualizó nada en la transacción
    expect(mockTx.deliveryAssignments.update).not.toHaveBeenCalled();
    expect(mockTx.orders.update).not.toHaveBeenCalled();
  });

  it("retorna 409 tras intentar completar asignación con estado inválido", async () => {
    prisma.deliveryAssignments.findUnique.mockResolvedValue({ ...mockAcceptedAssignment, assignment_status: "PENDING" });

    const res = await request(app)
      .post("/api/assignments/1/complete")
      .set("Cookie", authCookie)
      .send();

    expect(res.status).toBe(409);
    expect(res.body.error.message).toMatch(/solo se pueden completar asignaciones aceptadas/i);
    expect(mockTx.deliveryAssignments.update).not.toHaveBeenCalled();
    expect(mockTx.orders.update).not.toHaveBeenCalled();
  });

  it("retorna 404 tras intentar completar asignación no encontrada", async () => {
    prisma.deliveryAssignments.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .post("/api/assignments/999/complete")
      .set("Cookie", authCookie)
      .send();

    expect(res.status).toBe(404);
    expect(res.body.error.message).toMatch(/Asignación no encontrada/i);
    expect(mockTx.deliveryAssignments.update).not.toHaveBeenCalled();
  });
});
