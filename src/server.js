//import dotenv from "dotenv";
import "dotenv/config.js";
console.log("DATABASE_URL:", process.env.DATABASE_URL);
import app from "./app.js";

//dotenv.config();

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});