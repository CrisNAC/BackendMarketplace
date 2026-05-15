import { vi, describe, it, expect, beforeEach, beforeAll, afterAll } from "vitest";
import { randomBytes } from "crypto";
import request from "supertest";
import jwt from "jsonwebtoken";
import app from "../../src/app.js";
import { prisma } from "../../src/lib/prisma.js";

vi.mock("../../src/lib/prisma.js", () => ({
  prisma: {
    stores: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    products: {
      updateMany: vi.fn(),
    },
    notifications: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

const TEST_JWT_SECRET = randomBytes(32).toString("hex");
const STORE_ID = 50;
const SELLER_ID = 10;

const clone = (value) => JSON.parse(JSON.stringify(value));

let adminToken;
let sellerToken;
let store;
let notifications;
let nextNotificationId;

const buildStore = (overrides = {}) => ({
  id_store: STORE_ID,
  fk_user: SELLER_ID,
  name: "Comercio Circular",
  email: "comercio@test.com",
  phone: "0981000000",
  description: "Productos sustentables",
  logo: null,
  store_status: "INACTIVE",
  status: true,
  created_at: "2026-05-15T10:00:00.000Z",
  user: {
    id_user: SELLER_ID,
    name: "Vendedor Test",
    email: "seller@test.com",
    status: true,
  },
  store_categories: [
    {
      id_store_category: 1,
      status: true,
      category: { id_category: 1, name: "Moda", status: true },
    },
  ],
  ...overrides,
});

const setupStatefulPrisma = () => {
  prisma.stores.findUnique.mockImplementation(async ({ where }) => {
    if (where.id_store !== STORE_ID || !store) return null;
    return clone(store);
  });

  prisma.stores.update.mockImplementation(async ({ where, data }) => {
    if (where.id_store !== STORE_ID || !store) return null;
    store = { ...store, ...data };
    return clone(store);
  });

  prisma.stores.count.mockImplementation(async ({ where }) =>
    store?.status === where.status && store?.store_status === where.store_status ? 1 : 0
  );

  prisma.stores.findMany.mockImplementation(async ({ where }) =>
    store?.status === where.status && store?.store_status === where.store_status
      ? [clone(store)]
      : []
  );

  prisma.products.updateMany.mockResolvedValue({ count: 3 });

  prisma.notifications.create.mockImplementation(async ({ data }) => {
    const notification = {
      id_notification: nextNotificationId,
      fk_user: data.fk_user,
      title: data.title,
      message: data.message ?? null,
      reference_id: data.reference_id ?? null,
      read: data.read ?? false,
      status: data.status ?? true,
      created_at: new Date(2026, 4, 15, 10, nextNotificationId).toISOString(),
    };
    nextNotificationId += 1;
    notifications.push(notification);
    return clone(notification);
  });

  prisma.notifications.findMany.mockImplementation(async ({ where }) =>
    notifications
      .filter((notification) => notification.fk_user === where.fk_user && notification.status === where.status)
      .sort((left, right) => new Date(right.created_at) - new Date(left.created_at))
      .map(clone)
  );

  prisma.notifications.findFirst.mockImplementation(async ({ where }) => {
    const notification = notifications.find(
      (item) => item.id_notification === where.id_notification && item.status === where.status
    );
    return notification ? clone(notification) : null;
  });

  prisma.notifications.update.mockImplementation(async ({ where, data }) => {
    const index = notifications.findIndex((item) => item.id_notification === where.id_notification);
    if (index === -1) return null;
    notifications[index] = { ...notifications[index], ...data };
    return clone(notifications[index]);
  });

  prisma.$transaction.mockImplementation(async (operations) => {
    if (Array.isArray(operations)) {
      return Promise.all(operations);
    }
    return operations(prisma);
  });
};

let originalJwtSecret;

beforeAll(() => {
  originalJwtSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = TEST_JWT_SECRET;
  adminToken = jwt.sign(
    { id_user: 1, email: "admin@test.com", role: "ADMIN" },
    TEST_JWT_SECRET
  );
  sellerToken = jwt.sign(
    { id_user: SELLER_ID, email: "seller@test.com", role: "SELLER" },
    TEST_JWT_SECRET
  );
});

afterAll(() => {
  if (originalJwtSecret === undefined) {
    delete process.env.JWT_SECRET;
  } else {
    process.env.JWT_SECRET = originalJwtSecret;
  }
});

describe("flujo e2e de aprobacion de comercio con rechazo y reenvio", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    store = buildStore();
    notifications = [];
    nextNotificationId = 1;
    setupStatefulPrisma();
  });

  it("rechaza, notifica, permite reenviar a revision y luego aprobar con nueva notificacion", async () => {
    const rejectResponse = await request(app)
      .patch(`/api/admin/stores/${STORE_ID}/reject`)
      .set("Cookie", `userToken=${adminToken}`)
      .send({ reason: "Falta documentacion comercial" });

    expect(rejectResponse.status).toBe(200);
    expect(rejectResponse.body.data).toMatchObject({
      id_store: STORE_ID,
      store_status: "SUSPENDED",
    });
    expect(store.store_status).toBe("SUSPENDED");
    expect(notifications).toHaveLength(1);
    expect(notifications[0]).toMatchObject({
      fk_user: SELLER_ID,
      title: "Solicitud de comercio rechazada",
      reference_id: STORE_ID,
      read: false,
    });

    const prematureApproveResponse = await request(app)
      .patch(`/api/admin/stores/${STORE_ID}/approve`)
      .set("Cookie", `userToken=${adminToken}`);

    expect(prematureApproveResponse.status).toBe(400);
    expect(prematureApproveResponse.body.message).toMatch(/pendiente de aprobacion/i);
    expect(store.store_status).toBe("SUSPENDED");
    expect(notifications).toHaveLength(1);

    const rejectedNotificationsResponse = await request(app)
      .get("/api/notifications")
      .set("Cookie", `userToken=${sellerToken}`);

    expect(rejectedNotificationsResponse.status).toBe(200);
    expect(rejectedNotificationsResponse.body.unreadCount).toBe(1);
    expect(rejectedNotificationsResponse.body.notifications[0]).toMatchObject({
      title: "Solicitud de comercio rechazada",
      referenceId: STORE_ID,
      read: false,
    });

    const markReadResponse = await request(app)
      .patch(`/api/notifications/${notifications[0].id_notification}/read`)
      .set("Cookie", `userToken=${sellerToken}`);

    expect(markReadResponse.status).toBe(200);
    expect(markReadResponse.body).toMatchObject({
      id: notifications[0].id_notification,
      referenceId: STORE_ID,
      read: true,
    });

    const updateResponse = await request(app)
      .put(`/api/commerces/${STORE_ID}`)
      .set("Cookie", `userToken=${sellerToken}`)
      .send({ name: "Comercio Circular Updated" });

    if (updateResponse.status !== 200) console.error("UPDATE ERROR:", updateResponse.body);
    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.data).toMatchObject({
      id_store: STORE_ID,
      store_status: "INACTIVE",
    });
    expect(store.store_status).toBe("INACTIVE");

    const pendingResponse = await request(app)
      .get("/api/admin/stores/pending")
      .set("Cookie", `userToken=${adminToken}`);

    expect(pendingResponse.status).toBe(200);
    expect(pendingResponse.body.data).toHaveLength(1);
    expect(pendingResponse.body.data[0]).toMatchObject({
      id_store: STORE_ID,
      store_status: "INACTIVE",
    });

    const approveResponse = await request(app)
      .patch(`/api/admin/stores/${STORE_ID}/approve`)
      .set("Cookie", `userToken=${adminToken}`);

    expect(approveResponse.status).toBe(200);
    expect(approveResponse.body.data).toMatchObject({
      id_store: STORE_ID,
      store_status: "ACTIVE",
    });
    expect(store.store_status).toBe("ACTIVE");
    expect(notifications).toHaveLength(2);
    expect(notifications[1]).toMatchObject({
      fk_user: SELLER_ID,
      title: "Comercio aprobado",
      reference_id: STORE_ID,
      read: false,
    });

    const finalNotificationsResponse = await request(app)
      .get("/api/notifications")
      .set("Cookie", `userToken=${sellerToken}`);

    expect(finalNotificationsResponse.status).toBe(200);
    expect(finalNotificationsResponse.body.unreadCount).toBe(1);
    expect(finalNotificationsResponse.body.notifications).toEqual([
      expect.objectContaining({
        title: "Comercio aprobado",
        referenceId: STORE_ID,
        read: false,
      }),
      expect.objectContaining({
        title: "Solicitud de comercio rechazada",
        referenceId: STORE_ID,
        read: true,
      }),
    ]);
  });
});
