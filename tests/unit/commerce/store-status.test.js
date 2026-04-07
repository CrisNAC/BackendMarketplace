import { vi, describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import app from "../../../src/app.js";
import { prisma } from "../../../src/lib/prisma.js";

vi.mock("../../../src/lib/prisma.js", () => ({
    prisma: {
        stores: {
            findUnique: vi.fn(),
            findFirst: vi.fn(),
            update: vi.fn(),
        },
        products: {
            updateMany: vi.fn(),
        },
        $transaction: vi.fn(),
    }
}));

vi.mock("jsonwebtoken", async () => {
    const actual = await vi.importActual("jsonwebtoken");
    return {
        default: {
            ...actual.default,
            verify: vi.fn((token, secret, callback) => {
                callback(null, { id_user: 1, email: "test@test.com", role: "SELLER" });
            }),
        }
    };
});

// ─── Datos de prueba ──────────────────────────────────────────────────────────
const mockActiveStore = {
    id_store: 1,
    fk_user: 1,
    name: "Comercio Test",
    store_status: "ACTIVE",
    status: true,
    logo: null,
    user: { id_user: 1, status: true },
};

const mockInactiveStore = {
    ...mockActiveStore,
    store_status: "INACTIVE",
};

const authCookie = "userToken=mock-token";

// ─── Tests: GET /api/commerces/:id (ruta pública) ────────────────────────────
describe("GET /api/commerces/:id — ruta pública", () => {
    beforeEach(() => vi.clearAllMocks());

    it("devuelve 404 cuando el comercio está INACTIVE", async () => {
        prisma.stores.findUnique.mockResolvedValue({
            ...mockInactiveStore,
            user: { id_user: 1, name: "Test", email: "test@test.com" },
            store_category: { id_store_category: 1, name: "Tecnología" },
            products: [],
            addresses: [],
        });

        const res = await request(app).get("/api/commerces/1");

        expect(res.status).toBe(404);
        expect(res.body.message).toMatch(/comercio no disponible/i);
    });

    it("devuelve 200 cuando el comercio está ACTIVE", async () => {
        prisma.stores.findUnique.mockResolvedValue({
            ...mockActiveStore,
            user: { id_user: 1, name: "Test", email: "test@test.com" },
            store_category: { id_store_category: 1, name: "Tecnología" },
            products: [],
            addresses: [],
        });

        const res = await request(app).get("/api/commerces/1");

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty("id_store", 1);
    });

    it("devuelve 404 cuando el comercio no existe", async () => {
        prisma.stores.findUnique.mockResolvedValue(null);

        const res = await request(app).get("/api/commerces/999");

        expect(res.status).toBe(404);
        expect(res.body.message).toMatch(/comercio no encontrado/i);
    });
});

// ─── Tests: GET /api/commerces/my/:id (ruta autenticada SELLER) ──────────────
describe("GET /api/commerces/my/:id — ruta autenticada", () => {
    beforeEach(() => vi.clearAllMocks());

    it("devuelve 200 cuando el comercio está INACTIVE para el SELLER dueño", async () => {
        prisma.stores.findUnique.mockResolvedValue({
            ...mockInactiveStore,
            user: { id_user: 1, name: "Test", email: "test@test.com" },
            store_category: { id_store_category: 1, name: "Tecnología" },
            products: [],
            addresses: [],
        });

        const res = await request(app)
            .get("/api/commerces/my/1")
            .set("Cookie", authCookie);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty("store_status", "INACTIVE");
    });

    it("devuelve 403 cuando el SELLER no es dueño del comercio", async () => {
        prisma.stores.findUnique.mockResolvedValue({
            ...mockActiveStore,
            fk_user: 99,
            user: { id_user: 99, name: "Otro", email: "otro@test.com" },
            store_category: { id_store_category: 1, name: "Tecnología" },
            products: [],
            addresses: [],
        });

        const res = await request(app)
            .get("/api/commerces/my/1")
            .set("Cookie", authCookie);

        expect(res.status).toBe(403);
        expect(res.body.message).toMatch(/permisos/i);
    });

    it("devuelve 401 cuando no hay cookie de autenticación", async () => {
        const res = await request(app).get("/api/commerces/my/1");

        expect(res.status).toBe(401);
    });
});

// ─── Tests: PATCH /api/commerces/:id/status ──────────────────────────────────
describe("PATCH /api/commerces/:id/status", () => {
    beforeEach(() => vi.clearAllMocks());

    it("devuelve 400 cuando store_status no se envía", async () => {
        const res = await request(app)
            .patch("/api/commerces/1/status")
            .set("Cookie", authCookie)
            .send({});

        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/store_status es requerido/i);
    });

    it("devuelve 400 cuando store_status tiene un valor inválido", async () => {
        prisma.stores.findUnique.mockResolvedValue(mockActiveStore);

        const res = await request(app)
            .patch("/api/commerces/1/status")
            .set("Cookie", authCookie)
            .send({ store_status: "SUSPENDIDO" });

        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/ACTIVE o INACTIVE/i);
    });

    it("devuelve 200 y mensaje correcto al deshabilitar el comercio", async () => {
        prisma.stores.findUnique
            .mockResolvedValueOnce(mockActiveStore)
            .mockResolvedValueOnce({
                id_store: 1,
                name: "Comercio Test",
                store_status: "INACTIVE",
                status: true,
            });
        prisma.$transaction.mockResolvedValue([{}, {}]);

        const res = await request(app)
            .patch("/api/commerces/1/status")
            .set("Cookie", authCookie)
            .send({ store_status: "INACTIVE" });

        expect(res.status).toBe(200);
        expect(res.body.message).toMatch(/deshabilitado/i);
        expect(res.body.success).toBe(true);
    });

    it("devuelve 200 y mensaje correcto al habilitar el comercio", async () => {
        prisma.stores.findUnique
            .mockResolvedValueOnce(mockInactiveStore)
            .mockResolvedValueOnce({
                id_store: 1,
                name: "Comercio Test",
                store_status: "ACTIVE",
                status: true,
            });
        prisma.$transaction.mockResolvedValue([{}, {}]);

        const res = await request(app)
            .patch("/api/commerces/1/status")
            .set("Cookie", authCookie)
            .send({ store_status: "ACTIVE" });

        expect(res.status).toBe(200);
        expect(res.body.message).toMatch(/habilitado/i);
    });

    it("devuelve 401 cuando no hay cookie de autenticación", async () => {
        const res = await request(app)
            .patch("/api/commerces/1/status")
            .send({ store_status: "INACTIVE" });

        expect(res.status).toBe(401);
    });

    it("devuelve 404 cuando el comercio no existe", async () => {
        prisma.stores.findUnique.mockResolvedValue(null);

        const res = await request(app)
            .patch("/api/commerces/1/status")
            .set("Cookie", authCookie)
            .send({ store_status: "INACTIVE" });

        expect(res.status).toBe(404);
    });
});