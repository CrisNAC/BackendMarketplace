export const adminCategorySchemas = {
  AdminCreateCategoryBody: {
    type: "object",
    required: ["name"],
    properties: {
      name: {
        type: "string",
        minLength: 1,
        maxLength: 100,
        example: "Electrónica"
      }
    }
  },
  AdminCreateCategoryResponse: {
    type: "object",
    properties: {
      id: { type: "integer", example: 15 },
      name: { type: "string", example: "Electrónica" },
      visible: { type: "boolean", example: true },
      status: { type: "boolean", example: true },
      createdAt: { type: "string", format: "date-time" }
    }
  },
  AdminCategoryResponse: {
    type: "object",
    properties: {
      id: { type: "integer", example: 1 },
      name: { type: "string", example: "Electrónica" },
      visible: { type: "boolean", example: true },
      productCount: { type: "integer", example: 42 },
      createdAt: { type: "string", format: "date-time" },
      updatedAt: { type: "string", format: "date-time" }
    }
  },
  AdminCategoryListResponse: {
    type: "object",
    properties: {
      data: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "integer", example: 1 },
            name: { type: "string", example: "Electrónica" },
            status: { type: "boolean", example: true },
            visible: { type: "boolean", example: true },
            productCount: { type: "integer", example: 42 }
          }
        }
      },
      categoryTotal: { type: "integer", example: 10 },
      categoryPage: { type: "integer", example: 1 },
      categoryLimit: { type: "integer", example: 20 },
      categoryTotalPages: { type: "integer", example: 1 }
    }
  },

  AdminCategoryWithProductsListResponse: {
    type: "object",
    properties: {
      data: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "integer", example: 1 },
            name: { type: "string", example: "Electrónica" },
            status: { type: "boolean", example: true },
            visible: { type: "boolean", example: true },
            productCount: { type: "integer", example: 42 },
            products: {
              type: "object",
              properties: {
                data: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      id: { type: "integer", example: 1 },
                      name: { type: "string", example: "Auriculares Bluetooth" },
                      price: { type: "number", example: 120000 },
                      originalPrice: { type: "number", example: 150000 },
                      offerPrice: { type: "number", nullable: true, example: 120000 },
                      isOffer: { type: "boolean", example: true },
                      status: { type: "boolean", example: true },
                      visible: { type: "boolean", example: true }
                    }
                  }
                },
                total: { type: "integer", example: 5 },
                productPage: { type: "integer", example: 1 },
                productLimit: { type: "integer", example: 20 },
                productTotalPages: { type: "integer", example: 1 }
              }
            }
          }
        }
      },
      categoryTotal: { type: "integer", example: 10 },
      categoryPage: { type: "integer", example: 1 },
      categoryLimit: { type: "integer", example: 20 },
      categoryTotalPages: { type: "integer", example: 1 }
    }
  },

  AdminCategoryRequestDecision: {
    type: "object",
    required: ["decision"],
    properties: {
      decision: {
        type: "string",
        enum: ["approve", "reject"],
        example: "approve"
      }
    }
  },

  AdminCategoryRequestDecisionResponse: {
    type: "object",
    properties: {
      id: { type: "integer", example: 25 },
      name: { type: "string", example: "Electrónica gamer" },
      visible: { type: "boolean", example: true },
      status: { type: "boolean", example: true },
      decision: { type: "string", example: "approve" },
      createdAt: { type: "string", format: "date-time" },
      updatedAt: { type: "string", format: "date-time" }
    }
  }
};