import { vi, describe, it, expect, beforeEach, beforeAll } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import app from "../../src/app.js";
import { prisma } from "../../src/lib/prisma.js";
import { filterStoreProductsService } from "../../src/modules/commerce/commerces/store.service.js";

vi.mock("../../src/lib/prisma.js", () => ({
  prisma: {
    users: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    stores: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    storeCategories: {
      findUnique: vi.fn(),
    },
    products: {
      count: vi.fn(),
      findMany: vi.fn(),
      updateMany: vi.fn(),
    },
    addresses: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

const TEST_JWT_SECRET = "test-secret-stores";

// Token válido de un vendedor para las rutas protegidas
let sellerToken;

beforeAll(() => {
  process.env.JWT_SECRET = TEST_JWT_SECRET;
  sellerToken = jwt.sign(
    { id_user: 1, email: "seller@test.com", role: "SELLER" },
    TEST_JWT_SECRET
  );
});

// Comercio de ejemplo que devuelve la BD
const mockStore = {
  id_store: 1,
  fk_user: 1,
  fk_store_category: 1,
  name: "Tienda Test",
  email: "tienda@test.com",
  phone: "0981000000",
  description: null,
  logo: null,
  website_url: null,
  instagram_url: null,
  tiktok_url: null,
  status: true,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
  user: { id_user: 1, name: "Vendedor", email: "seller@test.com", role: "SELLER", status: true },
  store_category: { id_store_category: 1, name: "Electrónica", status: true },
  products: [],
  addresses: [],
};

const mockProducts = [
  {
    id_product: 1,
    name: "Producto A",
    description: "Desc A",
    price: 10.0,
    quantity: 5,
    visible: true,
    created_at: "2026-01-01T00:00:00.000Z",
    product_category: { id_product_category: 1, name: "Cat A" },
  },
];

// ─── GET /api/commerces/:id ───────────────────────────────────────────────────

describe("GET /api/commerces/:id", () => {
  beforeEach(() => vi.resetAllMocks());

  it("devuelve 200 con datos del comercio cuando existe", async () => {
    prisma.stores.findUnique.mockResolvedValue(mockStore);

    const res = await request(app).get("/api/commerces/1");

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("id_store", 1);
    expect(res.body).toHaveProperty("name", "Tienda Test");
  });

  it("devuelve 400 cuando el id no es numérico", async () => {
    const res = await request(app).get("/api/commerces/abc");

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/n.mero/i);
  });

  it("devuelve 404 cuando el comercio no existe", async () => {
    prisma.stores.findUnique.mockResolvedValue(null);

    const res = await request(app).get("/api/commerces/9999");

    expect(res.status).toBe(404);
    expect(res.body.message).toMatch(/no encontrado/i);
  });
});

// ─── GET /api/commerces/products/:id ─────────────────────────────────────────

describe("GET /api/commerces/products/:id", () => {
  beforeEach(() => vi.resetAllMocks());

  it("devuelve 200 con los productos del comercio", async () => {
    // Primera llamada: verificar que el store existe
    prisma.stores.findUnique.mockResolvedValue({ id_store: 1 });
    prisma.products.findMany.mockResolvedValue(mockProducts);

    const res = await request(app).get("/api/commerces/products/1");

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(1);
  });

  it("devuelve 404 cuando el comercio no existe", async () => {
    prisma.stores.findUnique.mockResolvedValue(null);

    const res = await request(app).get("/api/commerces/products/9999");

    expect(res.status).toBe(404);
    expect(res.body.message).toMatch(/no encontrado/i);
  });

  it("devuelve 404 cuando el comercio no tiene productos", async () => {
    prisma.stores.findUnique.mockResolvedValue({ id_store: 1 });
    prisma.products.findMany.mockResolvedValue([]);

    const res = await request(app).get("/api/commerces/products/1");

    expect(res.status).toBe(404);
  });
});

// ─── GET /api/commerces/products/filter/:id ───────────────────────────────────

describe("GET /api/commerces/products/filter/:id", () => {
  beforeEach(() => vi.resetAllMocks());

  it("devuelve 200 con productos filtrados por precio", async () => {
    prisma.stores.findUnique.mockResolvedValue({ id_store: 1 });
    prisma.products.count.mockResolvedValue(1);
    prisma.products.findMany.mockResolvedValue(mockProducts);

    const res = await request(app).get(
      "/api/commerces/products/filter/1?price_min=5&price_max=20"
    );

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("content");
    expect(Array.isArray(res.body.content)).toBe(true);
  });

  it("aplica el rango sobre price u offer_price segun el precio efectivo", async () => {
    prisma.stores.findUnique.mockResolvedValue({ id_store: 1 });
    prisma.products.count.mockResolvedValue(1);
    prisma.products.findMany.mockResolvedValue([
      {
        ...mockProducts[0],
        price: 20,
        offer_price: 12,
        is_offer: true
      }
    ]);

    const res = await request(app).get(
      "/api/commerces/products/filter/1?price_min=10&price_max=15"
    );

    expect(res.status).toBe(200);
    expect(prisma.products.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: [
            {
              AND: [
                { is_offer: false },
                { price: { gte: 10, lte: 15 } }
              ]
            },
            {
              AND: [
                { is_offer: true },
                { offer_price: { gte: 10, lte: 15 } }
              ]
            }
          ]
        })
      })
    );
  });

  it("devuelve 404 cuando no hay productos con los filtros aplicados", async () => {
    prisma.stores.findUnique.mockResolvedValue({ id_store: 1 });
    prisma.products.count.mockResolvedValue(0);
    prisma.products.findMany.mockResolvedValue([]);

    const res = await request(app).get(
      "/api/commerces/products/filter/1?price_min=1000"
    );

    expect(res.status).toBe(404);
  });

});

describe("filterStoreProductsService", () => {
  beforeEach(() => vi.resetAllMocks());

  it("rechaza price_min vacio con 400", async () => {
    prisma.stores.findUnique.mockResolvedValue({ id_store: 1 });

    await expect(
      filterStoreProductsService(1, { price_min: "" }, {})
    ).rejects.toMatchObject({
      status: 400,
      message: expect.stringMatching(/price_min.*numero valido/i)
    });

    expect(prisma.products.count).not.toHaveBeenCalled();
    expect(prisma.products.findMany).not.toHaveBeenCalled();
  });

  it("rechaza price_max no numerico con 400", async () => {
    prisma.stores.findUnique.mockResolvedValue({ id_store: 1 });

    await expect(
      filterStoreProductsService(1, { price_max: "abc" }, {})
    ).rejects.toMatchObject({
      status: 400,
      message: expect.stringMatching(/price_max.*numero valido/i)
    });

    expect(prisma.products.count).not.toHaveBeenCalled();
    expect(prisma.products.findMany).not.toHaveBeenCalled();
  });

  it("rechaza cuando price_min es mayor que price_max con 400", async () => {
    prisma.stores.findUnique.mockResolvedValue({ id_store: 1 });

    await expect(
      filterStoreProductsService(1, { price_min: "20", price_max: "10" }, {})
    ).rejects.toMatchObject({
      status: 400,
      message: expect.stringMatching(/price_min.*mayor que price_max/i)
    });

    expect(prisma.products.count).not.toHaveBeenCalled();
    expect(prisma.products.findMany).not.toHaveBeenCalled();
  });
});

// ─── POST /api/commerces ──────────────────────────────────────────────────────

describe("POST /api/commerces", () => {
  beforeEach(() => vi.resetAllMocks());

  it("devuelve 401 cuando no hay cookie de autenticación", async () => {
    const res = await request(app).post("/api/commerces").send({});

    expect(res.status).toBe(401);
  });

  it("devuelve 400 cuando faltan campos obligatorios", async () => {
    const res = await request(app)
      .post("/api/commerces")
      .set("Cookie", `userToken=${sellerToken}`)
      .send({ name: "Solo Nombre" });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/campos obligatorios/i);
  });

  it("devuelve 400 cuando el email tiene formato inválido", async () => {
    prisma.users.findUnique.mockResolvedValue({ id_user: 1, role: "CUSTOMER", status: true });
    prisma.stores.findUnique.mockResolvedValue(null); // no tiene tienda aún

    const res = await request(app)
      .post("/api/commerces")
      .set("Cookie", `userToken=${sellerToken}`)
      .send({
        fk_store_category: 1,
        name: "Tienda",
        email: "email-invalido",
        phone: "0981000000",
        address: "Calle 1",
        city: "Asunción",
        region: "Central",
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/email/i);
  });

  it("devuelve 409 cuando el usuario ya tiene un comercio registrado", async () => {
    prisma.users.findUnique.mockResolvedValue({ id_user: 1, role: "SELLER", status: true });
    prisma.stores.findUnique.mockResolvedValue(mockStore); // ya tiene tienda

    const res = await request(app)
      .post("/api/commerces")
      .set("Cookie", `userToken=${sellerToken}`)
      .send({
        fk_store_category: 1,
        name: "Tienda",
        email: "nueva@test.com",
        phone: "0981000000",
        address: "Calle 1",
        city: "Asunción",
        region: "Central",
      });

    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/ya tiene un comercio/i);
  });

  it("devuelve 201 con el comercio cuando todos los datos son válidos", async () => {
    prisma.users.findUnique.mockResolvedValue({ id_user: 1, role: "CUSTOMER", status: true });
    prisma.stores.findUnique.mockResolvedValue(null);
    prisma.storeCategories.findUnique.mockResolvedValue({ id_store_category: 1, status: true });
    prisma.$transaction.mockImplementation(async (fn) =>
      fn({
        stores: {
          create: vi.fn().mockResolvedValue({ id_store: 1 }),
        },
        addresses: {
          create: vi.fn().mockResolvedValue({}),
        },
        users: {
          update: vi.fn().mockResolvedValue({}),
        },
      })
    );

    const res = await request(app)
      .post("/api/commerces")
      .set("Cookie", `userToken=${sellerToken}`)
      .send({
        fk_store_category: 1,
        name: "Nueva Tienda",
        email: "nueva@test.com",
        phone: "0981000000",
        address: "Calle 1",
        city: "Asunción",
        region: "Central",
      });

    expect(res.status).toBe(201);
  });
});

// ─── PUT /api/commerces/:id ───────────────────────────────────────────────────

describe("PUT /api/commerces/:id", () => {
  beforeEach(() => vi.resetAllMocks());

  it("devuelve 401 cuando no hay cookie de autenticación", async () => {
    const res = await request(app)
      .put("/api/commerces/1")
      .send({ name: "Nuevo Nombre" });

    expect(res.status).toBe(401);
  });

  it("devuelve 400 cuando no se envía ningún campo", async () => {
    prisma.stores.findUnique.mockResolvedValue({
      ...mockStore,
      fk_user: 1,
      user: { id_user: 1, status: true },
    });

    const res = await request(app)
      .put("/api/commerces/1")
      .set("Cookie", `userToken=${sellerToken}`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/al menos un campo/i);
  });

  it("devuelve 200 con el comercio actualizado", async () => {
    // getAuthorizedStoreOwnerService
    prisma.stores.findUnique
      .mockResolvedValueOnce({
        id_store: 1,
        fk_user: 1,
        logo: null,
        status: true,
        user: { id_user: 1, status: true },
      })
      // tx.stores.findUnique al final de la transacción
      .mockResolvedValueOnce({ ...mockStore, name: "Nombre Actualizado" });

    prisma.$transaction.mockImplementation(async (fn) =>
      fn({
        stores: {
          update: vi.fn().mockResolvedValue({}),
          findUnique: vi.fn().mockResolvedValue({ ...mockStore, name: "Nombre Actualizado" }),
        },
        addresses: {
          update: vi.fn().mockResolvedValue({}),
          create: vi.fn().mockResolvedValue({}),
        },
      })
    );

    const res = await request(app)
      .put("/api/commerces/1")
      .set("Cookie", `userToken=${sellerToken}`)
      .send({ name: "Nombre Actualizado" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// ─── DELETE /api/commerces/:id ────────────────────────────────────────────────

describe("DELETE /api/commerces/:id", () => {
  beforeEach(() => vi.resetAllMocks());

  it("devuelve 401 cuando no hay cookie de sesión", async () => {
    const res = await request(app).delete("/api/commerces/1");

    expect(res.status).toBe(401);
  });

  it("devuelve 404 cuando el comercio no existe", async () => {
    prisma.stores.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .delete("/api/commerces/1")
      .set("Cookie", `userToken=${sellerToken}`);

    expect(res.status).toBe(404);
  });

  it("devuelve 403 cuando el usuario no es dueño del comercio", async () => {
    prisma.stores.findUnique.mockResolvedValue({ id_store: 1, fk_user: 99, status: true });

    const res = await request(app)
      .delete("/api/commerces/1")
      .set("Cookie", `userToken=${sellerToken}`);

    expect(res.status).toBe(403);
  });

  it("devuelve 204 cuando el comercio se elimina correctamente", async () => {
    prisma.stores.findUnique.mockResolvedValue({ id_store: 1, fk_user: 1, status: true });
    prisma.$transaction.mockResolvedValue([{}, {}]);

    const res = await request(app)
      .delete("/api/commerces/1")
      .set("Cookie", `userToken=${sellerToken}`);

    expect(res.status).toBe(204);
  });
});
