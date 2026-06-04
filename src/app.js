//app.js
import { validateEnv } from './config/env.config.js'
validateEnv() // Si falta algo, el servidor no arranca
import express from "express";
import morgan from "morgan";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";

import storeRoutes from "./modules/commerce/commerces/store.routes.js";
import commerceAddressRoutes from "./modules/commerce/addresses/routes/addresses.routes.js";
import commerceBusinessHoursRoutes from "./modules/commerce/business-hours/routes/business-hours.routes.js";
import { deliveryRouter, storeDeliveryRouter } from "./modules/commerce/deliveries/delivery.routes.js";
import storeCategoryRoutes from "./modules/commerce/store-categories/store-category.routes.js";
import productRoutes from "./modules/commerce/products/product.routes.js";
import categoriesRoutes from "./modules/global/categories/categories.routes.js";
import categoryRequestRoutes from "./modules/commerce/category-requests/category-request.routes.js";
import productTagRoutes from "./modules/commerce/product-tags/product-tag.routes.js";
import productReviewRoutes from "./modules/commerce/product-reviews/product-review.routes.js";
import userRoutes from "./modules/users/users/routes/users.routes.js";
import addressRoutes from "./modules/users/addresses/routes/addresses.routes.js";
import sessionRoutes from "./modules/session/routes/session.routes.js";
import userProductReviewRoutes from "./modules/users/product-review/product-review.routes.js";
import deliveryRoutes from "./modules/delivery/delivery/delivery.routes.js";
import assignmentRoutes from "./modules/delivery/delivery-assignments/delivery-assignments.routes.js";
import storeDeliveryAssignmentRoutes from "./modules/commerce/deliveries/delivery-assignments/delivery-assignments.routes.js";

import productReportRoutes from "./modules/global/reports/product/product-report.routes.js";
import reviewReportRoutes from "./modules/global/reports/review/review-report.routes.js";

import wishlistRoutes from "./modules/users/wishlist/wishlist.routes.js";
import cartRoutes from "./modules/users/cart/cart.routes.js";

import { orderRouter, userOrderRouter } from "./modules/users/orders/order.routes.js";

import { errorHandler } from "./middlewares/errorHandler.js";
import { securityResponseLogger } from "./middlewares/security-log.middleware.js";
import { NotFoundError } from "./lib/errors.js";

import { setupSwagger } from "./config/swagger.config.js";

import distanceRoutes from "./modules/global/distances/routes/distance.routes.js";

import notificationRoutes from "./modules/notifications/notification.routes.js";

// Rutas de imágenes
import { 
  productImageRoutes, 
  userImageRoutes, 
  storeImageRoutes, 
} from './modules/images/routes/index.js';

// Rutas de administración
import {
  adminUsersRoutes,
  adminCategoryRoutes,
  adminStoresRoutes,
  adminProductsRoutes,
  adminBannersRoutes,
  adminTagRoutes,
} from "./modules/admin/index.js";
import { bannerRoutes } from "./modules/global/banners/banners.routes.js";

const app = express();

// Seguridad HTTP con Helmet
app.use(helmet());
app.use((req, res, next) => {
  res.setHeader(
    "Permissions-Policy",
    "camera=(), microphone=(), payment=()"
  );
  next();
});

//Para debug en consola de las peticiones
app.use(morgan('dev'));
app.use(express.json());
app.use(cookieParser());
app.use(securityResponseLogger);

const allowedOrigins = process.env.CORS_ORIGIN 
  ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
  : ["http://localhost:5173"];

app.use(cors({
  origin: function (origin, callback) {
    // Permitir solicitudes sin origen (por ejemplo, Postman o backend-to-backend)
    if (!origin) return callback(null, true);

    // Evitar estrictamente el wildcard en producción cuando se requieren credenciales
    if (allowedOrigins.includes('*')) {
      return callback(new Error('CORS configured with wildcard (*) is not allowed when credentials are required.'), false);
    }

    if (allowedOrigins.includes(origin)) {
      callback(null, origin);
    } else {
      callback(new Error('Not allowed by CORS'), false);
    }
  },
  credentials: true
}));

setupSwagger(app);

// Rutas de comercio
app.use("/api/commerces/category-requests", categoryRequestRoutes);
app.use("/api/commerces/categories", storeCategoryRoutes);
app.use("/api/commerces", storeRoutes);
app.use("/api/commerces", commerceAddressRoutes);
app.use("/api/commerces", commerceBusinessHoursRoutes);

// Rutas de delivery
app.use("/api/deliveries", deliveryRouter);
app.use("/api/stores", storeDeliveryRouter);
app.use("/api/stores", storeDeliveryAssignmentRoutes);

//Desde aqui pueden usarse dos endpoints, para productos /api/categories/products, y /api/categories/stores
//Se encuentra indexado
app.use("/api/categories", categoriesRoutes);
app.use("/products/tags", productTagRoutes);
app.use("/products/reviews", productReviewRoutes);
app.use("/products", productRoutes);

// Rutas del Cliente
app.use("/products/:id/reviews", userProductReviewRoutes);

// Rutas de reportes
app.use("/api/reports", productReportRoutes);
app.use("/api/reports", reviewReportRoutes);

// Rutas de usuarios
app.use("/api/users", userRoutes);
app.use("/api/users", addressRoutes);
app.use("/api/users", wishlistRoutes);
app.use("/api/users", cartRoutes);
app.use("/api/users", userOrderRouter);
app.use('/api/session', sessionRoutes);

// Rutas de notificaciones
app.use('/api/notifications', notificationRoutes);

// Rutas de deliveries
app.use("/api/deliveries", deliveryRoutes);
app.use("/api/assignments", assignmentRoutes);


// Rutas de pedidos
app.use("/api/orders", orderRouter);

// Rutas de administración
app.use("/api/admin", adminUsersRoutes);
app.use("/api/admin/categories", adminCategoryRoutes);
app.use("/api/admin/stores", adminStoresRoutes);
app.use("/api/admin/products", adminProductsRoutes);
app.use("/api/admin/banners", adminBannersRoutes);
app.use("/api/admin/tags", adminTagRoutes);

// Rutas de distancias
app.use("/api/distances", distanceRoutes);

// Rutas de banners
app.use("/api/banners", bannerRoutes);

app.use('/products', productImageRoutes)
app.use('/users', userImageRoutes)
app.use('/stores', storeImageRoutes)

// Ruta no encontrada — va ANTES del errorHandler
app.use((req, _res, next) => {
  next(new NotFoundError(`Ruta ${req.method} ${req.path} no encontrada`));
});

// captura todos los errores de las rutas anteriores
app.use(errorHandler);

export default app;