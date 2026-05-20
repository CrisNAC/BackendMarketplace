import { vi, describe, it, expect, beforeEach } from "vitest";
import { prisma } from "../../../src/lib/prisma.js";
import {
  getStoreBusinessHoursService,
  updateStoreBusinessHoursService,
} from "../../../src/modules/commerce/business-hours/services/business-hours.services.js";

vi.mock("../../../src/lib/prisma.js", () => ({
  prisma: {
    stores: {
      findFirst: vi.fn(),
    },
    storeBusinessHours: {
      findMany: vi.fn(),
      upsert: vi.fn(),
    },
    $transaction: vi.fn((operations) => Promise.all(operations)),
  },
}));

vi.mock("../../../src/modules/commerce/commerces/store.service.js", () => ({
  getAuthorizedStoreOwnerService: vi.fn(),
}));

import { getAuthorizedStoreOwnerService } from "../../../src/modules/commerce/commerces/store.service.js";

const mockStore = { id_store: 1, fk_user: 10 };

describe("getStoreBusinessHoursService", () => {
  beforeEach(() => vi.clearAllMocks());

  it("lanza 404 si el comercio no existe", async () => {
    prisma.stores.findFirst.mockResolvedValue(null);

    await expect(getStoreBusinessHoursService(1)).rejects.toMatchObject({
      status: 404,
    });
  });

  it("devuelve horarios y estado", async () => {
    prisma.stores.findFirst.mockResolvedValue(mockStore);
    prisma.storeBusinessHours.findMany.mockResolvedValue([
      {
        day_of_week: 0,
        open_time: "08:00",
        close_time: "18:00",
        is_closed: false,
      },
    ]);

    const result = await getStoreBusinessHoursService(1);

    expect(result.schedules).toHaveLength(1);
    expect(result).toHaveProperty("is_open");
  });
});

describe("updateStoreBusinessHoursService", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rechaza schedules vacio", async () => {
    getAuthorizedStoreOwnerService.mockResolvedValue(mockStore);

    await expect(
      updateStoreBusinessHoursService(10, 1, { schedules: [] })
    ).rejects.toMatchObject({ status: 400 });
  });

  it("rechaza open_time mayor o igual a close_time", async () => {
    getAuthorizedStoreOwnerService.mockResolvedValue(mockStore);

    await expect(
      updateStoreBusinessHoursService(10, 1, {
        schedules: [
          {
            day_of_week: 0,
            is_closed: false,
            open_time: "18:00",
            close_time: "08:00",
          },
        ],
      })
    ).rejects.toMatchObject({ status: 400 });
  });

  it("guarda horarios con upsert", async () => {
    getAuthorizedStoreOwnerService.mockResolvedValue(mockStore);
    prisma.storeBusinessHours.upsert.mockResolvedValue({});
    prisma.storeBusinessHours.findMany.mockResolvedValue([
      {
        day_of_week: 0,
        open_time: "08:00",
        close_time: "18:00",
        is_closed: false,
      },
    ]);

    const result = await updateStoreBusinessHoursService(10, 1, {
      schedules: [
        {
          day_of_week: 0,
          is_closed: false,
          open_time: "08:00",
          close_time: "18:00",
        },
      ],
    });

    expect(prisma.$transaction).toHaveBeenCalled();
    expect(prisma.storeBusinessHours.upsert).toHaveBeenCalled();
    expect(result.schedules).toHaveLength(1);
  });
});
