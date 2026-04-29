//delivery-assignments.test.js
import { vi, describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import app from "../../../src/app.js";
import { prisma } from "../../../src/lib/prisma.js";

vi.mock("../../../src/lib/prisma.js", () => ({
  prisma: {
    orders: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    deliveries: {
      findUnique: vi.fn(),
    },
    deliveryAssignments: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
}));

vi.mock("../../../src/config/jwt.config.js", () => ({
  default: vi.fn((req, res, next) => {
    req.user = { id_user: 10, email: "delivery@test.com", role: "DELIVERY" };
    next();
  }),
}));

const authCookie = "userToken=mock-token";

const mockOrder = {
  id_order: 1,
  fk_user: 5,
  total: 100.0,
  order_status: "PENDING",
};

const mockDelivery = {
  id_delivery: 1,
  fk_user: 10,
  delivery_status: "ACTIVE",
};

const mockAssignment = {
  id_delivery_assignment: 1,
  fk_order: 1,
  fk_delivery: 1,
  assignment_status: "PENDING",
  assignment_sequence: 1,
};

describe("POST /api/assignments", () => {
  beforeEach(() => vi.clearAllMocks());

  it("devuelve 400 cuando faltan campos obligatorios", async () => {
    const res = await request(app)
      .post("/api/assignments")
      .set("Cookie", authCookie)
      .send({ fk_order: 1 }); // Falta fk_delivery

    expect(res.status).toBe(400);
  });

  it("devuelve 404 cuando pedido no existe", async () => {
    prisma.orders.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .post("/api/assignments")
      .set("Cookie", authCookie)
      .send({
        fk_order: 999,
        fk_delivery: 1,
      });

    expect(res.status).toBe(404);
    expect(res.body.error.message).toMatch(/pedido no encontrado/i);
  });

  it("devuelve 404 cuando delivery no existe", async () => {
    prisma.orders.findUnique.mockResolvedValue(mockOrder);
    prisma.deliveries.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .post("/api/assignments")
      .set("Cookie", authCookie)
      .send({
        fk_order: 1,
        fk_delivery: 999,
      });

    expect(res.status).toBe(404);
    expect(res.body.error.message).toMatch(/delivery no encontrado/i);
  });

  it("devuelve 409 cuando hay asignación PENDING activa", async () => {
    prisma.orders.findUnique.mockResolvedValue(mockOrder);
    prisma.deliveries.findUnique.mockResolvedValue(mockDelivery);
    prisma.deliveryAssignments.findFirst.mockResolvedValue(mockAssignment);

    const res = await request(app)
      .post("/api/assignments")
      .set("Cookie", authCookie)
      .send({
        fk_order: 1,
        fk_delivery: 1,
      });

    expect(res.status).toBe(409);
    expect(res.body.error.message).toMatch(/asignación pendiente/i);
  });

  it("devuelve 201 y crea asignación exitosamente", async () => {
    prisma.orders.findUnique.mockResolvedValue(mockOrder);
    prisma.deliveries.findUnique.mockResolvedValue(mockDelivery);
    prisma.deliveryAssignments.findFirst.mockResolvedValue(null);
    prisma.deliveryAssignments.create.mockResolvedValue(mockAssignment);

    const res = await request(app)
      .post("/api/assignments")
      .set("Cookie", authCookie)
      .send({
        fk_order: 1,
        fk_delivery: 1,
      });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      id_delivery_assignment: 1,
      assignment_status: "PENDING",
    });
  });
});

describe("POST /api/assignments/:id/accept", () => {
  beforeEach(() => vi.clearAllMocks());

  it("devuelve 400 cuando ID es inválido", async () => {
    const res = await request(app)
      .post("/api/assignments/abc/accept")
      .set("Cookie", authCookie)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/ID inválido/i);
  });

  it("devuelve 404 cuando asignación no existe", async () => {
    prisma.deliveryAssignments.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .post("/api/assignments/999/accept")
      .set("Cookie", authCookie)
      .send({});

    expect(res.status).toBe(404);
    expect(res.body.error.message).toMatch(/asignación no encontrada/i);
  });

  it("devuelve 409 cuando asignación ya fue respondida", async () => {
    prisma.deliveryAssignments.findUnique.mockResolvedValue({
      ...mockAssignment,
      assignment_status: "ACCEPTED",
    });

    const res = await request(app)
      .post("/api/assignments/1/accept")
      .set("Cookie", authCookie)
      .send({});

    expect(res.status).toBe(409);
    expect(res.body.error.message).toMatch(/ya fue respondida/i);
  });

  it("devuelve 200 y acepta asignación", async () => {
    prisma.deliveryAssignments.findUnique.mockResolvedValue({
      ...mockAssignment,
      delivery: { fk_user: 10 },
    });
    prisma.deliveryAssignments.update.mockResolvedValue({
      ...mockAssignment,
      assignment_status: "ACCEPTED",
    });

    const res = await request(app)
      .post("/api/assignments/1/accept")
      .set("Cookie", authCookie)
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.assignment_status).toBe("ACCEPTED");
  });
});

describe("POST /api/assignments/:id/reject", () => {
  beforeEach(() => vi.clearAllMocks());

  it("devuelve 404 cuando asignación no existe", async () => {
    prisma.deliveryAssignments.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .post("/api/assignments/999/reject")
      .set("Cookie", authCookie)
      .send({});

    expect(res.status).toBe(404);
    expect(res.body.error.message).toMatch(/asignación no encontrada/i);
  });

  it("devuelve 200 y rechaza asignación", async () => {
    prisma.deliveryAssignments.findUnique.mockResolvedValue({
      ...mockAssignment,
      delivery: { fk_user: 10 },
    });
    prisma.deliveryAssignments.update.mockResolvedValue({
      ...mockAssignment,
      assignment_status: "REJECTED",
    });

    const res = await request(app)
      .post("/api/assignments/1/reject")
      .set("Cookie", authCookie)
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.assignment_status).toBe("REJECTED");
  });
});

describe("GET /api/assignments/:id", () => {
  beforeEach(() => vi.clearAllMocks());

  it("devuelve 404 cuando asignación no existe", async () => {
    prisma.deliveryAssignments.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .get("/api/assignments/999")
      .set("Cookie", authCookie);

    expect(res.status).toBe(404);
    expect(res.body.error.message).toMatch(/asignación no encontrada/i);
  });

  it("devuelve 200 y la asignación con detalles", async () => {
    prisma.deliveryAssignments.findUnique.mockResolvedValue({
      ...mockAssignment,
      order: { id_order: 1, total: 100.0, created_at: new Date() },
      delivery: { id_delivery: 1, delivery_status: "ACTIVE" },
    });

    const res = await request(app)
      .get("/api/assignments/1")
      .set("Cookie", authCookie);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      id_delivery_assignment: 1,
      fk_order: 1,
    });
  });
});

describe("GET /api/assignments/deliveries/:deliveryId/assignments", () => {
  beforeEach(() => vi.clearAllMocks());

  it("devuelve 400 cuando ID es inválido", async () => {
    const res = await request(app)
      .get("/api/assignments/deliveries/abc/assignments")
      .set("Cookie", authCookie);

    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/ID inválido/i);
  });

  it("devuelve 404 cuando delivery no existe", async () => {
    prisma.deliveries.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .get("/api/assignments/deliveries/999/assignments")
      .set("Cookie", authCookie);

    expect(res.status).toBe(404);
    expect(res.body.error.message).toMatch(/delivery no encontrado/i);
  });

  it("devuelve 400 cuando status no es válido", async () => {
    prisma.deliveries.findUnique.mockResolvedValue(mockDelivery);

    const res = await request(app)
      .get("/api/assignments/deliveries/1/assignments?status=INVALID")
      .set("Cookie", authCookie);

    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/status inválido/i);
  });

  it("devuelve 200 y lista de asignaciones", async () => {
    prisma.deliveries.findUnique.mockResolvedValue(mockDelivery);
    prisma.deliveryAssignments.findMany.mockResolvedValue([mockAssignment]);

    const res = await request(app)
      .get("/api/assignments/deliveries/1/assignments")
      .set("Cookie", authCookie);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("devuelve 200 con asignaciones filtradas por status", async () => {
    prisma.deliveries.findUnique.mockResolvedValue(mockDelivery);
    prisma.deliveryAssignments.findMany.mockResolvedValue([
      { ...mockAssignment, assignment_status: "ACCEPTED" },
    ]);

    const res = await request(app)
      .get("/api/assignments/deliveries/1/assignments?status=ACCEPTED")
      .set("Cookie", authCookie);

    expect(res.status).toBe(200);
    expect(res.body[0].assignment_status).toBe("ACCEPTED");
  });
});

describe("POST /api/assignments/:id/complete", () => {
  beforeEach(() => vi.clearAllMocks());

  it("devuelve 404 cuando asignación no existe", async () => {
    prisma.deliveryAssignments.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .post("/api/assignments/999/complete")
      .set("Cookie", authCookie)
      .send({});

    expect(res.status).toBe(404);
    expect(res.body.error.message).toMatch(/asignación no encontrada/i);
  });

  it("devuelve 409 cuando asignación no está ACCEPTED", async () => {
    prisma.deliveryAssignments.findUnique.mockResolvedValue(mockAssignment);

    const res = await request(app)
      .post("/api/assignments/1/complete")
      .set("Cookie", authCookie)
      .send({});

    expect(res.status).toBe(409);
    expect(res.body.error.message).toMatch(/solo se pueden completar asignaciones aceptadas/i);
  });

  it("devuelve 200 y marca como DELIVERED", async () => {
    const acceptedAssignment = {
      ...mockAssignment,
      assignment_status: "ACCEPTED",
      fk_order: 1,
    };

    prisma.deliveryAssignments.findUnique.mockResolvedValue({
      ...acceptedAssignment,
      delivery: { fk_user: 10 },
    });
    prisma.deliveryAssignments.update.mockResolvedValue({
      ...acceptedAssignment,
      assignment_status: "DELIVERED",
    });
    prisma.orders.update.mockResolvedValue({
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
});

describe("DELETE /api/assignments/:id", () => {
  beforeEach(() => vi.clearAllMocks());

  it("devuelve 404 cuando asignación no existe", async () => {
    prisma.deliveryAssignments.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .delete("/api/assignments/999")
      .set("Cookie", authCookie);

    expect(res.status).toBe(404);
    expect(res.body.error.message).toMatch(/asignación no encontrada/i);
  });

  it("devuelve 409 cuando asignación ya fue respondida", async () => {
    prisma.deliveryAssignments.findUnique.mockResolvedValue({
      ...mockAssignment,
      assignment_status: "ACCEPTED",
    });

    const res = await request(app)
      .delete("/api/assignments/1")
      .set("Cookie", authCookie);

    expect(res.status).toBe(409);
    expect(res.body.error.message).toMatch(/no se puede eliminar/i);
  });

  it("devuelve 200 y elimina asignación", async () => {
    prisma.deliveryAssignments.findUnique.mockResolvedValue({
      ...mockAssignment,
      delivery: { fk_user: 10 },
    });
    prisma.deliveryAssignments.update.mockResolvedValue({
      ...mockAssignment,
      status: false,
    });

    const res = await request(app)
      .delete("/api/assignments/1")
      .set("Cookie", authCookie);

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/eliminada/i);
  });
});