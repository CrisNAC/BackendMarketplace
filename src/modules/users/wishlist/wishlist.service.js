import { prisma } from "../../../lib/prisma.js";
import { getProductPricing } from "../../../lib/product-pricing.js";
import { ForbiddenError, NotFoundError, ValidationError } from "../../../lib/errors.js";
import { parsePositiveInteger } from "../../../lib/validators.js";

const getOrCreateActiveWishlist = async (userId) => {
  const existing = await prisma.wishlists.findFirst({
    where: { fk_user: userId, status: true }
  });

  if (existing) return existing;

  return prisma.wishlists.create({
    data: {
      fk_user: userId,
      name: "Mi lista",
      status: true
    }
  });
};

const mapWishlistResponse = (wishlist) => ({
  id: wishlist.id_wishlist,
  name: wishlist.name,
  items: wishlist.wishlist_items.map((item) => {
    const pricing = getProductPricing(item.product);

    return {
      id: item.id_wishlist_item,
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
});

const getWishlistWithItems = async (wishlistId) => {
  return prisma.wishlists.findUnique({
    where: { id_wishlist: wishlistId },
    select: {
      id_wishlist: true,
      name: true,
      wishlist_items: {
        where: { status: true },
        select: {
          id_wishlist_item: true,
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

export const getWishlistService = async (authenticatedUserId, customerId) => {
  const resolvedCustomerId = parsePositiveInteger(customerId, "customerId");

  if (Number(authenticatedUserId) !== resolvedCustomerId) {
    throw new ForbiddenError("No tienes permisos para ver esta lista");
  }

  // TERCERO: reutilizar getWishlistWithItems en vez de duplicar la query
  const existingWishlist = await prisma.wishlists.findFirst({
    where: { fk_user: resolvedCustomerId, status: true },
    select: { id_wishlist: true }
  });

  if (!existingWishlist) {
    return { id: null, name: null, items: [] };
  }

  const wishlist = await getWishlistWithItems(existingWishlist.id_wishlist);
  return mapWishlistResponse(wishlist);
};

export const addWishlistItemService = async (
  authenticatedUserId,
  customerId,
  { productId, quantity = 1 }
) => {
  const resolvedCustomerId = parsePositiveInteger(customerId, "customerId");

  if (Number(authenticatedUserId) !== resolvedCustomerId) {
    throw new ForbiddenError("No tienes permisos para modificar esta lista");
  }

  const resolvedProductId = parsePositiveInteger(productId, "productId");
  const resolvedQuantity = Number(quantity);

  if (!Number.isInteger(resolvedQuantity) || resolvedQuantity < 1) {
    throw new ValidationError("quantity debe ser un entero mayor a 0");
  }

  const product = await prisma.products.findFirst({
    where: { id_product: resolvedProductId, status: true, visible: true },
    select: { id_product: true }
  });

  if (!product) {
    throw new NotFoundError("Producto no encontrado o no disponible");
  }

  const wishlist = await getOrCreateActiveWishlist(resolvedCustomerId);

  // PRIMERO: envolver en transacción para evitar race conditions
  await prisma.$transaction(async (tx) => {
    const existingItem = await tx.wishlistItems.findFirst({
      where: { fk_wishlist: wishlist.id_wishlist, fk_product: resolvedProductId }
    });

    if (existingItem && existingItem.status) {
      await tx.wishlistItems.update({
        where: { id_wishlist_item: existingItem.id_wishlist_item },
        data: { quantity: { increment: resolvedQuantity } }
      });
    } else if (existingItem && !existingItem.status) {
      await tx.wishlistItems.update({
        where: { id_wishlist_item: existingItem.id_wishlist_item },
        data: { quantity: resolvedQuantity, status: true }
      });
    } else {
      await tx.wishlistItems.create({
        data: {
          fk_wishlist: wishlist.id_wishlist,
          fk_product: resolvedProductId,
          quantity: resolvedQuantity,
          status: true
        }
      });
    }
  });

  const updated = await getWishlistWithItems(wishlist.id_wishlist);
  return mapWishlistResponse(updated);
};

export const removeWishlistItemService = async (
  authenticatedUserId,
  customerId,
  productId
) => {
  const resolvedCustomerId = parsePositiveInteger(customerId, "customerId");

  if (Number(authenticatedUserId) !== resolvedCustomerId) {
    throw new ForbiddenError("No tienes permisos para modificar esta lista");
  }

  const resolvedProductId = parsePositiveInteger(productId, "productId");

  const wishlist = await prisma.wishlists.findFirst({
    where: { fk_user: resolvedCustomerId, status: true }
  });

  if (!wishlist) {
    throw new NotFoundError("Lista de deseos no encontrada");
  }

  const item = await prisma.wishlistItems.findFirst({
    where: {
      fk_wishlist: wishlist.id_wishlist,
      fk_product: resolvedProductId,
      status: true
    }
  });

  if (!item) {
    throw new NotFoundError("Producto no encontrado en la lista");
  }

  await prisma.wishlistItems.update({
    where: { id_wishlist_item: item.id_wishlist_item },
    data: { status: false }
  });
};

export const updateWishlistItemQuantityService = async (
  authenticatedUserId,
  customerId,
  productId,
  { quantity }
) => {
  const resolvedCustomerId = parsePositiveInteger(customerId, "customerId");

  if (Number(authenticatedUserId) !== resolvedCustomerId) {
    throw new ForbiddenError("No tienes permisos para modificar esta lista");
  }

  const resolvedProductId = parsePositiveInteger(productId, "productId");
  const resolvedQuantity = Number(quantity);

  if (!Number.isInteger(resolvedQuantity) || resolvedQuantity < 1) {
    throw new ValidationError("quantity debe ser un entero mayor a 0");
  }

  const wishlist = await prisma.wishlists.findFirst({
    where: { fk_user: resolvedCustomerId, status: true }
  });

  if (!wishlist) {
    throw new NotFoundError("Lista de deseos no encontrada");
  }

  const item = await prisma.wishlistItems.findFirst({
    where: { fk_wishlist: wishlist.id_wishlist, fk_product: resolvedProductId, status: true }
  });

  if (!item) {
    throw new NotFoundError("Producto no encontrado en la lista");
  }

  await prisma.wishlistItems.update({
    where: { id_wishlist_item: item.id_wishlist_item },
    data: { quantity: resolvedQuantity }
  });

  const updated = await getWishlistWithItems(wishlist.id_wishlist);
  return mapWishlistResponse(updated);
};
