/**
 * Stubs orders.count para mapOrderResponse/generateOrderNumber en e2e de creación de pedidos.
 */
export function stubOrderCountForCreateOrder(prisma, count = 0) {
  prisma.orders.count.mockResolvedValue(count);
}
