import { vi, describe, it, expect, beforeEach } from "vitest";

vi.mock("../../src/lib/prisma.js", () => ({
  prisma: {
    users: { findUnique: vi.fn() },
    carts: { findFirst: vi.fn(), update: vi.fn() },
    orders: { create: vi.fn(), findUnique: vi.fn(), count: vi.fn().mockResolvedValue(0) },
    orderItems: { createMany: vi.fn() },
    products: { update: vi.fn() },
    notifications: { create: vi.fn() },
    $transaction: vi.fn()
  }
}));

vi.mock("../../src/config/jwt.config.js", () => ({
  default: vi.fn((req, res, next) => {
    const cookie = req.cookies?.userToken;

    if (!cookie) {
      return res.status(401).json({ error: { code: 401, message: "No autenticado" } });
    }

    if (cookie === "seller-token") {
      req.user = { id_user: 1, id: 1, email: "seller@test.com", role: "SELLER" };
    } else if (cookie === "customer-token") {
      req.user = { id_user: 2, id: 2, email: "cust@test.com", role: "CUSTOMER" };
    } else {
      return res.status(401).json({ error: { code: 401, message: "No autenticado" } });
    }

    next();
  }),
}));

import request from "supertest";
import app from "../../src/app.js";
import { prisma } from "../../src/lib/prisma.js";

const customerCookie = "userToken=customer-token";

describe("POST /api/orders -> crea notificación", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retorna 201 y crea notificación en la transacción al confirmar pedido", async () => {
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

    const mockNotificationsCreate = vi.fn().mockResolvedValue({});

    prisma.$transaction.mockImplementation(async (fn) =>
      fn({
        orders: { create: mockOrderCreate, findUnique: mockOrderFind },
        orderItems: { createMany: vi.fn().mockResolvedValue({}) },
        products: { update: mockProductsUpdate },
        carts: { update: vi.fn().mockResolvedValue({}), updateMany: vi.fn().mockResolvedValue({}) },
        notifications: { create: mockNotificationsCreate }
      })
    );

    const res = await request(app)
      .post("/api/orders")
      .set("Cookie", customerCookie)
      .send({ cartId: 7, addressId: null, notes: null });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("id");
    expect(prisma.$transaction).toHaveBeenCalled();
    expect(mockProductsUpdate).toHaveBeenCalled();

    // Verificar que se llamó a notifications.create con la referencia al pedido
    expect(mockNotificationsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          fk_user: 2,
          reference_id: 500,
          title: expect.any(String),
          message: expect.any(String),
          read: false,
          status: true
        })
      })
    );
  });

  it("retorna 200 y lista notificaciones con unreadCount correcto", async () => {
    // preparar datos: 2 notificaciones, una sin leer y una leída
    const notifUnread = {
      id_notification: 1,
      title: "¡Pedido confirmado!",
      message: "Tu pedido #500 fue confirmado correctamente.",
      read: false,
      reference_id: 500,
      created_at: new Date("2026-05-02T00:00:00.000Z")
    };

    const notifRead = {
      id_notification: 2,
      title: "Info",
      message: "Otra notificación.",
      read: true,
      reference_id: null,
      created_at: new Date("2026-05-01T00:00:00.000Z")
    };

    prisma.notifications.findMany = vi.fn().mockResolvedValue([notifUnread, notifRead]);

    const res = await request(app)
      .get("/api/notifications")
      .set("Cookie", customerCookie);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("unreadCount", 1);
    expect(Array.isArray(res.body.notifications)).toBe(true);
    expect(res.body.notifications).toHaveLength(2);
    // la primera debe ser la más reciente (notifUnread)
    expect(res.body.notifications[0]).toMatchObject({ id: 1, read: false });
  });

  it("retorna 200 y lista vacía cuando no hay notificaciones", async () => {
    // preparar: no hay notificaciones activas
    prisma.notifications.findMany = vi.fn().mockResolvedValue([]);

    const res = await request(app)
      .get("/api/notifications")
      .set("Cookie", customerCookie);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("unreadCount", 0);
    expect(Array.isArray(res.body.notifications)).toBe(true);
    expect(res.body.notifications).toHaveLength(0);
  });

  it("retorna 200 y marca la notificación como leída", async () => {
    // preparar notification existente que pertenece al usuario
    prisma.notifications.findFirst = vi.fn().mockResolvedValue({
      id_notification: 10,
      fk_user: 2,
      title: "Pedido",
      message: "Tu pedido #10 fue confirmado.",
      read: false,
      reference_id: 10,
      created_at: new Date("2026-05-03T00:00:00.000Z")
    });

    prisma.notifications.update = vi.fn().mockResolvedValue({
      id_notification: 10,
      title: "Pedido",
      message: "Tu pedido #10 fue confirmado.",
      read: true,
      reference_id: 10,
      created_at: new Date("2026-05-03T00:00:00.000Z")
    });

    const res = await request(app)
      .patch("/api/notifications/10/read")
      .set("Cookie", customerCookie);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("read", true);
    expect(res.body).toHaveProperty("id", 10);
    expect(prisma.notifications.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id_notification: 10, status: true } })
    );
    expect(prisma.notifications.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id_notification: 10 }, data: { read: true } })
    );
  });

  it("retorna 403 cuando se intenta marcar notificación de otro usuario", async () => {
    // notificación pertenece a otro usuario
    prisma.notifications.findFirst = vi.fn().mockResolvedValue({
      id_notification: 11,
      fk_user: 99,
      title: "Pedido",
      message: "Notificación de otro usuario",
      read: false,
      reference_id: 11,
      created_at: new Date()
    });

    // asegurar que update no sea llamado
    prisma.notifications.update = vi.fn();

    const res = await request(app)
      .patch("/api/notifications/11/read")
      .set("Cookie", customerCookie);

    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty("error");
    expect(res.body.error).toHaveProperty("code", 403);
    expect(prisma.notifications.update).not.toHaveBeenCalled();
  });
});
