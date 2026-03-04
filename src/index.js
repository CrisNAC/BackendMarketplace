import express from "express";
import dotenv from "dotenv";
import morgan from "morgan";
import cors from "cors";
import storeRoutes from "./modules/commerce/commerces/store.routes.js";
import productRoutes from "./modules/commerce/products/product.routes.js";
import productCategoryRoutes from "./modules/commerce/product-categories/product-category.routes.js";
import productTagRoutes from "./modules/commerce/product-tags/product-tag.routes.js";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

//Para debug en consola de las peticiones
app.use(morgan('dev'));
app.use(express.json());
app.use(cors({
  origin: process.env.CORS_ORIGIN || "http://localhost:5173",
  credentials: true
}));

app.use("/api/commerces",storeRoutes);
app.use("/products", productRoutes);
app.use("/products/categories", productCategoryRoutes);
app.use("/products/tags", productTagRoutes);
app.listen(PORT, () => {
	console.log(`Servidor corriendo en http://localhost:${PORT}`);
});

