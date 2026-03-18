import { prisma } from "../../../lib/prisma.js";
import {
  ValidationError,
  ForbiddenError,
  NotFoundError,
  ConflictError
} from "../../../lib/errors.js";

const parsePositiveInteger = (value, fieldName) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new ValidationError(`${fieldName} debe ser un entero mayor a 0`);
  }
  return parsed;
};

const mapOrderResponse = (order) => ({
  id: order.id_order,
  status: order.order_status,
  total: Number(order.total),
  notes: order.notes ?? null,
  address: {
    id: order.address.id_address,
    address: order.address.address,
    city: order.address.city,
    region: order.address.region
  },
  items: order.order_items.map((item) => ({
    id: item.id_order_item,
    quantity: item.quantity,
    subtotal: Number(item.subtotal),
    product: {
      id: item.product.id_product,
      name: item.product.name,
      price: Number(item.product.price)
    }
  })),
  createdAt: order.created_at,
  updatedAt: order.updated_at
});

export const createOrderService = async (authenticatedUserId, { wishlistId, addressId, notes }) => {
  const resolvedUserId = parsePositiveInteger(authenticatedUserId, "userId");
  const resolvedWishlistId = parsePositiveInteger(wishlistId, "wishlistId");
  const resolvedAddressId = parsePositiveInteger(addressId, "addressId");

  // Validar que la wishlist existe, está activa y pertenece al usuario
  const wishlist = await prisma.wishlists.findFirst({
    where: { id_wishlist: resolvedWishlistId, fk_user: resolvedUserId, status: true },
    select: {
      id_wishlist: true,
      orders: { select: { id_order: true } },
      wishlist_items: {
        where: { status: true },
        select: {
          fk_product: true,
          quantity: true,
          product: {
            select: { id_product: true, price: true, status: true, visible: true }
          }
        }
      }
    }
  });

  if (!wishlist) {
    throw new NotFoundError("Lista de deseos no encontrada");
  }

  // Una wishlist solo puede convertirse en pedido una vez
  if (wishlist.orders) {
    throw new ConflictError("Esta lista de deseos ya fue convertida en un pedido");
  }

  // La wishlist debe tener al menos un item
  if (wishlist.wishlist_items.length === 0) {
    throw new ValidationError("La lista de deseos no tiene productos para ordenar");
  }

  // Validar que todos los productos siguen activos y visibles
  const unavailable = wishlist.wishlist_items.filter(
    (item) => !item.product.status || !item.product.visible
  );
  if (unavailable.length > 0) {
    throw new ValidationError(
      "Uno o más productos de la lista ya no están disponibles"
    );
  }

  // Validar que la dirección existe y pertenece al usuario
  const address = await prisma.addresses.findFirst({
    where: { id_address: resolvedAddressId, fk_user: resolvedUserId, status: true }
  });

  if (!address) {
    throw new NotFoundError("Dirección no encontrada");
  }

  // Calcular subtotales y total
  const itemsData = wishlist.wishlist_items.map((item) => ({
    fk_product: item.fk_product,
    quantity: item.quantity,
    subtotal: Number(item.product.price) * item.quantity,
    status: true
  }));

  const total = itemsData.reduce((sum, item) => sum + item.subtotal, 0);

  // Crear orden e items en una sola transacción
  const createdOrder = await prisma.$transaction(async (tx) => {
    const order = await tx.orders.create({
      data: {
        fk_user: resolvedUserId,
        fk_address: resolvedAddressId,
        fk_wishlist: resolvedWishlistId,
        total,
        notes: notes ?? null,
        status: true
      },
      select: { id_order: true }
    });

    await tx.orderItems.createMany({
      data: itemsData.map((item) => ({
        fk_order: order.id_order,
        ...item
      }))
    });

    return tx.orders.findUnique({
      where: { id_order: order.id_order },
      select: {
        id_order: true,
        order_status: true,
        total: true,
        notes: true,
        created_at: true,
        updated_at: true,
        address: {
          select: { id_address: true, address: true, city: true, region: true }
        },
        order_items: {
          where: { status: true },
          select: {
            id_order_item: true,
            quantity: true,
            subtotal: true,
            product: {
              select: { id_product: true, name: true, price: true }
            }
          }
        }
      }
    });
  });

  return mapOrderResponse(createdOrder);
};

export const getOrdersService = async (authenticatedUserId, customerId) => {
  const resolvedCustomerId = parsePositiveInteger(customerId, "customerId");

  if (resolvedCustomerId !== parsePositiveInteger(authenticatedUserId, "userId")) {
    throw new ForbiddenError("No tienes permisos para ver estos pedidos");
  }

  const orders = await prisma.orders.findMany({
    where: { fk_user: resolvedCustomerId, status: true },
    orderBy: { created_at: "desc" },
    select: {
      id_order: true,
      order_status: true,
      total: true,
      notes: true,
      created_at: true,
      updated_at: true,
      address: {
        select: { id_address: true, address: true, city: true, region: true }
      },
      order_items: {
        where: { status: true },
        select: {
          id_order_item: true,
          quantity: true,
          subtotal: true,
          product: {
            select: { id_product: true, name: true, price: true }
          }
        }
      }
    }
  });

  return orders.map(mapOrderResponse);
};