import { validateEnv } from './config/env.config.js'
validateEnv() // Si falta algo, el servidor no arranca
import express from "express";
import morgan from "morgan";
import cors from "cors";
import cookieParser from "cookie-parser";

import storeRoutes from "./modules/commerce/commerces/store.routes.js";
import commerceAddressRoutes from "./modules/commerce/addresses/routes/addresses.routes.js";
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

import productReportRoutes from "./modules/global/reports/product/product-report.routes.js";
import reviewReportRoutes from "./modules/global/reports/review/review-report.routes.js";

import wishlistRoutes from "./modules/users/wishlist/wishlist.routes.js";
import cartRoutes from "./modules/users/cart/cart.routes.js";

import { orderRouter, userOrderRouter } from "./modules/users/orders/order.routes.js";

import { errorHandler } from "./middlewares/errorHandler.js";
import { NotFoundError } from "./lib/errors.js";

import { setupSwagger } from "./config/swagger.config.js";

import distanceRoutes from "./modules/global/distances/routes/distance.routes.js";

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
} from "./modules/admin/index.js";

const app = express();

//Para debug en consola de las peticiones
app.use(morgan('dev'));
app.use(express.json());
app.use(cookieParser());

app.use(cors({
  origin: process.env.CORS_ORIGIN || "http://localhost:5173",
  credentials: true
}));

setupSwagger(app);

// Rutas de comercio
app.use("/api/commerces/category-requests", categoryRequestRoutes);
app.use("/api/commerces/categories", storeCategoryRoutes);
app.use("/api/commerces", storeRoutes);
app.use("/api/commerces", commerceAddressRoutes);

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

// Rutas de pedidos
app.use("/api/orders", orderRouter);

// Rutas de administración
app.use("/api/admin", adminUsersRoutes);
app.use("/api/admin/categories", adminCategoryRoutes);
app.use("/api/admin/stores", adminStoresRoutes);
app.use("/api/admin/products", adminProductsRoutes);

// Rutas de distancias
app.use("/api/distances", distanceRoutes);

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