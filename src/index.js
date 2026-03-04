import express from "express";
import dotenv from "dotenv";
import morgan from "morgan";
import storeRoutes from "./modules/commerce/commerces/store.routes.js";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

//Para debug en consola de las peticiones
app.use(morgan('dev'));
app.use(express.json());

app.use("/api/commerces",storeRoutes);
app.listen(PORT, () => {
	console.log(`Servidor corriendo en http://localhost:${PORT}`);
});

