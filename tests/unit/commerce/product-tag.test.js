import { vi, describe, it, expect, beforeEach } from "vitest";
import { prisma } from "../../../src/lib/prisma.js";
import {
  parseProductTagIdsService,
  validateProductTagsService,
  getProductTagsService,
} from "../../../src/modules/commerce/product-tags/product-tag.service.js";

vi.mock("../../../src/lib/prisma.js", () => ({
  prisma: {
    productTags: {
      findMany: vi.fn(),
    },
  },
}));

// ─── parseProductTagIdsService (función pura, sin Prisma) ────────────────────

describe("parseProductTagIdsService", () => {
  it("retorna array vacío cuando tags es undefined", () => {
    expect(parseProductTagIdsService(undefined)).toEqual([]);
  });

  it("retorna array vacío cuando tags es null", () => {
    expect(parseProductTagIdsService(null)).toEqual([]);
  });

  it("lanza 400 cuando tags no es un array", () => {
    expect(() => parseProductTagIdsService("1,2,3")).toThrow();
    try {
      parseProductTagIdsService("1,2,3");
    } catch (e) {
      expect(e.status).toBe(400);
      expect(e.message).toContain("arreglo");
    }
  });

  it("lanza 400 cuando algún tag no es entero positivo", () => {
    try {
      parseProductTagIdsService([1, -1, 3]);
    } catch (e) {
      expect(e.status).toBe(400);
      expect(e.message).toContain("numerico");
    }
  });

  it("lanza 400 cuando algún tag es 0", () => {
    try {
      parseProductTagIdsService([1, 0]);
    } catch (e) {
      expect(e.status).toBe(400);
    }
  });

  it("elimina duplicados del array", () => {
    const result = parseProductTagIdsService([1, 2, 2, 3, 1]);
    expect(result).toEqual([1, 2, 3]);
  });

  it("retorna los IDs parseados cuando son válidos", () => {
    const result = parseProductTagIdsService([1, 2, 3]);
    expect(result).toEqual([1, 2, 3]);
  });

  it("lanza 400 cuando hay más de 10 tags únicos", () => {
    try {
      parseProductTagIdsService([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    } catch (e) {
      expect(e.status).toBe(400);
      expect(e.message).toContain("10");
    }
  });

  it("acepta exactamente 10 tags únicos", () => {
    const result = parseProductTagIdsService([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(result).toHaveLength(10);
  });
});

// ─── validateProductTagsService ──────────────────────────────────────────────

describe("validateProductTagsService", () => {
  beforeEach(() => vi.clearAllMocks());

  it("no hace nada cuando tagIds está vacío", async () => {
    await validateProductTagsService([]);
    expect(prisma.productTags.findMany).not.toHaveBeenCalled();
  });

  it("no lanza error cuando todos los tags existen", async () => {
    prisma.productTags.findMany.mockResolvedValue([
      { id_product_tag: 1 },
      { id_product_tag: 2 },
    ]);
    await expect(validateProductTagsService([1, 2])).resolves.not.toThrow();
  });

  it("lanza 400 cuando algún tag no existe en la BD", async () => {
    prisma.productTags.findMany.mockResolvedValue([{ id_product_tag: 1 }]); // solo 1 de los 2
    try {
      await validateProductTagsService([1, 2]);
    } catch (e) {
      expect(e.status).toBe(400);
      expect(e.message).toContain("validos");
    }
  });
});

// ─── getProductTagsService ────────────────────────────────────────────────────

describe("getProductTagsService", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retorna array vacío cuando no hay tags", async () => {
    prisma.productTags.findMany.mockResolvedValue([]);
    const result = await getProductTagsService();
    expect(result).toEqual([]);
  });

  it("mapea los tags al formato de respuesta esperado", async () => {
    const NOW = new Date("2026-01-01");
    prisma.productTags.findMany.mockResolvedValue([
      { id_product_tag: 1, name: "gaming", created_at: NOW, updated_at: NOW },
    ]);
    const result = await getProductTagsService();
    expect(result[0]).toMatchObject({ id: 1, name: "gaming" });
    expect(result[0].createdAt).toBe(NOW);
  });

  it("aplica filtro de búsqueda cuando se provee search", async () => {
    prisma.productTags.findMany.mockResolvedValue([]);
    await getProductTagsService({ search: "gam" });
    expect(prisma.productTags.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          name: expect.objectContaining({ contains: "gam" }),
        }),
      })
    );
  });

  it("no aplica filtro de nombre cuando search está vacío", async () => {
    prisma.productTags.findMany.mockResolvedValue([]);
    await getProductTagsService({ search: "" });
    const callArg = prisma.productTags.findMany.mock.calls[0][0];
    expect(callArg.where).not.toHaveProperty("name");
  });

  it("usa take 100 por defecto", async () => {
    prisma.productTags.findMany.mockResolvedValue([]);
    await getProductTagsService();
    expect(prisma.productTags.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 100 })
    );
  });

  it("limita a 100 cuando limit supera 100", async () => {
    prisma.productTags.findMany.mockResolvedValue([]);
    await getProductTagsService({ limit: "500" });
    expect(prisma.productTags.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 100 })
    );
  });
});