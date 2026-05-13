export const NOTIFICATION_MESSAGES = {
  ORDER_CONFIRMED: (orderId) => ({
    title: "¡Pedido confirmado!",
    message: `Tu pedido #${orderId} fue confirmado correctamente.`,
    reference_id: orderId
  })
}