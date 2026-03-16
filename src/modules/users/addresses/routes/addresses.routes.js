//addresses.routes.js
import { Router } from "express";
import authenticate from "../../../../config/jwt.config.js";
import {
    createAddress,
    deleteAddress,
    getAddressById,
    getAddressesByUser,
    updateAddress,
} from "../controllers/addresses.controllers.js";

const router = Router();

// crea una nueva direccion personal
router.post("/:id/addresses", authenticate, createAddress);
// lista las direcciones personales activas del usuario
router.get("/:id/addresses", authenticate, getAddressesByUser);
// obtiene una direccion personal puntual
router.get("/:id/addresses/:id_address", authenticate, getAddressById);
// edita una direccion personal puntual
router.put("/:id/addresses/:id_address", authenticate, updateAddress);
// desactiva una direccion personal puntual
router.delete("/:id/addresses/:id_address", authenticate, deleteAddress);

export default router;
