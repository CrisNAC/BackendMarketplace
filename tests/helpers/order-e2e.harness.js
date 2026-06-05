/**
 * Fixtures y mocks compartidos para e2e de POST /api/orders.
 */

export const ORDER_CREATE_CART = {
  id_cart: 7,
  fk_store: 3,
  order: null,
  items: [
    {
      fk_product: 30,
      quantity: 2,
      product: {
        id_product: 30,
        price: 100,
        offer_price: null,
        is_offer: false,
        status: true,
        visible: true,
        quantity: 5,
      },
    },
  ],
};

export const ORDER_CREATE_FIND_RESULT = {
  id_order: 500,
  fk_store: 3,
  order_status: "PENDING",
  delivery_unavailable: false,
  total: 200,
  shipping_cost: 0,
  shipping_distance_km: null,
  notes: null,
  created_at: new Date(),
  updated_at: new Date(),
  address: null,
  order_items: [
    {
      id_order_item: 1,
      quantity: 2,
      price: 100,
      original_price: 100,
      is_offer_applied: false,
      subtotal: 200,
      product: { name: "Producto 30" },
    },
  ],
};

/**
 * Prepara carrito, count, mocks de transacción y $transaction para confirmar pedido.
 */
export function setupOrderCreateE2e(prisma, vi, options = {}) {
  const { trackNotifications = false } = options;

  prisma.carts.findFirst.mockReset();
  prisma.orders.count.mockReset();
  prisma.$transaction.mockReset();

  prisma.carts.findFirst.mockResolvedValue(ORDER_CREATE_CART);
  prisma.orders.count.mockResolvedValue(0);

  const mockProductsUpdate = vi.fn().mockResolvedValue({});
  const mockOrderCreate = vi.fn().mockResolvedValue({ id_order: 500 });
  const mockOrderFind = vi.fn().mockResolvedValue(ORDER_CREATE_FIND_RESULT);
  const mockNotificationsCreate = vi.fn().mockResolvedValue({});

  prisma.$transaction.mockImplementation(async (fn) =>
    fn({
      orders: { create: mockOrderCreate, findUnique: mockOrderFind },
      orderItems: { createMany: vi.fn().mockResolvedValue({}) },
      products: { update: mockProductsUpdate },
      carts: {
        update: vi.fn().mockResolvedValue({}),
        updateMany: vi.fn().mockResolvedValue({}),
      },
      notifications: {
        create: trackNotifications
          ? mockNotificationsCreate
          : vi.fn().mockResolvedValue({}),
      },
    })
  );

  return {
    mockProductsUpdate,
    mockOrderCreate,
    mockOrderFind,
    mockNotificationsCreate,
  };
}
