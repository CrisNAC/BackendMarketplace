// src/modules/commerce/commerces/store.routes.js
import { Router } from "express";
import  authenticate  from '../../../config/jwt.config.js';
import { 
    createStore,
    getStoreById,
    getAllProductsByStore,
    filterStoreProducts, 
    deleteStore
} from "./store.controller.js";

const router = Router();

router.post("/", createStore);
router.get("/:id", getStoreById);
router.get("/products/:id", getAllProductsByStore);
router.get("/products/filter/:id", filterStoreProducts);
router.delete("/:id", deleteStore);

export default router;