// src/docs/schemas/commerce/delivery-assignment.schema.js

export const deliveryAssignmentSchemas = {
  AvailableDelivery: {
    type: "object",
    properties: {
      id_delivery: { type: "integer", example: 1 },
      name: { type: "string", example: "Carlos López" },
      phone: { type: "string", example: "0981234567" },
      avatar_url: {
        type: "string",
        nullable: true,
        example: "https://cdn.example.com/deliveries/1/avatar.jpg"
      }
    }
  },
  DeliveryAddressInfo: {
    type: "object",
    properties: {
      address: { type: "string", example: "Av. Libertador 1234" },
      city: { type: "string", example: "Ciudad del Este" },
      region: { type: "string", nullable: true, example: "Centro" },
      postal_code: { type: "string", nullable: true, example: "3500" }
    }
  },
  GetAvailableDeliveriesResponse: {
    type: "object",
    properties: {
      order_id: { type: "integer", example: 5 },
      order_status: {
        type: "string",
        enum: ["PENDING", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"],
        example: "PENDING"
      },
      delivery_address: {
        oneOf: [
          { $ref: "#/components/schemas/DeliveryAddressInfo" },
          { type: "null" }
        ],
        description: "null si el pedido es retiro en tienda (pickup)"
      },
      available_deliveries: {
        type: "array",
        items: { $ref: "#/components/schemas/AvailableDelivery" }
      }
    }
  },
  DeliveryAssignmentErrorResponse: {
    type: "object",
    properties: {
      message: { type: "string", example: "Pedido no encontrado" }
    }
  },
  DeliveryAssignmentValidationError: {
    type: "object",
    properties: {
      message: {
        type: "string",
        example: "Solo se pueden delegar pedidos en estado PENDING o PROCESSING"
      }
    }
  },
  DeliveryAssignmentConflictError: {
    type: "object",
    properties: {
      message: {
        type: "string",
        example: "Este pedido ya tiene una asignación activa"
      }
    }
  }
};