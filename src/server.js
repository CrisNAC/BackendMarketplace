import dotenv from "dotenv";
import app from "./app.js";
import { validateEnv } from "./config/env.config.js";

dotenv.config();

validateEnv();

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});