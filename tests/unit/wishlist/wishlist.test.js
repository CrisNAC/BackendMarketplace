import { vi, describe, it, expect, beforeEach } from "vitest";
import { prisma } from "../../../src/lib/prisma.js";
import {
  getWishlistsService,
  createWishlistService,
  deleteWishlistService,
  getWishlistItemsService,
  addWishlistItemService,
  updateWishlistItemQuantityService,
  removeWishlistItemService,
} from "../../../src/modules/users/wishlist/wishlist.service.js";
import {
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "../../../src/lib/errors.js";

// ─── MOCK DE PRISMA ──────────────────────────────────────────────────────────

vi.mock("../../../src/lib/prisma.js", () => ({
  prisma: {
    wishlists: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    wishlistItems: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    products: {
      findFirst: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock("../../../src/lib/product-pricing.js", () => ({
  getProductPricing: vi.fn((product) => ({
    price: product.is_offer && product.offer_price != null
      ? Number(product.offer_price)
      : Number(product.price),
    originalPrice: Number(product.price),
    offerPrice: product.offer_price ? Number(product.offer_price) : null,
    isOffer: product.is_offer ?? false,
  })),
}));

// ─── DATOS DE PRUEBA ─────────────────────────────────────────────────────────

const mockProduct = {
  id_product: 1,
  name: "Remera Test",
  price: 50000,
  offer_price: null,
  is_offer: false,
};

const mockProductOffer = {
  id_product: 2,
  name: "Remera Oferta",
  price: 50000,
  offer_price: 35000,
  is_offer: true,
};

const mockWishlistItem = {
  id_wishlist_item: 1,
  quantity: 2,
  product: mockProduct,
};

const mockWishlistFull = {
  id_wishlist: 1,
  name: "Mi lista",
  wishlist_items: [mockWishlistItem],
};

const mockWishlistEmpty = {
  id_wishlist: 1,
  name: "Mi lista",
  wishlist_items: [],
};

// ─── getWishlistsService ─────────────────────────────────────────────────────

describe("getWishlistsService", () => {
  beforeEach(() => vi.clearAllMocks());

  it("lanza ForbiddenError cuando el usuario autenticado no coincide con customerId", async () => {
    await expect(
      getWishlistsService(1, 2)
    ).rejects.toThrow(ForbiddenError);
  });

  it("lanza ValidationError cuando customerId no es un entero positivo", async () => {
    await expect(
      getWishlistsService(1, -1)
    ).rejects.toThrow(ValidationError);
  });

  it("retorna array vacío cuando el usuario no tiene listas", async () => {
    prisma.wishlists.findMany.mockResolvedValue([]);

    const result = await getWishlistsService(1, 1);

    expect(result).toEqual([]);
  });

  it("retorna las listas con id, name, itemCount y createdAt", async () => {
    prisma.wishlists.findMany.mockResolvedValue([
      {
        id_wishlist: 1,
        name: "Para cumpleaños",
        created_at: new Date("2025-01-01"),
        _count: { wishlist_items: 3 },
      },
    ]);

    const result = await getWishlistsService(1, 1);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: 1,
      name: "Para cumpleaños",
      itemCount: 3,
    });
  });

  it("retorna múltiples listas correctamente", async () => {
    prisma.wishlists.findMany.mockResolvedValue([
      { id_wishlist: 1, name: "Ropa", created_at: new Date(), _count: { wishlist_items: 2 } },
      { id_wishlist: 2, name: "Tecnología", created_at: new Date(), _count: { wishlist_items: 5 } },
    ]);

    const result = await getWishlistsService(1, 1);

    expect(result).toHaveLength(2);
    expect(result[1].itemCount).toBe(5);
  });
});

// ─── createWishlistService ───────────────────────────────────────────────────

describe("createWishlistService", () => {
  beforeEach(() => vi.clearAllMocks());

  it("lanza ForbiddenError cuando el usuario autenticado no coincide con customerId", async () => {
    await expect(
      createWishlistService(1, 2, { name: "Ropa" })
    ).rejects.toThrow(ForbiddenError);
  });

  it("lanza ValidationError cuando el nombre está vacío", async () => {
    await expect(
      createWishlistService(1, 1, { name: "" })
    ).rejects.toThrow(ValidationError);
  });

  it("lanza ValidationError cuando el nombre no se envía", async () => {
    await expect(
      createWishlistService(1, 1, {})
    ).rejects.toThrow(ValidationError);
  });

  it("lanza ValidationError cuando el nombre supera 50 caracteres", async () => {
    await expect(
      createWishlistService(1, 1, { name: "a".repeat(51) })
    ).rejects.toThrow(ValidationError);
  });

  it("crea la lista y retorna id, name, itemCount y createdAt", async () => {
    prisma.wishlists.create.mockResolvedValue({
      id_wishlist: 1,
      name: "Ropa",
      created_at: new Date("2025-06-01"),
    });

    const result = await createWishlistService(1, 1, { name: "Ropa" });

    expect(result).toMatchObject({
      id: 1,
      name: "Ropa",
      itemCount: 0,
    });
  });

  it("aplica trim al nombre antes de crear", async () => {
    prisma.wishlists.create.mockResolvedValue({
      id_wishlist: 1,
      name: "Ropa",
      created_at: new Date(),
    });

    await createWishlistService(1, 1, { name: "  Ropa  " });

    expect(prisma.wishlists.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ name: "Ropa" }),
      })
    );
  });
});

// ─── deleteWishlistService ───────────────────────────────────────────────────

describe("deleteWishlistService", () => {
  beforeEach(() => vi.clearAllMocks());

  it("lanza ForbiddenError cuando el usuario autenticado no coincide con customerId", async () => {
    await expect(
      deleteWishlistService(1, 2, 1)
    ).rejects.toThrow(ForbiddenError);
  });

  it("lanza ValidationError cuando wishlistId no es un entero positivo", async () => {
    await expect(
      deleteWishlistService(1, 1, -1)
    ).rejects.toThrow(ValidationError);
  });

  it("lanza NotFoundError cuando la lista no existe o no pertenece al usuario", async () => {
    prisma.wishlists.findFirst.mockResolvedValue(null);

    await expect(
      deleteWishlistService(1, 1, 99)
    ).rejects.toThrow(NotFoundError);
  });

  it("aplica soft delete a la lista y sus items en transacción", async () => {
    prisma.wishlists.findFirst.mockResolvedValue({ id_wishlist: 1 });
    prisma.$transaction.mockResolvedValue([{}, {}]);

    await deleteWishlistService(1, 1, 1);

    expect(prisma.$transaction).toHaveBeenCalled();
  });
});

// ─── getWishlistItemsService ─────────────────────────────────────────────────

describe("getWishlistItemsService", () => {
  beforeEach(() => vi.clearAllMocks());

  it("lanza ForbiddenError cuando el usuario autenticado no coincide con customerId", async () => {
    await expect(
      getWishlistItemsService(1, 2, 1)
    ).rejects.toThrow(ForbiddenError);
  });

  it("lanza NotFoundError cuando la lista no existe o no pertenece al usuario", async () => {
    prisma.wishlists.findFirst.mockResolvedValue(null);

    await expect(
      getWishlistItemsService(1, 1, 99)
    ).rejects.toThrow(NotFoundError);
  });

  it("retorna la lista con sus items correctamente mapeados", async () => {
    prisma.wishlists.findFirst.mockResolvedValue({ id_wishlist: 1 });
    prisma.wishlists.findUnique.mockResolvedValue(mockWishlistFull);

    const result = await getWishlistItemsService(1, 1, 1);

    expect(result).toMatchObject({
      id: 1,
      name: "Mi lista",
    });
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      id: 1,
      quantity: 2,
      product: { id: 1, name: "Remera Test", price: 50000 },
    });
  });

  it("retorna lista vacía cuando no hay items activos", async () => {
    prisma.wishlists.findFirst.mockResolvedValue({ id_wishlist: 1 });
    prisma.wishlists.findUnique.mockResolvedValue(mockWishlistEmpty);

    const result = await getWishlistItemsService(1, 1, 1);

    expect(result.items).toHaveLength(0);
  });

  it("mapea correctamente precio de oferta en los items", async () => {
    prisma.wishlists.findFirst.mockResolvedValue({ id_wishlist: 1 });
    prisma.wishlists.findUnique.mockResolvedValue({
      ...mockWishlistFull,
      wishlist_items: [{ id_wishlist_item: 2, quantity: 1, product: mockProductOffer }],
    });

    const result = await getWishlistItemsService(1, 1, 1);

    expect(result.items[0].product).toMatchObject({
      price: 35000,
      originalPrice: 50000,
      isOffer: true,
    });
  });
});

// ─── addWishlistItemService ──────────────────────────────────────────────────

describe("addWishlistItemService", () => {
  beforeEach(() => vi.clearAllMocks());

  it("lanza ForbiddenError cuando el usuario autenticado no coincide con customerId", async () => {
    await expect(
      addWishlistItemService(1, 2, 1, { productId: 1 })
    ).rejects.toThrow(ForbiddenError);
  });

  it("lanza ValidationError cuando quantity es 0", async () => {
    await expect(
      addWishlistItemService(1, 1, 1, { productId: 1, quantity: 0 })
    ).rejects.toThrow(ValidationError);
  });

  it("lanza ValidationError cuando quantity es negativa", async () => {
    await expect(
      addWishlistItemService(1, 1, 1, { productId: 1, quantity: -2 })
    ).rejects.toThrow(ValidationError);
  });

  it("lanza ValidationError cuando quantity es decimal", async () => {
    await expect(
      addWishlistItemService(1, 1, 1, { productId: 1, quantity: 1.5 })
    ).rejects.toThrow(ValidationError);
  });

  it("lanza NotFoundError cuando la lista no existe o no pertenece al usuario", async () => {
    prisma.wishlists.findFirst.mockResolvedValue(null);

    await expect(
      addWishlistItemService(1, 1, 99, { productId: 1, quantity: 1 })
    ).rejects.toThrow(NotFoundError);
  });

  it("lanza NotFoundError cuando el producto no existe o no está disponible", async () => {
    prisma.wishlists.findFirst.mockResolvedValue({ id_wishlist: 1 });
    prisma.products.findFirst.mockResolvedValue(null);

    await expect(
      addWishlistItemService(1, 1, 1, { productId: 99, quantity: 1 })
    ).rejects.toThrow(NotFoundError);
  });

  it("crea un nuevo item cuando no existía previamente", async () => {
    prisma.wishlists.findFirst.mockResolvedValue({ id_wishlist: 1 });
    prisma.products.findFirst.mockResolvedValue({ id_product: 1 });
    prisma.$transaction.mockImplementation(async (fn) => {
      const tx = {
        wishlistItems: {
          findFirst: vi.fn().mockResolvedValue(null),
          create: vi.fn().mockResolvedValue({}),
        },
      };
      return fn(tx);
    });
    prisma.wishlists.findUnique.mockResolvedValue(mockWishlistFull);

    const result = await addWishlistItemService(1, 1, 1, { productId: 1, quantity: 2 });

    expect(result).toMatchObject({ id: 1, name: "Mi lista" });
  });

  it("incrementa quantity cuando el item ya existe y está activo", async () => {
    prisma.wishlists.findFirst.mockResolvedValue({ id_wishlist: 1 });
    prisma.products.findFirst.mockResolvedValue({ id_product: 1 });
    prisma.$transaction.mockImplementation(async (fn) => {
      const tx = {
        wishlistItems: {
          findFirst: vi.fn().mockResolvedValue({ id_wishlist_item: 1, status: true }),
          update: vi.fn().mockResolvedValue({}),
        },
      };
      return fn(tx);
    });
    prisma.wishlists.findUnique.mockResolvedValue(mockWishlistFull);

    await addWishlistItemService(1, 1, 1, { productId: 1, quantity: 3 });

    expect(prisma.$transaction).toHaveBeenCalled();
  });

  it("reactiva el item cuando existía pero estaba inactivo", async () => {
    prisma.wishlists.findFirst.mockResolvedValue({ id_wishlist: 1 });
    prisma.products.findFirst.mockResolvedValue({ id_product: 1 });
    prisma.$transaction.mockImplementation(async (fn) => {
      const tx = {
        wishlistItems: {
          findFirst: vi.fn().mockResolvedValue({ id_wishlist_item: 1, status: false }),
          update: vi.fn().mockResolvedValue({}),
        },
      };
      return fn(tx);
    });
    prisma.wishlists.findUnique.mockResolvedValue(mockWishlistFull);

    await addWishlistItemService(1, 1, 1, { productId: 1, quantity: 1 });

    expect(prisma.$transaction).toHaveBeenCalled();
  });

  it("usa quantity=1 por defecto cuando no se envía", async () => {
    prisma.wishlists.findFirst.mockResolvedValue({ id_wishlist: 1 });
    prisma.products.findFirst.mockResolvedValue({ id_product: 1 });
    prisma.$transaction.mockImplementation(async (fn) => {
      const tx = {
        wishlistItems: {
          findFirst: vi.fn().mockResolvedValue(null),
          create: vi.fn().mockResolvedValue({}),
        },
      };
      return fn(tx);
    });
    prisma.wishlists.findUnique.mockResolvedValue(mockWishlistFull);

    const result = await addWishlistItemService(1, 1, 1, { productId: 1 });

    expect(result).toBeDefined();
  });
});

// ─── updateWishlistItemQuantityService ───────────────────────────────────────

describe("updateWishlistItemQuantityService", () => {
  beforeEach(() => vi.clearAllMocks());

  it("lanza ForbiddenError cuando el usuario autenticado no coincide con customerId", async () => {
    await expect(
      updateWishlistItemQuantityService(1, 2, 1, 1, { quantity: 3 })
    ).rejects.toThrow(ForbiddenError);
  });

  it("lanza ValidationError cuando quantity es 0", async () => {
    await expect(
      updateWishlistItemQuantityService(1, 1, 1, 1, { quantity: 0 })
    ).rejects.toThrow(ValidationError);
  });

  it("lanza ValidationError cuando quantity es negativa", async () => {
    await expect(
      updateWishlistItemQuantityService(1, 1, 1, 1, { quantity: -1 })
    ).rejects.toThrow(ValidationError);
  });

  it("lanza ValidationError cuando quantity es decimal", async () => {
    await expect(
      updateWishlistItemQuantityService(1, 1, 1, 1, { quantity: 2.5 })
    ).rejects.toThrow(ValidationError);
  });

  it("lanza NotFoundError cuando el item no existe en la lista", async () => {
    prisma.wishlistItems.findFirst.mockResolvedValue(null);

    await expect(
      updateWishlistItemQuantityService(1, 1, 1, 99, { quantity: 3 })
    ).rejects.toThrow(NotFoundError);
  });

  it("actualiza la cantidad correctamente y retorna la lista actualizada", async () => {
    prisma.wishlistItems.findFirst.mockResolvedValue({ id_wishlist_item: 1 });
    prisma.wishlistItems.update.mockResolvedValue({});
    prisma.wishlists.findUnique.mockResolvedValue(mockWishlistFull);

    const result = await updateWishlistItemQuantityService(1, 1, 1, 1, { quantity: 5 });

    expect(prisma.wishlistItems.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id_wishlist_item: 1 },
        data: { quantity: 5 },
      })
    );
    expect(result).toMatchObject({ id: 1, name: "Mi lista" });
  });
});

// ─── removeWishlistItemService ───────────────────────────────────────────────

describe("removeWishlistItemService", () => {
  beforeEach(() => vi.clearAllMocks());

  it("lanza ForbiddenError cuando el usuario autenticado no coincide con customerId", async () => {
    await expect(
      removeWishlistItemService(1, 2, 1, 1)
    ).rejects.toThrow(ForbiddenError);
  });

  it("lanza ValidationError cuando productId no es un entero positivo", async () => {
    await expect(
      removeWishlistItemService(1, 1, 1, -5)
    ).rejects.toThrow(ValidationError);
  });

  it("lanza NotFoundError cuando el item no existe o no pertenece al usuario", async () => {
    prisma.wishlistItems.findFirst.mockResolvedValue(null);

    await expect(
      removeWishlistItemService(1, 1, 1, 99)
    ).rejects.toThrow(NotFoundError);
  });

  it("aplica borrado lógico (status: false) al item", async () => {
    prisma.wishlistItems.findFirst.mockResolvedValue({ id_wishlist_item: 1 });
    prisma.wishlistItems.update.mockResolvedValue({});

    await removeWishlistItemService(1, 1, 1, 1);

    expect(prisma.wishlistItems.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id_wishlist_item: 1 },
        data: { status: false },
      })
    );
  });

  it("no retorna contenido después de eliminar (void)", async () => {
    prisma.wishlistItems.findFirst.mockResolvedValue({ id_wishlist_item: 1 });
    prisma.wishlistItems.update.mockResolvedValue({});

    const result = await removeWishlistItemService(1, 1, 1, 1);

    expect(result).toBeUndefined();
  });
});