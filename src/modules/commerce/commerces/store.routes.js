// src/modules/commerce/commerces/store.routes.js
import { Router } from "express";
import  authenticate  from '../../../config/jwt.config.js';
import { 
    createStore,
    updateStore,
    getStoreById,
    getAllProductsByStore,
    filterStoreProducts 
} from "./store.controller.js";

const router = Router();

router.post("/", createStore);
router.put("/:id", authenticate, updateStore);
router.get("/:id", getStoreById);
router.get("/:id/products", getAllProductsByStore);
router.get("/:id/products/filter", filterStoreProducts);

export default router;
