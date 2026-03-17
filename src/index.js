import express from "express";
import dotenv from "dotenv";
import morgan from "morgan";
import cors from "cors";
import cookieParser from "cookie-parser";
import storeRoutes from "./modules/commerce/commerces/store.routes.js";
import commerceAddressRoutes from "./modules/commerce/addresses/routes/addresses.routes.js";
import storeCategoryRoutes from "./modules/commerce/store-categories/store-category.routes.js";
import productRoutes from "./modules/commerce/products/product.routes.js";
import categoriesRoutes from "./modules/global/categories/categories.routes.js";
import productTagRoutes from "./modules/commerce/product-tags/product-tag.routes.js";
import productReviewRoutes from "./modules/commerce/product-reviews/product-review.routes.js";
import userRoutes from "./modules/users/users/routes/users.routes.js";
import addressRoutes from "./modules/users/addresses/routes/addresses.routes.js";
import sessionRoutes from "./modules/session/routes/session.routes.js";
import userProductReviewRoutes from "./modules/users/product-review/product-review.routes.js";

import { errorHandler } from "./middlewares/errorHandler.js";
import { NotFoundError } from "./lib/errors.js";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

//Para debug en consola de las peticiones
app.use(morgan('dev'));
app.use(express.json());
app.use(cookieParser());

app.use(cors({
  origin: process.env.CORS_ORIGIN || "http://localhost:5173",
  credentials: true
}));

// Rutas de comercio
app.use("/api/commerces/categories", storeCategoryRoutes);
app.use("/api/commerces",storeRoutes);
app.use("/api/commerces", commerceAddressRoutes);

//Desde aqui pueden usarse dos endpoints, para productos /api/categories/products, y /api/categories/stores
//Se encuentra indexado
app.use("/api/categories", categoriesRoutes); 
app.use("/products/tags", productTagRoutes);
app.use("/products/reviews", productReviewRoutes);
app.use("/products", productRoutes);

// Rutas del Cliente
app.use("/products/:id/reviews", userProductReviewRoutes);

// Rutas de usuarios
app.use("/api/users", userRoutes);
app.use("/api/users", addressRoutes);
app.use('/api/session', sessionRoutes);

// Ruta no encontrada — va ANTES del errorHandler
app.use((req, _res, next) => {
  next(new NotFoundError(`Ruta ${req.method} ${req.path} no encontrada`));
});

// captura todos los errores de las rutas anteriores
app.use(errorHandler);

app.listen(PORT, () => {
	console.log(`Servidor corriendo en http://localhost:${PORT}`);
});

