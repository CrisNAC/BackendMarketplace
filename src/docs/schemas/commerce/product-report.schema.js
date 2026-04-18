
export const productReportSchemas = {
  ProductReport: {
    type: "object",
    properties: {
      id_product_report: { type: "integer", example: 1 },
      reason: { type: "string", example: "Producto en mal estado" },
      description: { type: "string", example: "El producto llegó roto" },
      report_status: {
        type: "string",
        enum: ["PENDING", "IN_PROGRESS", "RESOLVED", "REJECTED"],
        example: "PENDING",
      },
      notes: { type: "string", nullable: true, example: "Se coordina reenvío del producto" },
      created_at: { type: "string", format: "date-time" },
      resolved_at: { type: "string", format: "date-time", nullable: true },
      reporter: {
        type: "object",
        properties: {
          id_user: { type: "integer" },
          name: { type: "string" },
          email: { type: "string" },
          phone: { type: "string" },
        },
      },
      product: {
        type: "object",
        properties: {
          id_product: { type: "integer" },
          name: { type: "string" },
          store: {
            type: "object",
            properties: {
              id_store: { type: "integer" },
              name: { type: "string" },
            },
          },
        },
      },
      order: {
        type: "object",
        properties: {
          id_order: { type: "integer" },
          created_at: { type: "string", format: "date-time" },
        },
      },
    },
  },

  ProductReportUpdated: {
    type: "object",
    properties: {
      id_product_report: { type: "integer", example: 1 },
      report_status: {
        type: "string",
        enum: ["PENDING", "IN_PROGRESS", "RESOLVED", "REJECTED"],
        example: "RESOLVED",
      },
      notes: { type: "string", nullable: true, example: "Se coordina reenvío del producto" },
      resolved_at: { type: "string", format: "date-time", nullable: true },
      resolver: {
        type: "object",
        properties: {
          id_user: { type: "integer" },
          name: { type: "string" },
        },
      },
    },
  },
};