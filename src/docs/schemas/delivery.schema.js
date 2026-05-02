/**
 * Swagger schemas para entregas / deliveries.
 */

export const deliverySchemas = {
  DeliveryReviewItem: {
    type: "object",
    properties: {
      id: { type: "integer", example: 1 },
      orderId: { type: "integer", example: 120 },
      customerName: { type: "string", example: "Juan" },
      rating: { type: "integer", example: 5 },
      comment: { type: "string", example: "Entrega rápida" },
      createdAt: { type: "string", format: "date-time" }
    }
  },
  DeliveryReviewListResponse: {
    type: "object",
    properties: {
      total: { type: "integer", example: 2 },
      reviews: {
        type: "array",
        items: { $ref: "#/components/schemas/DeliveryReviewItem" }
      }
    }
  },
  DeliveryRegisterBody: {
    type: "object",
    required: ["vehicleType"],
    properties: {
      vehicleType: {
        type: "string",
        enum: ["CAR", "MOTORCYCLE", "BICYCLE", "ON_FOOT"],
        example: "MOTORCYCLE",
        description: "Tipo de vehiculo del delivery"
      }
    }
  },
  DeliveryRegisterResponseUser: {
    type: "object",
    properties: {
      id_user: { type: "integer", example: 10 },
      name: { type: "string", example: "Juan" },
      email: { type: "string", example: "juan@test.com" },
      phone: { type: "string", example: "0987654321" },
      role: { type: "string", example: "DELIVERY" }
    }
  },
  DeliveryRegisterResponseDelivery: {
    type: "object",
    properties: {
      id_delivery: { type: "integer", example: 3 },
      fk_user: { type: "integer", example: 10 },
      fk_store: { type: "integer", nullable: true, example: null },
      delivery_status: { type: "string", enum: ["ACTIVE", "INACTIVE", "SUSPENDED"], example: "INACTIVE" },
      vehicle_type: { type: "string", enum: ["CAR", "MOTORCYCLE", "BICYCLE", "ON_FOOT"], example: "MOTORCYCLE" },
      status: { type: "boolean", example: true }
    }
  },
  DeliveryRegisterSuccessResponse: {
    type: "object",
    properties: {
      user: { $ref: "#/components/schemas/DeliveryRegisterResponseUser" },
      delivery: { $ref: "#/components/schemas/DeliveryRegisterResponseDelivery" }
    }
  },
  DeliveryRegisterErrorResponse: {
    type: "object",
    properties: {
      error: {
        type: "object",
        properties: {
          code: { type: "integer", example: 400 },
          message: { type: "string", example: "Datos inválidos" }
        }
      }
    }
  },
  DeliveryRegisterForbiddenResponse: {
    type: "object",
    properties: {
      error: {
        type: "object",
        properties: {
          code: { type: "integer", example: 403 },
          message: { type: "string", example: "Solo un usuario CUSTOMER puede registrarse como delivery" }
        }
      }
    }
  },
  DeliveryRegisterNotFoundResponse: {
    type: "object",
    properties: {
      error: {
        type: "object",
        properties: {
          code: { type: "integer", example: 404 },
          message: { type: "string", example: "Usuario no encontrado" }
        }
      }
    }
  },
  DeliveryRegisterConflictResponse: {
    type: "object",
    properties: {
      error: {
        type: "object",
        properties: {
          code: { type: "integer", example: 409 },
          message: { type: "string", example: "El usuario ya está registrado como delivery" }
        }
      }
    }
  },
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
  },
  QueryValidationErrorResponse: {
    type: "object",
    properties: {
      error: {
        type: "object",
        properties: {
          code: { type: "integer", example: 400 },
          message: { type: "string", example: "Datos inválidos" },
          details: {
            type: "array",
            items: {
              type: "object",
              properties: {
                field: { type: "string", example: "period" },
                message: { type: "string", example: "Invalid enum value" }
              }
            }
          }
        }
      }
    }
  }
};