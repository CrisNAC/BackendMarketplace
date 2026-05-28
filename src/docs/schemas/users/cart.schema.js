//cart.schema.js

export const cartSchemas = {
  CartItem: {
    type: "object",
    properties: {
      id: { type: "integer", example: 1 },
      quantity: { type: "integer", example: 2 },
      product: {
        type: "object",
        properties: {
          id: { type: "integer", example: 10 },
          name: { type: "string", example: "Laptop Dell" },
          price: { type: "number", example: 1500000 },
          originalPrice: { type: "number", example: 1500000 },
          offerPrice: { type: "number", nullable: true, example: 1350000 },
          isOffer: { type: "boolean", example: true },
          imageUrl: { type: "string", nullable: true, example: "https://cdn.example.com/products/10/image.jpg" }
        }
      }
    }
  },

  CartCommerceInfo: {
    type: "object",
    properties: {
      id: { type: "integer", example: 1 },
      name: { type: "string", example: "Electrónica Carlos" },
      logo: { type: "string", nullable: true, example: "https://cdn.example.com/stores/1/logo.jpg" }
    }
  },

  Cart: {
    type: "object",
    properties: {
      id: { type: "integer", example: 5 },
      storeId: { type: "integer", example: 1 },
      commerce: { $ref: "#/components/schemas/CartCommerceInfo" },
      status: { type: "string", example: "ACTIVE" },
      items: {
        type: "array",
        items: { $ref: "#/components/schemas/CartItem" }
      }
    }
  },

  GetCartsResponse: {
    type: "object",
    properties: {
      carts: {
        type: "array",
        items: { $ref: "#/components/schemas/Cart" }
      }
    }
  },

  DeleteCartResponse: {
    type: "object",
    properties: {
      success: { type: "boolean", example: true },
      message: { type: "string", example: "Carrito eliminado correctamente" }
    }
  },

  DeleteAllCartsResponse: {
    type: "object",
    properties: {
      success: { type: "boolean", example: true },
      message: { type: "string", example: "Todos los carritos fueron eliminados correctamente" }
    }
  },

  CartErrorResponse: {
    type: "object",
    properties: {
      message: { type: "string", example: "Carrito no encontrado" }
    }
  },

  CartValidationError: {
    type: "object",
    properties: {
      message: {
        type: "string",
        example: "No tienes permisos para eliminar este carrito"
      }
    }
  }
};