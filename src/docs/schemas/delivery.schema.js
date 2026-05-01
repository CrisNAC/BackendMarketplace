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
  },
  DeliveryAssignmentResponse: {
    type: "object",
    properties: {
      id_delivery_assignment: { type: "integer", example: 1 },
      fk_order: { type: "integer", example: 100 },
      fk_delivery: { type: "integer", example: 1 },
      assignment_status: {
        type: "string",
        enum: ["PENDING", "ACCEPTED", "REJECTED", "DELIVERED"],
        example: "PENDING"
      },
      assignment_sequence: { type: "integer", example: 1 },
      status: { type: "boolean", example: true },
      created_at: { type: "string", format: "date-time" }
    }
  },
  DeliveryResponseBody: {
    type: "object",
    required: ["action"],
    properties: {
      action: {
        type: "string",
        enum: ["ACCEPT", "REJECT"],
        example: "ACCEPT",
        description: "Acción del delivery sobre el pedido asignado"
      }
    }
  },
  DeliveryResponseSuccess: {
    type: "object",
    properties: {
      id_delivery_assignment: { type: "integer", example: 1 },
      fk_order: { type: "integer", example: 100 },
      fk_delivery: { type: "integer", example: 1 },
      assignment_status: {
        type: "string",
        enum: ["ACCEPTED", "REJECTED"],
        example: "ACCEPTED"
      },
      assignment_sequence: { type: "integer", example: 1 }
    }
  },
  DeliveryResponseNotFound: {
    type: "object",
    properties: {
      error: {
        type: "object",
        properties: {
          code: { type: "integer", example: 404 },
          message: { type: "string", example: "No hay asignación pendiente para este pedido" }
        }
      }
    }
  },
  DeliveryResponseForbidden: {
    type: "object",
    properties: {
      error: {
        type: "object",
        properties: {
          code: { type: "integer", example: 403 },
          message: { type: "string", example: "No tienes permiso para responder esta asignación" }
        }
      }
    }
  },
  DeliveryResponseNoAvailable: {
    type: "object",
    properties: {
      error: {
        type: "object",
        properties: {
          code: { type: "integer", example: 404 },
          message: { type: "string", example: "No hay deliveries disponibles, el pedido vuelve a pendiente" }
        }
      }
    }
  },
  DeliveryOrderHistoryResponse: {
    type: "object",
    properties: {
      content: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id_delivery_assignment: { type: "integer", example: 1 },
            assignment_status: {
              type: "string",
              enum: ["PENDING", "ACCEPTED", "REJECTED", "DELIVERED"],
              example: "DELIVERED"
            },
            assignment_sequence: { type: "integer", example: 1 },
            created_at: { type: "string", format: "date-time" },
            order: {
              type: "object",
              properties: {
                id_order: { type: "integer", example: 100 },
                order_status: { type: "string", example: "DELIVERED" },
                total: { type: "number", example: 150000 },
                shipping_cost: { type: "number", example: 10000 },
                created_at: { type: "string", format: "date-time" },
                user: {
                  type: "object",
                  properties: {
                    id_user: { type: "integer", example: 1 },
                    name: { type: "string", example: "Juan Pérez" }
                  }
                },
                store: {
                  type: "object",
                  properties: {
                    id_store: { type: "integer", example: 1 },
                    name: { type: "string", example: "Mi Comercio" }
                  }
                }
              }
            }
          }
        }
      },
      total_elements: { type: "integer", example: 50 },
      total_pages: { type: "integer", example: 3 },
      page: { type: "integer", example: 1 },
      size: { type: "integer", example: 20 }
    }
  }
};