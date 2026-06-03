import { vi, describe, it, expect, beforeEach } from "vitest";

vi.mock("../../src/lib/prisma.js", () => ({
    prisma: {
        users: { findUnique: vi.fn() },
        products: {
            findUnique: vi.fn(),
            findFirst: vi.fn(),
            findMany: vi.fn(),
            update: vi.fn(),
            count: vi.fn()
        },
        carts: { findFirst: vi.fn(), upsert: vi.fn(), update: vi.fn(), findUnique: vi.fn(), findMany: vi.fn() },
        cartItems: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), findMany: vi.fn() },
        orders: { create: vi.fn(), findUnique: vi.fn(), count: vi.fn().mockResolvedValue(0) },
        orderItems: { createMany: vi.fn(), findMany: vi.fn() },
        notifications: { create: vi.fn() },
        $transaction: vi.fn()
    }
}));

vi.mock("jsonwebtoken", async () => {
    const actual = await vi.importActual("jsonwebtoken");
    return {
        default: {
            ...actual.default,
            verify: vi.fn((token, secret, callback) => {
                if (token === "seller-token") {
                    callback(null, { id_user: 1, email: "seller@test.com", role: "SELLER" });
                } else {
                    callback(null, { id_user: 2, email: "cust@test.com", role: "CUSTOMER" });
                }
            }),
        },
    };
});

import request from "supertest";
import app from "../../src/app.js";
import { prisma } from "../../src/lib/prisma.js";

const sellerCookie = "userToken=seller-token";
const customerCookie = "userToken=customer-token";

//PUT /products/:id

describe("PUT /products/:id", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("Retorna 200 y actualiza el stock cuando el seller modifica la cantidad", async () => {
        prisma.users.findUnique.mockResolvedValue({
            id_user: 1,
            role: "SELLER",
            status: true,
            store: { id_store: 1, status: true }
        });

        prisma.products.findUnique.mockResolvedValue({
            id_product: 10,
            fk_store: 1,
            offer_price: null,
            is_offer: false,
            status: true
        });

        prisma.$transaction.mockImplementation(async (fn) =>
            fn({
                products: {
                    update: vi.fn().mockResolvedValue({}),
                    findFirst: vi.fn().mockResolvedValue({
                        id_product: 10,
                        name: "Producto X",
                        quantity: 5,
                        price: 100,
                        offer_price: null,
                        is_offer: false,
                        visible: true,
                        product_categories: [],
                        store: { id_store: 1, name: "Tienda" },
                        product_tag_relations: [],
                        product_reviews: []
                    })
                },
                productCategories: { createMany: vi.fn(), deleteMany: vi.fn() },
                productTagRelations: { createMany: vi.fn(), updateMany: vi.fn() }
            })
        );

        const res = await request(app)
            .put("/products/10")
            .set("Cookie", sellerCookie)
            .send({ quantity: 5 });

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty("quantity");
        expect(res.body.quantity).toBe(5);
        expect(prisma.$transaction).toHaveBeenCalled();
    });
});

// POST /api/users/:customerId/cart/items

describe("POST /api/users/:customerId/cart/items", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("Retorna 400 cuando el producto no tiene stock disponible", async () => {
        prisma.$transaction.mockImplementation(async (fn) =>
            fn({
                products: {
                    findFirst: vi.fn().mockResolvedValue({
                        id_product: 20,
                        fk_store: 2,
                        quantity: 0,
                        status: true,
                        visible: true,
                        store: { id_store: 2, store_status: "ACTIVE", status: true }
                    })
                },
                carts: { upsert: vi.fn().mockResolvedValue({ id_cart: 5 }) },
                cartItems: { findFirst: vi.fn().mockResolvedValue(null) }
            })
        );

        const res = await request(app)
            .post("/api/users/2/cart/items")
            .set("Cookie", customerCookie)
            .send({ productId: 20, quantity: 1 });

        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty("error.message");
        expect(String(res.body.error.message).toLowerCase()).toMatch(/stock|insuficiente/);
    });

    it("Retorna 201 y la respuesta incluye stock en cada item del carrito", async () => {
        prisma.$transaction.mockImplementation(async (fn) =>
            fn({
                products: {
                    findFirst: vi.fn().mockResolvedValue({
                        id_product: 20,
                        fk_store: 2,
                        quantity: 10,
                        status: true,
                        visible: true,
                        store: { id_store: 2, store_status: "ACTIVE", status: true }
                    })
                },
                carts: { upsert: vi.fn().mockResolvedValue({ id_cart: 5 }) },
                cartItems: {
                    findFirst: vi.fn().mockResolvedValue(null),
                    create: vi.fn().mockResolvedValue({})
                }
            })
        );

        prisma.carts.findUnique.mockResolvedValue({
            id_cart: 5,
            fk_store: 2,
            cart_status: "ACTIVE",
            store: { id_store: 2, name: "Tienda Test", logo: null },
            items: [{
                id_cart_item: 1,
                quantity: 1,
                product: {
                    id_product: 20,
                    name: "Producto Test",
                    price: 500,
                    offer_price: null,
                    is_offer: false,
                    image_url: null,
                    quantity: 10
                }
            }]
        });

        const res = await request(app)
            .post("/api/users/2/cart/items")
            .set("Cookie", customerCookie)
            .send({ productId: 20, quantity: 1 });

        expect(res.status).toBe(201);
        expect(res.body).toHaveProperty("items");
        expect(res.body.items[0].product).toHaveProperty("stock");
        expect(typeof res.body.items[0].product.stock).toBe("number");
        expect(res.body.items[0].product.stock).toBe(10);
    });
});

//PUT /api/users/cart/items/:cartItemId

describe("PUT /api/users/cart/items/:cartItemId", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("Retorna 400 cuando la cantidad solicitada supera el stock disponible", async () => {
        prisma.cartItems.findFirst.mockResolvedValue({
            id_cart_item: 100,
            fk_cart: 9,
            product: { quantity: 2 }
        });

        const res = await request(app)
            .put("/api/users/cart/items/100")
            .set("Cookie", customerCookie)
            .send({ quantity: 5 });

        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty("error.message");
        expect(String(res.body.error.message).toLowerCase()).toMatch(/stock|insuficiente/);
    });
});

//POST /api/orders

describe("POST /api/orders", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("Retorna 201 y decrementa el stock al confirmar una orden con stock suficiente", async () => {
        prisma.carts.findFirst.mockResolvedValue({
            id_cart: 7,
            fk_store: 3,
            order: null,
            items: [
                {
                    fk_product: 30,
                    quantity: 2,
                    product: {
                        id_product: 30,
                        price: 100,
                        offer_price: null,
                        is_offer: false,
                        status: true,
                        visible: true,
                        quantity: 5
                    }
                }
            ]
        });

        const mockProductsUpdate = vi.fn().mockResolvedValue({});
        const mockOrderCreate = vi.fn().mockResolvedValue({ id_order: 500 });
        const mockOrderFind = vi.fn().mockResolvedValue({
            id_order: 500,
            order_status: "PENDING",
            total: 200,
            shipping_cost: 0,
            shipping_distance_km: null,
            notes: null,
            created_at: new Date(),
            updated_at: new Date(),
            address: null,
            order_items: [
                {
                    id_order_item: 1,
                    quantity: 2,
                    price: 100,
                    original_price: 100,
                    is_offer_applied: false,
                    subtotal: 200,
                    product: { name: "Producto 30" }
                }
            ]
        });

        prisma.$transaction.mockImplementation(async (fn) =>
            fn({
                orders: { create: mockOrderCreate, findUnique: mockOrderFind },
                orderItems: { createMany: vi.fn().mockResolvedValue({}) },
                products: { update: mockProductsUpdate },
                carts: { update: vi.fn().mockResolvedValue({}), updateMany: vi.fn().mockResolvedValue({}) },
                notifications: { create: vi.fn().mockResolvedValue({}) }
            })
        );

        const res = await request(app)
            .post("/api/orders")
            .set("Cookie", customerCookie)
            .send({ cartId: 7, addressId: null, notes: null });

        expect(res.status).toBe(201);
        expect(res.body).toHaveProperty("id");
        expect(res.body.id).toBe(500);
        expect(prisma.$transaction).toHaveBeenCalled();
        expect(mockProductsUpdate).toHaveBeenCalled();

        const calledWith = mockProductsUpdate.mock.calls[0][0];
        expect(calledWith).toHaveProperty("where");
        expect(calledWith).toHaveProperty("data");
        expect(calledWith.data).toHaveProperty("quantity");
        expect(calledWith.data.quantity).toHaveProperty("decrement");
    });

    it("Retorna 400 cuando el stock es insuficiente al momento del checkout", async () => {
        prisma.carts.findFirst.mockResolvedValue({
            id_cart: 8,
            fk_store: 4,
            order: null,
            items: [
                {
                    fk_product: 40,
                    quantity: 10,
                    product: {
                        id_product: 40,
                        price: 50,
                        offer_price: null,
                        is_offer: false,
                        status: true,
                        visible: true,
                        quantity: 2
                    }
                }
            ]
        });

        const res = await request(app)
            .post("/api/orders")
            .set("Cookie", customerCookie)
            .send({ cartId: 8, addressId: null, notes: null });

        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty("error.message");
        expect(String(res.body.error.message).toLowerCase()).toMatch(/stock|insuficiente/);
    });
});

// GET /api/users/:customerId/carts

describe("GET /api/users/:customerId/carts", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("Retorna 200 con campo stock en items: positivo para producto con stock y cero para producto agotado", async () => {
        prisma.carts.findMany.mockResolvedValue([{ id_cart: 1 }]);

        prisma.carts.findUnique.mockResolvedValue({
            id_cart: 1,
            fk_store: 10,
            cart_status: "ACTIVE",
            store: { id_store: 10, name: "Tienda Test", logo: null },
            items: [
                {
                    id_cart_item: 1,
                    quantity: 2,
                    product: {
                        id_product: 1,
                        name: "Producto con stock",
                        price: 100,
                        offer_price: null,
                        is_offer: false,
                        image_url: null,
                        quantity: 5
                    }
                },
                {
                    id_cart_item: 2,
                    quantity: 1,
                    product: {
                        id_product: 2,
                        name: "Producto sin stock",
                        price: 200,
                        offer_price: null,
                        is_offer: false,
                        image_url: null,
                        quantity: 0
                    }
                }
            ]
        });

        const res = await request(app)
            .get("/api/users/2/carts")
            .set("Cookie", customerCookie);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty("carts");
        expect(res.body.carts).toHaveLength(1);

        const items = res.body.carts[0].items;
        expect(items).toHaveLength(2);

        const itemConStock = items.find((i) => i.product.id === 1);
        expect(itemConStock.product).toHaveProperty("stock");
        expect(itemConStock.product.stock).toBe(5);

        const itemSinStock = items.find((i) => i.product.id === 2);
        expect(itemSinStock.product).toHaveProperty("stock");
        expect(itemSinStock.product.stock).toBe(0);
    });
});

// GET /api/users/cart/:cartId/items

describe("GET /api/users/cart/:cartId/items", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("Retorna 200 con campo stock en items: positivo para producto con stock y cero para producto agotado", async () => {
        prisma.carts.findFirst.mockResolvedValue({ id_cart: 5 });

        prisma.cartItems.findMany.mockResolvedValue([
            {
                id_cart_item: 10,
                quantity: 3,
                product: {
                    id_product: 3,
                    name: "Producto con stock",
                    price: 150,
                    offer_price: null,
                    is_offer: false,
                    quantity: 8,
                    store: { name: "Tienda B" }
                }
            },
            {
                id_cart_item: 11,
                quantity: 1,
                product: {
                    id_product: 4,
                    name: "Producto sin stock",
                    price: 300,
                    offer_price: null,
                    is_offer: false,
                    quantity: 0,
                    store: { name: "Tienda B" }
                }
            }
        ]);

        const res = await request(app)
            .get("/api/users/cart/5/items")
            .set("Cookie", customerCookie);

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body).toHaveLength(2);

        const itemConStock = res.body.find((i) => i.product.id === 3);
        expect(itemConStock.product).toHaveProperty("stock");
        expect(itemConStock.product.stock).toBe(8);

        const itemSinStock = res.body.find((i) => i.product.id === 4);
        expect(itemSinStock.product).toHaveProperty("stock");
        expect(itemSinStock.product.stock).toBe(0);
    });
});