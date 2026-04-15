import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import {
    commonSchemas,
    imageSchemas,
    // /commerce
    addressSchemas,
    storeSchemas,
    productTagSchemas,
    productReviewSchemas,
    productSchemas,
    // /session
    sessionSchemas,
    // /admin
    adminCategorySchemas,
} from "../docs/schemas/index.js";

const options = {
    definition: {
        openapi: "3.0.0",
        info: {
            title: "OpenMarket API",
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
            { name: "Reviews", description: "Reseñas de productos" },
            { name: "Users", description: "Gestión de usuarios" },
            { name: "Orders", description: "Gestión de pedidos" },
            { name: "Images", description: "Gestión de imágenes" },
            { name: "Admin", description: "Gestión de administración" },
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
                ...commonSchemas,
                // /commerce/
                ...addressSchemas,
                ...storeSchemas,
                ...productReviewSchemas,
                ...productTagSchemas,
                ...productSchemas,

                // /session
                ...sessionSchemas,
                // /images
                ...imageSchemas,
                // /admin
                ...adminCategorySchemas,
            }
        },
        security: [
            { cookieAuth: [] }
        ],
    },
    // Rutas donde swagger-jsdoc va a buscar los comentarios @swagger
    apis: [
        "./src/modules/**/*.routes.js",
        "./src/modules/**/routes/*.routes.js",
        "./src/docs/**/*.schema.js"
    ]
};

export const swaggerSpec = swaggerJsdoc(options);

export const setupSwagger = (app) => {
    app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
        customSiteTitle: "Marketplace API Docs",
        swaggerOptions: {
            persistAuthorization: true
        }
    }));
};