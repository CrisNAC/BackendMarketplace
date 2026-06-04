import { vi, expect, describe, it, beforeEach } from "vitest";
import request from "supertest";

export const DELIVERY_REGISTER = {
  authCookie: "userToken=mock-token",
  validPhone: "0987654321",
  registerPayload: { vehicleType: "MOTORCYCLE", phone: "0987654321" },
};

export function setupAuthenticatedCustomer(mockAuthenticate) {
  mockAuthenticate.mockImplementation((req, res, next) => {
    if (!req.cookies?.userToken) {
      return res.status(401).json({
        errors: { auth: { message: "No autenticado" } },
      });
    }

    req.user = { id_user: 10, email: "customer@test.com", role: "CUSTOMER" };
    next();
  });
}

function expectValidationError(res) {
  expect(res.status).toBe(400);
  expect(res.body.message).toBe("Error de validación");
  expect(res.body.errors?.length).toBeGreaterThan(0);
}

function setupSuccessfulRegisterMocks(prisma) {
  const { validPhone, registerPayload } = DELIVERY_REGISTER;

  prisma.users.findUnique.mockResolvedValue({
    id_user: 10,
    role: "CUSTOMER",
    phone: validPhone,
    delivery: null,
  });

  prisma.users.update.mockResolvedValue({
    id_user: 10,
    name: "Juan",
    email: "customer@test.com",
    phone: validPhone,
    role: "DELIVERY",
  });

  prisma.deliveries.create.mockResolvedValue({
    id_delivery: 1,
    fk_user: 10,
    fk_store: null,
    delivery_status: "ACTIVE",
    vehicle_type: registerPayload.vehicleType,
    status: true,
  });
}

/**
 * Suite compartida de POST /api/deliveries/register (e2e y unit).
 */
export function defineDeliveryRegisterTests(app, harness, options = {}) {
  const { includeUnauthenticatedCase = false, successTitle } = options;
  const prisma = harness.prisma;
  const { authCookie, validPhone, registerPayload } = DELIVERY_REGISTER;

  describe("POST /api/deliveries/register", () => {
    beforeEach(() => {
      vi.clearAllMocks();
      setupAuthenticatedCustomer(harness.mockAuthenticate);
    });

    if (includeUnauthenticatedCase) {
      it("devuelve 401 cuando no hay autenticación", async () => {
        const res = await request(app)
          .post("/api/deliveries/register")
          .send(registerPayload);

        expect(res.status).toBe(401);
      });
    }

    it("retorna 400 cuando vehicleType no se envía", async () => {
      const res = await request(app)
        .post("/api/deliveries/register")
        .set("Cookie", authCookie)
        .send({ phone: validPhone });

      expectValidationError(res);
    });

    it("retorna 400 cuando vehicleType es inválido", async () => {
      const res = await request(app)
        .post("/api/deliveries/register")
        .set("Cookie", authCookie)
        .send({ vehicleType: "PLANE", phone: validPhone });

      expectValidationError(res);
    });

    it("retorna 404 cuando el usuario no existe", async () => {
      prisma.users.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .post("/api/deliveries/register")
        .set("Cookie", authCookie)
        .send({ vehicleType: "CAR", phone: validPhone });

      expect(res.status).toBe(404);
      expect(res.body.error.message).toMatch(/usuario no encontrado/i);
    });

    it("retorna 403 cuando el usuario no es CUSTOMER", async () => {
      prisma.users.findUnique.mockResolvedValue({
        id_user: 10,
        role: "SELLER",
        delivery: null,
      });

      const res = await request(app)
        .post("/api/deliveries/register")
        .set("Cookie", authCookie)
        .send({ vehicleType: "CAR", phone: validPhone });

      expect(res.status).toBe(403);
      expect(res.body.error.message).toMatch(/solo un usuario customer/i);
    });

    it("retorna 409 cuando el usuario ya es delivery", async () => {
      prisma.users.findUnique.mockResolvedValue({
        id_user: 10,
        role: "DELIVERY",
        delivery: { id_delivery: 5 },
      });

      const res = await request(app)
        .post("/api/deliveries/register")
        .set("Cookie", authCookie)
        .send({ vehicleType: "BICYCLE", phone: validPhone });

      expect(res.status).toBe(409);
      expect(res.body.error.message).toMatch(/ya está registrado como delivery/i);
    });

    it(successTitle ?? "retorna 200 y crea el delivery con estado ACTIVE", async () => {
      setupSuccessfulRegisterMocks(prisma);

      const res = await request(app)
        .post("/api/deliveries/register")
        .set("Cookie", authCookie)
        .send(registerPayload);

      expect(res.status).toBe(200);
      expect(res.body.user.role).toBe("DELIVERY");
      expect(res.body.delivery.delivery_status).toBe("ACTIVE");
      expect(res.body.delivery.fk_store).toBe(null);
      expect(res.body.delivery.vehicle_type).toBe("MOTORCYCLE");
      expect(prisma.users.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id_user: 10 },
          data: { role: "DELIVERY", phone: validPhone },
        })
      );
      expect(prisma.deliveries.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            fk_user: 10,
            fk_store: null,
            delivery_status: "ACTIVE",
            vehicle_type: "MOTORCYCLE",
          }),
        })
      );
    });
  });
}
