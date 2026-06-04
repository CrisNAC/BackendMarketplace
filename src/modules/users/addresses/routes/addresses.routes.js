//addresses.routes.js
import { Router } from "express";
import authenticate from "../../../../config/jwt.config.js";
import { validate } from "../../../../middlewares/validate.middleware.js";
import {
    createAddress,
    deleteAddress,
    getAddressById,
    getAddressesByUser,
    updateAddress,
} from "../controllers/addresses.controllers.js";
import { IdParamDTO, AddressIdParamDTO } from "../../../global/dtos/common/params.dto.js";
import { CreateAddressDTO, UpdateAddressDTO } from "../../../global/dtos/addresses/address.dto.js";

const router = Router();

// crea una nueva direccion personal
router.post("/:id/addresses", authenticate, validate(IdParamDTO, "params"), validate(CreateAddressDTO, "body"), createAddress);
// lista las direcciones personales activas del usuario
router.get("/:id/addresses", authenticate, getAddressesByUser);
// obtiene una direccion personal puntual
router.get("/:id/addresses/:id_address", authenticate, getAddressById);
// edita una direccion personal puntual
router.put("/:id/addresses/:id_address", authenticate, validate(IdParamDTO, "params"), validate(AddressIdParamDTO, "params"), validate(UpdateAddressDTO, "body"), updateAddress);
// desactiva una direccion personal puntual
router.delete("/:id/addresses/:id_address", authenticate, validate(IdParamDTO, "params"), validate(AddressIdParamDTO, "params"), deleteAddress);

export default router;
