export const bannerSchemas = {
  BannerPublicResponse: {
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
      createdAt: { type: "string", format: "date-time" }
    }
  },
  BannerPublicListResponse: {
    type: "array",
    items: { $ref: "#/components/schemas/BannerPublicResponse" }
  }
};
