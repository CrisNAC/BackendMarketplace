import { vi, describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import app from "../../../src/app.js";
import { prisma } from "../../../src/lib/prisma.js";

vi.mock("../../../src/lib/prisma.js", () => ({
  prisma: {
    productTags: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn()
    },
    productTagRelations: {
      deleteMany: vi.fn()
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

const mockTag = {
  id_product_tag: 5,
  name: "Orgánico",
  status: true,
  created_at: now,
  updated_at: now,
  _count: { product_tag_relations: 3 }
};

const mockTagList = [
  {
    id_product_tag: 1,
    name: "Artesanal",
    status: true,
    created_at: now,
    updated_at: now,
    _count: { product_tag_relations: 2 }
  },
  {
    id_product_tag: 2,
    name: "Orgánico",
    status: true,
    created_at: now,
    updated_at: now,
    _count: { product_tag_relations: 5 }
  },
  {
    id_product_tag: 3,
    name: "Vegano",
    status: true,
    created_at: now,
    updated_at: now,
    _count: { product_tag_relations: 0 }
  }
];

// ─── POST /api/admin/tags ─────────────────────────────────────────
describe("POST /api/admin/tags", () => {
  beforeEach(() => vi.resetAllMocks());

  it("devuelve 401 cuando no hay token", async () => {
    const res = await request(app)
      .post("/api/admin/tags")
      .send({ name: "Orgánico" });

    expect(res.status).toBe(401);
  });

  it("devuelve 403 cuando el usuario no es ADMIN", async () => {
    const res = await asRole(
      request(app)
        .post("/api/admin/tags")
        .send({ name: "Orgánico" }),
      "seller"
    );

    expect(res.status).toBe(403);
  });

  it("devuelve 403 cuando el usuario es CUSTOMER", async () => {
    const res = await asRole(
      request(app)
        .post("/api/admin/tags")
        .send({ name: "Orgánico" }),
      "customer"
    );

    expect(res.status).toBe(403);
  });

  it("devuelve 400 cuando name está vacío", async () => {
    const res = await asRole(
      request(app)
        .post("/api/admin/tags")
        .send({ name: "   " }),
      "admin"
    );

    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/no puede estar vacío/i);
  });

  it("devuelve 400 cuando name no se envía", async () => {
    const res = await asRole(
      request(app)
        .post("/api/admin/tags")
        .send({}),
      "admin"
    );

    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/no puede estar vacío/i);
  });

  it("devuelve 400 cuando name supera 20 caracteres", async () => {
    const res = await asRole(
      request(app)
        .post("/api/admin/tags")
        .send({ name: "A".repeat(21) }),
      "admin"
    );

    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/no puede superar/i);
  });

  it("devuelve 400 cuando ya existe una etiqueta activa con el mismo nombre", async () => {
    prisma.productTags.findFirst.mockResolvedValue({ id_product_tag: 10 });

    const res = await asRole(
      request(app)
        .post("/api/admin/tags")
        .send({ name: "orgánico" }),
      "admin"
    );

    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe("Ya existe una etiqueta con ese nombre");
    expect(prisma.productTags.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          name: { equals: "orgánico", mode: "insensitive" },
          status: true
        })
      })
    );
  });

  it("devuelve 409 cuando prisma tira error de constraint único (P2002)", async () => {
    prisma.productTags.findFirst.mockResolvedValue(null);
    prisma.productTags.create.mockRejectedValue({ code: "P2002" });

    const res = await asRole(
      request(app)
        .post("/api/admin/tags")
        .send({ name: "orgánico" }),
      "admin"
    );

    expect(res.status).toBe(409);
    expect(res.body.error.message).toBe("Ya existe una etiqueta con ese nombre");
  });

  it("devuelve 201 y crea etiqueta con status=true", async () => {
    prisma.productTags.findFirst.mockResolvedValue(null);
    prisma.productTags.create.mockResolvedValue({
      id_product_tag: 22,
      name: "Orgánico",
      status: true,
      created_at: now
    });

    const res = await asRole(
      request(app)
        .post("/api/admin/tags")
        .send({ name: "  Orgánico  " }),
      "admin"
    );

    expect(res.status).toBe(201);
    expect(prisma.productTags.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: "Orgánico",
          status: true
        })
      })
    );
    expect(res.body).toEqual({
      id: 22,
      name: "Orgánico",
      status: true,
      createdAt: now
    });
  });

  it("trim del nombre al crear", async () => {
    prisma.productTags.findFirst.mockResolvedValue(null);
    prisma.productTags.create.mockResolvedValue({
      id_product_tag: 23,
      name: "Vegano",
      status: true,
      created_at: now
    });

    await asRole(
      request(app)
        .post("/api/admin/tags")
        .send({ name: "   Vegano   " }),
      "admin"
    );

    expect(prisma.productTags.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ name: "Vegano" })
      })
    );
  });
});

// ─── GET /api/admin/tags ──────────────────────────────────────────
describe("GET /api/admin/tags", () => {
  beforeEach(() => vi.resetAllMocks());

  it("devuelve 401 cuando no hay token", async () => {
    const res = await request(app).get("/api/admin/tags");
    expect(res.status).toBe(401);
  });

  it("devuelve 403 cuando el usuario no es ADMIN", async () => {
    const res = await asRole(
      request(app).get("/api/admin/tags"),
      "seller"
    );
    expect(res.status).toBe(403);
  });

  it("devuelve 403 cuando el usuario es CUSTOMER", async () => {
    const res = await asRole(
      request(app).get("/api/admin/tags"),
      "customer"
    );
    expect(res.status).toBe(403);
  });

  it("devuelve 200 con todas las etiquetas activas", async () => {
    prisma.productTags.findMany.mockResolvedValue(mockTagList);

    const res = await asRole(
      request(app).get("/api/admin/tags"),
      "admin"
    );

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(3);
    expect(res.body[0]).toMatchObject({
      id: 1,
      name: "Artesanal",
      status: true,
      productCount: 2
    });
    expect(res.body[1]).toMatchObject({
      id: 2,
      name: "Orgánico",
      productCount: 5
    });
    expect(res.body[2]).toMatchObject({
      id: 3,
      name: "Vegano",
      productCount: 0
    });
  });

  it("devuelve array vacío cuando no hay etiquetas", async () => {
    prisma.productTags.findMany.mockResolvedValue([]);

    const res = await asRole(
      request(app).get("/api/admin/tags"),
      "admin"
    );

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(0);
  });

  it("solo consulta etiquetas activas (status: true)", async () => {
    prisma.productTags.findMany.mockResolvedValue([]);

    await asRole(
      request(app).get("/api/admin/tags"),
      "admin"
    );

    expect(prisma.productTags.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: true },
        orderBy: { name: "asc" }
      })
    );
  });

  it("incluye _count de product_tag_relations en el select", async () => {
    prisma.productTags.findMany.mockResolvedValue([]);

    await asRole(
      request(app).get("/api/admin/tags"),
      "admin"
    );

    expect(prisma.productTags.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        select: expect.objectContaining({
          _count: { select: { product_tag_relations: true } }
        })
      })
    );
  });
});

// ─── PATCH /api/admin/tags/:id ────────────────────────────────────
describe("PATCH /api/admin/tags/:id", () => {
  beforeEach(() => vi.resetAllMocks());

  it("devuelve 401 cuando no hay token", async () => {
    const res = await request(app)
      .patch("/api/admin/tags/1")
      .send({ name: "Nuevo" });

    expect(res.status).toBe(401);
  });

  it("devuelve 403 cuando el usuario no es ADMIN", async () => {
    const res = await asRole(
      request(app)
        .patch("/api/admin/tags/1")
        .send({ name: "Nuevo" }),
      "seller"
    );

    expect(res.status).toBe(403);
  });

  it("devuelve 400 cuando el id no es un entero válido", async () => {
    const res = await asRole(
      request(app)
        .patch("/api/admin/tags/abc")
        .send({ name: "Nuevo" }),
      "admin"
    );

    expect(res.status).toBe(400);
  });

  it("devuelve 400 cuando el id es 0", async () => {
    const res = await asRole(
      request(app)
        .patch("/api/admin/tags/0")
        .send({ name: "Nuevo" }),
      "admin"
    );

    expect(res.status).toBe(400);
  });

  it("devuelve 400 cuando el id es negativo", async () => {
    const res = await asRole(
      request(app)
        .patch("/api/admin/tags/-1")
        .send({ name: "Nuevo" }),
      "admin"
    );

    expect(res.status).toBe(400);
  });

  it("devuelve 400 cuando name está vacío", async () => {
    const res = await asRole(
      request(app)
        .patch("/api/admin/tags/1")
        .send({ name: "  " }),
      "admin"
    );

    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/no puede estar vacío/i);
  });

  it("devuelve 400 cuando name supera 20 caracteres", async () => {
    const res = await asRole(
      request(app)
        .patch("/api/admin/tags/1")
        .send({ name: "A".repeat(21) }),
      "admin"
    );

    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/no puede superar/i);
  });

  it("devuelve 404 cuando la etiqueta no existe", async () => {
    prisma.productTags.findUnique.mockResolvedValue(null);

    const res = await asRole(
      request(app)
        .patch("/api/admin/tags/999")
        .send({ name: "Nuevo" }),
      "admin"
    );

    expect(res.status).toBe(404);
    expect(res.body.error.message).toBe("Etiqueta no encontrada");
  });

  it("devuelve 404 cuando la etiqueta existe pero está inactiva (status=false)", async () => {
    prisma.productTags.findUnique.mockResolvedValue({
      id_product_tag: 5,
      status: false
    });

    const res = await asRole(
      request(app)
        .patch("/api/admin/tags/5")
        .send({ name: "Nuevo" }),
      "admin"
    );

    expect(res.status).toBe(404);
  });

  it("devuelve 400 cuando ya existe otra etiqueta activa con el mismo nombre", async () => {
    prisma.productTags.findUnique.mockResolvedValue({
      id_product_tag: 5,
      status: true
    });
    prisma.productTags.findFirst.mockResolvedValue({ id_product_tag: 10 });

    const res = await asRole(
      request(app)
        .patch("/api/admin/tags/5")
        .send({ name: "Orgánico" }),
      "admin"
    );

    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe("Ya existe una etiqueta con ese nombre");
    expect(prisma.productTags.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          name: { equals: "Orgánico", mode: "insensitive" },
          status: true,
          id_product_tag: { not: 5 }
        })
      })
    );
  });

  it("devuelve 409 cuando prisma tira error de constraint único (P2002) al actualizar", async () => {
    prisma.productTags.findUnique.mockResolvedValue({
      id_product_tag: 5,
      status: true
    });
    prisma.productTags.findFirst.mockResolvedValue(null);
    prisma.productTags.update.mockRejectedValue({ code: "P2002" });

    const res = await asRole(
      request(app)
        .patch("/api/admin/tags/5")
        .send({ name: "Orgánico" }),
      "admin"
    );

    expect(res.status).toBe(409);
    expect(res.body.error.message).toBe("Ya existe una etiqueta con ese nombre");
  });

  it("devuelve 200 y actualiza el nombre correctamente", async () => {
    prisma.productTags.findUnique.mockResolvedValue({
      id_product_tag: 5,
      status: true
    });
    prisma.productTags.findFirst.mockResolvedValue(null);
    prisma.productTags.update.mockResolvedValue({
      id_product_tag: 5,
      name: "Vegano",
      status: true,
      created_at: now,
      updated_at: now
    });

    const res = await asRole(
      request(app)
        .patch("/api/admin/tags/5")
        .send({ name: "  Vegano  " }),
      "admin"
    );

    expect(res.status).toBe(200);
    expect(prisma.productTags.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id_product_tag: 5 },
        data: { name: "Vegano" }
      })
    );
    expect(res.body).toEqual({
      id: 5,
      name: "Vegano",
      status: true,
      createdAt: now,
      updatedAt: now
    });
  });
});

// ─── DELETE /api/admin/tags/:id ───────────────────────────────────
describe("DELETE /api/admin/tags/:id", () => {
  beforeEach(() => vi.resetAllMocks());

  it("devuelve 401 cuando no hay token", async () => {
    const res = await request(app).delete("/api/admin/tags/1");
    expect(res.status).toBe(401);
  });

  it("devuelve 403 cuando el usuario no es ADMIN", async () => {
    const res = await asRole(
      request(app).delete("/api/admin/tags/1"),
      "seller"
    );
    expect(res.status).toBe(403);
  });

  it("devuelve 403 cuando el usuario es CUSTOMER", async () => {
    const res = await asRole(
      request(app).delete("/api/admin/tags/1"),
      "customer"
    );
    expect(res.status).toBe(403);
  });

  it("devuelve 400 cuando el id no es un entero válido", async () => {
    const res = await asRole(
      request(app).delete("/api/admin/tags/abc"),
      "admin"
    );
    expect(res.status).toBe(400);
  });

  it("devuelve 404 cuando la etiqueta no existe", async () => {
    prisma.productTags.findUnique.mockResolvedValue(null);

    const res = await asRole(
      request(app).delete("/api/admin/tags/999"),
      "admin"
    );

    expect(res.status).toBe(404);
    expect(res.body.error.message).toBe("Etiqueta no encontrada");
  });

  it("devuelve 404 cuando la etiqueta existe pero está inactiva", async () => {
    prisma.productTags.findUnique.mockResolvedValue({
      id_product_tag: 5,
      status: false
    });

    const res = await asRole(
      request(app).delete("/api/admin/tags/5"),
      "admin"
    );

    expect(res.status).toBe(404);
  });

  it("devuelve 204 cuando la etiqueta se elimina correctamente", async () => {
    prisma.productTags.findUnique.mockResolvedValue({
      id_product_tag: 5,
      status: true
    });
    prisma.$transaction.mockResolvedValue([]);

    const res = await asRole(
      request(app).delete("/api/admin/tags/5"),
      "admin"
    );

    expect(res.status).toBe(204);
  });

  it("ejecuta la transacción para eliminar relaciones y desactivar la etiqueta", async () => {
    prisma.productTags.findUnique.mockResolvedValue({
      id_product_tag: 5,
      status: true
    });
    prisma.$transaction.mockImplementation(async (ops) => ops);

    await asRole(
      request(app).delete("/api/admin/tags/5"),
      "admin"
    );

    expect(prisma.$transaction).toHaveBeenCalled();
  });

  it("desasocia todas las relaciones producto-tag antes de desactivar", async () => {
    prisma.productTags.findUnique.mockResolvedValue({
      id_product_tag: 5,
      status: true
    });
    prisma.$transaction.mockResolvedValue([]);

    await asRole(
      request(app).delete("/api/admin/tags/5"),
      "admin"
    );

    expect(prisma.productTagRelations.deleteMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { fk_product_tag: 5 }
      })
    );
  });

  it("pone status en false al eliminar", async () => {
    prisma.productTags.findUnique.mockResolvedValue({
      id_product_tag: 5,
      status: true
    });
    prisma.$transaction.mockResolvedValue([]);

    await asRole(
      request(app).delete("/api/admin/tags/5"),
      "admin"
    );

    expect(prisma.productTags.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id_product_tag: 5 },
        data: expect.objectContaining({
          status: false
        })
      })
    );
  });
});
