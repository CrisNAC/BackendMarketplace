import { vi, describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import { prisma } from "../../src/lib/prisma.js";

const mockTx = {
  deliveryAssignments: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
    create: vi.fn(),
  },
  deliveries: {
    findUnique: vi.fn(),
  },
  orders: {
    update: vi.fn(),
  },
};

vi.mock("../../src/lib/prisma.js", () => ({
  prisma: {
    orders: {
      findUnique: vi.fn(),
    },
    deliveries: {
      findUnique: vi.fn(),
    },
    deliveryAssignments: {
      findFirst: vi.fn(),
      update: vi.fn(),
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

    req.user = { id_user: 1, email: "seller@test.com", role: "SELLER" };
    next();
  }),
}));

const authCookie = "userToken=mock-token";

describe("POST /api/assignments", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockTx.deliveryAssignments.findMany.mockReset();
    mockTx.deliveryAssignments.findFirst.mockReset();
    mockTx.deliveryAssignments.update.mockReset();
    mockTx.deliveryAssignments.create.mockReset();
    mockTx.deliveries.findUnique.mockReset();
    mockTx.orders.update.mockReset();

    prisma.orders.findUnique.mockReset();
    prisma.deliveries.findUnique.mockReset();
    prisma.deliveryAssignments.findFirst.mockReset();
    prisma.deliveryAssignments.update.mockReset();
    prisma.deliveryAssignments.create.mockReset();
  });

  it("retorna 201 y auto-rechaza una asignación PENDING previa si su delivery está INACTIVE, creando una nueva", async () => {
    prisma.orders.findUnique.mockResolvedValue({
      id_order: 5,
      fk_store: 10,
    });

    prisma.deliveries.findUnique.mockResolvedValue({
      id_delivery: 2,
      fk_store: 10,
      fk_user: 20,
      delivery_status: "ACTIVE",
      status: true,
    });

    mockTx.deliveryAssignments.findMany.mockResolvedValue([]);

    mockTx.deliveryAssignments.findFirst
      .mockResolvedValueOnce({
        id_delivery_assignment: 7,
        fk_order: 5,
        fk_delivery: 1,
        assignment_status: "PENDING",
        assignment_sequence: 1,
        delivery: { delivery_status: "INACTIVE" },
      })
      .mockResolvedValueOnce({ assignment_sequence: 1 });

    mockTx.deliveries.findUnique.mockResolvedValue({
      id_delivery: 2,
      delivery_status: "ACTIVE",
      status: true,
    });

    mockTx.orders.update.mockResolvedValue({});

    mockTx.deliveryAssignments.update.mockResolvedValue({
      id_delivery_assignment: 7,
      fk_order: 5,
      fk_delivery: 1,
      assignment_status: "REJECTED",
      status: false,
    });

    mockTx.deliveryAssignments.create.mockResolvedValue({
      id_delivery_assignment: 8,
      fk_order: 5,
      fk_delivery: 2,
      assignment_status: "PENDING",
      assignment_sequence: 2,
      status: true,
    });

    const res = await request(app)
      .post("/api/assignments")
      .set("Cookie", authCookie)
      .send({ fk_order: 5, fk_delivery: 2 });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      id_delivery_assignment: 8,
      fk_order: 5,
      fk_delivery: 2,
      assignment_status: "PENDING",
      assignment_sequence: 2,
      status: true,
    });

    expect(mockTx.deliveryAssignments.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id_delivery_assignment: 7 },
        data: { assignment_status: "REJECTED", status: false },
      })
    );

    expect(mockTx.deliveryAssignments.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          fk_order: 5,
          fk_delivery: 2,
          assignment_status: "PENDING",
          assignment_sequence: 2,
          status: true,
        }),
      })
    );
  });
});