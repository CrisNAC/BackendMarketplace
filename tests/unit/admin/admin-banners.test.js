import { vi, describe, it, expect, beforeEach } from "vitest";
import { prisma } from "../../../src/lib/prisma.js";
import {
  createAdminBannerService,
  getAdminBannersService,
  toggleAdminBannerActiveService,
  updateAdminBannerService,
} from "../../../src/modules/admin/banners/admin-banners.service.js";
import { NotFoundError, ValidationError } from "../../../src/lib/errors.js";

vi.mock("../../../src/lib/prisma.js", () => ({
  prisma: {
    banners: {
      create: vi.fn(),
      count: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

const mockBanner = {
  id_banner: 1,
  title: "Semana Eco",
  description: "Descuentos hasta 30%",
  image_url: "https://cdn.example.com/banner.jpg",
  link_url: "https://frontend.example.com/ofertas",
  start_at: new Date("2024-05-01T10:00:00Z"),
  end_at: new Date("2024-05-10T10:00:00Z"),
  is_active: true,
  status: true,
  created_at: new Date("2024-04-30T10:00:00Z"),
  updated_at: new Date("2024-04-30T10:00:00Z"),
};

const pagination = { page: 1, limit: 10, skip: 0 };

describe("createAdminBannerService", () => {
  beforeEach(() => vi.clearAllMocks());

  it("lanza ValidationError cuando title está vacío", async () => {
    await expect(
      createAdminBannerService({ imageUrl: "https://img", startAt: "2024-05-01" })
    ).rejects.toThrow(ValidationError);
  });

  it("lanza ValidationError cuando endAt es anterior a startAt", async () => {
    await expect(
      createAdminBannerService({
        title: "Campaña",
        imageUrl: "https://img",
        startAt: "2024-06-10",
        endAt: "2024-06-01",
      })
    ).rejects.toThrow(ValidationError);
  });

  it("crea el banner con los campos normalizados", async () => {
    prisma.banners.create.mockResolvedValue(mockBanner);

    const result = await createAdminBannerService({
      title: "  Semana Eco  ",
      description: "  Descuentos  ",
      imageUrl: "https://cdn.example.com/banner.jpg",
      linkUrl: "https://frontend.example.com/ofertas",
      startAt: "2024-05-01T10:00:00Z",
      endAt: "2024-05-10T10:00:00Z",
      isActive: true,
    });

    expect(prisma.banners.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: "Semana Eco",
          description: "Descuentos",
          image_url: "https://cdn.example.com/banner.jpg",
          link_url: "https://frontend.example.com/ofertas",
        })
      })
    );

    expect(result.title).toBe("Semana Eco");
    expect(result.imageUrl).toBe("https://cdn.example.com/banner.jpg");
  });
});

describe("getAdminBannersService", () => {
  beforeEach(() => vi.clearAllMocks());

  it("aplica filtro active cuando se solicita", async () => {
    prisma.banners.count.mockResolvedValue(0);
    prisma.banners.findMany.mockResolvedValue([]);

    await getAdminBannersService({ active: "true" }, pagination);

    expect(prisma.banners.count).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ is_active: true }) })
    );
  });

  it("aplica search por titulo y descripcion", async () => {
    prisma.banners.count.mockResolvedValue(0);
    prisma.banners.findMany.mockResolvedValue([]);

    await getAdminBannersService({ search: "eco" }, pagination);

    expect(prisma.banners.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: [
            { title: { contains: "eco", mode: "insensitive" } },
            { description: { contains: "eco", mode: "insensitive" } },
          ],
        }),
      })
    );
  });
});

describe("updateAdminBannerService", () => {
  beforeEach(() => vi.clearAllMocks());

  it("lanza NotFoundError cuando no existe el banner", async () => {
    prisma.banners.findUnique.mockResolvedValue(null);

    await expect(updateAdminBannerService(1, { title: "Nuevo" })).rejects.toThrow(NotFoundError);
  });

  it("lanza ValidationError cuando endAt es anterior a startAt", async () => {
    prisma.banners.findUnique.mockResolvedValue(mockBanner);

    await expect(
      updateAdminBannerService(1, {
        startAt: "2024-06-10",
        endAt: "2024-06-01",
      })
    ).rejects.toThrow(ValidationError);
  });
});

describe("toggleAdminBannerActiveService", () => {
  beforeEach(() => vi.clearAllMocks());

  it("lanza ValidationError cuando isActive no es boolean", async () => {
    await expect(toggleAdminBannerActiveService(1, "si")).rejects.toThrow(ValidationError);
  });

  it("lanza NotFoundError cuando el banner no existe", async () => {
    prisma.banners.findUnique.mockResolvedValue(null);

    await expect(toggleAdminBannerActiveService(1, true)).rejects.toThrow(NotFoundError);
  });
});
