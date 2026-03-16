import express from "express";
import dotenv from "dotenv";
import morgan from "morgan";
import cors from "cors";
import cookieParser from "cookie-parser";
import storeRoutes from "./modules/commerce/commerces/store.routes.js";
import storeCategoryRoutes from "./modules/commerce/store-categories/store-category.routes.js";
import productRoutes from "./modules/commerce/products/product.routes.js";
import categoriesRoutes from "./modules/global/categories/categories.routes.js";
import productTagRoutes from "./modules/commerce/product-tags/product-tag.routes.js";
import userRoutes from "./modules/users/users/routes/users.routes.js";
import addressRoutes from "./modules/users/addresses/routes/addresses.routes.js";
import sessionRoutes from "./modules/session/routes/session.routes.js";

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

app.use('/api/session', sessionRoutes);
app.use("/api/commerces/categories", storeCategoryRoutes);
app.use("/api/commerces",storeRoutes);
app.use("/products", productRoutes);
//Desde aqui pueden usarse dos endpoints, para productos /api/categories/products, y /api/categories/stores
//Se encuentra indexado
app.use("/api/categories", categoriesRoutes); 
app.use("/products/tags", productTagRoutes);
app.use("/api/users", userRoutes);
app.use("/api/users", addressRoutes);

app.listen(PORT, () => {
	console.log(`Servidor corriendo en http://localhost:${PORT}`);
});

