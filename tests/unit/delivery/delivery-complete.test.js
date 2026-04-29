//delivery-complete.test.js
import { vi, describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import app from "../../../src/app.js";
import { prisma } from "../../../src/lib/prisma.js";

// Creamos los fns mockeados fuera para poder acceder a ellos en los tests
const mockAssignmentsUpdate = vi.fn();
const mockOrdersUpdate = vi.fn();

vi.mock("../../../src/lib/prisma.js", () => ({
  prisma: {
    orders: {
      update: vi.fn(),
    },
    deliveries: {
      findUnique: vi.fn(),
    },
    deliveryAssignments: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    // $transaction recibe el callback y le pasa un tx con los mismos fns mockeados
    $transaction: vi.fn((callback) =>
      callback({
        deliveryAssignments: { update: mockAssignmentsUpdate },
        orders: { update: mockOrdersUpdate },
      })
    ),
  },
}));

vi.mock("../../../src/config/jwt.config.js", () => ({
  default: vi.fn((req, res, next) => {
    req.user = { id_user: 10, email: "delivery@test.com", role: "DELIVERY" };
    next();
  }),
}));

const authCookie = "userToken=mock-token";

const mockAssignmentPending = {
  id_delivery_assignment: 1,
  fk_order: 1,
  fk_delivery: 1,
  assignment_status: "PENDING",
  assignment_sequence: 1,
  delivery: { fk_user: 10 },
};

const mockAssignmentAccepted = {
  id_delivery_assignment: 1,
  fk_order: 1,
  fk_delivery: 1,
  assignment_status: "ACCEPTED",
  assignment_sequence: 1,
  delivery: { fk_user: 10 },
};

describe("POST /api/assignments/:id/complete", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAssignmentsUpdate.mockReset();
    mockOrdersUpdate.mockReset();
  });

  it("devuelve 400 cuando el ID no es numérico", async () => {
    const res = await request(app)
      .post("/api/assignments/abc/complete")
      .set("Cookie", authCookie)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/ID inválido/i);
  });

  it("devuelve 404 cuando la asignación no existe", async () => {
    prisma.deliveryAssignments.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .post("/api/assignments/999/complete")
      .set("Cookie", authCookie)
      .send({});

    expect(res.status).toBe(404);
    expect(res.body.error.message).toMatch(/asignación no encontrada/i);
  });

  it("devuelve 409 cuando la asignación no está ACCEPTED (está PENDING)", async () => {
    prisma.deliveryAssignments.findUnique.mockResolvedValue(mockAssignmentPending);

    const res = await request(app)
      .post("/api/assignments/1/complete")
      .set("Cookie", authCookie)
      .send({});

    expect(res.status).toBe(409);
    expect(res.body.error.message).toMatch(/solo se pueden completar asignaciones aceptadas/i);
  });

  it("devuelve 409 cuando la asignación ya fue completada (DELIVERED)", async () => {
    prisma.deliveryAssignments.findUnique.mockResolvedValue({
      ...mockAssignmentAccepted,
      assignment_status: "DELIVERED",
    });

    const res = await request(app)
      .post("/api/assignments/1/complete")
      .set("Cookie", authCookie)
      .send({});

    expect(res.status).toBe(409);
    expect(res.body.error.message).toMatch(/solo se pueden completar asignaciones aceptadas/i);
  });

  it("devuelve 403 cuando el delivery no es el dueño de la asignación", async () => {
    prisma.deliveryAssignments.findUnique.mockResolvedValue({
      ...mockAssignmentAccepted,
      delivery: { fk_user: 99 }, // fk_user diferente al autenticado (10)
    });

    const res = await request(app)
      .post("/api/assignments/1/complete")
      .set("Cookie", authCookie)
      .send({});

    expect(res.status).toBe(403);
    expect(res.body.error.message).toMatch(/no tienes permiso para completar/i);
  });

  it("devuelve 200 y marca la asignación como DELIVERED", async () => {
    prisma.deliveryAssignments.findUnique.mockResolvedValue(mockAssignmentAccepted);
    mockAssignmentsUpdate.mockResolvedValue({
      ...mockAssignmentAccepted,
      assignment_status: "DELIVERED",
    });
    mockOrdersUpdate.mockResolvedValue({
      id_order: 1,
      order_status: "DELIVERED",
    });

    const res = await request(app)
      .post("/api/assignments/1/complete")
      .set("Cookie", authCookie)
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.assignment_status).toBe("DELIVERED");
  });

  it("también actualiza el order_status a DELIVERED al completar", async () => {
    prisma.deliveryAssignments.findUnique.mockResolvedValue(mockAssignmentAccepted);
    mockAssignmentsUpdate.mockResolvedValue({
      ...mockAssignmentAccepted,
      assignment_status: "DELIVERED",
    });
    mockOrdersUpdate.mockResolvedValue({
      id_order: 1,
      order_status: "DELIVERED",
    });

    await request(app)
      .post("/api/assignments/1/complete")
      .set("Cookie", authCookie)
      .send({});

    // Verificar que se actualizó el pedido dentro de la transacción
    expect(mockOrdersUpdate).toHaveBeenCalledWith({
      where: { id_order: 1 },
      data: { order_status: "DELIVERED" },
    });
  });
});