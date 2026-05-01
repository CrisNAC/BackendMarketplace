import { prisma } from "../../../lib/prisma.js";
import {
  ValidationError,
  ForbiddenError,
  NotFoundError,
  ConflictError
} from "../../../lib/errors.js";
import { parsePositiveInteger } from "../../../lib/validators.js";

const mapOrderResponse = (order) => ({
  id: order.id_order,
  status: order.order_status,
  total: Number(order.total),
  shippingCost: Number(order.shipping_cost ?? 0),
  shippingDistanceKm:
    order.shipping_distance_km === null || order.shipping_distance_km === undefined
      ? null
      : Number(order.shipping_distance_km),
  notes: order.notes ?? null,
  address: order.address ? {
    id: order.address.id_address,
    address: order.address.address,
    city: order.address.city,
    region: order.address.region
  } : null,
  items: order.order_items.map((item) => ({
    id: item.id_order_item,
    name: item.product?.name ?? "Producto",
    quantity: item.quantity,
    price: Number(item.price),
    originalPrice: Number(item.original_price),
    isOfferApplied: item.is_offer_applied,
    subtotal: Number(item.subtotal),
  })),
  createdAt: order.created_at,
  updatedAt: order.updated_at
});

const DISTANCE_THRESHOLD_KM = 2;

const roundToTwoDecimals = (value) => Number(Number(value).toFixed(2));

const getRouteDistanceKm = async (coordinates) => {
  if (!process.env.ORS_API_KEY) {
    throw new ValidationError("Servicio de geolocalización no disponible");
  }

  let response;
  try {
    response = await fetch("https://api.openrouteservice.org/v2/directions/driving-car", {
      method: "POST",
      headers: {
        Authorization: process.env.ORS_API_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ coordinates }),
      signal: AbortSignal.timeout(15000)
    });
  } catch {
    throw new ValidationError("No se pudo conectar con el servicio de distancias");
  }

  if (!response.ok) {
    throw new ValidationError("No se pudo calcular la distancia de envío");
  }

  const data = await response.json();
  const distanceMeters = data?.routes?.[0]?.summary?.distance;

  if (!Number.isFinite(distanceMeters)) {
    throw new ValidationError("No se pudo calcular la distancia de envío");
  }

  return roundToTwoDecimals(distanceMeters / 1000);
};

const getUserAddressForShipping = async (resolvedUserId, resolvedAddressId) => {
  const address = await prisma.addresses.findFirst({
    where: {
      id_address: resolvedAddressId,
      fk_user: resolvedUserId,
      status: true
    },
    select: {
      id_address: true,
      latitude: true,
      longitude: true
    }
  });

  if (!address) {
    throw new NotFoundError("Dirección no encontrada");
  }

  if (address.latitude == null || address.longitude == null) {
    throw new ValidationError("La dirección seleccionada no tiene coordenadas");
  }

  return {
    id: address.id_address,
    lat: Number(address.latitude),
    lng: Number(address.longitude)
  };
};

const getStoreShippingConfig = async (storeId) => {
  const store = await prisma.stores.findFirst({
    where: {
      id_store: storeId,
      status: true
    },
    select: {
      id_store: true,
      addresses: {
        where: { status: true },
        orderBy: { created_at: "asc" },
        select: {
          latitude: true,
          longitude: true
        },
        take: 1
      },
      shipping_zones: {
        where: { status: true },
        orderBy: { created_at: "asc" },
        select: {
          base_price: true,
          distance_price: true
        },
        take: 1
      }
    }
  });

  if (!store) {
    throw new NotFoundError("Comercio no encontrado");
  }

  const storeAddress = store.addresses?.[0];
  if (!storeAddress || storeAddress.latitude == null || storeAddress.longitude == null) {
    throw new ValidationError("El comercio no tiene ubicación válida para calcular envío");
  }

  const shippingZone = store.shipping_zones?.[0];
  if (!shippingZone) {
    throw new ValidationError("El comercio no tiene precios de envío configurados");
  }

  return {
    storeLat: Number(storeAddress.latitude),
    storeLng: Number(storeAddress.longitude),
    basePrice: Number(shippingZone.base_price),
    distancePrice: Number(shippingZone.distance_price)
  };
};

const buildShippingQuote = async ({ storeId, userId, addressId }) => {
  const [storeConfig, userAddress] = await Promise.all([
    getStoreShippingConfig(storeId),
    getUserAddressForShipping(userId, addressId)
  ]);

  const distanceKm = await getRouteDistanceKm([
    [storeConfig.storeLng, storeConfig.storeLat],
    [userAddress.lng, userAddress.lat]
  ]);

  const useDistanceRate = distanceKm > DISTANCE_THRESHOLD_KM;
  const ratePerKm = useDistanceRate
    ? storeConfig.distancePrice
    : storeConfig.basePrice;
  const shippingCost = roundToTwoDecimals(ratePerKm * distanceKm);

  return {
    distance_km: distanceKm,
    shipping_cost: shippingCost,
    threshold_km: DISTANCE_THRESHOLD_KM,
    rate_type: useDistanceRate ? "distance_price" : "base_price",
    rate_per_km: ratePerKm
  };
};

export const getOrderShippingQuoteService = async (
  authenticatedUserId,
  { cartId, addressId }
) => {
  const resolvedUserId = parsePositiveInteger(authenticatedUserId, "userId");
  const resolvedCartId = parsePositiveInteger(cartId, "cartId");
  const resolvedAddressId = parsePositiveInteger(addressId, "addressId");

  const cart = await prisma.carts.findFirst({
    where: {
      id_cart: resolvedCartId,
      fk_user: resolvedUserId,
      cart_status: "ACTIVE",
      status: true
    },
    select: {
      id_cart: true,
      fk_store: true
    }
  });

  if (!cart) {
    throw new NotFoundError("Carrito no encontrado");
  }

  return buildShippingQuote({
    storeId: cart.fk_store,
    userId: resolvedUserId,
    addressId: resolvedAddressId
  });
};



/**
 * Crea un pedido confirmando el carrito activo del usuario.
 * Calcula los precios históricos de cada item, marca el carrito como CHECKED_OUT
 * y crea la orden con sus items en una sola transacción.
 *
 * POST /api/orders/
 * Body:
 * {
 *   "fk_cart": 1,         // id del carrito activo a confirmar
 *   "fk_address": 1,      // id de la dirección de entrega
 *   "total": 150000,      // total calculado en el frontend por ahora, debido a que no hay registro de costo de envío, o sea andres lo hace
 *   "notes": "Puedo recibir solo de mañana" // esto es opcional
 * }
 */
export const createOrderService = async (
  authenticatedUserId,
  { cartId, addressId, notes, shippingMethod = "pickup" }
) => {
  const resolvedUserId = parsePositiveInteger(authenticatedUserId, "userId");
  const resolvedCartId = parsePositiveInteger(cartId, "cartId");
  const resolvedAddressId = addressId ? parsePositiveInteger(addressId, "addressId") : null;
  const normalizedShippingMethod =
    shippingMethod === "standard" ? "standard" : "pickup";

  // Validar que el carrito existe, está activa y pertenece al usuario
  const cart = await prisma.carts.findFirst({
    where: {
      id_cart: resolvedCartId,
      fk_user: resolvedUserId,
      cart_status: "ACTIVE",
      status: true
    },
    select: {
      id_cart: true,
      fk_store: true,
      order: { select: { id_order: true } },
      items: {
        where: { status: true },
        select: {
          fk_product: true,
          quantity: true,
          product: {
            select: {
              id_product: true,
              price: true,
              offer_price: true,
              is_offer: true,
              status: true,
              visible: true
            }
          }
        }
      }
    }
  });

  if (!cart) {
    throw new NotFoundError("Carrito no encontrado");
  }

  // Un carrito solo puede convertirse en pedido una vez
  if (cart.order) {
    throw new ConflictError("Este carrito ya fue convertido en un pedido");
  }

  // El carrito debe tener al menos un item
  if (cart.items.length === 0) {
    throw new ValidationError("El carrito no tiene productos");
  }

  // Validar que todos los productos siguen activos y visibles
  const unavailable = cart.items.filter(
    (item) => !item.product.status || !item.product.visible
  );
  if (unavailable.length > 0) {
    throw new ValidationError("Uno o más productos del carrito ya no están disponibles");
  }

  if (normalizedShippingMethod === "standard" && !resolvedAddressId) {
    throw new ValidationError("Debes seleccionar una dirección para envío estándar");
  }

  // Calcular precios historicos por item
  const itemsData = cart.items.map((item) => {
    const isOfferApplied = item.product.is_offer && item.product.offer_price != null;
    const price = isOfferApplied ? Number(item.product.offer_price) : Number(item.product.price);
    const originalPrice = Number(item.product.price);
    const subtotal = price * item.quantity;

    return {
      fk_product: item.fk_product,
      quantity: item.quantity,
      price,
      original_price: originalPrice,
      is_offer_applied: isOfferApplied,
      subtotal,
      status: true
    };
  });

  const itemsTotal = roundToTwoDecimals(
    itemsData.reduce((acc, item) => acc + item.subtotal, 0)
  );

  let shippingCost = 0;
  let shippingDistanceKm = null;
  let finalAddressId = null;

  if (normalizedShippingMethod === "standard") {
    const shippingQuote = await buildShippingQuote({
      storeId: cart.fk_store,
      userId: resolvedUserId,
      addressId: resolvedAddressId
    });

    shippingCost = shippingQuote.shipping_cost;
    shippingDistanceKm = shippingQuote.distance_km;
    finalAddressId = resolvedAddressId;
  }

  const total = roundToTwoDecimals(itemsTotal + shippingCost);

  // Crear orden, items y marcar carrito como CHECKED_OUT en una sola transacción
  const createdOrder = await prisma.$transaction(async (tx) => {
    const order = await tx.orders.create({
      data: {
        user: {
          connect: { id_user: resolvedUserId }
        },
        store: {
          connect: { id_store: cart.fk_store }
        },
        cart: {
          connect: { id_cart: resolvedCartId }
        },
        ...(finalAddressId
          ? {
            address: {
              connect: { id_address: finalAddressId }
            }
          }
          : {}),
        total,
        shipping_cost: shippingCost,
        shipping_distance_km: shippingDistanceKm,
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

    //marcar el carrito como CHECKED_OUT
    await tx.carts.update({
      where: { id_cart: resolvedCartId },
      data: { cart_status: "CHECKED_OUT" }
    })

    return tx.orders.findUnique({
      where: { id_order: order.id_order },
      select: {
        id_order: true,
        order_status: true,
        total: true,
        shipping_cost: true,
        shipping_distance_km: true,
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
            price: true,
            original_price: true,
            is_offer_applied: true,
            subtotal: true,
            product: {
              select: {
                name: true
              }
            }
          }
        }
      }
    });
  });

  return mapOrderResponse(createdOrder);
};

/**
 * Obtener el historial de pedidos de un cliente.
 * Si el usuario autenticado es el mismo cliente, ve todos sus pedidos.
 * Si es un SELLER, solo puede ver los pedidos de ese cliente que pertenecen a su tienda.
 *
 * GET /api/users/:customerId/orders
 * Params:
 *   customerId — id del cliente cuyos pedidos se quieren ver
 */
export const getOrdersService = async (authenticatedUserId, customerId) => {
  const resolvedUserId = parsePositiveInteger(authenticatedUserId, "userId");
  const resolvedCustomerId = parsePositiveInteger(customerId, "customerId");

  let storeId = null;

  // si son distintos users, se verifica que el user auth sea SELLER y tenga un store con pedidos de customerId
  if (resolvedCustomerId !== resolvedUserId) {
    const store = await prisma.stores.findFirst({
      where: {
        fk_user: resolvedUserId,
        status: true,
        order: {
          some: {
            fk_user: resolvedCustomerId,
            status: true
          }
        }
      },
      select: { id_store: true }
    });
    if (!store) throw new ForbiddenError("No tienes permisos para ver estos pedidos");
    storeId = store.id_store;
  }

  const orders = await prisma.orders.findMany({
    where: {
      fk_user: resolvedCustomerId,
      status: true,
      ...(storeId && { fk_store: storeId }) // si el user es SELLER filtra pedidos por su tienda
    },
    orderBy: { created_at: "desc" },
    select: {
      id_order: true,
      order_status: true,
      total: true,
      shipping_cost: true,
      shipping_distance_km: true,
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
          price: true,
          original_price: true,
          is_offer_applied: true,
          subtotal: true
        }
      }
    }
  });

  return orders.map(mapOrderResponse);
};

export const getPendingDeliveryReviewsService = async (authenticatedUserId) => {
  const resolvedUserId = parsePositiveInteger(authenticatedUserId, "userId");

  const user = await prisma.users.findFirst({
    where: { id_user: resolvedUserId, status: true },
    select: { role: true }
  });

  if (!user) {
    throw new NotFoundError("Usuario no encontrado.");
  }

  if (user.role !== "CUSTOMER") {
    throw new ForbiddenError("Solo clientes pueden calificar deliveries.");
  }

  const reviewedOrders = await prisma.deliveryReviews.findMany({
    where: {
      fk_user: resolvedUserId,
      status: true
    },
    select: {
      fk_order: true
    }
  });

  const reviewedOrderIds = reviewedOrders.map((review) => review.fk_order);

  const pendingOrders = await prisma.orders.findMany({
    where: {
      fk_user: resolvedUserId,
      status: true,
      order_status: "DELIVERED",
      ...(reviewedOrderIds.length > 0
        ? {
          id_order: {
            notIn: reviewedOrderIds
          }
        }
        : {}),
      delivery_assignments: {
        some: { status: true }
      }
    },
    orderBy: {
      updated_at: "desc"
    },
    select: {
      id_order: true,
      updated_at: true,
      store: {
        select: {
          name: true
        }
      },
      delivery_assignments: {
        where: { status: true },
        orderBy: [{ assignment_sequence: "desc" }, { assigned_at: "desc" }],
        take: 1,
        select: {
          fk_delivery: true,
          delivery: {
            select: {
              user: {
                select: {
                  name: true
                }
              }
            }
          }
        }
      }
    }
  });

  return pendingOrders
    .map((order) => {
      const latestAssignment = order.delivery_assignments[0];
      if (!latestAssignment) return null;

      return {
        orderId: order.id_order,
        deliveryId: latestAssignment.fk_delivery,
        deliveryName: latestAssignment.delivery?.user?.name ?? "Delivery",
        storeName: order.store?.name ?? "Comercio",
        deliveredAt: order.updated_at
      };
    })
    .filter(Boolean);
};

export const createDeliveryReviewService = async (
  authenticatedUserId,
  orderId,
  { rating, comment }
) => {
  const resolvedUserId = parsePositiveInteger(authenticatedUserId, "userId");
  const resolvedOrderId = parsePositiveInteger(orderId, "orderId");
  const normalizedRating = Number(rating);
  const normalizedComment = typeof comment === "string" ? comment.trim() : "";

  if (
    !Number.isInteger(normalizedRating) ||
    normalizedRating < 1 ||
    normalizedRating > 5
  ) {
    throw new ValidationError("La calificación debe estar entre 1 y 5");
  }

  if (normalizedComment.length > 1000) {
    throw new ValidationError(
      "El comentario no puede superar los 1000 caracteres"
    );
  }

  const user = await prisma.users.findFirst({
    where: {
      id_user: resolvedUserId,
      status: true
    },
    select: {
      role: true
    }
  });

  if (!user) throw new NotFoundError("Usuario no encontrado.");

  if (user.role !== "CUSTOMER") {
    throw new ForbiddenError(
      "Solo clientes pueden calificar deliveries."
    );
  }

  const order = await prisma.orders.findFirst({
    where: {
      id_order: resolvedOrderId,
      fk_user: resolvedUserId,
      status: true
    },
    select: {
      id_order: true,
      order_status: true
    }
  });

  if (!order) {
    throw new NotFoundError("Pedido no encontrado");
  }

  if (order.order_status !== "DELIVERED") {
    throw new ValidationError(
      "Solo se pueden calificar pedidos entregados"
    );
  }

  const latestAssignment =
    await prisma.deliveryAssignments.findFirst({
      where: {
        fk_order: resolvedOrderId,
        status: true
      },
      orderBy: [
        { assignment_sequence: "desc" },
        { assigned_at: "desc" }
      ],
      select: {
        fk_delivery: true
      }
    });

  if (!latestAssignment) {
    throw new ValidationError(
      "El pedido no tiene delivery asignado"
    );
  }

  try {
    const created = await prisma.deliveryReviews.create({
      data: {
        fk_order: resolvedOrderId,
        fk_user: resolvedUserId,
        fk_delivery: latestAssignment.fk_delivery,
        rating: normalizedRating,
        comment: normalizedComment || null,
        status: true
      },
      select: {
        id_delivery_review: true,
        fk_order: true,
        fk_delivery: true,
        rating: true,
        comment: true,
        created_at: true
      }
    });

    return {
      id: created.id_delivery_review,
      orderId: created.fk_order,
      deliveryId: created.fk_delivery,
      rating: created.rating,
      comment: created.comment,
      createdAt: created.created_at
    };
  } catch (error) {
    if (
      error?.code === "P2002" &&
      error?.meta?.target?.includes("fk_order")
    ) {
      throw new ConflictError(
        "Este pedido ya tiene una calificación de delivery"
      );
    }

    throw error;
  }
};


/**
 * Obtener los pedidos de una tienda con filtros opcionales.
 * Solo el dueño del comercio puede acceder.
 *
 * GET /api/orders/store/:storeId
 * Params:
 *   storeId — id del comercio
 * Query:
 * {
 *   "order_status": "PENDING",       // opcional — filtra por estado
 *   "date_from": "2025-01-01",       // opcional — fecha inicio del rango
 *   "date_to": "2025-12-31",         // opcional — fecha fin del rango
 *   "page": 1,                       // opcional — pagina actual (default: 1)
 *   "limit": 10                      // opcional — resultados por página (default: 10)
 * }
 */
export const getStoreOrdersService = async (authenticatedUserId, storeId, filters) => {
  const resolvedUserId = parsePositiveInteger(authenticatedUserId, "userId");
  const resolvedStoreId = parsePositiveInteger(storeId, 'storeId');

  // validar que el comercio existe y pertenece al usuario autenticado
  const store = await prisma.stores.findFirst({
    where: { id_store: resolvedStoreId, fk_user: resolvedUserId, status: true }
  });

  if (!store) throw new NotFoundError("Comercio no encontrado.");

  const { order_status, date_from, date_to } = filters;
  const page = parsePositiveInteger(filters.page ?? 1, "page");
  const limit = parsePositiveInteger(filters.limit ?? 10, "limit");

  let statusFilter = undefined;
  if (order_status) {
    const estados = order_status.split(",").map(s => s.trim());
    statusFilter = estados.length === 1
      ? estados[0]
      : { in: estados };
  }

  const where = {
    fk_store: resolvedStoreId,
    status: true,
    ...(statusFilter && { order_status: statusFilter }),
    ...(date_from || date_to ? {
      created_at: {
        ...(date_from && { gte: new Date(date_from) }),
        ...(date_to && { lte: new Date(date_to) })
      }
    } : {})
  };

  const [orders, total] = await prisma.$transaction([
    prisma.orders.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id_order: true,
        order_status: true,
        total: true,
        shipping_cost: true,
        shipping_distance_km: true,
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
            price: true,
            original_price: true,
            is_offer_applied: true,
            subtotal: true
          }
        }
      }
    }),
    prisma.orders.count({ where })
  ]);

  return {
    orders: orders.map(mapOrderResponse),
    total,
    page,
    limit,
    total_page: Math.ceil(total / limit)
  };
};

/**
 * Actualizar el estado de un pedido según el rol del usuario autenticado.
 * Cada rol tiene transiciones permitidas específicas:
 *   - SELLER:   PENDING → PROCESSING (acepta) | PENDING → CANCELLED (rechaza) | PROCESSING → SHIPPED 
 *   - DELIVERY: SHIPPED → DELIVERED (entrega)
 *   - CUSTOMER: PENDING → CANCELLED (cancela antes de que el comercio acepte)
 *
 * PATCH /api/orders/:orderId/status
 * Params:
 *   orderId — id del pedido a modificar
 * Body:
 * {
 *   "order_status": "PROCESSING" // nuevo estado a asignar
 * }
 */
export const updateOrderStatusService = async (authenticatedUserId, orderId, order_status) => {
  const resolvedUserId = parsePositiveInteger(authenticatedUserId, "userId");
  const resolvedOrderId = parsePositiveInteger(orderId, "orderId");

  //obtener rol del usuario autenticado
  const user = await prisma.users.findFirst({
    where: { id_user: resolvedUserId, status: true },
    select: { role: true }
  });

  if (!user) throw new NotFoundError("Usuario no encontrado.");

  //validar que el pedido existe
  const order = await prisma.orders.findFirst({
    where: { id_order: resolvedOrderId, status: true },
    select: { id_order: true, order_status: true, fk_store: true }
  });

  if (!order) throw new NotFoundError("Pedido no encontrado.");

  //validar que el comercio del pedido pertenece al user de rol SELLER
  if (user.role === "SELLER") {
    const store = await prisma.stores.findFirst({
      where: { id_store: order.fk_store, fk_user: resolvedUserId, status: true }
    });

    if (!store) throw new ForbiddenError("No tienes permisos para modificar este pedido.");
  }

  //validar que el pedido pertenece al CUSTOMER autenticado
  if (user.role === "CUSTOMER") {
    const customerOrder = await prisma.orders.findFirst({
      where: { id_order: resolvedOrderId, fk_user: resolvedUserId, status: true }
    });

    if (!customerOrder) throw new ForbiddenError("No tienes permisos para modificar este pedido.");
  }

  //validar transiciones permitidas por rol de user autenticado
  const allowedTransitions = {
    SELLER: {
      PENDING: ["PROCESSING", "CANCELLED"],
      PROCESSING: ["SHIPPED"],
    },
    DELIVERY: {
      SHIPPED: ["DELIVERED"]
    },
    CUSTOMER: {
      PENDING: ["CANCELLED"] //el cliente puede cancelar solo hasta antes de que se acepte el pedido
    }
  };

  const roleTransitions = allowedTransitions[user.role]

  if (!roleTransitions) throw new ForbiddenError("No puedes modificar el estado del pedido.");

  const allowed = roleTransitions[order.order_status];

  if (!allowed) throw new ValidationError(`No se puede modificar un pedido en estado ${order.order_status}`);

  if (!allowed.includes(order_status)) throw new ValidationError(`Transicion invalida: ${order.order_status} a ${order_status}`);

  const updated = await prisma.$transaction(async (tx) => {
    const updatedOrder = await tx.orders.update({
      where: {
        id_order: resolvedOrderId,
        order_status: order.order_status  // condicional atómico — falla si otro request ya cambió el status
      },
      data: { order_status },
      select: {
        id_order: true,
        order_status: true,
        fk_store: true,
        total: true,
        shipping_cost: true,
        shipping_distance_km: true,
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
            price: true,
            original_price: true,
            is_offer_applied: true,
            subtotal: true
          }
        }
      }
    });

    if (!updatedOrder) {
      throw new ConflictError("El pedido fue modificado por otra solicitud, intente nuevamente");
    }

    if (order_status === "PROCESSING") {
      const existingPending = await tx.deliveryAssignments.findFirst({
        where: { fk_order: resolvedOrderId, assignment_status: "PENDING", status: true }
      });

      if (existingPending) {
        throw new ConflictError("Ya hay una asignación pendiente para este pedido");
      }

      const delivery = await tx.deliveries.findFirst({
        where: {
          fk_store: order.fk_store,
          delivery_status: "ACTIVE",
          status: true,
          delivery_assignments: {
            none: { assignment_status: "PENDING" }
          }
        }
      });

      if (!delivery) {
        throw new ValidationError("No hay deliveries disponibles para este comercio");
      }

      const lastAssignment = await tx.deliveryAssignments.findFirst({
        where: { fk_order: resolvedOrderId },
        orderBy: { assignment_sequence: "desc" },
        select: { assignment_sequence: true }
      });

      await tx.deliveryAssignments.create({
        data: {
          fk_order: resolvedOrderId,
          fk_delivery: delivery.id_delivery,
          assignment_status: "PENDING",
          assignment_sequence: (lastAssignment?.assignment_sequence || 0) + 1,
          status: true
        }
      });
    }

    return updatedOrder;
  });

  return mapOrderResponse(updated);
};