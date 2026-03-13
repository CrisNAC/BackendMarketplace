//addresses.routes.js
import { Router } from "express";
import authenticate from "../../../../config/jwt.config.js";
import {
    createStoreAddress,
    deleteStoreAddress,
    getStoreAddressById,
    getStoreAddresses,
    updateStoreAddress,
} from "../controllers/addresses.controllers.js";

const router = Router();

// crea una nueva direccion para el comercio
router.post("/:id_store/addresses", authenticate, createStoreAddress);
// lista las direcciones activas del comercio
router.get("/:id_store/addresses", authenticate, getStoreAddresses);
// obtiene una direccion puntual del comercio
router.get("/:id_store/addresses/:id_address", authenticate, getStoreAddressById);
// edita una direccion puntual del comercio
router.put("/:id_store/addresses/:id_address", authenticate, updateStoreAddress);
// desactiva una direccion puntual del comercio
router.delete("/:id_store/addresses/:id_address", authenticate, deleteStoreAddress);

export default router;
