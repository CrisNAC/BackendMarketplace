import { prisma } from "../../../lib/prisma.js";
import {
  ValidationError,
  ForbiddenError,
  NotFoundError
} from "../../../lib/errors.js";

const parsePositiveInteger = (value, fieldName) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new ValidationError(`${fieldName} debe ser un entero mayor a 0`);
  }
  return parsed;
};

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
  items: wishlist.wishlist_items.map((item) => ({
    id: item.id_wishlist_item,
    quantity: item.quantity,
    product: {
      id: item.product.id_product,
      name: item.product.name,
      price: Number(item.product.price)
    }
  }))
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
              price: true
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

  const wishlist = await prisma.wishlists.findFirst({
    where: { fk_user: resolvedCustomerId, status: true },
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
              price: true
            }
          }
        }
      }
    }
  });

  if (!wishlist) {
    return { id: null, name: null, items: [] };
  }

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

  // Validar que el producto exista y esté activo
  const product = await prisma.products.findFirst({
    where: { id_product: resolvedProductId, status: true, visible: true },
    select: { id_product: true }
  });

  if (!product) {
    throw new NotFoundError("Producto no encontrado o no disponible");
  }

  const wishlist = await getOrCreateActiveWishlist(resolvedCustomerId);

  // Verificar si el producto ya está en la lista
  const existingItem = await prisma.wishlistItems.findFirst({
    where: { fk_wishlist: wishlist.id_wishlist, fk_product: resolvedProductId }
  });

  if (existingItem && existingItem.status) {
    // Ya existe y está activo — incrementar quantity
    await prisma.wishlistItems.update({
      where: { id_wishlist_item: existingItem.id_wishlist_item },
      data: { quantity: existingItem.quantity + resolvedQuantity }
    });
  } else if (existingItem && !existingItem.status) {
    // Existía pero fue eliminado — reactivar con nueva quantity
    await prisma.wishlistItems.update({
      where: { id_wishlist_item: existingItem.id_wishlist_item },
      data: { quantity: resolvedQuantity, status: true }
    });
  } else {
    // No existe — crear nuevo item
    await prisma.wishlistItems.create({
      data: {
        fk_wishlist: wishlist.id_wishlist,
        fk_product: resolvedProductId,
        quantity: resolvedQuantity,
        status: true
      }
    });
  }

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