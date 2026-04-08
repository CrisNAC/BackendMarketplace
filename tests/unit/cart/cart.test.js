import { vi, describe, it, expect, beforeEach } from "vitest";
import { prisma } from "../../../src/lib/prisma.js";
import {
  getActiveCartsForUserService,
  addCartItemService,
  getCartItemsByIdService,
  removeCartItemService,
  updatedCartItemQuantityService,
} from "../../../src/modules/users/cart/cart.service.js";
import {
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "../../../src/lib/errors.js";

// ─── MOCK DE PRISMA ──────────────────────────────────────────────────────────

vi.mock("../../../src/lib/prisma.js", () => ({
  prisma: {
    carts: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      upsert: vi.fn(),
    },
    cartItems: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
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
  name: "Producto Test",
  price: 100,
  offer_price: null,
  is_offer: false,
};

const mockProductOffer = {
  id_product: 2,
  name: "Producto Oferta",
  price: 100,
  offer_price: 75,
  is_offer: true,
};

const mockCartItem = {
  id_cart_item: 1,
  quantity: 2,
  product: mockProduct,
};

const mockCartFull = {
  id_cart: 1,
  fk_store: 10,
  cart_status: "ACTIVE",
  store: { id_store: 10, name: "Tienda Test" },
  items: [mockCartItem],
};

const mockCartEmpty = {
  ...mockCartFull,
  items: [],
};

// ─── getActiveCartsForUserService ────────────────────────────────────────────

describe("getActiveCartsForUserService", () => {
  beforeEach(() => vi.clearAllMocks());

  it("lanza ForbiddenError cuando el usuario autenticado no es el mismo que customerId", async () => {
    await expect(
      getActiveCartsForUserService(1, 2)
    ).rejects.toThrow(ForbiddenError);
  });

  it("retorna array vacío cuando el usuario no tiene carritos activos", async () => {
    prisma.carts.findMany.mockResolvedValue([]);

    const result = await getActiveCartsForUserService(1, 1);

    expect(result).toEqual([]);
  });

  it("retorna array vacío cuando los carritos existen pero no tienen items", async () => {
    prisma.carts.findMany.mockResolvedValue([{ id_cart: 1 }]);
    prisma.carts.findUnique.mockResolvedValue(mockCartEmpty);

    const result = await getActiveCartsForUserService(1, 1);

    expect(result).toEqual([]);
  });

  it("retorna los carritos activos con items correctamente mapeados", async () => {
    prisma.carts.findMany.mockResolvedValue([{ id_cart: 1 }]);
    prisma.carts.findUnique.mockResolvedValue(mockCartFull);

    const result = await getActiveCartsForUserService(1, 1);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: 1,
      storeId: 10,
      commerce: { id: 10, name: "Tienda Test" },
      status: "ACTIVE",
    });
    expect(result[0].items).toHaveLength(1);
  });

  it("mapea correctamente los campos del producto en cada item", async () => {
    prisma.carts.findMany.mockResolvedValue([{ id_cart: 1 }]);
    prisma.carts.findUnique.mockResolvedValue(mockCartFull);

    const result = await getActiveCartsForUserService(1, 1);
    const item = result[0].items[0];

    expect(item).toMatchObject({
      id: 1,
      quantity: 2,
      product: {
        id: 1,
        name: "Producto Test",
        price: 100,
        isOffer: false,
      },
    });
  });

  it("retorna múltiples carritos (uno por comercio)", async () => {
    prisma.carts.findMany.mockResolvedValue([{ id_cart: 1 }, { id_cart: 2 }]);
    prisma.carts.findUnique
      .mockResolvedValueOnce(mockCartFull)
      .mockResolvedValueOnce({ ...mockCartFull, id_cart: 2, fk_store: 20 });

    const result = await getActiveCartsForUserService(1, 1);

    expect(result).toHaveLength(2);
  });

  it("lanza ValidationError cuando customerId no es un entero positivo", async () => {
    await expect(
      getActiveCartsForUserService(1, -1)
    ).rejects.toThrow(ValidationError);
  });
});

// ─── addCartItemService ──────────────────────────────────────────────────────

describe("addCartItemService", () => {
  beforeEach(() => vi.clearAllMocks());

  it("lanza ForbiddenError cuando el usuario autenticado no es el customerId", async () => {
    await expect(
      addCartItemService(1, 2, { productId: 1, quantity: 1 })
    ).rejects.toThrow(ForbiddenError);
  });

  it("lanza ValidationError cuando quantity es 0", async () => {
    await expect(
      addCartItemService(1, 1, { productId: 1, quantity: 0 })
    ).rejects.toThrow(ValidationError);
  });

  it("lanza ValidationError cuando quantity es negativa", async () => {
    await expect(
      addCartItemService(1, 1, { productId: 1, quantity: -3 })
    ).rejects.toThrow(ValidationError);
  });

  it("lanza ValidationError cuando quantity es decimal", async () => {
    await expect(
      addCartItemService(1, 1, { productId: 1, quantity: 1.5 })
    ).rejects.toThrow(ValidationError);
  });

  it("lanza NotFoundError cuando el producto no existe o no está disponible", async () => {
    prisma.$transaction.mockImplementation(async (fn) => {
      const tx = {
        products: { findFirst: vi.fn().mockResolvedValue(null) },
        carts: { upsert: vi.fn() },
        cartItems: { findFirst: vi.fn() },
      };
      return fn(tx);
    });

    await expect(
      addCartItemService(1, 1, { productId: 99, quantity: 1 })
    ).rejects.toThrow(NotFoundError);
  });

  it("lanza ValidationError cuando el comercio del producto no está activo", async () => {
    prisma.$transaction.mockImplementation(async (fn) => {
      const tx = {
        products: {
          findFirst: vi.fn().mockResolvedValue({
            id_product: 1,
            fk_store: 10,
            quantity: 100,
            store: { id_store: 10, store_status: "INACTIVE", status: true },
          }),
        },
        carts: { upsert: vi.fn() },
        cartItems: { findFirst: vi.fn() },
      };
      return fn(tx);
    });

    await expect(
      addCartItemService(1, 1, { productId: 1, quantity: 1 })
    ).rejects.toThrow(ValidationError);
  });

  it("lanza ValidationError cuando el comercio tiene status false", async () => {
    prisma.$transaction.mockImplementation(async (fn) => {
      const tx = {
        products: {
          findFirst: vi.fn().mockResolvedValue({
            id_product: 1,
            fk_store: 10,
            quantity: 100,
            store: { id_store: 10, store_status: "ACTIVE", status: false },
          }),
        },
        carts: { upsert: vi.fn() },
        cartItems: { findFirst: vi.fn() },
      };
      return fn(tx);
    });

    await expect(
      addCartItemService(1, 1, { productId: 1, quantity: 1 })
    ).rejects.toThrow(ValidationError);
  });

  it("lanza ValidationError cuando no hay stock suficiente", async () => {
    prisma.$transaction.mockImplementation(async (fn) => {
      const tx = {
        products: {
          findFirst: vi.fn().mockResolvedValue({
            id_product: 1,
            fk_store: 10,
            quantity: 2, // solo 2 en stock
            store: { id_store: 10, store_status: "ACTIVE", status: true },
          }),
        },
        carts: {
          upsert: vi.fn().mockResolvedValue({ id_cart: 1 }),
        },
        cartItems: {
          findFirst: vi.fn().mockResolvedValue(null),
        },
      };
      return fn(tx);
    });

    await expect(
      addCartItemService(1, 1, { productId: 1, quantity: 5 }) // pide 5, hay 2
    ).rejects.toThrow(ValidationError);
  });

  it("crea un nuevo item cuando no existía previamente", async () => {
    prisma.$transaction.mockImplementation(async (fn) => {
      const tx = {
        products: {
          findFirst: vi.fn().mockResolvedValue({
            id_product: 1,
            fk_store: 10,
            quantity: 100,
            store: { id_store: 10, store_status: "ACTIVE", status: true },
          }),
        },
        carts: {
          upsert: vi.fn().mockResolvedValue({ id_cart: 1 }),
        },
        cartItems: {
          findFirst: vi.fn().mockResolvedValue(null), // no existía
          create: vi.fn().mockResolvedValue({}),
        },
      };
      return fn(tx);
    });
    prisma.carts.findUnique.mockResolvedValue(mockCartFull);

    const result = await addCartItemService(1, 1, { productId: 1, quantity: 2 });

    expect(result).toMatchObject({ id: 1, storeId: 10 });
  });

  it("incrementa la cantidad cuando el item ya existe y está activo", async () => {
    const existingItem = { id_cart_item: 1, quantity: 2, status: true };

    prisma.$transaction.mockImplementation(async (fn) => {
      const tx = {
        products: {
          findFirst: vi.fn().mockResolvedValue({
            id_product: 1,
            fk_store: 10,
            quantity: 100,
            store: { id_store: 10, store_status: "ACTIVE", status: true },
          }),
        },
        carts: {
          upsert: vi.fn().mockResolvedValue({ id_cart: 1 }),
        },
        cartItems: {
          findFirst: vi.fn().mockResolvedValue(existingItem),
          update: vi.fn().mockResolvedValue({}),
        },
      };
      return fn(tx);
    });
    prisma.carts.findUnique.mockResolvedValue(mockCartFull);

    await addCartItemService(1, 1, { productId: 1, quantity: 3 });

    // la transacción se ejecutó (update fue llamado dentro)
    expect(prisma.$transaction).toHaveBeenCalled();
  });

  it("reactiva y actualiza cantidad cuando el item existía pero estaba inactivo", async () => {
    const inactiveItem = { id_cart_item: 1, quantity: 1, status: false };

    prisma.$transaction.mockImplementation(async (fn) => {
      const tx = {
        products: {
          findFirst: vi.fn().mockResolvedValue({
            id_product: 1,
            fk_store: 10,
            quantity: 100,
            store: { id_store: 10, store_status: "ACTIVE", status: true },
          }),
        },
        carts: {
          upsert: vi.fn().mockResolvedValue({ id_cart: 1 }),
        },
        cartItems: {
          findFirst: vi.fn().mockResolvedValue(inactiveItem),
          update: vi.fn().mockResolvedValue({}),
        },
      };
      return fn(tx);
    });
    prisma.carts.findUnique.mockResolvedValue(mockCartFull);

    await addCartItemService(1, 1, { productId: 1, quantity: 2 });

    expect(prisma.$transaction).toHaveBeenCalled();
  });

  it("usa quantity=1 por defecto cuando no se envía", async () => {
    prisma.$transaction.mockImplementation(async (fn) => {
      const tx = {
        products: {
          findFirst: vi.fn().mockResolvedValue({
            id_product: 1,
            fk_store: 10,
            quantity: 100,
            store: { id_store: 10, store_status: "ACTIVE", status: true },
          }),
        },
        carts: {
          upsert: vi.fn().mockResolvedValue({ id_cart: 1 }),
        },
        cartItems: {
          findFirst: vi.fn().mockResolvedValue(null),
          create: vi.fn().mockResolvedValue({}),
        },
      };
      return fn(tx);
    });
    prisma.carts.findUnique.mockResolvedValue(mockCartFull);

    // sin quantity
    const result = await addCartItemService(1, 1, { productId: 1 });

    expect(result).toBeDefined();
  });
});

// ─── getCartItemsByIdService ──────────────────────────────────────────────────

describe("getCartItemsByIdService", () => {
  beforeEach(() => vi.clearAllMocks());

  it("lanza NotFoundError cuando el carrito no existe o no pertenece al usuario", async () => {
    prisma.carts.findFirst.mockResolvedValue(null);

    await expect(
      getCartItemsByIdService(1, 99)
    ).rejects.toThrow(NotFoundError);
  });

  it("retorna array vacío cuando el carrito no tiene items activos", async () => {
    prisma.carts.findFirst.mockResolvedValue({ id_cart: 1 });
    prisma.cartItems.findMany.mockResolvedValue([]);

    const result = await getCartItemsByIdService(1, 1);

    expect(result).toEqual([]);
  });

  it("retorna los items del carrito correctamente mapeados", async () => {
    prisma.carts.findFirst.mockResolvedValue({ id_cart: 1 });
    prisma.cartItems.findMany.mockResolvedValue([
      {
        id_cart_item: 1,
        quantity: 3,
        product: { ...mockProduct, store: { name: "Tienda Test" } },
      },
    ]);

    const result = await getCartItemsByIdService(1, 1);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: 1,
      quantity: 3,
      product: {
        id: 1,
        name: "Producto Test",
        price: 100,
        isOffer: false,
        storeName: "Tienda Test",
      },
    });
  });

  it("mapea correctamente precio de oferta", async () => {
    prisma.carts.findFirst.mockResolvedValue({ id_cart: 1 });
    prisma.cartItems.findMany.mockResolvedValue([
      {
        id_cart_item: 2,
        quantity: 1,
        product: { ...mockProductOffer, store: { name: "Tienda Test" } },
      },
    ]);

    const result = await getCartItemsByIdService(1, 1);

    expect(result[0].product).toMatchObject({
      price: 75,        // offer_price
      originalPrice: 100,
      isOffer: true,
    });
  });

  it("retorna storeName como null cuando el producto no tiene tienda", async () => {
    prisma.carts.findFirst.mockResolvedValue({ id_cart: 1 });
    prisma.cartItems.findMany.mockResolvedValue([
      {
        id_cart_item: 1,
        quantity: 1,
        product: { ...mockProduct, store: null },
      },
    ]);

    const result = await getCartItemsByIdService(1, 1);

    expect(result[0].product.storeName).toBeNull();
  });

  it("lanza ValidationError cuando cartId no es un entero positivo", async () => {
    await expect(
      getCartItemsByIdService(1, -5)
    ).rejects.toThrow(ValidationError);
  });
});

// ─── removeCartItemService ────────────────────────────────────────────────────

describe("removeCartItemService", () => {
  beforeEach(() => vi.clearAllMocks());

  it("lanza NotFoundError cuando el item no existe o no pertenece al usuario", async () => {
    prisma.cartItems.findFirst.mockResolvedValue(null);

    await expect(
      removeCartItemService(1, 99)
    ).rejects.toThrow(NotFoundError);
  });

  it("aplica borrado lógico (status: false) al item", async () => {
    prisma.cartItems.findFirst.mockResolvedValue({
      id_cart_item: 1,
      fk_cart: 1,
    });
    prisma.cartItems.update.mockResolvedValue({});
    prisma.carts.findUnique.mockResolvedValue(mockCartEmpty);

    await removeCartItemService(1, 1);

    expect(prisma.cartItems.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id_cart_item: 1 },
        data: { status: false },
      })
    );
  });

  it("retorna el carrito actualizado después de eliminar el item", async () => {
    prisma.cartItems.findFirst.mockResolvedValue({
      id_cart_item: 1,
      fk_cart: 1,
    });
    prisma.cartItems.update.mockResolvedValue({});
    prisma.carts.findUnique.mockResolvedValue(mockCartFull);

    const result = await removeCartItemService(1, 1);

    expect(result).toMatchObject({ id: 1, storeId: 10 });
  });

  it("lanza ValidationError cuando cartItemId no es un entero positivo", async () => {
    await expect(
      removeCartItemService(1, -1)
    ).rejects.toThrow(ValidationError);
  });
});

// ─── updatedCartItemQuantityService ──────────────────────────────────────────

describe("updatedCartItemQuantityService", () => {
  beforeEach(() => vi.clearAllMocks());

  it("lanza ValidationError cuando la nueva cantidad es 0", async () => {
    await expect(
      updatedCartItemQuantityService(1, 1, 0)
    ).rejects.toThrow(ValidationError);
  });

  it("lanza ValidationError cuando la nueva cantidad es negativa", async () => {
    await expect(
      updatedCartItemQuantityService(1, 1, -2)
    ).rejects.toThrow(ValidationError);
  });

  it("lanza ValidationError cuando la nueva cantidad es decimal", async () => {
    await expect(
      updatedCartItemQuantityService(1, 1, 2.5)
    ).rejects.toThrow(ValidationError);
  });

  it("lanza NotFoundError cuando el item no existe o no pertenece al usuario", async () => {
    prisma.cartItems.findFirst.mockResolvedValue(null);

    await expect(
      updatedCartItemQuantityService(1, 99, 3)
    ).rejects.toThrow(NotFoundError);
  });

  it("lanza ValidationError cuando la nueva cantidad supera el stock disponible", async () => {
    prisma.cartItems.findFirst.mockResolvedValue({
      id_cart_item: 1,
      fk_cart: 1,
      product: { quantity: 5 }, // solo 5 en stock
    });

    await expect(
      updatedCartItemQuantityService(1, 1, 10) // pide 10
    ).rejects.toThrow(ValidationError);
  });

  it("actualiza la cantidad correctamente cuando hay stock suficiente", async () => {
    prisma.cartItems.findFirst.mockResolvedValue({
      id_cart_item: 1,
      fk_cart: 1,
      product: { quantity: 100 },
    });
    prisma.cartItems.update.mockResolvedValue({});
    prisma.carts.findUnique.mockResolvedValue(mockCartFull);

    await updatedCartItemQuantityService(1, 1, 5);

    expect(prisma.cartItems.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id_cart_item: 1 },
        data: { quantity: 5 },
      })
    );
  });

  it("actualiza correctamente cuando el producto no tiene límite de stock (quantity null)", async () => {
    prisma.cartItems.findFirst.mockResolvedValue({
      id_cart_item: 1,
      fk_cart: 1,
      product: { quantity: null }, // sin límite de stock
    });
    prisma.cartItems.update.mockResolvedValue({});
    prisma.carts.findUnique.mockResolvedValue(mockCartFull);

    await updatedCartItemQuantityService(1, 1, 999);

    expect(prisma.cartItems.update).toHaveBeenCalled();
  });

  it("retorna el carrito actualizado con los nuevos valores", async () => {
    prisma.cartItems.findFirst.mockResolvedValue({
      id_cart_item: 1,
      fk_cart: 1,
      product: { quantity: 100 },
    });
    prisma.cartItems.update.mockResolvedValue({});
    prisma.carts.findUnique.mockResolvedValue(mockCartFull);

    const result = await updatedCartItemQuantityService(1, 1, 3);

    expect(result).toMatchObject({ id: 1, storeId: 10 });
    expect(Array.isArray(result.items)).toBe(true);
  });

  it("lanza ValidationError cuando cartItemId no es un entero positivo", async () => {
    await expect(
      updatedCartItemQuantityService(1, -1, 3)
    ).rejects.toThrow(ValidationError);
  });
});