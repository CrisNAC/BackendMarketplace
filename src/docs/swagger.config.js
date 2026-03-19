import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";

const options = {
    definition: {
        openapi: "3.0.0",
        info: {
            title: "Marketplace API",
            version: "1.0.0",
            description: "Documentación de la API del OpenMarket"
        },
        servers: [
            {
                url: "http://localhost:3000",
                description: "Servidor local"
            },
            {
                url: "https://backendmarketplace-test.onrender.com",
                description: "Servidor de testeo en Render"
            },
            {
                url: "https://backendmarketplace-4cgb.onrender.com",
                description: "Servidor de producción en Render"
            }
        ],
        tags: [
            { name: "Session", description: "Autenticación y sesión" },
            { name: "Commerces", description: "Gestión de comercios" },
            { name: "Products", description: "Gestión de productos" },
            { name: "Reviews", description: "Reseñas de productos" }
        ],
        components: {
            securitySchemes: {
                cookieAuth: {
                    type: "apiKey",
                    in: "cookie",
                    name: "userToken"
                }
            },
            schemas: {
                // ─── RESPONSES COMUNES ────────────────────────────────
                ErrorResponse: {
                    type: "object",
                    properties: {
                        message: { type: "string", example: "Error interno del servidor" }
                    }
                },
                ValidationErrorResponse: {
                    type: "object",
                    properties: {
                        message: { type: "string", example: "Error de validación" },
                        errors: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    field: { type: "string", example: "email" },
                                    message: { type: "string", example: "email no tiene formato válido" }
                                }
                            }
                        }
                    }
                },

                // ─── SESSION ─────────────────────────────────────────
                LoginRequest: {
                    type: "object",
                    required: ["email", "password"],
                    properties: {
                        email: { type: "string", format: "email", example: "vendedor@mail.com" },
                        password: { type: "string", example: "password123" }
                    }
                },
                LoginResponse: {
                    type: "object",
                    properties: {
                        success: { type: "boolean", example: true },
                        message: { type: "string", example: "Login exitoso" },
                        user: {
                            type: "object",
                            properties: {
                                id_user: { type: "integer", example: 1 },
                                name: { type: "string", example: "Juan Pérez" },
                                email: { type: "string", example: "vendedor@mail.com" },
                                role: { type: "string", enum: ["ADMIN", "CUSTOMER", "SELLER", "DELIVERY"] }
                            }
                        }
                    }
                },
                UserSessionResponse: {
                    type: "object",
                    properties: {
                        success: { type: "boolean", example: true },
                        user: {
                            type: "object",
                            properties: {
                                id_user: { type: "integer", example: 1 },
                                name: { type: "string", example: "Juan Pérez" },
                                email: { type: "string", example: "vendedor@mail.com" },
                                phone: { type: "string", nullable: true, example: "0981123456" },
                                role: { type: "string", example: "SELLER" },
                                id_store: { type: "integer", nullable: true, example: 3 }
                            }
                        }
                    }
                },

                // ─── STORE ───────────────────────────────────────────
                CreateStoreRequest: {
                    type: "object",
                    required: ["fk_user", "fk_store_category", "name", "email", "phone"],
                    properties: {
                        fk_user: { type: "integer", example: 1 },
                        fk_store_category: { type: "integer", example: 2 },
                        name: { type: "string", example: "Mi Comercio" },
                        email: { type: "string", format: "email", example: "comercio@mail.com" },
                        phone: { type: "string", example: "0981123456" },
                        description: { type: "string", nullable: true, example: "Descripción del comercio" },
                        logo: { type: "string", nullable: true, example: "https://example.com/logo.png" },
                        website_url: { type: "string", nullable: true, example: "https://micomercio.com" },
                        instagram_url: { type: "string", nullable: true, example: "https://instagram.com/micomercio" },
                        tiktok_url: { type: "string", nullable: true, example: "https://tiktok.com/@micomercio" }
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
                        fk_user: { type: "integer", example: 1 },
                        store_category: {
                            type: "object",
                            nullable: true,
                            properties: {
                                id_store_category: { type: "integer", example: 2 },
                                name: { type: "string", example: "Electrónica" }
                            }
                        },
                        created_at: { type: "string", format: "date-time" },
                        updated_at: { type: "string", format: "date-time" }
                    }
                },

                // ─── PRODUCT ─────────────────────────────────────────
                CreateProductRequest: {
                    type: "object",
                    required: ["name", "price", "categoryId"],
                    properties: {
                        name: { type: "string", example: "Auriculares Bluetooth" },
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
                ProductResponse: {
                    type: "object",
                    properties: {
                        id_product: { type: "integer", example: 1 },
                        name: { type: "string", example: "Auriculares Bluetooth" },
                        description: { type: "string", nullable: true },
                        price: { type: "number", example: 150000 },
                        quantity: { type: "integer", nullable: true, example: 50 },
                        visible: { type: "boolean", example: true },
                        fk_store: { type: "integer", example: 1 },
                        product_category: {
                            type: "object",
                            nullable: true,
                            properties: {
                                id_product_category: { type: "integer", example: 3 },
                                name: { type: "string", example: "Audio" }
                            }
                        },
                        tags: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    id_product_tag: { type: "integer", example: 1 },
                                    name: { type: "string", example: "oferta" }
                                }
                            }
                        },
                        average_rating: { type: "number", nullable: true, example: 4.5 },
                        review_count: { type: "integer", example: 10 },
                        created_at: { type: "string", format: "date-time" },
                        updated_at: { type: "string", format: "date-time" }
                    }
                },

                // ─── REVIEW ──────────────────────────────────────────
                CreateReviewRequest: {
                    type: "object",
                    required: ["rating"],
                    properties: {
                        rating: { type: "integer", minimum: 1, maximum: 5, example: 4 },
                        comment: { type: "string", nullable: true, example: "Muy buen producto" }
                    }
                },
                ReviewResponse: {
                    type: "object",
                    properties: {
                        id: { type: "integer", example: 1 },
                        customerName: { type: "string", example: "Juan Pérez" },
                        rating: { type: "integer", example: 4 },
                        comment: { type: "string", nullable: true },
                        date: { type: "string", format: "date-time" },
                        isVerified: { type: "boolean", example: true }
                    }
                },
                ReviewsListResponse: {
                    type: "object",
                    properties: {
                        stats: {
                            type: "object",
                            properties: {
                                averageRating: { type: "number", nullable: true, example: 4.2 },
                                totalReviews: { type: "integer", example: 25 },
                                verifiedReviews: { type: "integer", example: 20 }
                            }
                        },
                        pagination: {
                            type: "object",
                            properties: {
                                page: { type: "integer", example: 1 },
                                limit: { type: "integer", example: 10 },
                                totalReviews: { type: "integer", example: 25 },
                                totalPages: { type: "integer", example: 3 }
                            }
                        },
                        reviews: {
                            type: "array",
                            items: { $ref: "#/components/schemas/ReviewResponse" }
                        }
                    }
                }
            }
        }
    },
    // Rutas donde swagger-jsdoc va a buscar los comentarios @swagger
    apis: ["./src/modules/**/*.routes.js", "./src/modules/**/routes/*.routes.js"]
};

export const swaggerSpec = swaggerJsdoc(options);

export const setupSwagger = (app) => {
    app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
        customSiteTitle: "Marketplace API Docs",
        swaggerOptions: {
            persistAuthorization: true
        }
    }));

    console.log("📄 Swagger disponible en http://localhost:3000/api/docs");
};