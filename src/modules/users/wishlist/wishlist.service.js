import { prisma } from "../../../lib/prisma.js";
import { getProductPricing } from "../../../lib/product-pricing.js";
import { ForbiddenError, NotFoundError, ValidationError } from "../../../lib/errors.js";
import { parsePositiveInteger } from "../../../lib/validators.js";

// ─── Helpers ────────────────────────────────────────────────────────────────

const validateOwnership = (authenticatedUserId, customerId) => {
  if (Number(authenticatedUserId) !== parsePositiveInteger(customerId, "customerId")) {
    throw new ForbiddenError("No tienes permisos para acceder a esta lista");
  }
  return parsePositiveInteger(customerId, "customerId");
};

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

// ─── Gestión de listas ───────────────────────────────────────────────────────

/** Retorna todas las listas del usuario con conteo de items */
export const getWishlistsService = async (authenticatedUserId, customerId) => {
  const resolvedCustomerId = validateOwnership(authenticatedUserId, customerId);

  const wishlists = await prisma.wishlists.findMany({
    where: { fk_user: resolvedCustomerId, status: true },
    orderBy: { created_at: "asc" },
    select: {
      id_wishlist: true,
      name: true,
      created_at: true,
      _count: {
        select: { wishlist_items: { where: { status: true } } }
      }
    }
  });

  return wishlists.map((w) => ({
    id: w.id_wishlist,
    name: w.name,
    itemCount: w._count.wishlist_items,
    createdAt: w.created_at
  }));
};

/** Crea una nueva lista de deseos */
export const createWishlistService = async (authenticatedUserId, customerId, { name }) => {
  const resolvedCustomerId = validateOwnership(authenticatedUserId, customerId);

  const trimmedName = name?.toString().trim();
  if (!trimmedName) {
    throw new ValidationError("El nombre de la lista es requerido");
  }
  if (trimmedName.length > 50) {
    throw new ValidationError("El nombre de la lista no puede superar los 50 caracteres");
  }

  const created = await prisma.wishlists.create({
    data: { fk_user: resolvedCustomerId, name: trimmedName, status: true },
    select: { id_wishlist: true, name: true, created_at: true }
  });

  return { id: created.id_wishlist, name: created.name, itemCount: 0, createdAt: created.created_at };
};

/** Soft delete de una lista y todos sus items */
export const deleteWishlistService = async (authenticatedUserId, customerId, wishlistId) => {
  const resolvedCustomerId = validateOwnership(authenticatedUserId, customerId);
  const resolvedWishlistId = parsePositiveInteger(wishlistId, "wishlistId");

  const wishlist = await prisma.wishlists.findFirst({
    where: { id_wishlist: resolvedWishlistId, fk_user: resolvedCustomerId, status: true }
  });

  if (!wishlist) {
    throw new NotFoundError("Lista de deseos no encontrada");
  }

  await prisma.$transaction([
    prisma.wishlistItems.updateMany({
      where: { fk_wishlist: resolvedWishlistId },
      data: { status: false }
    }),
    prisma.wishlists.update({
      where: { id_wishlist: resolvedWishlistId },
      data: { status: false }
    })
  ]);
};

// ─── Items de una lista ──────────────────────────────────────────────────────

/** Retorna los items de una lista específica */
export const getWishlistItemsService = async (authenticatedUserId, customerId, wishlistId) => {
  const resolvedCustomerId = validateOwnership(authenticatedUserId, customerId);
  const resolvedWishlistId = parsePositiveInteger(wishlistId, "wishlistId");

  const wishlist = await prisma.wishlists.findFirst({
    where: { id_wishlist: resolvedWishlistId, fk_user: resolvedCustomerId, status: true }
  });

  if (!wishlist) {
    throw new NotFoundError("Lista de deseos no encontrada");
  }

  const full = await getWishlistWithItems(resolvedWishlistId);
  return mapWishlistResponse(full);
};

/** Agrega un producto a una lista específica */
export const addWishlistItemService = async (
  authenticatedUserId,
  customerId,
  wishlistId,
  { productId, quantity = 1 }
) => {
  const resolvedCustomerId = validateOwnership(authenticatedUserId, customerId);
  const resolvedWishlistId = parsePositiveInteger(wishlistId, "wishlistId");
  const resolvedProductId = parsePositiveInteger(productId, "productId");
  const resolvedQuantity = Number(quantity);

  if (!Number.isInteger(resolvedQuantity) || resolvedQuantity < 1) {
    throw new ValidationError("quantity debe ser un entero mayor a 0");
  }

  const wishlist = await prisma.wishlists.findFirst({
    where: { id_wishlist: resolvedWishlistId, fk_user: resolvedCustomerId, status: true }
  });

  if (!wishlist) {
    throw new NotFoundError("Lista de deseos no encontrada");
  }

  const product = await prisma.products.findFirst({
    where: { id_product: resolvedProductId, status: true, visible: true },
    select: { id_product: true }
  });

  if (!product) {
    throw new NotFoundError("Producto no encontrado o no disponible");
  }

  await prisma.$transaction(async (tx) => {
    const existingItem = await tx.wishlistItems.findFirst({
      where: { fk_wishlist: resolvedWishlistId, fk_product: resolvedProductId }
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
          fk_wishlist: resolvedWishlistId,
          fk_product: resolvedProductId,
          quantity: resolvedQuantity,
          status: true
        }
      });
    }
  });

  const updated = await getWishlistWithItems(resolvedWishlistId);
  return mapWishlistResponse(updated);
};

/** Actualiza la cantidad de un item en una lista */
export const updateWishlistItemQuantityService = async (
  authenticatedUserId,
  customerId,
  wishlistId,
  productId,
  { quantity }
) => {
  const resolvedCustomerId = validateOwnership(authenticatedUserId, customerId);
  const resolvedWishlistId = parsePositiveInteger(wishlistId, "wishlistId");
  const resolvedProductId = parsePositiveInteger(productId, "productId");
  const resolvedQuantity = Number(quantity);

  if (!Number.isInteger(resolvedQuantity) || resolvedQuantity < 1) {
    throw new ValidationError("quantity debe ser un entero mayor a 0");
  }

  const item = await prisma.wishlistItems.findFirst({
    where: {
      fk_wishlist: resolvedWishlistId,
      fk_product: resolvedProductId,
      status: true,
      wishlist: { fk_user: resolvedCustomerId, status: true }
    }
  });

  if (!item) {
    throw new NotFoundError("Producto no encontrado en la lista");
  }

  await prisma.wishlistItems.update({
    where: { id_wishlist_item: item.id_wishlist_item },
    data: { quantity: resolvedQuantity }
  });

  const updated = await getWishlistWithItems(resolvedWishlistId);
  return mapWishlistResponse(updated);
};

/** Elimina un producto de una lista */
export const removeWishlistItemService = async (
  authenticatedUserId,
  customerId,
  wishlistId,
  productId
) => {
  const resolvedCustomerId = validateOwnership(authenticatedUserId, customerId);
  const resolvedWishlistId = parsePositiveInteger(wishlistId, "wishlistId");
  const resolvedProductId = parsePositiveInteger(productId, "productId");

  const item = await prisma.wishlistItems.findFirst({
    where: {
      fk_wishlist: resolvedWishlistId,
      fk_product: resolvedProductId,
      status: true,
      wishlist: { fk_user: resolvedCustomerId, status: true }
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