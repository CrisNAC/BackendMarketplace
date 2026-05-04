import { vi, describe, it, expect, beforeEach } from "vitest";
import { prisma } from "../../../src/lib/prisma.js";
import {
  validateStoreCategoryService,
  getStoreCategoriesService,
} from "../../../src/modules/commerce/store-categories/store-category.service.js";

vi.mock("../../../src/lib/prisma.js", () => ({
  prisma: {
    storeCategories: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

const mockCategory = { id_store_category: 1, status: true, name: "Tecnología" };

// ─── validateStoreCategoryService ────────────────────────────────────────────

describe("validateStoreCategoryService", () => {
  beforeEach(() => vi.clearAllMocks());

  it("lanza 400 cuando categoryId no es entero positivo", async () => {
    await expect(validateStoreCategoryService(-1)).rejects.toMatchObject({
      status: 400,
    });
  });

  it("lanza 400 cuando categoryId es 0", async () => {
    await expect(validateStoreCategoryService(0)).rejects.toMatchObject({
      status: 400,
    });
  });

  it("lanza 400 cuando la categoría no existe", async () => {
    prisma.storeCategories.findUnique.mockResolvedValue(null);
    await expect(validateStoreCategoryService(1)).rejects.toMatchObject({
      status: 400,
      message: expect.stringContaining("no es valido"),
    });
  });

  it("lanza 400 cuando la categoría está inactiva", async () => {
    prisma.storeCategories.findUnique.mockResolvedValue({ id_store_category: 1, status: false });
    await expect(validateStoreCategoryService(1)).rejects.toMatchObject({
      status: 400,
    });
  });

  it("retorna el ID parseado cuando la categoría es válida", async () => {
    prisma.storeCategories.findUnique.mockResolvedValue(mockCategory);
    const result = await validateStoreCategoryService("1");
    expect(result).toBe(1);
  });
});

// ─── getStoreCategoriesService ────────────────────────────────────────────────

describe("getStoreCategoriesService", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retorna array vacío cuando no hay categorías", async () => {
    prisma.storeCategories.findMany.mockResolvedValue([]);
    const result = await getStoreCategoriesService();
    expect(result).toEqual([]);
  });

  it("mapea las categorías al formato de respuesta esperado", async () => {
    const NOW = new Date("2026-01-01");
    prisma.storeCategories.findMany.mockResolvedValue([
      { id_store_category: 1, name: "Tecnología", status: true, created_at: NOW, updated_at: NOW },
    ]);
    const result = await getStoreCategoriesService();
    expect(result[0]).toMatchObject({ id: 1, name: "Tecnología", status: true });
    expect(result[0].createdAt).toBe(NOW);
  });

  it("pasa el filtro search al query de Prisma", async () => {
    prisma.storeCategories.findMany.mockResolvedValue([]);
    await getStoreCategoriesService({ search: "Tech" });
    expect(prisma.storeCategories.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          name: expect.objectContaining({ contains: "Tech" }),
        }),
      })
    );
  });

  it("no aplica filtro de nombre cuando search está vacío", async () => {
    prisma.storeCategories.findMany.mockResolvedValue([]);
    await getStoreCategoriesService({ search: "   " });
    const callArg = prisma.storeCategories.findMany.mock.calls[0][0];
    expect(callArg.where).not.toHaveProperty("name");
  });

  it("usa limit 100 por defecto cuando no se especifica", async () => {
    prisma.storeCategories.findMany.mockResolvedValue([]);
    await getStoreCategoriesService();
    expect(prisma.storeCategories.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 100 })
    );
  });

  it("respeta el limit especificado hasta máximo 100", async () => {
    prisma.storeCategories.findMany.mockResolvedValue([]);
    await getStoreCategoriesService({ limit: "10" });
    expect(prisma.storeCategories.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 10 })
    );
  });

  it("limita a 100 cuando limit supera 100", async () => {
    prisma.storeCategories.findMany.mockResolvedValue([]);
    await getStoreCategoriesService({ limit: "200" });
    expect(prisma.storeCategories.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 100 })
    );
  });
});