import { vi, describe, it, expect, beforeEach, beforeAll } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import app from "../../src/app.js";
import { prisma } from "../../src/lib/prisma.js";

vi.mock("../../src/lib/prisma.js", () => ({
  prisma: {
    users: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
    },
    stores: {
      findUnique: vi.fn(),
    },
    deliveries: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}));

const TEST_JWT_SECRET = "test-secret-delivery";

// Tokens para diferentes roles
let sellerToken;
let deliveryToken;

beforeAll(() => {
  process.env.JWT_SECRET = TEST_JWT_SECRET;
  sellerToken = jwt.sign(
    { id_user: 1, email: "seller@test.com", role: "SELLER" },
    TEST_JWT_SECRET
  );
  deliveryToken = jwt.sign(
    { id_user: 2, email: "delivery@test.com", role: "DELIVERY" },
    TEST_JWT_SECRET
  );
});

// Datos de ejemplo para el comercio
const mockStore = {
  id_store: 1,
  fk_user: 1,
  fk_store_category: 1,
  name: "Tienda Test",
  email: "tienda@test.com",
  phone: "0981000000",
  status: true,
  user: { id_user: 1, status: true },
};

// Candidatos a delivery no vinculados
const mockDeliveryCandidate = {
  id_user: 2,
  name: "Delivery Juan",
  email: "delivery@test.com",
  phone: "0981111111",
};

const mockDeliveryCandidate2 = {
  id_user: 3,
  name: "Delivery María",
  email: "maria@delivery.com",
  phone: "0981222222",
};

// Delivery creado
const mockDeliveryCreated = {
  id_delivery: 10,
  fk_store: 1,
  fk_user: 2,
  delivery_status: "INACTIVE",
  created_at: "2026-05-03T00:00:00.000Z",
  updated_at: "2026-05-03T00:00:00.000Z",
};

// ─── GET /api/deliveries/search ─────────────────────────────────────────────

describe("GET /api/deliveries/search", () => {
  beforeEach(() => vi.resetAllMocks());

  it("Retorna array vacío cuando no hay query", async () => {
    const res = await request(app)
      .get("/api/deliveries/search")
      .set("Cookie", `userToken=${sellerToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("Retorna candidatos cuando la query es válida", async () => {
    prisma.users.findMany.mockResolvedValue([mockDeliveryCandidate]);

    const res = await request(app)
      .get("/api/deliveries/search?q=delivery")
      .set("Cookie", `userToken=${sellerToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toHaveProperty("id_user", 2);
    expect(res.body[0]).toHaveProperty("name", "Delivery Juan");
    expect(res.body[0]).toHaveProperty("email", "delivery@test.com");
    expect(res.body[0]).toHaveProperty("phone", "0981111111");

    // Verificar que solo busca en role DELIVERY
    expect(prisma.users.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          role: "DELIVERY",
          status: true,
          delivery: null,
        }),
      })
    );
  });

  it("Excluye deliveries ya vinculados en los resultados", async () => {
    // Simula que hay 2 usuarios pero solo 1 sin vinculación
    prisma.users.findMany.mockResolvedValue([mockDeliveryCandidate2]);

    const res = await request(app)
      .get("/api/deliveries/search?q=del")
      .set("Cookie", `userToken=${sellerToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].id_user).toBe(3);

    // Verificar que el filtro de "delivery: null" está siendo aplicado
    expect(prisma.users.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          delivery: null,
        }),
      })
    );
  });

  it("Busca por email con búsqueda case-insensitive", async () => {
    prisma.users.findMany.mockResolvedValue([mockDeliveryCandidate]);

    const res = await request(app)
      .get("/api/deliveries/search?q=DELIVERY@TEST.COM")
      .set("Cookie", `userToken=${sellerToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);

    // Verificar que usa 'insensitive' en la búsqueda
    expect(prisma.users.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            expect.objectContaining({ email: expect.objectContaining({ mode: "insensitive" }) }),
          ]),
        }),
      })
    );
  });

  it("Busca por phone con búsqueda case-insensitive", async () => {
    prisma.users.findMany.mockResolvedValue([mockDeliveryCandidate]);

    const res = await request(app)
      .get("/api/deliveries/search?q=0981111111")
      .set("Cookie", `userToken=${sellerToken}`);

    expect(res.status).toBe(200);
    expect(prisma.users.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            expect.objectContaining({ phone: expect.objectContaining({ mode: "insensitive" }) }),
          ]),
        }),
      })
    );
  });
});

// ─── POST /api/stores/{id}/deliveries ─────────────────────────────────────────

describe("POST /api/stores/{id}/deliveries", () => {
  beforeEach(() => vi.resetAllMocks());

  it("Retorna 400 cuando fk_user es requerido pero falta", async () => {
    prisma.stores.findUnique.mockResolvedValue(mockStore);

    const res = await request(app)
      .post("/api/stores/1/deliveries")
      .set("Cookie", `userToken=${sellerToken}`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/fk_user es requerido/i);
  });

  it("Retorna 403 cuando el usuario no es dueño del store", async () => {
    // la tienda es propiedad del usuario 99, pero el usuario autenticado es 1
    const otherStore = { ...mockStore, fk_user: 99, user: { id_user: 99, status: true } };
    prisma.stores.findUnique.mockResolvedValue(otherStore);

    const res = await request(app)
      .post("/api/stores/1/deliveries")
      .set("Cookie", `userToken=${sellerToken}`)
      .send({ fk_user: 2 });

    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/permisos/i);
  });

  it("Retorna 404 cuando el candidato a delivery no existe", async () => {
    prisma.stores.findUnique.mockResolvedValue(mockStore);
    prisma.users.findFirst.mockResolvedValue(null);

    const res = await request(app)
      .post("/api/stores/1/deliveries")
      .set("Cookie", `userToken=${sellerToken}`)
      .send({ fk_user: 9999 });

    expect(res.status).toBe(404);
    expect(res.body.message).toMatch(/Candidato a delivery no encontrado o no válido/i);
  });

  it("Retorna 404 cuando el usuario no tiene rol DELIVERY", async () => {
    prisma.stores.findUnique.mockResolvedValue(mockStore);
    // El servicio busca con role: 'DELIVERY', así que si no es DELIVERY, devuelve null
    prisma.users.findFirst.mockResolvedValue(null);

    const res = await request(app)
      .post("/api/stores/1/deliveries")
      .set("Cookie", `userToken=${sellerToken}`)
      .send({ fk_user: 2 });

    expect(res.status).toBe(404);
    expect(res.body.message).toMatch(/Candidato a delivery no encontrado o no válido/i);
  });

  it("Retorna 404 cuando el usuario está inactivo", async () => {
    prisma.stores.findUnique.mockResolvedValue(mockStore);
    // El servicio busca con status: true, así que si está inactivo, devuelve null
    prisma.users.findFirst.mockResolvedValue(null);

    const res = await request(app)
      .post("/api/stores/1/deliveries")
      .set("Cookie", `userToken=${sellerToken}`)
      .send({ fk_user: 2 });

    expect(res.status).toBe(404);
    expect(res.body.message).toMatch(/Candidato a delivery no encontrado o no válido/i);
  });

  it("Retorna 409 cuando el delivery ya está vinculado al mismo comercio", async () => {
    prisma.stores.findUnique.mockResolvedValue(mockStore);
    prisma.users.findFirst.mockResolvedValue({
      id_user: 2,
      role: "DELIVERY",
      status: true,
    });

    // Simulamos el error de unique constraint
    const prismaError = new Error("Unique constraint failed on the fields: (`fk_user`)");
    prismaError.code = "P2002";
    prisma.deliveries.create.mockRejectedValue(prismaError);

    // El delivery ya vinculado al mismo store
    prisma.deliveries.findUnique.mockResolvedValue({
      fk_store: 1,
      fk_user: 2,
    });

    const res = await request(app)
      .post("/api/stores/1/deliveries")
      .set("Cookie", `userToken=${sellerToken}`)
      .send({ fk_user: 2 });

    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/ya está vinculado a este comercio/i);
  });

  it("Retorna 409 cuando el delivery ya está vinculado a otro comercio", async () => {
    prisma.stores.findUnique.mockResolvedValue(mockStore);
    prisma.users.findFirst.mockResolvedValue({
      id_user: 2,
      role: "DELIVERY",
      status: true,
    });

    // Simulamos el error de unique constraint
    const prismaError = new Error("Unique constraint failed on the fields: (`fk_user`)");
    prismaError.code = "P2002";
    prisma.deliveries.create.mockRejectedValue(prismaError);

    // El delivery está vinculado a un store diferente
    prisma.deliveries.findUnique.mockResolvedValue({
      fk_store: 999, // Store diferente
      fk_user: 2,
    });

    const res = await request(app)
      .post("/api/stores/1/deliveries")
      .set("Cookie", `userToken=${sellerToken}`)
      .send({ fk_user: 2 });

    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/ya está vinculado a un comercio/i);
  });

  it("Retorna 201 con el delivery creado cuando todos los datos son válidos", async () => {
    prisma.stores.findUnique.mockResolvedValue(mockStore);
    prisma.users.findFirst.mockResolvedValue({
      id_user: 2,
      role: "DELIVERY",
      status: true,
    });
    prisma.deliveries.create.mockResolvedValue(mockDeliveryCreated);

    const res = await request(app)
      .post("/api/stores/1/deliveries")
      .set("Cookie", `userToken=${sellerToken}`)
      .send({ fk_user: 2 });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("id_delivery", 10);
    expect(res.body).toHaveProperty("fk_store", 1);
    expect(res.body).toHaveProperty("fk_user", 2);
    expect(res.body).toHaveProperty("delivery_status", "INACTIVE");

    // Verificar que se creó con los datos correctos
    expect(prisma.deliveries.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          fk_store: 1,
          fk_user: 2,
          delivery_status: "INACTIVE",
        }),
      })
    );
  });

  it("Validación de fk_user debe ser un número entero positivo", async () => {
    prisma.stores.findUnique.mockResolvedValue(mockStore);

    const res = await request(app)
      .post("/api/stores/1/deliveries")
      .set("Cookie", `userToken=${sellerToken}`)
      .send({ fk_user: -5 });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/id numérico válido/i);
  });

  it("Validación de fk_user no acepta strings", async () => {
    prisma.stores.findUnique.mockResolvedValue(mockStore);

    const res = await request(app)
      .post("/api/stores/1/deliveries")
      .set("Cookie", `userToken=${sellerToken}`)
      .send({ fk_user: "abc" });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/id numérico válido/i);
  });

  it("Retorna 401 cuando no hay autenticación", async () => {
    const res = await request(app)
      .post("/api/stores/1/deliveries")
      .send({ fk_user: 2 });

    expect(res.status).toBe(401);
  });

  it("Retorna 400 cuando el store ID no es numérico", async () => {
    const res = await request(app)
      .post("/api/stores/abc/deliveries")
      .set("Cookie", `userToken=${sellerToken}`)
      .send({ fk_user: 2 });

    expect(res.status).toBe(400);
  });
});
