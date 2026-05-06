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
        },
        deliveryReviews: {
            findMany: vi.fn(),
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
        it("returns empty array if no query provided", async () => {
            const res = await request(app)
                .get("/api/deliveries/search")
                .set("Cookie", authCookie);
            expect(res.status).toBe(200);
            expect(res.body).toEqual([]);
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
            
            const prismaError = new Error("Unique constraint failed");
            prismaError.code = "P2002";
            prisma.deliveries.create.mockRejectedValue(prismaError);
            prisma.deliveries.findUnique.mockResolvedValue({ fk_store: 1, fk_user: 2 });

            const res = await request(app)
                .post("/api/stores/1/deliveries")
                .set("Cookie", authCookie)
                .send({ fk_user: 2 });
            
            expect(res.status).toBe(409);
            expect(res.body.message).toMatch(/ya está vinculado/i);
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
    });

    describe("GET /api/stores/:storeId/deliveries/:deliveryId/reviews", () => {
        it("returns 400 when search is not numeric", async () => {
            prisma.stores.findUnique.mockResolvedValue({
                id_store: 1,
                fk_user: 1,
                status: true,
                user: { id_user: 1, status: true }
            });
            prisma.deliveries.findUnique.mockResolvedValue({ id_delivery: 2, fk_store: 1 });

            const res = await request(app)
                .get("/api/stores/1/deliveries/2/reviews?search=abc")
                .set("Cookie", authCookie);

            expect(res.status).toBe(400);
            expect(res.body.message).toMatch(/ID de pedido/i);
        });

        it("returns 400 when rating range is invalid", async () => {
            prisma.stores.findUnique.mockResolvedValue({
                id_store: 1,
                fk_user: 1,
                status: true,
                user: { id_user: 1, status: true }
            });
            prisma.deliveries.findUnique.mockResolvedValue({ id_delivery: 2, fk_store: 1 });

            const res = await request(app)
                .get("/api/stores/1/deliveries/2/reviews?minRating=6")
                .set("Cookie", authCookie);

            expect(res.status).toBe(400);
            expect(res.body.message).toMatch(/minRating/i);
        });

        it("returns 404 when delivery is not linked to the store", async () => {
            prisma.stores.findUnique.mockResolvedValue({
                id_store: 1,
                fk_user: 1,
                status: true,
                user: { id_user: 1, status: true }
            });
            prisma.deliveries.findUnique.mockResolvedValue(null);

            const res = await request(app)
                .get("/api/stores/1/deliveries/2/reviews")
                .set("Cookie", authCookie);

            expect(res.status).toBe(404);
            expect(res.body.message).toMatch(/delivery no encontrado/i);
        });

        it("returns 200 with reviews", async () => {
            prisma.stores.findUnique.mockResolvedValue({
                id_store: 1,
                fk_user: 1,
                status: true,
                user: { id_user: 1, status: true }
            });
            prisma.deliveries.findUnique.mockResolvedValue({ id_delivery: 2, fk_store: 1 });
            prisma.deliveryReviews.findMany.mockResolvedValue([
                {
                    id_delivery_review: 5,
                    fk_order: 120,
                    rating: 5,
                    comment: "Entrega rápida",
                    created_at: new Date("2026-04-28T00:00:00.000Z"),
                    user: { name: "Juan" }
                }
            ]);

            const res = await request(app)
                .get("/api/stores/1/deliveries/2/reviews?minRating=4&maxRating=5")
                .set("Cookie", authCookie);

            expect(res.status).toBe(200);
            expect(res.body.total).toBe(1);
            expect(res.body.reviews[0]).toMatchObject({
                orderId: 120,
                customerName: "Juan",
                rating: 5
            });
        });
    });
});
