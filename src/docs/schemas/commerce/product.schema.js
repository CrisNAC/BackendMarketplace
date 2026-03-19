export const productSchemas = {
    // ─── REQUESTS ──────────────────────────────────────────────────
    CreateProductRequest: {
        type: "object",
        required: ["name", "price", "categoryId"],
        properties: {
            name: { type: "string", maxLength: 100, example: "Auriculares Bluetooth" },
            price: { type: "number", example: 150000 },
            categoryId: { type: "integer", example: 3 },
            description: { type: "string", nullable: true, example: "Auriculares de alta calidad" },
            quantity: { type: "integer", nullable: true, example: 50 },
            tags: {
                type: "array",
                items: { type: "integer" },
                example: [1, 2]
            },
            visible: { type: "boolean", example: true }
        }
    },

    UpdateProductRequest: {
        type: "object",
        properties: {
            name: { type: "string", maxLength: 100, example: "Auriculares Bluetooth Pro" },
            price: { type: "number", example: 200000 },
            categoryId: { type: "integer", example: 3 },
            description: { type: "string", nullable: true },
            quantity: { type: "integer", nullable: true },
            tags: { type: "array", items: { type: "integer" }, example: [1] },
            visible: { type: "boolean", example: true }
        }
    },

    // ─── RESPONSES ─────────────────────────────────────────────────
    ProductResponse: {
        type: "object",
        properties: {
            id: { type: "integer", example: 1 },
            name: { type: "string", example: "Auriculares Bluetooth" },
            description: { type: "string", nullable: true },
            price: { type: "number", example: 150000 },
            quantity: { type: "integer", nullable: true, example: 50 },
            categoryId: { type: "integer", example: 3 },
            category: {
                type: "object",
                nullable: true,
                properties: {
                    id: { type: "integer", example: 3 },
                    name: { type: "string", example: "Audio" },
                    status: { type: "boolean", example: true }
                }
            },
            tags: {
                type: "array",
                items: {
                    type: "object",
                    properties: {
                        id: { type: "integer", example: 1 },
                        name: { type: "string", example: "oferta" }
                    }
                }
            },
            commerce: {
                type: "object",
                nullable: true,
                properties: {
                    id: { type: "integer", example: 1 },
                    name: { type: "string", example: "Mi Comercio" }
                }
            },
            averageRating: { type: "number", nullable: true, example: 4.5 },
            reviewCount: { type: "integer", example: 10 },
            visible: { type: "boolean", example: true },
            status: { type: "string", enum: ["active", "pending"], example: "active" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" }
        }
    },

    ProductSearchItemResponse: {
        type: "object",
        properties: {
            id_product: { type: "integer", example: 1 },
            name: { type: "string", example: "Auriculares Bluetooth" },
            description: { type: "string", nullable: true },
            price: { type: "number", example: 150000 },
            store: {
                type: "object",
                nullable: true,
                properties: {
                    id_store: { type: "integer", example: 1 },
                    name: { type: "string", example: "Mi Comercio" }
                }
            }
        }
    },

    ProductSearchResponse: {
        type: "object",
        properties: {
            products: {
                type: "array",
                items: { $ref: "#/components/schemas/ProductSearchItemResponse" }
            },
            pagination: {
                type: "object",
                properties: {
                    totalProducts: { type: "integer", example: 100 },
                    page: { type: "integer", example: 1 },
                    limit: { type: "integer", example: 20 },
                    totalPages: { type: "integer", example: 5 }
                }
            }
        }
    },

    CompareProductsResponse: {
        type: "object",
        properties: {
            product: {
                type: "object",
                nullable: true,
                properties: {
                    productId: { type: "integer", example: 1 },
                    name: { type: "string", example: "Auriculares Bluetooth" },
                    description: { type: "string", nullable: true },
                    price: { type: "number", example: 150000 },
                    store: {
                        type: "object",
                        nullable: true,
                        properties: {
                            id: { type: "integer", example: 1 },
                            name: { type: "string", example: "Mi Comercio" }
                        }
                    }
                }
            },
            offers: {
                type: "array",
                items: {
                    type: "object",
                    properties: {
                        productId: { type: "integer", example: 2 },
                        name: { type: "string", example: "Auriculares Bluetooth" },
                        description: { type: "string", nullable: true },
                        price: { type: "number", example: 120000 },
                        store: {
                            type: "object",
                            nullable: true,
                            properties: {
                                id: { type: "integer", example: 2 },
                                name: { type: "string", example: "Otro Comercio" }
                            }
                        }
                    }
                }
            },
            pagination: {
                type: "object",
                nullable: true,
                properties: {
                    totalProducts: { type: "integer", example: 5 },
                    page: { type: "integer", example: 1 },
                    limit: { type: "integer", example: 50 },
                    totalPages: { type: "integer", example: 1 }
                }
            }
        }
    }
};