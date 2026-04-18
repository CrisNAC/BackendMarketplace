import { vi, describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import app from "../../../src/app.js";
import { prisma } from "../../../src/lib/prisma.js";

vi.mock("../../../src/lib/prisma.js", () => ({
  prisma: {
    productCategories: {
      findUnique: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
      findMany: vi.fn()
    },
    products: {
      updateMany: vi.fn(),
      count: vi.fn()
    },
    $transaction: vi.fn()
  }
}));

vi.mock("../../../src/config/jwt.config.js", () => ({
  default: (req, res, next) => {
    const role = req.headers["x-test-role"];

    if (!role) {
      return res.status(401).json({ errors: { auth: { message: "No autenticado" } } });
    }

    const users = {
      admin: { id_user: 1, role: "ADMIN" },
      seller: { id_user: 10, role: "SELLER" },
      customer: { id_user: 2, role: "CUSTOMER" }
    };

    req.user = users[role] ?? null;

    if (!req.user) {
      return res.status(401).json({ errors: { auth: { message: "No autenticado" } } });
    }

    next();
  }
}));

// ─── HELPERS ──────────────────────────────────────────────────────
const asRole = (req, role) => req.set("x-test-role", role);

const now = new Date().toISOString();
const mockCategory = {
  id_product_category: 1,
  name: "Electrónica",
  status: true,
  visible: true,
  created_at: now,
  updated_at: now,
  _count: { products: 5 }
};

const mockUpdatedCategory = {
  id_product_category: 1,
  name: "Electrónica premium",
  visible: false,
  created_at: now,
  updated_at: now
};

const mockCategoryList = [
  {
    id_product_category: 1,
    name: "Electrónica",
    status: true,
    visible: true,
    _count: { products: 3 }
  },
  {
    id_product_category: 2,
    name: "Ropa",
    status: false,
    visible: false,
    _count: { products: 0 }
  }
];

const mockCategoryWithProducts = [
  {
    id_product_category: 1,
    name: "Electrónica",
    status: true,
    visible: true,
    _count: { products: 2 },
    products: [
      {
        id_product: 1,
        name: "Auriculares",
        price: 150000,
        offer_price: 120000,
        is_offer: true,
        status: true,
        visible: true
      }
    ]
  }
];

// ─── GET /api/admin/categories/:id ────────────────────────────────
describe("GET /api/admin/categories/:id", () => {
  beforeEach(() => vi.resetAllMocks());

  it("devuelve 401 cuando no hay token", async () => {
    const res = await request(app).get("/api/admin/categories/1");
    expect(res.status).toBe(401);
  });

  it("devuelve 403 cuando el usuario no es ADMIN", async () => {
    const res = await asRole(request(app).get("/api/admin/categories/1"), "seller");
    expect(res.status).toBe(403);
  });

  it("devuelve 403 cuando el usuario es CUSTOMER", async () => {
    const res = await asRole(request(app).get("/api/admin/categories/1"), "customer");
    expect(res.status).toBe(403);
  });

  it("devuelve 400 cuando el id no es un entero válido", async () => {
    const res = await asRole(request(app).get("/api/admin/categories/abc"), "admin");
    expect(res.status).toBe(400);
  });

  it("devuelve 404 cuando la categoría no existe", async () => {
    prisma.productCategories.findUnique.mockResolvedValue(null);

    const res = await asRole(request(app).get("/api/admin/categories/999"), "admin");
    expect(res.status).toBe(404);
  });

  it("devuelve 200 con la categoría y productCount", async () => {
    prisma.productCategories.findUnique.mockResolvedValue(mockCategory);

    const res = await asRole(request(app).get("/api/admin/categories/1"), "admin");

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(1);
    expect(res.body.status).toBe(true);
    expect(res.body.productCount).toBe(5);
    expect(typeof res.body.name).toBe("string");
  });

  it("devuelve la categoría aunque status sea false (admin ve todo)", async () => {
    prisma.productCategories.findUnique.mockResolvedValue({
      ...mockCategory,
      status: false
    });

    const res = await asRole(request(app).get("/api/admin/categories/1"), "admin");

    expect(res.status).toBe(200);
    expect(res.body.status).toBe(false);
  });

  it("retorna productCount en 0 cuando la categoría no tiene productos", async () => {
    prisma.productCategories.findUnique.mockResolvedValue({
      ...mockCategory,
      _count: { products: 0 }
    });

    const res = await asRole(request(app).get("/api/admin/categories/1"), "admin");

    expect(res.status).toBe(200);
    expect(res.body.productCount).toBe(0);
  });
});

// ─── GET /api/admin/categories ────────────────────────────────────
describe("GET /api/admin/categories", () => {
  beforeEach(() => vi.resetAllMocks());

  it("devuelve 401 cuando no hay token", async () => {
    const res = await request(app).get("/api/admin/categories");

    expect(res.status).toBe(401);
  });

  it("devuelve 403 cuando el usuario no es ADMIN", async () => {
    const res = await asRole(
      request(app).get("/api/admin/categories"),
      "seller"
    );

    expect(res.status).toBe(403);
  });

  it("devuelve 200 con todas las categorías sin filtros", async () => {
    prisma.productCategories.count.mockResolvedValue(2);
    prisma.productCategories.findMany.mockResolvedValue(mockCategoryList);

    const res = await asRole(
      request(app).get("/api/admin/categories"),
      "admin"
    );

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      categoryTotal: 2,
      categoryPage: 1
    });
    expect(res.body.data).toHaveLength(2);
  });

  it("incluye categorías con status false (admin ve todo)", async () => {
    prisma.productCategories.count.mockResolvedValue(1);
    prisma.productCategories.findMany.mockResolvedValue([mockCategoryList[1]]);

    const res = await asRole(
      request(app).get("/api/admin/categories?visible=false"),
      "admin"
    );

    expect(res.status).toBe(200);
    expect(res.body.data[0].visible).toBe(false);
  });

  it("filtra por visible=true", async () => {
    prisma.productCategories.count.mockResolvedValue(1);
    prisma.productCategories.findMany.mockResolvedValue([mockCategoryList[0]]);

    const res = await asRole(
      request(app).get("/api/admin/categories?visible=true"),
      "admin"
    );

    expect(res.status).toBe(200);
    expect(res.body.data[0].visible).toBe(true);
  });

  it("filtra por searchCategory", async () => {
    prisma.productCategories.count.mockResolvedValue(1);
    prisma.productCategories.findMany.mockResolvedValue([mockCategoryList[0]]);

    const res = await asRole(
      request(app).get("/api/admin/categories?searchCategory=Electr"),
      "admin"
    );

    expect(res.status).toBe(200);
    expect(res.body.data[0].name).toBe("Electrónica");
  });

  it("retorna paginación correcta", async () => {
    prisma.productCategories.count.mockResolvedValue(40);
    prisma.productCategories.findMany.mockResolvedValue(mockCategoryList);

    const res = await asRole(
      request(app).get("/api/admin/categories?categoryPage=2&categoryLimit=20"),
      "admin"
    );

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      categoryPage: 2,
      categoryLimit: 20,
      categoryTotal: 40,
      categoryTotalPages: 2
    });
  });

  it("retorna data vacía cuando no hay coincidencias", async () => {
    prisma.productCategories.count.mockResolvedValue(0);
    prisma.productCategories.findMany.mockResolvedValue([]);

    const res = await asRole(
      request(app).get("/api/admin/categories?searchCategory=noexiste"),
      "admin"
    );

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(0);
    expect(res.body.categoryTotal).toBe(0);
  });
});

// ─── GET /api/admin/categories/filter/withProducts ──────────────────────
describe("GET /api/admin/categories/filter/withProducts", () => {
  beforeEach(() => vi.resetAllMocks());

  it("devuelve 401 cuando no hay token", async () => {
    const res = await request(app).get("/api/admin/categories/filter/withProducts");

    expect(res.status).toBe(401);
  });

  it("devuelve 403 cuando el usuario no es ADMIN", async () => {
    const res = await asRole(
      request(app).get("/api/admin/categories/filter/withProducts"),
      "seller"
    );

    expect(res.status).toBe(403);
  });

  it("devuelve 200 con categorías y productos", async () => {
    prisma.productCategories.count.mockResolvedValue(1);
    prisma.productCategories.findMany.mockResolvedValue(mockCategoryWithProducts);
    prisma.products.count.mockResolvedValue(2);

    const res = await asRole(
      request(app).get("/api/admin/categories/filter/withProducts"),
      "admin"
    );

    expect(res.status).toBe(200);
    expect(res.body.data[0]).toHaveProperty("products");
    expect(res.body.data[0].products).toHaveProperty("data");
    expect(res.body.data[0].products).toHaveProperty("total");
  });

  it("filtra por search — devuelve categoría cuando el nombre de categoría coincide", async () => {
    prisma.productCategories.count.mockResolvedValue(1);
    prisma.productCategories.findMany.mockResolvedValue(mockCategoryWithProducts);
    prisma.products.count.mockResolvedValue(0);

    const res = await asRole(
      request(app).get("/api/admin/categories/filter/withProducts?search=Elec"),
      "admin"
    );

    expect(res.status).toBe(200);
    expect(prisma.productCategories.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            { name: { contains: "Elec", mode: "insensitive" } },
            expect.objectContaining({
              products: expect.objectContaining({ some: expect.anything() })
            })
          ])
        })
      })
    );
  });

  it("filtra por search — devuelve categoría cuando el nombre de producto coincide", async () => {
    prisma.productCategories.count.mockResolvedValue(1);
    prisma.productCategories.findMany.mockResolvedValue(mockCategoryWithProducts);
    prisma.products.count.mockResolvedValue(1);

    const res = await asRole(
      request(app).get("/api/admin/categories/filter/withProducts?search=Auriculares"),
      "admin"
    );

    expect(res.status).toBe(200);
    expect(prisma.products.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          name: { contains: "Auriculares", mode: "insensitive" }
        })
      })
    );
    expect(res.body.data[0].products.data[0].name).toBe("Auriculares");
  });

  it("filtra por searchCategory + searchProduct de forma dependiente", async () => {
    prisma.productCategories.count.mockResolvedValue(1);
    prisma.productCategories.findMany.mockResolvedValue(mockCategoryWithProducts);
    prisma.products.count.mockResolvedValue(1);

    const res = await asRole(
      request(app).get("/api/admin/categories/filter/withProducts?searchCategory=Electr&searchProduct=Auriculares"),
      "admin"
    );

    expect(res.status).toBe(200);
    expect(prisma.productCategories.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          name: { contains: "Electr", mode: "insensitive" }
        })
      })
    );
    expect(prisma.products.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          name: { contains: "Auriculares", mode: "insensitive" }
        })
      })
    );
  });

  it("retorna paginación de categorías y productos correcta", async () => {
    prisma.productCategories.count.mockResolvedValue(10);
    prisma.productCategories.findMany.mockResolvedValue(mockCategoryWithProducts);
    prisma.products.count.mockResolvedValue(5);

    const res = await asRole(
      request(app).get("/api/admin/categories/filter/withProducts?categoryPage=1&categoryLimit=5&productPage=1&productLimit=2"),
      "admin"
    );

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      categoryPage: 1,
      categoryLimit: 5,
      categoryTotal: 10,
      categoryTotalPages: 2
    });
    expect(res.body.data[0].products).toMatchObject({
      total: 5,
      productPage: 1,
      productLimit: 2,
      productTotalPages: 3
    });
  });

  it("retorna data vacía cuando no hay coincidencias", async () => {
    prisma.productCategories.count.mockResolvedValue(0);
    prisma.productCategories.findMany.mockResolvedValue([]);

    const res = await asRole(
      request(app).get("/api/admin/categories/filter/withProducts?search=noexiste"),
      "admin"
    );

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(0);
    expect(res.body.categoryTotal).toBe(0);
  });
});

describe("PUT /api/admin/categories/:id", () => {
  beforeEach(() => vi.resetAllMocks());

  it("devuelve 401 cuando no hay token", async () => {
    const res = await request(app)
      .put("/api/admin/categories/1")
      .send({ name: "Nueva" });

    expect(res.status).toBe(401);
  });

  it("devuelve 403 cuando el usuario no es ADMIN", async () => {
    const res = await asRole(
      request(app).put("/api/admin/categories/1").send({ name: "Nueva" }),
      "seller"
    );

    expect(res.status).toBe(403);
  });

  it("devuelve 400 cuando el id no es un entero válido", async () => {
    const res = await asRole(
      request(app).put("/api/admin/categories/abc").send({ name: "Nueva" }),
      "admin"
    );

    expect(res.status).toBe(400);
  });

  it("devuelve 400 cuando el body no tiene campos para actualizar", async () => {
    const res = await asRole(
      request(app).put("/api/admin/categories/1").send({}),
      "admin"
    );

    expect(res.status).toBe(400);
  });

  it("devuelve 400 cuando visible no es boolean", async () => {
    const res = await asRole(
      request(app).put("/api/admin/categories/1").send({ visible: "si" }),
      "admin"
    );

    expect(res.status).toBe(400);
  });

  it("devuelve 404 cuando la categoría no existe", async () => {
    prisma.productCategories.findUnique.mockResolvedValue(null);

    const res = await asRole(
      request(app).put("/api/admin/categories/999").send({ name: "Nueva" }),
      "admin"
    );

    expect(res.status).toBe(404);
  });

  it("devuelve 200 y actualiza name y visible", async () => {
    prisma.productCategories.findUnique.mockResolvedValue({ id_product_category: 1 });
    prisma.productCategories.update.mockResolvedValue(mockUpdatedCategory);

    const payload = {
      name: "Electrónica premium",
      visible: false
    };

    const res = await asRole(
      request(app).put("/api/admin/categories/1").send(payload),
      "admin"
    );

    expect(res.status).toBe(200);
    expect(prisma.productCategories.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id_product_category: 1 },
        data: expect.objectContaining({
          name: "Electrónica premium",
          visible: false
        })
      })
    );
    expect(res.body.id).toBe(1);
    expect(res.body.visible).toBe(false);
    expect(typeof res.body.name).toBe("string");
  });
});

describe("DELETE /api/admin/categories/:id", () => {
  beforeEach(() => vi.resetAllMocks());

  it("devuelve 401 cuando no hay token", async () => {
    const res = await request(app).delete("/api/admin/categories/1");
    expect(res.status).toBe(401);
  });

  it("devuelve 403 cuando el usuario no es ADMIN", async () => {
    const res = await asRole(request(app).delete("/api/admin/categories/2"), "seller");
    expect(res.status).toBe(403);
  });

  it("devuelve 400 cuando el id no es un entero válido", async () => {
    const res = await asRole(request(app).delete("/api/admin/categories/abc"), "admin");
    expect(res.status).toBe(400);
  });

  it("devuelve 400 cuando se intenta eliminar la categoría con id 1", async () => {
    const res = await asRole(request(app).delete("/api/admin/categories/1"), "admin");
    expect(res.status).toBe(400);
  });

  it("devuelve 404 cuando la categoría no existe", async () => {
    prisma.productCategories.findUnique.mockResolvedValue(null);

    const res = await asRole(request(app).delete("/api/admin/categories/999"), "admin");
    expect(res.status).toBe(404);
  });

  it("devuelve 204 cuando la categoría se elimina correctamente", async () => {
    prisma.productCategories.findUnique.mockResolvedValue(mockCategory);
    prisma.$transaction.mockResolvedValue([]);

    const res = await asRole(request(app).delete("/api/admin/categories/2"), "admin");
    expect(res.status).toBe(204);
  });

  it("ejecuta la transacción para reasignar productos y ocultar categoría", async () => {
    prisma.productCategories.findUnique.mockResolvedValue(mockCategory);
    prisma.$transaction.mockImplementation(async (ops) => ops);

    await asRole(request(app).delete("/api/admin/categories/2"), "admin");

    expect(prisma.$transaction).toHaveBeenCalled();
  });
});