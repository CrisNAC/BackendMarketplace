/**
 * Swagger schemas para pedidos (órdenes) del cliente.
 */

export const orderSchemas = {
  ApiErrorEnvelope: {
    type: "object",
    description: "Cuerpo de error devuelto por AppError (errorHandler)",
    properties: {
      error: {
        type: "object",
        properties: {
          code: { type: "integer", description: "Código HTTP", example: 400 },
          message: { type: "string", example: "La calificación debe estar entre 1 y 5" }
        },
        required: ["code", "message"]
      }
    },
    required: ["error"]
  },
  PendingDeliveryReviewItem: {
    type: "object",
    description: "Pedido entregado con delivery asignado, pendiente de calificación por el cliente",
    properties: {
      orderId: { type: "integer", example: 42 },
      deliveryId: { type: "integer", example: 3 },
      deliveryName: { type: "string", example: "María Gómez" },
      storeName: { type: "string", example: "Tienda Central" },
      deliveredAt: { type: "string", format: "date-time" }
    },
    required: ["orderId", "deliveryId", "deliveryName", "storeName", "deliveredAt"]
  },
  PendingDeliveryReviewsResponse: {
    type: "array",
    items: { $ref: "#/components/schemas/PendingDeliveryReviewItem" }
  },
  CreateDeliveryReviewRequest: {
    type: "object",
    required: ["rating"],
    properties: {
      rating: {
        type: "integer",
        minimum: 1,
        maximum: 5,
        description: "Calificación entera del 1 al 5"
      },
      comment: {
        type: "string",
        maxLength: 1000,
        description: "Comentario opcional (máximo 1000 caracteres)"
      }
    }
  },
  CreateDeliveryReviewResponse: {
    type: "object",
    properties: {
      id: { type: "integer", description: "id_delivery_review", example: 10 },
      orderId: { type: "integer", example: 42 },
      deliveryId: { type: "integer", example: 3 },
      rating: { type: "integer", minimum: 1, maximum: 5, example: 5 },
      comment: { type: "string", nullable: true, example: "Muy puntual" },
      createdAt: { type: "string", format: "date-time" }
    },
    required: ["id", "orderId", "deliveryId", "rating", "createdAt"]
  }
};
