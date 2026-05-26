import { vi, describe, it, expect, beforeEach } from "vitest";
import { prisma } from "../../../src/lib/prisma.js";
import { getActiveBannersService } from "../../../src/modules/global/banners/banners.service.js";
import { ValidationError } from "../../../src/lib/errors.js";

vi.mock("../../../src/lib/prisma.js", () => ({
  prisma: {
    banners: {
      findMany: vi.fn(),
    },
  },
}));

describe("getActiveBannersService", () => {
  beforeEach(() => vi.clearAllMocks());

  it("lanza ValidationError cuando limit es inválido", async () => {
    await expect(getActiveBannersService({ limit: "-1" })).rejects.toThrow(ValidationError);
  });

  it("filtra banners activos por rango de fechas", async () => {
    prisma.banners.findMany.mockResolvedValue([]);

    await getActiveBannersService({ limit: 5 });

    expect(prisma.banners.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: true,
          is_active: true,
          start_at: expect.any(Object),
          OR: expect.any(Array),
        }),
        take: 5,
      })
    );
  });
});
