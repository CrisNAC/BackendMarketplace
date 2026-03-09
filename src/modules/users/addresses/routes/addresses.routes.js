import { Router } from "express";
import { createAddress, updateAddress, deleteAddress, getAddressById, getAddressesByUser } from "../controllers/addresses.controller.js";

const router = new Router();

router.post("/", createAddress);
router.get("/user/:fk_user", getAddressesByUser);
router.get(":id", getAddressById);
router.patch(":id", updateAddress);
router.delete(":id", deleteAddress);

export default router;