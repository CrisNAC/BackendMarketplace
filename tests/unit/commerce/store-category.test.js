import { vi, describe, it, expect, beforeEach } from "vitest";
import { prisma } from "../../../src/lib/prisma.js";
import {
  validateStoreCategoriesService,
  getStoreCategoriesService,
} from "../../../src/modules/commerce/store-categories/store-category.service.js";

vi.mock("../../../src/lib/prisma.js", () => ({
  prisma: {
    categories: {
      findMany: vi.fn(),
    },
  },
}));

// ─── validateStoreCategoriesService ──────────────────────────────────────────

describe("validateStoreCategoriesService", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retorna array vacío cuando categoryData es null", async () => {
    const result = await validateStoreCategoriesService(null);
    expect(result).toEqual([]);
  });

  it("retorna array vacío cuando categoryData es undefined", async () => {
    const result = await validateStoreCategoriesService(undefined);
    expect(result).toEqual([]);
  });

  it("lanza 400 cuando category_id no es entero positivo", async () => {
    await expect(validateStoreCategoriesService([-1])).rejects.toMatchObject({
      status: 400,
    });
  });

  it("lanza 400 cuando category_id es 0", async () => {
    await expect(validateStoreCategoriesService([0])).rejects.toMatchObject({
      status: 400,
    });
  });

  it("lanza 400 cuando la categoría no existe en la BD", async () => {
    prisma.categories.findMany.mockResolvedValue([]);
    await expect(validateStoreCategoriesService([1])).rejects.toMatchObject({
      status: 400,
      message: expect.stringContaining("no existe"),
    });
  });

  it("lanza 400 cuando se envían más de 3 categorías", async () => {
    await expect(validateStoreCategoriesService([1, 2, 3, 4])).rejects.toMatchObject({
      status: 400,
      message: expect.stringContaining("3 categorias"),
    });
  });

  it("retorna los IDs validados cuando las categorías son válidas", async () => {
    prisma.categories.findMany.mockResolvedValue([{ id_category: 1 }, { id_category: 2 }]);
    const result = await validateStoreCategoriesService([1, 2]);
    expect(result).toEqual([1, 2]);
  });

  it("acepta un solo ID sin array", async () => {
    prisma.categories.findMany.mockResolvedValue([{ id_category: 1 }]);
    const result = await validateStoreCategoriesService(1);
    expect(result).toEqual([1]);
  });
});

// ─── getStoreCategoriesService ────────────────────────────────────────────────

describe("getStoreCategoriesService", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retorna array vacío cuando no hay categorías", async () => {
    prisma.categories.findMany.mockResolvedValue([]);
    const result = await getStoreCategoriesService();
    expect(result).toEqual([]);
  });

  it("mapea las categorías al formato de respuesta esperado", async () => {
    const NOW = new Date("2026-01-01");
    prisma.categories.findMany.mockResolvedValue([
      { id_category: 1, name: "Tecnología", status: true, created_at: NOW, updated_at: NOW },
    ]);
    const result = await getStoreCategoriesService();
    expect(result[0]).toMatchObject({ id: 1, name: "Tecnología", status: true });
    expect(result[0].createdAt).toBe(NOW);
  });

  it("pasa el filtro search al query de Prisma", async () => {
    prisma.categories.findMany.mockResolvedValue([]);
    await getStoreCategoriesService({ search: "Tech" });
    expect(prisma.categories.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          name: expect.objectContaining({ contains: "Tech" }),
        }),
      })
    );
  });

  it("no aplica filtro de nombre cuando search está vacío", async () => {
    prisma.categories.findMany.mockResolvedValue([]);
    await getStoreCategoriesService({ search: "   " });
    const callArg = prisma.categories.findMany.mock.calls[0][0];
    expect(callArg.where).not.toHaveProperty("name");
  });

  it("usa limit 100 por defecto cuando no se especifica", async () => {
    prisma.categories.findMany.mockResolvedValue([]);
    await getStoreCategoriesService();
    expect(prisma.categories.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 100 })
    );
  });

  it("respeta el limit especificado hasta máximo 100", async () => {
    prisma.categories.findMany.mockResolvedValue([]);
    await getStoreCategoriesService({ limit: "10" });
    expect(prisma.categories.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 10 })
    );
  });

  it("limita a 100 cuando limit supera 100", async () => {
    prisma.categories.findMany.mockResolvedValue([]);
    await getStoreCategoriesService({ limit: "200" });
    expect(prisma.categories.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 100 })
    );
  });
});
