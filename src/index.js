import express from "express";
import dotenv from "dotenv";
import morgan from "morgan";
import commercesRoutes from "./modules/commerce/commerces/commerces.routes.js";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

//Para debug en consola de las peticiones
app.use(morgan('dev'));
app.use(express.json());

app.use("/api/commerces",commercesRoutes);
app.listen(PORT, () => {
	console.log(`Servidor corriendo en http://localhost:${PORT}`);
});

