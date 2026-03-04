// src/modules/commerce/commerces/store.routes.js
import { Router } from "express";
import { 
    createStore,
    getStoreById,
    getAllProductsByStore,
    filterStoreProducts 
} from "./store.controller.js";

const router = Router();

router.post("/", createStore);
router.get("/:id_store", getStoreById);
router.get("/:id_store/products", getAllProductsByStore);
router.get("/:id_store/products/filter", filterStoreProducts);

export default router;