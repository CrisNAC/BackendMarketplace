export const NOTIFICATION_MESSAGES = {
  ORDER_CONFIRMED: (orderId) => ({
    title: "¡Pedido confirmado!",
    message: `Tu pedido #${orderId} fue confirmado correctamente.`,
    reference_id: orderId
  }),
  ORDER_NO_DELIVERY_AVAILABLE: (orderId) => ({
    title: "Sin deliveries disponibles",
    message: `El pedido #${orderId} no pudo asignarse a un repartidor activo. Revisá tus deliveries activos o reasigná el pedido manualmente.`,
    reference_id: orderId
  }),
  ORDER_DELIVERY_REJECTED: (orderId) => ({
    title: "Repartidor rechazó el pedido",
    message: `Un repartidor rechazó el pedido #${orderId}. Se intentó asignar a otro repartidor disponible.`,
    reference_id: orderId
  }),
  ORDER_DELIVERY_OFFLINE: (orderId) => ({
    title: "Repartidor desconectado",
    message: `Un repartidor se desconectó con el pedido #${orderId} pendiente. Revisá la asignación en Mis Pedidos.`,
    reference_id: orderId
  }),
};