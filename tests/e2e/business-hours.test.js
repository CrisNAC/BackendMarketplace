import { vi, describe, it, expect, beforeEach, beforeAll } from "vitest";
import { randomBytes } from "crypto";
import request from "supertest";
import jwt from "jsonwebtoken";
import app from "../../src/app.js";
import { prisma } from "../../src/lib/prisma.js";

vi.mock("../../src/lib/prisma.js", () => ({
  prisma: {
    stores: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
    },
    storeBusinessHours: {
      findMany: vi.fn(),
      upsert: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

const TEST_JWT_SECRET = randomBytes(32).toString("hex");
const STORE_ID = 1;
const SELLER_ID = 1;

let sellerToken;

beforeAll(() => {
  process.env.JWT_SECRET = TEST_JWT_SECRET;
  sellerToken = jwt.sign(
    { id_user: SELLER_ID, email: "seller@test.com", role: "SELLER" },
    TEST_JWT_SECRET
  );
});

const mockStore = {
  id_store: STORE_ID,
  fk_user: SELLER_ID,
  logo: null,
  name: "Tienda Test",
  status: true,
  store_status: "ACTIVE",
  user: { id_user: SELLER_ID, status: true },
};

const mockScheduleRows = [
  {
    id_store_business_hour: 1,
    fk_store: STORE_ID,
    day_of_week: 0,
    open_time: "08:00",
    close_time: "18:00",
    is_closed: false,
    status: true,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
  },
];

// ─── OM515-001 Errores en consulta de horarios ────────────────────────────────

describe("GET /api/commerces/:id/business-hours", () => {
  beforeEach(() => vi.resetAllMocks());

  it("retorna 400 cuando el ID no es numérico y 404 cuando el comercio no existe", async () => {
    const resInvalidId = await request(app).get(
      "/api/commerces/abc/business-hours"
    );
    expect(resInvalidId.status).toBe(400);

    prisma.stores.findFirst.mockResolvedValue(null);
    const resNotFound = await request(app).get(
      "/api/commerces/9999/business-hours"
    );
    expect(resNotFound.status).toBe(404);
    expect(resNotFound.body.message).toMatch(/no encontrado/i);
  });

  // OM515-002 Consulta exitosa de horarios
  it("retorna 200 con horarios configurados cuando el comercio existe", async () => {
    prisma.stores.findFirst.mockResolvedValue({ id_store: STORE_ID });
    prisma.storeBusinessHours.findMany.mockResolvedValue(mockScheduleRows);

    const res = await request(app).get(
      `/api/commerces/${STORE_ID}/business-hours`
    );

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.schedules)).toBe(true);
    expect(res.body.data.schedules).toHaveLength(1);
    expect(res.body.data).toHaveProperty("is_open");
    expect(res.body.data).toHaveProperty("open_time");
    expect(res.body.data).toHaveProperty("close_time");
  });

  it("retorna 200 con schedules vacío cuando el comercio no tiene horarios configurados", async () => {
    prisma.stores.findFirst.mockResolvedValue({ id_store: STORE_ID });
    prisma.storeBusinessHours.findMany.mockResolvedValue([]);

    const res = await request(app).get(
      `/api/commerces/${STORE_ID}/business-hours`
    );

    expect(res.status).toBe(200);
    expect(res.body.data.schedules).toHaveLength(0);
    expect(res.body.data.is_open).toBe(false);
  });
});

// ─── OM515-003 Autenticación y autorización en actualización ──────────────────

describe("PUT /api/commerces/:id/business-hours", () => {
  beforeEach(() => vi.resetAllMocks());

  it("retorna 401 sin cookie, 403 cuando no es dueño y 404 cuando el comercio no existe", async () => {
    const resUnauth = await request(app)
      .put(`/api/commerces/${STORE_ID}/business-hours`)
      .send({ schedules: [{ day_of_week: 0, open_time: "08:00", close_time: "18:00", is_closed: false }] });
    expect(resUnauth.status).toBe(401);

    prisma.stores.findUnique.mockResolvedValue({ ...mockStore, fk_user: 99 });
    const resForbidden = await request(app)
      .put(`/api/commerces/${STORE_ID}/business-hours`)
      .set("Cookie", `userToken=${sellerToken}`)
      .send({ schedules: [{ day_of_week: 0, open_time: "08:00", close_time: "18:00", is_closed: false }] });
    expect(resForbidden.status).toBe(403);

    prisma.stores.findUnique.mockResolvedValue(null);
    const resNotFound = await request(app)
      .put(`/api/commerces/${STORE_ID}/business-hours`)
      .set("Cookie", `userToken=${sellerToken}`)
      .send({ schedules: [{ day_of_week: 0, open_time: "08:00", close_time: "18:00", is_closed: false }] });
    expect(resNotFound.status).toBe(404);
  });

  // OM515-004 Validaciones de entrada en actualización
  it("retorna 400 para distintas entradas inválidas en schedules", async () => {
    prisma.stores.findUnique.mockResolvedValue(mockStore);

    const resNoField = await request(app)
      .put(`/api/commerces/${STORE_ID}/business-hours`)
      .set("Cookie", `userToken=${sellerToken}`)
      .send({});
    expect(resNoField.status).toBe(400);

    const resEmpty = await request(app)
      .put(`/api/commerces/${STORE_ID}/business-hours`)
      .set("Cookie", `userToken=${sellerToken}`)
      .send({ schedules: [] });
    expect(resEmpty.status).toBe(400);

    const resInvalidDay = await request(app)
      .put(`/api/commerces/${STORE_ID}/business-hours`)
      .set("Cookie", `userToken=${sellerToken}`)
      .send({ schedules: [{ day_of_week: 7, open_time: "08:00", close_time: "18:00", is_closed: false }] });
    expect(resInvalidDay.status).toBe(400);

    const resInvalidTime = await request(app)
      .put(`/api/commerces/${STORE_ID}/business-hours`)
      .set("Cookie", `userToken=${sellerToken}`)
      .send({ schedules: [{ day_of_week: 0, open_time: "8:0", close_time: "18:00", is_closed: false }] });
    expect(resInvalidTime.status).toBe(400);

    const resInvalidRange = await request(app)
      .put(`/api/commerces/${STORE_ID}/business-hours`)
      .set("Cookie", `userToken=${sellerToken}`)
      .send({ schedules: [{ day_of_week: 0, open_time: "18:00", close_time: "08:00", is_closed: false }] });
    expect(resInvalidRange.status).toBe(400);

    const resDuplicateDay = await request(app)
      .put(`/api/commerces/${STORE_ID}/business-hours`)
      .set("Cookie", `userToken=${sellerToken}`)
      .send({
        schedules: [
          { day_of_week: 0, open_time: "08:00", close_time: "18:00", is_closed: false },
          { day_of_week: 0, open_time: "09:00", close_time: "17:00", is_closed: false },
        ],
      });
    expect(resDuplicateDay.status).toBe(400);
  });

  // OM515-005 Actualización exitosa de horarios
  it("retorna 200 al actualizar días abiertos y días cerrados", async () => {
    prisma.stores.findUnique.mockResolvedValue(mockStore);
    prisma.storeBusinessHours.upsert.mockResolvedValue({});
    prisma.$transaction.mockResolvedValue([]);
    prisma.storeBusinessHours.findMany.mockResolvedValue([
      ...mockScheduleRows,
      {
        id_store_business_hour: 2,
        fk_store: STORE_ID,
        day_of_week: 6,
        open_time: null,
        close_time: null,
        is_closed: true,
        status: true,
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-01T00:00:00.000Z",
      },
    ]);

    const res = await request(app)
      .put(`/api/commerces/${STORE_ID}/business-hours`)
      .set("Cookie", `userToken=${sellerToken}`)
      .send({
        schedules: [
          { day_of_week: 0, open_time: "08:00", close_time: "18:00", is_closed: false },
          { day_of_week: 6, is_closed: true },
        ],
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toMatch(/actualizados/i);
    expect(Array.isArray(res.body.data.schedules)).toBe(true);
    expect(res.body.data.schedules).toHaveLength(2);
    const closedDay = res.body.data.schedules.find((s) => s.day_of_week === 6);
    expect(closedDay.is_closed).toBe(true);
  });
});
