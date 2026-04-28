/**
 * Swagger schemas para entregas / deliveries.
 */

export const deliverySchemas = {
  DeliveryStatusResponse: {
    type: "object",
    properties: {
      id_delivery: {
        type: "integer",
        description: "ID del delivery"
      },
      delivery_status: {
        type: "string",
        enum: ["ACTIVE", "INACTIVE"],
        description: "Estado de disponibilidad del delivery"
      },
      status: {
        type: "boolean",
        description: "Estado lógico del registro"
      },
      updatedAt: {
        type: "string",
        format: "date-time",
        description: "Fecha de última actualización"
      }
    }
  },
  UpdateDeliveryStatusBody: {
    type: "object",
    required: ["delivery_status"],
    properties: {
      delivery_status: {
        type: "string",
        enum: ["ACTIVE", "INACTIVE"],
        example: "ACTIVE",
        description: "Disponibilidad del delivery para recibir pedidos"
      }
    }
  },
  DeliveryStatusSuccessResponse: {
    type: "object",
    properties: {
      message: {
        type: "string",
        example: "Estado del delivery actualizado exitosamente"
      },
      data: {
        $ref: "#/components/schemas/DeliveryStatusResponse"
      }
    }
  },
  DeliveryStatusErrorResponse: {
    type: "object",
    properties: {
      error: {
        type: "object",
        properties: {
          code: { type: "integer", example: 400 },
          message: { type: "string", example: "delivery_status debe ser ACTIVE o INACTIVE" }
        }
      }
    }
  },
  DeliveryStatusForbiddenResponse: {
    type: "object",
    properties: {
      error: {
        type: "object",
        properties: {
          code: { type: "integer", example: 403 },
          message: { type: "string", example: "No tienes permiso para actualizar este delivery" }
        }
      }
    }
  },
  DeliveryStatusNotFoundResponse: {
    type: "object",
    properties: {
      error: {
        type: "object",
        properties: {
          code: { type: "integer", example: 404 },
          message: { type: "string", example: "Delivery no encontrado" }
        }
      }
    }
  }
};