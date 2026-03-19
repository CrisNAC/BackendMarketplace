export const productTagSchemas = {
    ProductTagResponse: {
        type: "object",
        properties: {
            id: { type: "integer", example: 1 },
            name: { type: "string", example: "oferta" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" }
        }
    }
};