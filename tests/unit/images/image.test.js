// tests/unit/images/image.test.js
import { vi, describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import app from "../../../src/app.js";
import { prisma } from "../../../src/lib/prisma.js";

// ─── MOCKS ────────────────────────────────────────────────────────
vi.mock("../../../src/lib/prisma.js", () => ({
  prisma: {
    products: { findUnique: vi.fn(), update: vi.fn() },
    stores: { findUnique: vi.fn(), update: vi.fn() },
    users: { findUnique: vi.fn(), update: vi.fn() },
  }
}));

vi.mock("../../../src/modules/images/services/image.service.js", () => ({
  uploadImage: vi.fn(),
  deleteImage: vi.fn(),
  extractFilePath: vi.fn(),
}));

// Mock del middleware authenticate — simula req.user según el tipo de usuario
vi.mock("../../../src/config/jwt.config.js", () => ({
  default: (req, res, next) => {
    const authHeader = req.headers["x-test-role"]

    if (!authHeader) {
      return res.status(401).json({ errors: { auth: { message: "No autenticado" } } })
    }

    const users = {
      admin: { id_user: 1, role: "ADMIN" },
      seller: { id_user: 10, role: "SELLER" },
      customer: { id_user: 1,  role: "CUSTOMER" },
      other: { id_user: 99, role: "CUSTOMER" },
    }

    req.user = users[authHeader] ?? null

    if (!req.user) {
      return res.status(401).json({ errors: { auth: { message: "No autenticado" } } })
    }

    next()
  }
}));

import { uploadImage, deleteImage, extractFilePath } from
  "../../../src/modules/images/services/image.service.js";

// ─── HELPERS ──────────────────────────────────────────────────────
const IMAGE_URL = "https://example.supabase.co/storage/v1/object/public/product-images/1/image.jpg";
const AVATAR_URL = "https://example.supabase.co/storage/v1/object/public/user-avatars/1/avatar.jpg";
const LOGO_URL = "https://example.supabase.co/storage/v1/object/public/store-logos/1/logo.jpg";

const mockProduct = { id_product: 1, image_url: null, store: { fk_user: 10 } };
const mockStore = { id_store: 1, logo: null, fk_user: 10 };
const mockUser = { id_user: 1, avatar_url: null };

const fakeFile = Buffer.from("fake-image-data");

// Helper — setea el header que nuestro mock de authenticate lee
const asRole = (req, role) => req.set("x-test-role", role)

// ─── PRODUCT IMAGE ────────────────────────────────────────────────
describe("Product Image endpoints", () => {
  beforeEach(() => vi.resetAllMocks());

  // ── GET ──────────────────────────────────────────────────────────
  describe("GET /products/:id/image", () => {
    it("devuelve 200 con image_url null cuando el producto no tiene imagen", async () => {
      prisma.products.findUnique.mockResolvedValue(mockProduct);

      const res = await request(app).get("/products/1/image");

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("image_url", null);
    });

    it("devuelve 200 con la URL cuando el producto tiene imagen", async () => {
      prisma.products.findUnique.mockResolvedValue({ ...mockProduct, image_url: IMAGE_URL });

      const res = await request(app).get("/products/1/image");

      expect(res.status).toBe(200);
      expect(res.body.image_url).toBe(IMAGE_URL);
    });

    it("devuelve 404 cuando el producto no existe", async () => {
      prisma.products.findUnique.mockResolvedValue(null);

      const res = await request(app).get("/products/999/image");

      expect(res.status).toBe(404);
    });

    it("es un endpoint público — no requiere autenticación", async () => {
      prisma.products.findUnique.mockResolvedValue(mockProduct);

      const res = await request(app).get("/products/1/image");

      expect(res.status).not.toBe(401);
    });
  });

  // ── POST ─────────────────────────────────────────────────────────
  describe("POST /products/:id/image", () => {
    it("devuelve 401 cuando no hay token", async () => {
      const res = await request(app).post("/products/1/image").attach("image", fakeFile, "test.jpg")

      expect(res.status).toBe(401);
    });

    it("devuelve 404 cuando el producto no existe", async () => {
      prisma.products.findUnique.mockResolvedValue(null);

      const res = await asRole(
        request(app).post("/products/1/image").attach("image", fakeFile, "test.jpg"),
        "seller"
      )


      expect(res.status).toBe(404);
    });

    it("devuelve 400 cuando no se adjunta archivo", async () => {
      prisma.products.findUnique.mockResolvedValue(mockProduct);

      const res = await asRole(
        request(app).post("/products/1/image"),
        "seller"
      )

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/archivo/i);
    });

    it("devuelve 201 y la URL cuando la subida es exitosa", async () => {
      prisma.products.findUnique.mockResolvedValue({ ...mockProduct, store: { fk_user: 10 } });
      uploadImage.mockResolvedValue(IMAGE_URL);
      prisma.products.update.mockResolvedValue({ ...mockProduct, image_url: IMAGE_URL });

      const res = await asRole(
        request(app).post("/products/1/image").attach("image", fakeFile, "test.jpg"),
        "seller"
      )

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("image_url", IMAGE_URL);
    });

    it("devuelve 403 cuando un SELLER intenta subir imagen de un producto ajeno", async () => {
      prisma.products.findUnique.mockResolvedValue({ ...mockProduct, store: { fk_user: 99 } });

      const res = await asRole(
        request(app).post("/products/1/image").attach("image", fakeFile, "test.jpg"),
        "seller"
      )

      expect(res.status).toBe(403);
    });
  });

  // ── PUT ──────────────────────────────────────────────────────────
  describe("PUT /products/:id/image", () => {
    it("devuelve 401 cuando no hay token", async () => {
      const res = await request(app).put("/products/1/image").attach("image", fakeFile, "test.jpg")

      expect(res.status).toBe(401);
    });

    it("reemplaza la imagen y devuelve 200 con la nueva URL", async () => {
      const oldUrl = "https://example.supabase.co/old.jpg";
      prisma.products.findUnique.mockResolvedValue({ ...mockProduct, image_url: oldUrl, store: { fk_user: 10 } });
      extractFilePath.mockReturnValue("1/old.jpg");
      uploadImage.mockResolvedValue(IMAGE_URL);
      prisma.products.update.mockResolvedValue({ ...mockProduct, image_url: IMAGE_URL });
      deleteImage.mockResolvedValue();

      const res = await asRole(
        request(app).put("/products/1/image").attach("image", fakeFile, "test.jpg"),
        "seller"
      )

      expect(res.status).toBe(200);
      expect(res.body.image_url).toBe(IMAGE_URL);
    });
  });

  // ── DELETE ───────────────────────────────────────────────────────
  describe("DELETE /products/:id/image", () => {
    it("devuelve 401 cuando no hay token", async () => {
      const res = await request(app).delete("/products/1/image");
      expect(res.status).toBe(401);
    });

    it("devuelve 404 cuando el producto no tiene imagen", async () => {
      prisma.products.findUnique.mockResolvedValue({ ...mockProduct, store: { fk_user: 10 } });

      const res = await asRole(
        request(app).delete("/products/1/image"),
        "seller"
      )

      expect(res.status).toBe(404);
    });

    it("devuelve 200 cuando la imagen se elimina correctamente", async () => {
      prisma.products.findUnique.mockResolvedValue({ ...mockProduct, image_url: IMAGE_URL, store: { fk_user: 10 } });
      extractFilePath.mockReturnValue("1/image.jpg");
      prisma.products.update.mockResolvedValue({ ...mockProduct, image_url: null });
      deleteImage.mockResolvedValue();

      const res = await asRole(
        request(app).delete("/products/1/image"),
        "seller"
      )

      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/eliminada/i);
    });

    it("ADMIN puede eliminar imagen de cualquier producto", async () => {
      prisma.products.findUnique.mockResolvedValue({ ...mockProduct, image_url: IMAGE_URL, store: { fk_user: 99 } });
      extractFilePath.mockReturnValue("1/image.jpg");
      prisma.products.update.mockResolvedValue({ ...mockProduct, image_url: null });
      deleteImage.mockResolvedValue();

      const res = await asRole(
        request(app).delete("/products/1/image"),
        "admin"
      )

      expect(res.status).toBe(200);
    });
  });
});

// ─── STORE IMAGE ──────────────────────────────────────────────────
describe("Store Image endpoints", () => {
  beforeEach(() => vi.resetAllMocks());

  describe("GET /stores/:id/image", () => {
    it("devuelve 200 con logo null cuando el comercio no tiene logo", async () => {
      prisma.stores.findUnique.mockResolvedValue(mockStore);

      const res = await request(app).get("/stores/1/image");

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("logo", null);
    });

    it("devuelve 200 con la URL cuando el comercio tiene logo", async () => {
      prisma.stores.findUnique.mockResolvedValue({ ...mockStore, logo: LOGO_URL });

      const res = await request(app).get("/stores/1/image");

      expect(res.status).toBe(200);
      expect(res.body.logo).toBe(LOGO_URL);
    });

    it("devuelve 404 cuando el comercio no existe", async () => {
      prisma.stores.findUnique.mockResolvedValue(null);

      const res = await request(app).get("/stores/999/image");

      expect(res.status).toBe(404);
    });
  });

  describe("POST /stores/:id/image", () => {
    it("devuelve 401 cuando no hay token", async () => {
      const res = await request(app)
        .post("/stores/1/image")
        .attach("image", fakeFile, "logo.jpg");

      expect(res.status).toBe(401);
    });

    it("devuelve 201 y la URL del logo cuando la subida es exitosa", async () => {
      prisma.stores.findUnique.mockResolvedValue({ ...mockStore, fk_user: 10 });
      uploadImage.mockResolvedValue(LOGO_URL);
      prisma.stores.update.mockResolvedValue({ ...mockStore, logo: LOGO_URL });

      const res = await asRole(
        request(app).post("/stores/1/image").attach("image", fakeFile, "logo.jpg"),
        "seller"
      )

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("logo", LOGO_URL);
    });

    it("devuelve 403 cuando un SELLER intenta modificar un comercio ajeno", async () => {
      prisma.stores.findUnique.mockResolvedValue({ ...mockStore, fk_user: 99 });

      const res = await asRole(
        request(app).post("/stores/1/image").attach("image", fakeFile, "logo.jpg"),
        "seller"
      )

      expect(res.status).toBe(403);
    });
  });

  describe("DELETE /stores/:id/image", () => {
    it("devuelve 404 cuando el comercio no tiene logo", async () => {
      prisma.stores.findUnique.mockResolvedValue({ ...mockStore, fk_user: 10 });

      const res = await asRole(
        request(app).delete("/stores/1/image"),
        "seller"
      )

      expect(res.status).toBe(404);
    });

    it("devuelve 200 cuando el logo se elimina correctamente", async () => {
      prisma.stores.findUnique.mockResolvedValue({ ...mockStore, logo: LOGO_URL, fk_user: 10 });
      extractFilePath.mockReturnValue("1/logo.jpg");
      prisma.stores.update.mockResolvedValue({ ...mockStore, logo: null });
      deleteImage.mockResolvedValue();

      const res = await asRole(
        request(app).delete("/stores/1/image"),
        "seller"
      )

      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/eliminado/i);
    });
  });
});

// ─── USER IMAGE ───────────────────────────────────────────────────
describe("User Image endpoints", () => {
  beforeEach(() => vi.resetAllMocks());

  describe("GET /users/:id/image", () => {
    it("devuelve 200 con avatar_url null cuando el usuario no tiene avatar", async () => {
      prisma.users.findUnique.mockResolvedValue(mockUser);

      const res = await request(app).get("/users/1/image");

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("avatar_url", null);
    });

    it("devuelve 200 con la URL cuando el usuario tiene avatar", async () => {
      prisma.users.findUnique.mockResolvedValue({ ...mockUser, avatar_url: AVATAR_URL });

      const res = await request(app).get("/users/1/image");

      expect(res.status).toBe(200);
      expect(res.body.avatar_url).toBe(AVATAR_URL);
    });

    it("devuelve 404 cuando el usuario no existe", async () => {
      prisma.users.findUnique.mockResolvedValue(null);

      const res = await request(app).get("/users/999/image");

      expect(res.status).toBe(404);
    });
  });

  describe("POST /users/:id/image", () => {
    it("devuelve 401 cuando no hay token", async () => {
      const res = await request(app)
        .post("/users/1/image")
        .attach("image", fakeFile, "avatar.jpg");

      expect(res.status).toBe(401);
    });

    it("devuelve 400 cuando no se adjunta archivo", async () => {
      const res = await asRole(
        request(app).post("/users/1/image"),
        "customer"
      )

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/archivo/i);
    });

    it("devuelve 201 y la URL cuando la subida es exitosa", async () => {
      prisma.users.findUnique.mockResolvedValue({ ...mockUser, id_user: 1 });
      uploadImage.mockResolvedValue(AVATAR_URL);
      prisma.users.update.mockResolvedValue({ ...mockUser, avatar_url: AVATAR_URL });

      const res = await asRole(
        request(app).post("/users/1/image").attach("image", fakeFile, "avatar.jpg"),
        "customer"
      )

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("avatar_url", AVATAR_URL);
    });

    it("devuelve 403 cuando un usuario intenta modificar el avatar de otro", async () => {
      prisma.users.findUnique.mockResolvedValue({ ...mockUser, id_user: 99 });

      const res = await asRole(
        request(app).post("/users/1/image").attach("image", fakeFile, "avatar.jpg"),
        "other"
      )

      expect(res.status).toBe(403);
    });

    it("ADMIN puede modificar el avatar de cualquier usuario", async () => {
      prisma.users.findUnique.mockResolvedValue({ ...mockUser, id_user: 99 });
      uploadImage.mockResolvedValue(AVATAR_URL);
      prisma.users.update.mockResolvedValue({ ...mockUser, avatar_url: AVATAR_URL });

      const res = await asRole(
        request(app).post("/users/99/image").attach("image", fakeFile, "avatar.jpg"),
        "admin"
      )

      expect(res.status).toBe(201);
    });
  });

  describe("DELETE /users/:id/image", () => {
    it("devuelve 401 cuando no hay token", async () => {
      const res = await request(app).delete("/users/1/image");
      expect(res.status).toBe(401);
    });

    it("devuelve 404 cuando el usuario no tiene avatar", async () => {
      prisma.users.findUnique.mockResolvedValue({ ...mockUser, id_user: 1 });

      const res = await asRole(
        request(app).delete("/users/1/image"),
        "customer"
      )

      expect(res.status).toBe(404);
    });

    it("devuelve 200 cuando el avatar se elimina correctamente", async () => {
      prisma.users.findUnique.mockResolvedValue({ ...mockUser, avatar_url: AVATAR_URL, id_user: 1 });
      extractFilePath.mockReturnValue("1/avatar.jpg");
      prisma.users.update.mockResolvedValue({ ...mockUser, avatar_url: null });
      deleteImage.mockResolvedValue();

      const res = await asRole(
        request(app).delete("/users/1/image"),
        "customer"
      )

      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/eliminado/i);
    });
  });
});
