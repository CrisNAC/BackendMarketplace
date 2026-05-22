import { vi, describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import { prisma } from "../../src/lib/prisma.js";

vi.mock("../../src/lib/prisma.js", () => ({
  prisma: {
    banners: {
      create: vi.fn(),
      count: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));

vi.mock("../../src/config/jwt.config.js", () => ({
  default: (req, res, next) => {
    const role = req.headers["x-test-role"];

    if (!role) return res.status(401).json({ errors: { auth: { message: "No autenticado" } } });

    const users = {
      admin: { id_user: 1, role: "ADMIN" },
      seller: { id_user: 10, role: "SELLER" },
      customer: { id_user: 2, role: "CUSTOMER" },
    };

    req.user = users[role] ?? null;

    if (!req.user) return res.status(401).json({ errors: { auth: { message: "No autenticado" } } });

    next();
  },
}));

const asAdmin = (req) => req.set("x-test-role", "admin");
const asSeller = (req) => req.set("x-test-role", "seller");

const mockBanner = {
  id_banner: 1,
  title: "Semana Eco",
  description: "Descuentos hasta 30%",
  image_url: "https://cdn.example.com/banner.jpg",
  link_url: "https://frontend.example.com/ofertas",
  start_at: new Date("2025-05-01T10:00:00.000Z"),
  end_at: new Date("2025-05-10T10:00:00.000Z"),
  is_active: true,
  status: true,
  created_at: new Date("2025-04-30T10:00:00.000Z"),
  updated_at: new Date("2025-04-30T10:00:00.000Z"),
};

const validCreateBody = {
  title: "Semana Eco",
  imageUrl: "https://cdn.example.com/banner.jpg",
  startAt: "2025-05-01T10:00:00.000Z",
  endAt: "2025-05-10T10:00:00.000Z",
  isActive: true,
};

// POST /api/admin/banners

describe("POST /api/admin/banners", () => {
  beforeEach(() => vi.clearAllMocks());

  // OM523
  it("devuelve 401 sin cookie de autenticación", async () => {
    const res = await request(app).post("/api/admin/banners").send(validCreateBody);

    expect(res.status).toBe(401);
  });

  it("devuelve 403 cuando el rol no es ADMIN", async () => {
    const res = await asSeller(
      request(app).post("/api/admin/banners").send(validCreateBody)
    );

    expect(res.status).toBe(403);
  });

  // OM523
  it("devuelve 400 cuando faltan campos requeridos (title, imageUrl o startAt)", async () => {
    const res = await asAdmin(
      request(app)
        .post("/api/admin/banners")
        .send({ imageUrl: "https://cdn.example.com/banner.jpg", startAt: "2025-05-01" })
    );

    expect(res.status).toBe(400);
  });

  it("devuelve 400 cuando endAt es anterior a startAt", async () => {
    const res = await asAdmin(
      request(app).post("/api/admin/banners").send({
        title: "Campaña",
        imageUrl: "https://cdn.example.com/banner.jpg",
        startAt: "2025-06-10T00:00:00.000Z",
        endAt: "2025-06-01T00:00:00.000Z",
      })
    );

    expect(res.status).toBe(400);
  });

  // OM523
  it("devuelve 201 con el banner creado cuando los datos son válidos", async () => {
    prisma.banners.create.mockResolvedValue(mockBanner);

    const res = await asAdmin(
      request(app).post("/api/admin/banners").send(validCreateBody)
    );

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("id", 1);
    expect(res.body).toHaveProperty("title", "Semana Eco");
    expect(res.body).toHaveProperty("imageUrl", "https://cdn.example.com/banner.jpg");
    expect(res.body).toHaveProperty("isActive", true);
    expect(res.body).toHaveProperty("status", true);
  });
});

// GET /api/admin/banners

describe("GET /api/admin/banners", () => {
  beforeEach(() => vi.clearAllMocks());

  // OM523
  it("devuelve 401 sin cookie de autenticación", async () => {
    const res = await request(app).get("/api/admin/banners");

    expect(res.status).toBe(401);
  });

  it("devuelve 403 cuando el rol no es ADMIN", async () => {
    const res = await asSeller(request(app).get("/api/admin/banners"));

    expect(res.status).toBe(403);
  });

  // OM523
  it("devuelve 200 con estructura paginada correcta", async () => {
    prisma.banners.count.mockResolvedValue(1);
    prisma.banners.findMany.mockResolvedValue([mockBanner]);

    const res = await asAdmin(request(app).get("/api/admin/banners"));

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("data");
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body).toHaveProperty("pagination");
    expect(res.body.pagination).toHaveProperty("total", 1);
    expect(res.body.pagination).toHaveProperty("page");
    expect(res.body.pagination).toHaveProperty("limit");
    expect(res.body.pagination).toHaveProperty("totalPages");
  });

  it("aplica el filtro active=true a la consulta", async () => {
    prisma.banners.count.mockResolvedValue(0);
    prisma.banners.findMany.mockResolvedValue([]);

    await asAdmin(request(app).get("/api/admin/banners?active=true"));

    expect(prisma.banners.count).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ is_active: true }) })
    );
  });

  it("aplica el filtro status=false a la consulta", async () => {
    prisma.banners.count.mockResolvedValue(0);
    prisma.banners.findMany.mockResolvedValue([]);

    await asAdmin(request(app).get("/api/admin/banners?status=false"));

    expect(prisma.banners.count).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ status: false }) })
    );
  });

  it("aplica búsqueda por título y descripción con el parámetro search", async () => {
    prisma.banners.count.mockResolvedValue(0);
    prisma.banners.findMany.mockResolvedValue([]);

    await asAdmin(request(app).get("/api/admin/banners?search=eco"));

    expect(prisma.banners.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: [
            { title: { contains: "eco", mode: "insensitive" } },
            { description: { contains: "eco", mode: "insensitive" } },
          ],
        }),
      })
    );
  });
});

// PUT /api/admin/banners/:id

describe("PUT /api/admin/banners/:id", () => {
  beforeEach(() => vi.clearAllMocks());

  // OM523
  it("devuelve 401 sin cookie de autenticación", async () => {
    const res = await request(app).put("/api/admin/banners/1").send({ title: "Nuevo" });

    expect(res.status).toBe(401);
  });

  it("devuelve 403 cuando el rol no es ADMIN", async () => {
    const res = await asSeller(
      request(app).put("/api/admin/banners/1").send({ title: "Nuevo" })
    );

    expect(res.status).toBe(403);
  });

  // OM523
  it("devuelve 400 cuando el id no es numérico", async () => {
    const res = await asAdmin(
      request(app).put("/api/admin/banners/abc").send({ title: "Nuevo" })
    );

    expect(res.status).toBe(400);
  });

  it("devuelve 404 cuando el banner no existe", async () => {
    prisma.banners.findUnique.mockResolvedValue(null);

    const res = await asAdmin(
      request(app).put("/api/admin/banners/999").send({ title: "Nuevo" })
    );

    expect(res.status).toBe(404);
  });

  it("devuelve 400 cuando endAt es anterior a startAt", async () => {
    prisma.banners.findUnique.mockResolvedValue(mockBanner);

    const res = await asAdmin(
      request(app).put("/api/admin/banners/1").send({
        startAt: "2025-06-10T00:00:00.000Z",
        endAt: "2025-06-01T00:00:00.000Z",
      })
    );

    expect(res.status).toBe(400);
  });

  // OM523
  it("devuelve 200 con el banner actualizado", async () => {
    const updatedBanner = { ...mockBanner, title: "Nuevo Titulo" };
    prisma.banners.findUnique
      .mockResolvedValueOnce(mockBanner)
      .mockResolvedValueOnce(updatedBanner);
    prisma.banners.updateMany.mockResolvedValue({ count: 1 });

    const res = await asAdmin(
      request(app).put("/api/admin/banners/1").send({ title: "Nuevo Titulo" })
    );

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("id", 1);
    expect(res.body).toHaveProperty("title", "Nuevo Titulo");
  });
});

// PATCH /api/admin/banners/:id/active

describe("PATCH /api/admin/banners/:id/active", () => {
  beforeEach(() => vi.clearAllMocks());

  // OM523
  it("devuelve 401 sin cookie de autenticación", async () => {
    const res = await request(app)
      .patch("/api/admin/banners/1/active")
      .send({ isActive: false });

    expect(res.status).toBe(401);
  });

  it("devuelve 403 cuando el rol no es ADMIN", async () => {
    const res = await asSeller(
      request(app).patch("/api/admin/banners/1/active").send({ isActive: false })
    );

    expect(res.status).toBe(403);
  });

  // OM523
  it("devuelve 400 cuando isActive no es un valor booleano", async () => {
    const res = await asAdmin(
      request(app).patch("/api/admin/banners/1/active").send({ isActive: "si" })
    );

    expect(res.status).toBe(400);
  });

  it("devuelve 400 cuando el id no es numérico", async () => {
    const res = await asAdmin(
      request(app).patch("/api/admin/banners/abc/active").send({ isActive: false })
    );

    expect(res.status).toBe(400);
  });

  it("devuelve 404 cuando el banner no existe", async () => {
    prisma.banners.findUnique.mockResolvedValue(null);

    const res = await asAdmin(
      request(app).patch("/api/admin/banners/999/active").send({ isActive: false })
    );

    expect(res.status).toBe(404);
  });

  // OM523
  it("devuelve 200 al desactivar un banner activo", async () => {
    const deactivatedBanner = { ...mockBanner, is_active: false };
    prisma.banners.findUnique
      .mockResolvedValueOnce({ id_banner: 1, status: true })
      .mockResolvedValueOnce(deactivatedBanner);
    prisma.banners.updateMany.mockResolvedValue({ count: 1 });

    const res = await asAdmin(
      request(app).patch("/api/admin/banners/1/active").send({ isActive: false })
    );

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("isActive", false);
  });

  it("devuelve 200 al activar un banner inactivo", async () => {
    const activatedBanner = { ...mockBanner, is_active: true };
    prisma.banners.findUnique
      .mockResolvedValueOnce({ id_banner: 1, status: true })
      .mockResolvedValueOnce(activatedBanner);
    prisma.banners.updateMany.mockResolvedValue({ count: 1 });

    const res = await asAdmin(
      request(app).patch("/api/admin/banners/1/active").send({ isActive: true })
    );

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("isActive", true);
  });
});

// GET /api/banners

describe("GET /api/banners", () => {
  beforeEach(() => vi.clearAllMocks());

  // OM523
  it("devuelve 200 con un array de banners activos", async () => {
    prisma.banners.findMany.mockResolvedValue([mockBanner]);

    const res = await request(app).get("/api/banners");

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toHaveProperty("id", 1);
    expect(res.body[0]).toHaveProperty("title", "Semana Eco");
    expect(res.body[0]).toHaveProperty("isActive", true);
  });

  it("retorna array vacío cuando no hay banners activos", async () => {
    prisma.banners.findMany.mockResolvedValue([]);

    const res = await request(app).get("/api/banners");

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("respeta el parámetro limit en la consulta", async () => {
    prisma.banners.findMany.mockResolvedValue([mockBanner]);

    const res = await request(app).get("/api/banners?limit=5");

    expect(res.status).toBe(200);
    expect(prisma.banners.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 5 })
    );
  });

  // OM523
  it("devuelve 400 cuando limit es inválido (negativo, cero o no numérico)", async () => {
    for (const limit of ["-1", "0", "abc"]) {
      const res = await request(app).get(`/api/banners?limit=${limit}`);
      expect(res.status).toBe(400);
    }
  });
});
