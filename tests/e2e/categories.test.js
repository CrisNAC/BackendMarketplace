import { vi, describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import { prisma } from "../../src/lib/prisma.js";

vi.mock("../../src/lib/prisma.js", () => ({
  prisma: {
    categories: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      count: vi.fn()
    },
    productCategories: {
      groupBy: vi.fn(),
      deleteMany: vi.fn()
    },
    $transaction: vi.fn()
  },
}));

// Mock de autenticación para e2e: permite inyectar roles con el header `x-test-role`
vi.mock("../../src/config/jwt.config.js", () => ({
  default: (req, res, next) => {
    const role = req.headers["x-test-role"];

    if (!role) return res.status(401).json({ errors: { auth: { message: "No autenticado" } } });

    const users = {
      admin: { id_user: 1, role: "ADMIN" },
      seller: { id_user: 10, role: "SELLER" },
      customer: { id_user: 2, role: "CUSTOMER" }
    };

    req.user = users[role] ?? null;

    if (!req.user) return res.status(401).json({ errors: { auth: { message: "No autenticado" } } });

    next();
  }
}));

// Helper para simular cabeceras de rol en requests
const asRole = (req, role) => req.set("x-test-role", role);

const mockProductCategories = [
  { id_category: 1, name: "Electrónica", status: true, created_at: "2026-01-01T00:00:00.000Z", updated_at: "2026-01-01T00:00:00.000Z" },
  { id_category: 2, name: "Ropa", status: true, created_at: "2026-01-01T00:00:00.000Z", updated_at: "2026-01-01T00:00:00.000Z" },
];

const mockStoreCategories = [
  { id_category: 1, name: "Tecnología", status: true, created_at: "2026-01-01T00:00:00.000Z", updated_at: "2026-01-01T00:00:00.000Z" },
  { id_category: 2, name: "Moda", status: true, created_at: "2026-01-01T00:00:00.000Z", updated_at: "2026-01-01T00:00:00.000Z" },
];

// ─── GET /api/categories/products ────────────────────────────────────────────

describe("GET /api/categories/products", () => {
  beforeEach(() => vi.clearAllMocks());

  it("devuelve 200 con un array de categorías de productos", async () => {
    prisma.categories.findMany.mockResolvedValue(mockProductCategories);

    const res = await request(app).get("/api/categories/products");

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(2);
  });

  it("cada categoría tiene las propiedades id, name, status, createdAt, updatedAt", async () => {
    prisma.categories.findMany.mockResolvedValue(mockProductCategories);

    const res = await request(app).get("/api/categories/products");

    expect(res.status).toBe(200);
    const category = res.body[0];
    expect(category).toHaveProperty("id");
    expect(category).toHaveProperty("name");
    expect(category).toHaveProperty("status");
    expect(category).toHaveProperty("createdAt");
    expect(category).toHaveProperty("updatedAt");
  });

  it("devuelve array vacío cuando no hay categorías", async () => {
    prisma.categories.findMany.mockResolvedValue([]);

    const res = await request(app).get("/api/categories/products");

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("filtra categorías por nombre con el parámetro search", async () => {
    const filtered = [mockProductCategories[0]];
    prisma.categories.findMany.mockResolvedValue(filtered);

    const res = await request(app).get("/api/categories/products?search=elec");

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });
});

// ─── GET /api/categories/stores ──────────────────────────────────────────────

describe("GET /api/categories/stores", () => {
  beforeEach(() => vi.clearAllMocks());

  it("devuelve 200 con un array de categorías de comercios", async () => {
    prisma.categories.findMany.mockResolvedValue(mockStoreCategories);

    const res = await request(app).get("/api/categories/stores");

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(2);
  });

  it("cada categoría tiene las propiedades id, name, status, createdAt, updatedAt", async () => {
    prisma.categories.findMany.mockResolvedValue(mockStoreCategories);

    const res = await request(app).get("/api/categories/stores");

    expect(res.status).toBe(200);
    const category = res.body[0];
    expect(category).toHaveProperty("id");
    expect(category).toHaveProperty("name");
    expect(category).toHaveProperty("status");
    expect(category).toHaveProperty("createdAt");
    expect(category).toHaveProperty("updatedAt");
  });

  it("devuelve array vacío cuando no hay categorías", async () => {
    prisma.categories.findMany.mockResolvedValue([]);

    const res = await request(app).get("/api/categories/stores");

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

// ─── GET /api/commerces/categories ───────────────────────────────────────────
// Módulo commerce: store-category.service.js (diferente al de /api/categories/stores)

describe("GET /api/commerces/categories", () => {
  beforeEach(() => vi.clearAllMocks());

  it("devuelve 200 con un array de categorías de comercios", async () => {
    prisma.categories.findMany.mockResolvedValue(mockStoreCategories);

    const res = await request(app).get("/api/commerces/categories");

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(2);
  });

  it("soporta filtrado por nombre con el parámetro search", async () => {
    prisma.categories.findMany.mockResolvedValue([mockStoreCategories[0]]);

    const res = await request(app).get("/api/commerces/categories?search=tec");

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].name).toBe("Tecnología");
  });

  it("respeta el parámetro limit (máximo 100)", async () => {
    prisma.categories.findMany.mockResolvedValue([mockStoreCategories[0]]);

    const res = await request(app).get("/api/commerces/categories?limit=1");

    expect(res.status).toBe(200);
    // Vitest verifica que el mock fue llamado con take: 1
    expect(prisma.categories.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 1 })
    );
  });
});

// ─── ICON FEATURES (Admin + Commerce request) ─────────────────────────────

describe("Icon support: admin create/get/update and commerce request", () => {
  beforeEach(() => vi.resetAllMocks());

  it("POST /api/admin/categories - crea categoría con icon y lo devuelve", async () => {
    const now = new Date().toISOString();
    const iconUrl = "https://cdn.example/icon.svg";

    prisma.categories.findFirst.mockResolvedValue(null);
    prisma.categories.create.mockResolvedValue({
      id_category: 33,
      name: "IconCat",
      icon: iconUrl,
      visible: true,
      status: true,
      created_at: now
    });

    const res = await asRole(
      request(app).post("/api/admin/categories").send({ name: "  IconCat  ", icon: iconUrl }),
      "admin"
    );

    expect(res.status).toBe(201);
    expect(prisma.categories.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ name: "IconCat", icon: iconUrl, visible: true })
      })
    );
    expect(res.body).toEqual({
      id: 33,
      name: "IconCat",
      icon: iconUrl,
      visible: true,
      status: true,
      createdAt: now
    });
  });

  it("GET /api/admin/categories/:id - incluye campo icon", async () => {
    const now = new Date().toISOString();
    const iconUrl = "https://cdn.example/icon.svg";

    prisma.categories.findUnique.mockResolvedValue({
      id_category: 10,
      name: "IconCat",
      icon: iconUrl,
      status: true,
      visible: true,
      created_at: now,
      updated_at: now,
      _count: { product_categories: 0 }
    });

    const res = await asRole(request(app).get("/api/admin/categories/10"), "admin");

    expect(res.status).toBe(200);
    expect(res.body.icon).toBe(iconUrl);
  });

  it("PUT /api/admin/categories/:id - actualiza solo el campo icon", async () => {
    const now = new Date().toISOString();
    const oldIcon = "https://cdn.example/icon.svg";
    const newIcon = "https://cdn.example/icon-new.svg";

    prisma.categories.findUnique.mockResolvedValue({ id_category: 5 });
    prisma.categories.update.mockResolvedValue({
      id_category: 5,
      name: "IconCat",
      icon: newIcon,
      visible: true,
      created_at: now,
      updated_at: now
    });

    const res = await asRole(
      request(app).put("/api/admin/categories/5").send({ icon: newIcon }),
      "admin"
    );

    expect(res.status).toBe(200);
    expect(prisma.categories.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id_category: 5 } })
    );
    expect(res.body.icon).toBe(newIcon);
  });

  it("Commerce: crear solicitud de categoría y luego aprobarla (admin)", async () => {
    const now = new Date().toISOString();

    // Seller crea la solicitud (solo envía name)
    prisma.categories.findFirst.mockResolvedValue(null);
    prisma.categories.create.mockResolvedValueOnce({
      id_category: 44,
      name: "SolicIcon",
      icon: null,
      visible: false,
      status: true,
      created_at: now,
      updated_at: now
    });

    const createRes = await asRole(
      request(app).post("/api/commerces/category-requests").send({ name: "SolicIcon" }),
      "seller"
    );

    expect(createRes.status).toBe(201);
    // El endpoint de solicitudes no devuelve campo icon (por ahora)
    expect(createRes.body.data.icon).toBeUndefined();

    // Admin procesa la solicitud (approve) — el servicio debe mantener el icon
    const pending = {
      id_category: 44,
      name: "SolicIcon",
      icon: null,
      visible: false,
      status: true,
      created_at: now,
      updated_at: now
    };

    const approved = {
      id_category: 44,
      name: "SolicIcon",
      icon: null,
      visible: true,
      status: true,
      created_at: now,
      updated_at: now
    };

    prisma.categories.findUnique.mockResolvedValueOnce(pending);
    prisma.categories.update.mockResolvedValueOnce(approved);
    prisma.categories.findUnique.mockResolvedValueOnce({ ...approved, _count: { product_categories: 0 } });

    const procRes = await asRole(
      request(app).patch("/api/admin/categories/44").send({ decision: "approve" }),
      "admin"
    );

    expect(procRes.status).toBe(200);
    // Después de aprobar, obtener la categoría no tendrá icon (null)
    const getRes = await asRole(request(app).get("/api/admin/categories/44"), "admin");
    expect(getRes.status).toBe(200);
    expect(getRes.body.icon).toBeNull();
  });
});
