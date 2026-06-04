import { Router } from "express";
import authenticate from "../../../../config/jwt.config.js";
import { validate } from "../../../../middlewares/validate.middleware.js";
import {
    createStoreAddress,
    deleteStoreAddress,
    getStoreAddressById,
    getStoreAddresses,
    updateStoreAddress,
} from "../controllers/addresses.controllers.js";
import { IdParamDTO, AddressIdParamDTO } from "../../../global/dtos/common/params.dto.js";
import { CreateAddressDTO, UpdateAddressDTO } from "../../../global/dtos/addresses/address.dto.js";

const router = Router();

// crea una nueva direccion para el comercio
router.post("/:id/addresses", authenticate, validate(IdParamDTO, "params"), validate(CreateAddressDTO, "body"), createStoreAddress);
// lista las direcciones activas del comercio
router.get("/:id/addresses", authenticate, getStoreAddresses);
// obtiene una direccion puntual del comercio
router.get("/:id/addresses/:id_address", authenticate, getStoreAddressById);
// edita una direccion puntual del comercio
router.put("/:id/addresses/:id_address", authenticate, validate(IdParamDTO, "params"), validate(AddressIdParamDTO, "params"), validate(UpdateAddressDTO, "body"), updateStoreAddress);
// desactiva una direccion puntual del comercio
router.delete("/:id/addresses/:id_address", authenticate, validate(IdParamDTO, "params"), validate(AddressIdParamDTO, "params"), deleteStoreAddress);

export default router;