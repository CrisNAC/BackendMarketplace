import { vi, describe, it, expect, beforeEach, beforeAll } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import app from "../../src/app.js";
import { prisma } from "../../src/lib/prisma.js";

vi.mock("../../src/lib/prisma.js", () => ({
  prisma: {
    products: {
      count: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn()
    },
    users: {
      findUnique: vi.fn()
    },
    productCategories: {
      findUnique: vi.fn()
    },
    productTags: {
      findMany: vi.fn()
    },
    $transaction: vi.fn()
  }
}));

const TEST_JWT_SECRET = "test-secret-products";
let sellerToken;

beforeAll(() => {
  process.env.JWT_SECRET = TEST_JWT_SECRET;
  sellerToken = jwt.sign(
    { id_user: 1, email: "seller@test.com", role: "SELLER" },
    TEST_JWT_SECRET
  );
});

const mockDbProduct = {
  id_product: 1,
  name: "Producto Test",
  description: "Descripcion de prueba",
  price: 25,
  offer_price: null,
  fk_product_category: 1,
  fk_store: 1,
  visible: true,
  is_offer: false,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
  product_category: {
    id_product_category: 1,
    name: "Categoria Test",
    status: true
  },
  product_tag_relations: [],
  product_reviews: []
};

const mockListProduct = {
  id_product: 1,
  name: "Producto Test",
  description: "Descripcion de prueba",
  price: 25,
  offer_price: null,
  is_offer: false,
  store: { id_store: 1, name: "Tienda Test" }
};

describe("GET /products", () => {
  beforeEach(() => vi.clearAllMocks());

  it("devuelve 200 con lista vacia y estructura de paginacion", async () => {
    prisma.products.count.mockResolvedValue(0);
    prisma.products.findMany.mockResolvedValue([]);

    const res = await request(app).get("/products");

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("products");
    expect(Array.isArray(res.body.products)).toBe(true);
    expect(res.body).toHaveProperty("pagination");
    expect(res.body.pagination).toMatchObject({
      totalProducts: 0,
      page: 1,
      limit: 20,
      totalPages: 0
    });
  });

  it("devuelve productos con busqueda por nombre o descripcion", async () => {
    prisma.products.count.mockResolvedValue(1);
    prisma.products.findMany.mockResolvedValue([mockListProduct]);

    const res = await request(app).get("/products?search=Producto");

    expect(res.status).toBe(200);
    expect(res.body.products).toHaveLength(1);
    expect(res.body.products[0]).toMatchObject({
      price: 25,
      original_price: 25,
      offer_price: null,
      is_offer: false
    });
    expect(res.body.pagination.totalProducts).toBe(1);
  });

  it("permite filtrar productos en oferta con isOffer=true", async () => {
    prisma.products.count.mockResolvedValue(1);
    prisma.products.findMany.mockResolvedValue([
      {
        ...mockListProduct,
        price: 25,
        offer_price: 19.9,
        is_offer: true
      }
    ]);

    const res = await request(app).get("/products?isOffer=true");

    expect(res.status).toBe(200);
    expect(res.body.products).toHaveLength(1);
    expect(res.body.products[0]).toMatchObject({
      price: 19.9,
      original_price: 25,
      offer_price: 19.9,
      is_offer: true
    });
    expect(prisma.products.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          is_offer: true
        })
      })
    );
  });

  it("respeta page y limit en la paginacion", async () => {
    prisma.products.count.mockResolvedValue(100);
    prisma.products.findMany.mockResolvedValue([]);

    const res = await request(app).get("/products?page=3&limit=10");

    expect(res.status).toBe(200);
    expect(res.body.pagination).toMatchObject({
      page: 3,
      limit: 10,
      totalProducts: 100,
      totalPages: 10
    });
  });

  it("usa page=1 y limit=20 cuando los parametros son invalidos", async () => {
    prisma.products.count.mockResolvedValue(0);
    prisma.products.findMany.mockResolvedValue([]);

    const res = await request(app).get("/products?page=-1&limit=0");

    expect(res.status).toBe(200);
    expect(res.body.pagination).toMatchObject({ page: 1, limit: 20 });
  });
});

describe("GET /products/:id", () => {
  beforeEach(() => vi.clearAllMocks());

  it("devuelve 200 con el producto mapeado cuando existe", async () => {
    prisma.products.findFirst.mockResolvedValue(mockDbProduct);

    const res = await request(app).get("/products/1");

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      id: 1,
      name: "Producto Test",
      price: 25,
      originalPrice: 25,
      offerPrice: null,
      isOffer: false,
      status: "active"
    });
    expect(res.body).toHaveProperty("category");
  });

  it("devuelve el precio de oferta como price cuando el producto esta en oferta", async () => {
    prisma.products.findFirst.mockResolvedValue({
      ...mockDbProduct,
      price: 25,
      offer_price: 17.5,
      is_offer: true
    });

    const res = await request(app).get("/products/1");

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      price: 17.5,
      originalPrice: 25,
      offerPrice: 17.5,
      isOffer: true
    });
  });

  it("devuelve status 'pending' cuando el producto tiene visible=false", async () => {
    prisma.products.findFirst.mockResolvedValue({ ...mockDbProduct, visible: false });

    const res = await request(app).get("/products/1");

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("pending");
  });

  it("devuelve 400 cuando el id no es numerico", async () => {
    const res = await request(app).get("/products/abc");

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("ID de producto invalido");
  });

  it("devuelve 400 cuando el id es 0", async () => {
    const res = await request(app).get("/products/0");

    expect(res.status).toBe(400);
  });

  it("devuelve 404 cuando el producto no existe", async () => {
    prisma.products.findFirst.mockResolvedValue(null);

    const res = await request(app).get("/products/9999");

    expect(res.status).toBe(404);
    expect(res.body.message).toBe("Producto no encontrado");
  });
});

describe("POST /products", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prisma.users.findUnique.mockResolvedValue({
      id_user: 1,
      role: "SELLER",
      status: true,
      store: { id_store: 1, status: true }
    });
    prisma.productCategories.findUnique.mockResolvedValue({
      id_product_category: 1,
      status: true
    });
  });

  it("devuelve 401 cuando falta autenticacion", async () => {
    const res = await request(app)
      .post("/products")
      .send({ name: "Test", price: 10, categoryId: 1 });

    expect(res.status).toBe(401);
    expect(JSON.stringify(res.body)).toMatch(/autenticado/i);
  });

  it("devuelve 400 cuando name esta vacio", async () => {
    const res = await request(app)
      .post("/products")
      .set("Cookie", `userToken=${sellerToken}`)
      .send({ name: "", price: 10, categoryId: 1 });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/name/i);
  });

  it("devuelve 400 cuando falta price", async () => {
    const res = await request(app)
      .post("/products")
      .set("Cookie", `userToken=${sellerToken}`)
      .send({ name: "Test", categoryId: 1 });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/price/i);
  });

  it("devuelve 400 cuando price es 0 o negativo", async () => {
    const res = await request(app)
      .post("/products")
      .set("Cookie", `userToken=${sellerToken}`)
      .send({ name: "Test", price: -5, categoryId: 1 });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/price/i);
  });

  it("devuelve 400 cuando falta categoryId", async () => {
    const res = await request(app)
      .post("/products")
      .set("Cookie", `userToken=${sellerToken}`)
      .send({ name: "Test", price: 10 });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/categoryId/i);
  });

  it("devuelve 400 cuando visible tiene valor invalido", async () => {
    const res = await request(app)
      .post("/products")
      .set("Cookie", `userToken=${sellerToken}`)
      .send({ name: "Test", price: 10, categoryId: 1, visible: "invalido" });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/visible/i);
  });

  it("devuelve 400 cuando tags no es un array", async () => {
    const res = await request(app)
      .post("/products")
      .set("Cookie", `userToken=${sellerToken}`)
      .send({ name: "Test", price: 10, categoryId: 1, tags: "no-array" });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/tags/i);
  });

  it("devuelve 201 con el producto creado cuando los datos son validos", async () => {
    prisma.users.findUnique.mockResolvedValue({
      id_user: 1,
      role: "SELLER",
      status: true,
      store: { id_store: 1, status: true }
    });
    prisma.productCategories.findUnique.mockResolvedValue({
      id_product_category: 1,
      status: true
    });
    prisma.$transaction.mockImplementation(async (fn) =>
      fn({
        products: {
          create: vi.fn().mockResolvedValue({ id_product: 1 }),
          findFirst: vi.fn().mockResolvedValue(mockDbProduct)
        },
        productTagRelations: {
          createMany: vi.fn().mockResolvedValue([])
        }
      })
    );

    const res = await request(app)
      .post("/products")
      .set("Cookie", `userToken=${sellerToken}`)
      .send({ name: "Producto Test", price: 25, categoryId: 1 });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("id");
    expect(res.body.name).toBe("Producto Test");
    expect(res.body.status).toBe("active");
    expect(res.body.price).toBe(25);
  });

  it("crea un producto en oferta y devuelve el precio efectivo sin perder el original", async () => {
    prisma.users.findUnique.mockResolvedValue({
      id_user: 1,
      role: "SELLER",
      status: true,
      store: { id_store: 1, status: true }
    });
    prisma.productCategories.findUnique.mockResolvedValue({
      id_product_category: 1,
      status: true
    });
    prisma.$transaction.mockImplementation(async (fn) =>
      fn({
        products: {
          create: vi.fn().mockResolvedValue({ id_product: 1 }),
          findFirst: vi.fn().mockResolvedValue({
            ...mockDbProduct,
            name: "Producto Oferta",
            price: 30,
            offer_price: 22.5,
            is_offer: true
          })
        },
        productTagRelations: {
          createMany: vi.fn().mockResolvedValue([])
        }
      })
    );

    const res = await request(app)
      .post("/products")
      .set("Cookie", `userToken=${sellerToken}`)
      .send({
        name: "Producto Oferta",
        price: 30,
        offerPrice: 22.5,
        isOffer: true,
        categoryId: 1
      });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      name: "Producto Oferta",
      price: 22.5,
      originalPrice: 30,
      offerPrice: 22.5,
      isOffer: true
    });
  });
});
