export const adminBannerSchemas = {
  AdminBannerCreateBody: {
    type: "object",
    required: ["title", "imageUrl", "startAt"],
    properties: {
      title: { type: "string", minLength: 1, maxLength: 120, example: "Semana Eco" },
      description: { type: "string", nullable: true, example: "Descuentos hasta 30%" },
      imageUrl: { type: "string", example: "https://cdn.example.com/banners/eco.jpg" },
      linkUrl: { type: "string", nullable: true, example: "https://frontend.example.com/ofertas" },
      startAt: { type: "string", format: "date-time" },
      endAt: { type: "string", format: "date-time", nullable: true },
      isActive: { type: "boolean", example: true }
    }
  },
  AdminBannerUpdateBody: {
    type: "object",
    properties: {
      title: { type: "string", minLength: 1, maxLength: 120, example: "Semana Eco" },
      description: { type: "string", nullable: true, example: "Descuentos hasta 30%" },
      imageUrl: { type: "string", example: "https://cdn.example.com/banners/eco.jpg" },
      linkUrl: { type: "string", nullable: true, example: "https://frontend.example.com/ofertas" },
      startAt: { type: "string", format: "date-time" },
      endAt: { type: "string", format: "date-time", nullable: true },
      isActive: { type: "boolean", example: true }
    }
  },
  AdminBannerToggleBody: {
    type: "object",
    required: ["isActive"],
    properties: {
      isActive: { type: "boolean", example: false }
    }
  },
  AdminBannerResponse: {
    type: "object",
    properties: {
      id: { type: "integer", example: 12 },
      title: { type: "string", example: "Semana Eco" },
      description: { type: "string", nullable: true, example: "Descuentos hasta 30%" },
      imageUrl: { type: "string", example: "https://cdn.example.com/banners/eco.jpg" },
      linkUrl: { type: "string", nullable: true, example: "https://frontend.example.com/ofertas" },
      startAt: { type: "string", format: "date-time" },
      endAt: { type: "string", format: "date-time", nullable: true },
      isActive: { type: "boolean", example: true },
      status: { type: "boolean", example: true },
      createdAt: { type: "string", format: "date-time" },
      updatedAt: { type: "string", format: "date-time" }
    }
  },
  AdminBannerListResponse: {
    type: "object",
    properties: {
      data: {
        type: "array",
        items: { $ref: "#/components/schemas/AdminBannerResponse" }
      },
      pagination: {
        type: "object",
        properties: {
          total: { type: "integer", example: 3 },
          page: { type: "integer", example: 1 },
          limit: { type: "integer", example: 20 },
          totalPages: { type: "integer", example: 1 }
        }
      }
    }
  }
};
