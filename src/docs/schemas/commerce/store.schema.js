export const storeSchemas = {
    // ─── REQUESTS ──────────────────────────────────────────────────
    CreateStoreRequest: {
        type: "object",
        required: ["fk_store_category", "name", "email", "phone", "address", "city", "region"],
        properties: {
            fk_store_category: { type: "integer", example: 2 },
            name: { type: "string", maxLength: 100, example: "Mi Comercio" },
            email: { type: "string", format: "email", example: "comercio@mail.com" },
            phone: { type: "string", maxLength: 20, example: "0981123456" },
            description: { type: "string", nullable: true, example: "Descripción del comercio" },
            logo: { type: "string", nullable: true, example: "https://example.com/logo.png" },
            website_url: { type: "string", nullable: true, example: "https://micomercio.com" },
            instagram_url: { type: "string", nullable: true, example: "https://instagram.com/micomercio" },
            tiktok_url: { type: "string", nullable: true, example: "https://tiktok.com/@micomercio" },
            address: { type: "string", example: "Av. España 1234" },
            city: { type: "string", maxLength: 100, example: "Asunción" },
            region: { type: "string", maxLength: 100, example: "Villa Morra" },
            postal_code: { type: "string", maxLength: 20, nullable: true, example: "1209" }
        }
    },

    UpdateStoreRequest: {
        type: "object",
        properties: {
            fk_store_category: { type: "integer", example: 2 },
            name: { type: "string", maxLength: 100, example: "Mi Comercio Actualizado" },
            email: { type: "string", format: "email", example: "nuevo@mail.com" },
            phone: { type: "string", maxLength: 20, example: "0981999999" },
            description: { type: "string", nullable: true },
            logo: { type: "string", nullable: true },
            website_url: { type: "string", nullable: true },
            instagram_url: { type: "string", nullable: true },
            tiktok_url: { type: "string", nullable: true },
            address: { type: "string" },
            city: { type: "string", maxLength: 100 },
            region: { type: "string", maxLength: 100 },
            postal_code: { type: "string", maxLength: 20, nullable: true }
        }
    },

    // ─── RESPONSES ─────────────────────────────────────────────────
    StoreProductNestedResponse: {
        type: "object",
        properties: {
            id_product: { type: "integer", example: 1 },
            name: { type: "string", example: "Auriculares Bluetooth" },
            price: { type: "number", example: 150000 },
            quantity: { type: "integer", nullable: true, example: 50 },
            visible: { type: "boolean", example: true },
            product_category: {
                type: "object",
                nullable: true,
                properties: {
                    id_product_category: { type: "integer", example: 3 },
                    name: { type: "string", example: "Audio" }
                }
            }
        }
    },

    StoreResponse: {
        type: "object",
        properties: {
            id_store: { type: "integer", example: 1 },
            name: { type: "string", example: "Mi Comercio" },
            email: { type: "string", example: "comercio@mail.com" },
            phone: { type: "string", example: "0981123456" },
            description: { type: "string", nullable: true },
            logo: { type: "string", nullable: true },
            website_url: { type: "string", nullable: true },
            instagram_url: { type: "string", nullable: true },
            tiktok_url: { type: "string", nullable: true },
            status: { type: "boolean", example: true },
            created_at: { type: "string", format: "date-time" },
            updated_at: { type: "string", format: "date-time" },
            user: {
                type: "object",
                properties: {
                    id_user: { type: "integer", example: 1 },
                    name: { type: "string", example: "Juan Pérez" },
                    email: { type: "string", example: "juan@mail.com" }
                }
            },
            store_category: {
                type: "object",
                nullable: true,
                properties: {
                    id_store_category: { type: "integer", example: 2 },
                    name: { type: "string", example: "Electrónica" }
                }
            },
            products: {
                type: "array",
                items: { $ref: "#/components/schemas/StoreProductNestedResponse" }
            },
            addresses: {
                type: "array",
                items: {
                    type: "object",
                    properties: {
                        id_address: { type: "integer", example: 1 },
                        address: { type: "string", example: "Av. España 1234" },
                        city: { type: "string", example: "Asunción" },
                        region: { type: "string", example: "Villa Morra" },
                        postal_code: { type: "string", nullable: true }
                    }
                }
            }
        }
    },

    StoreListItemResponse: {
        type: "object",
        properties: {
            id_store: { type: "integer", example: 1 },
            name: { type: "string", example: "Mi Comercio" },
            description: { type: "string", nullable: true },
            logo: { type: "string", nullable: true },
            status: { type: "boolean", example: true },
            store_category: {
                type: "object",
                nullable: true,
                properties: {
                    id_store_category: { type: "integer", example: 2 },
                    name: { type: "string", example: "Electrónica" }
                }
            }
        }
    },

    StoreProductResponse: {
        type: "object",
        properties: {
            id_product: { type: "integer", example: 1 },
            name: { type: "string", example: "Auriculares Bluetooth" },
            description: { type: "string", nullable: true },
            price: { type: "number", example: 150000 },
            quantity: { type: "integer", nullable: true },
            visible: { type: "boolean", example: true },
            created_at: { type: "string", format: "date-time" },
            product_category: {
                type: "object",
                nullable: true,
                properties: {
                    id_product_category: { type: "integer", example: 3 },
                    name: { type: "string", example: "Audio" }
                }
            }
        }
    },

    StoreProductsPageResponse: {
        type: "object",
        properties: {
            content: {
                type: "array",
                items: { $ref: "#/components/schemas/StoreProductResponse" }
            },
            total_elements: { type: "integer", example: 68 },
            total_pages: { type: "integer", example: 4 },
            size: { type: "integer", example: 20 },
            page: { type: "integer", example: 1 }
        }
    }
};