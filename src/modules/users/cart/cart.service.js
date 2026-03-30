import { prisma } from "../../../lib/prisma.js";
import { getProductPricing } from "../../../lib/product-pricing.js";
import {
  ForbiddenError,
  NotFoundError,
  ValidationError
} from "../../../lib/errors.js";
import { parsePositiveInteger } from "../../../lib/validators.js";

/**
 * Un usuario tiene a lo sumo un carrito ACTIVE por comercio (@@unique en schema).
 */
const getOrCreateActiveCart = async (tx, userId, storeId) => {
  const existing = await tx.carts.findFirst({
    where: {
      fk_user: userId,
      fk_store: storeId,
      cart_status: "ACTIVE",
      status: true
    }
  });

  if (existing) return existing;

  return tx.carts.create({
    data: {
      fk_user: userId,
      fk_store: storeId,
      cart_status: "ACTIVE",
      status: true
    }
  });
};

const getCartWithItems = async (cartId) => {
  return prisma.carts.findUnique({
    where: { id_cart: cartId },
    select: {
      id_cart: true,
      fk_store: true,
      cart_status: true,
      store: { select: { id_store: true, name: true } },
      items: {
        where: { status: true },
        select: {
          id_cart_item: true,
          quantity: true,
          product: {
            select: {
              id_product: true,
              name: true,
              price: true,
              offer_price: true,
              is_offer: true
            }
          }
        }
      }
    }
  });
};

const mapCartResponse = (cart) => {
  if (!cart) return null;

  return {
    id: cart.id_cart,
    storeId: cart.fk_store,
    commerce: cart.store
      ? { id: cart.store.id_store, name: cart.store.name }
      : null,
    status: cart.cart_status,
    items: cart.items.map((item) => {
      const pricing = getProductPricing(item.product);
      return {
        id: item.id_cart_item,
        quantity: item.quantity,
        product: {
          id: item.product.id_product,
          name: item.product.name,
          price: pricing.price,
          originalPrice: pricing.originalPrice,
          offerPrice: pricing.offerPrice,
          isOffer: pricing.isOffer
        }
      };
    })
  };
};

/**
 * Lista todos los carritos activos del usuario con ítems (uno por comercio).
 * GET /api/users/:customerId/carts
 */
export const getActiveCartsForUserService = async (
  authenticatedUserId,
  customerId
) => {
  const resolvedCustomerId = parsePositiveInteger(customerId, "customerId");

  if (Number(authenticatedUserId) !== resolvedCustomerId) {
    throw new ForbiddenError("No tienes permisos para ver estos carritos");
  }

  const cartRows = await prisma.carts.findMany({
    where: {
      fk_user: resolvedCustomerId,
      cart_status: "ACTIVE",
      status: true
    },
    orderBy: { updated_at: "desc" },
    select: { id_cart: true }
  });

  const fullCarts = await Promise.all(
    cartRows.map((row) => getCartWithItems(row.id_cart))
  );

  return fullCarts
    .map((full) => mapCartResponse(full))
    .filter((mapped) => mapped?.items?.length > 0);
};

/**
 * Agrega (o suma cantidad) de un producto al carrito activo del comercio al que pertenece el producto.
 *
 * POST /api/users/:customerId/cart/items
 * Body: { "productId": number, "quantity"?: number }
 */
export const addCartItemService = async (
  authenticatedUserId,
  customerId,
  { productId, quantity = 1 }
) => {
  const resolvedCustomerId = parsePositiveInteger(customerId, "customerId");

  if (Number(authenticatedUserId) !== resolvedCustomerId) {
    throw new ForbiddenError("No tienes permisos para modificar este carrito");
  }

  const resolvedProductId = parsePositiveInteger(productId, "productId");
  const resolvedQuantity = Number(quantity);

  if (!Number.isInteger(resolvedQuantity) || resolvedQuantity < 1) {
    throw new ValidationError("quantity debe ser un entero mayor a 0");
  }

  const result = await prisma.$transaction(async (tx) => {
    const product = await tx.products.findFirst({
      where: {
        id_product: resolvedProductId,
        status: true,
        visible: true
      },
      select: {
        id_product: true,
        fk_store: true,
        quantity: true,
        store: {
          select: {
            id_store: true,
            store_status: true,
            status: true
          }
        }
      }
    });

    if (!product) {
      throw new NotFoundError("Producto no encontrado o no disponible");
    }

    if (!product.store?.status || product.store.store_status !== "ACTIVE") {
      throw new ValidationError("El comercio de este producto no está disponible");
    }

    const storeId = product.fk_store;

    const cart = await getOrCreateActiveCart(tx, resolvedCustomerId, storeId);

    const existingItem = await tx.cartItems.findFirst({
      where: {
        fk_cart: cart.id_cart,
        fk_product: resolvedProductId
      }
    });

    const currentQtyInCart =
      existingItem?.status ? existingItem.quantity : 0;

    const newTotalQty = currentQtyInCart + resolvedQuantity;

    if (
      product.quantity != null &&
      Number.isFinite(Number(product.quantity)) &&
      newTotalQty > Number(product.quantity)
    ) {
      throw new ValidationError("No hay stock suficiente para esta cantidad");
    }

    if (existingItem && existingItem.status) {
      await tx.cartItems.update({
        where: { id_cart_item: existingItem.id_cart_item },
        data: {
          quantity: { increment: resolvedQuantity }
        }
      });
    } else if (existingItem && !existingItem.status) {
      await tx.cartItems.update({
        where: { id_cart_item: existingItem.id_cart_item },
        data: {
          quantity: newTotalQty,
          status: true
        }
      });
    } else {
      await tx.cartItems.create({
        data: {
          fk_cart: cart.id_cart,
          fk_product: resolvedProductId,
          quantity: resolvedQuantity,
          status: true
        }
      });
    }

    return {
      cartId: cart.id_cart,
      storeId
    };
  });

  const updated = await getCartWithItems(result.cartId);

  if (!updated) {
    throw new NotFoundError("No se pudo recuperar el carrito");
  }

  return mapCartResponse(updated);
};