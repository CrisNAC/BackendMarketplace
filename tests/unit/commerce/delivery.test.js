import { vi, describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import app from "../../../src/app.js";
import { prisma } from "../../../src/lib/prisma.js";

vi.mock("../../../src/lib/prisma.js", () => ({
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
            update: vi.fn(),
        }
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

const authCookie = "userToken=mock-token";

describe("Delivery Endpoints", () => {
    beforeEach(() => vi.clearAllMocks());

    describe("GET /api/deliveries/search", () => {
        it("returns all available candidates when no query provided", async () => {
            const mockAll = [
                { id_user: 2, name: "Ana", email: "ana@test.com", phone: "111" },
                { id_user: 3, name: "Ben", email: "ben@test.com", phone: "222" }
            ];
            prisma.users.findMany.mockResolvedValue(mockAll);

            const res = await request(app)
                .get("/api/deliveries/search")
                .set("Cookie", authCookie);

            expect(res.status).toBe(200);
            expect(res.body).toEqual(mockAll);
            expect(prisma.users.findMany).toHaveBeenCalledTimes(1);
            const callArg = prisma.users.findMany.mock.calls[0][0];
            expect(callArg.where).toMatchObject({
                role: "DELIVERY",
                status: true
            });
            expect(callArg.where.OR).toEqual(
                expect.arrayContaining([
                    { delivery: null },
                    { delivery: { fk_store: null } }
                ])
            );
        });

        it("returns candidates correctly", async () => {
            const mockCandidates = [
                { id_user: 2, name: "Delivery 1", email: "del@test.com", phone: "123" }
            ];
            prisma.users.findMany.mockResolvedValue(mockCandidates);

            const res = await request(app)
                .get("/api/deliveries/search?q=del")
                .set("Cookie", authCookie);

            expect(res.status).toBe(200);
            expect(res.body).toEqual(mockCandidates);
            expect(prisma.users.findMany).toHaveBeenCalledTimes(1);
        });
    });

    describe("POST /api/stores/:id/deliveries", () => {
        it("returns 400 if fk_user is missing", async () => {
            const res = await request(app)
                .post("/api/stores/1/deliveries")
                .set("Cookie", authCookie)
                .send({});
            
            expect(res.status).toBe(400);
            expect(res.body.message).toMatch(/fk_user es requerido/);
        });

        it("returns 403 if store not owned by user", async () => {
            prisma.stores.findUnique.mockResolvedValue({
                id_store: 1,
                fk_user: 99, // User 1 is trying to access store owned by user 99
                status: true,
                user: { id_user: 99, status: true }
            });

            const res = await request(app)
                .post("/api/stores/1/deliveries")
                .set("Cookie", authCookie)
                .send({ fk_user: 2 });
            
            expect(res.status).toBe(403);
            expect(res.body.message).toMatch(/permisos/i);
        });

        it("returns 404 if delivery candidate not found", async () => {
            prisma.stores.findUnique.mockResolvedValue({
                id_store: 1,
                fk_user: 1, 
                status: true,
                user: { id_user: 1, status: true }
            });
            prisma.users.findFirst.mockResolvedValue(null);

            const res = await request(app)
                .post("/api/stores/1/deliveries")
                .set("Cookie", authCookie)
                .send({ fk_user: 2 });
            
            expect(res.status).toBe(404);
            expect(res.body.message).toMatch(/Candidato a delivery no encontrado o no válido/i);
        });

        it("returns 409 if delivery already linked", async () => {
            prisma.stores.findUnique.mockResolvedValue({
                id_store: 1,
                fk_user: 1, 
                status: true,
                user: { id_user: 1, status: true }
            });
            prisma.users.findFirst.mockResolvedValue({ id_user: 2, role: "DELIVERY", status: true });
            prisma.deliveries.findUnique.mockResolvedValue({ fk_store: 1, fk_user: 2 });

            const res = await request(app)
                .post("/api/stores/1/deliveries")
                .set("Cookie", authCookie)
                .send({ fk_user: 2 });
            
            expect(res.status).toBe(409);
            expect(res.body.message).toMatch(/ya está vinculado/i);
            expect(prisma.deliveries.create).not.toHaveBeenCalled();
        });

        it("returns 201 on success", async () => {
            prisma.stores.findUnique.mockResolvedValue({
                id_store: 1,
                fk_user: 1, 
                status: true,
                user: { id_user: 1, status: true }
            });
            prisma.users.findFirst.mockResolvedValue({ id_user: 2, role: "DELIVERY", status: true });
            prisma.deliveries.findUnique.mockResolvedValue(null);
            
            const mockDelivery = { id_delivery: 10, fk_store: 1, fk_user: 2, delivery_status: "INACTIVE" };
            prisma.deliveries.create.mockResolvedValue(mockDelivery);

            const res = await request(app)
                .post("/api/stores/1/deliveries")
                .set("Cookie", authCookie)
                .send({ fk_user: 2 });
            
            expect(res.status).toBe(201);
            expect(res.body).toEqual(mockDelivery);
        });

        it("returns 201 updating row when delivery exists without store", async () => {
            prisma.stores.findUnique.mockResolvedValue({
                id_store: 1,
                fk_user: 1,
                status: true,
                user: { id_user: 1, status: true }
            });
            prisma.users.findFirst.mockResolvedValue({ id_user: 2, role: "DELIVERY", status: true });
            prisma.deliveries.findUnique.mockResolvedValue({
                id_delivery: 10,
                fk_user: 2,
                fk_store: null,
                delivery_status: "ACTIVE"
            });
            const updated = { id_delivery: 10, fk_store: 1, fk_user: 2, delivery_status: "ACTIVE" };
            prisma.deliveries.update.mockResolvedValue(updated);

            const res = await request(app)
                .post("/api/stores/1/deliveries")
                .set("Cookie", authCookie)
                .send({ fk_user: 2 });

            expect(res.status).toBe(201);
            expect(res.body).toEqual(updated);
            expect(prisma.deliveries.update).toHaveBeenCalledTimes(1);
            expect(prisma.deliveries.create).not.toHaveBeenCalled();
        });
    });
});
