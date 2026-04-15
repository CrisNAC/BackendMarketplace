export const adminCategorySchemas = {
  AdminCategoryResponse: {
    type: "object",
    properties: {
      id: { type: "integer", example: 1 },
      name: { type: "string", example: "Electrónica" },
      status: { type: "boolean", example: true },
      productCount: { type: "integer", example: 42 },
      createdAt: { type: "string", format: "date-time" },
      updatedAt: { type: "string", format: "date-time" }
    }
  }
};