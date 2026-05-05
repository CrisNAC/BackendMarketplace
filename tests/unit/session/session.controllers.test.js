import { describe, beforeEach, afterEach, it, expect, vi } from "vitest";
import { userSession } from "../../../src/modules/session/controllers/session.controllers.js";
import { prisma } from "../../../src/lib/prisma.js";
import jwt from "jsonwebtoken";

vi.mock("../../../src/lib/prisma.js", () => ({
  prisma: {
    users: {
      findFirst: vi.fn(),
    },
  },
}));

vi.mock("jsonwebtoken", () => ({
  default: {
    verify: vi.fn(),
  }
}));

describe("userSession controller", () => {
  let req, res;

  beforeEach(() => {
    req = {
      cookies: {
        userToken: "fake-token",
      },
    };
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    process.env.JWT_SECRET = "secret";
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should return user data including id_delivery when the user is a delivery", async () => {
    jwt.verify.mockReturnValue({ id_user: 1 });

    prisma.users.findFirst.mockResolvedValue({
      id_user: 1,
      name: "Delivery Guy",
      email: "delivery@example.com",
      phone: "12345678",
      role: "DELIVERY",
      store: null,
      delivery: {
        id_delivery: 10,
      },
    });

    await userSession(req, res);

    expect(prisma.users.findFirst).toHaveBeenCalledWith({
      where: {
        id_user: 1,
        status: true,
      },
      include: {
        store: {
          where: { status: true },
          select: { id_store: true },
        },
        delivery: {
          where: { status: true },
          select: { id_delivery: true },
        },
      },
    });

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      user: {
        id_user: 1,
        name: "Delivery Guy",
        email: "delivery@example.com",
        phone: "12345678",
        role: "DELIVERY",
        id_store: null,
        id_delivery: 10,
      },
    });
  });
});
