/**
 * Schemas para solicitudes de categorías de productos
 * @module CategoryRequestSchemas
 */

export const categoryRequestSchemas = {
  CategoryRequestResponse: {
    type: "object",
    properties: {
      id: {
        type: "integer",
        description: "ID de la categoría creada como solicitud"
      },
      name: {
        type: "string",
        maxLength: 100,
        description: "Nombre de la categoría solicitada"
      },
      visible: {
        type: "boolean",
        description: "false indica solicitud pendiente, true indica categoría aprobada",
        example: false
      },
      status: {
        type: "boolean",
        description: "Estado lógico del registro",
        default: true
      },
      createdAt: {
        type: "string",
        format: "date-time",
        description: "Fecha de creación de la solicitud"
      },
      updatedAt: {
        type: "string",
        format: "date-time",
        description: "Fecha de última actualización de la solicitud"
      }
    }
  },
  CreateCategoryRequestBody: {
    type: "object",
    required: ["name"],
    properties: {
      name: {
        type: "string",
        minLength: 1,
        maxLength: 100,
        example: "Electrónica",
        description: "Nombre de la categoría a solicitar"
      }
    }
  },
  CategoryRequestErrorResponse: {
    type: "object",
    properties: {
      error: {
        type: "object",
        properties: {
          code: {
            type: "integer",
            description: "Código HTTP del error"
          },
          message: {
            type: "string",
            description: "Mensaje de error descriptivo"
          }
        }
      }
    }
  },
  CategoryRequestSuccessResponse: {
    type: "object",
    properties: {
      message: {
        type: "string",
        description: "Mensaje de confirmación"
      },
      data: {
        $ref: "#/components/schemas/CategoryRequestResponse"
      }
    }
  }
};
