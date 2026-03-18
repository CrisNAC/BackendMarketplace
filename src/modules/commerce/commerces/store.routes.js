// src/modules/commerce/commerces/store.routes.js
import { Router } from "express";
import  authenticate  from '@/config/jwt.config.js';
import { 
    createStore,
    updateStore,
    getStoreById,
    getStores,
    getAllProductsByStore,
    filterStoreProducts, 
    deleteStore
} from "./store.controller.js";
import { 
    CreateStoreDTO,
} from "./dtos/index";
import { validate } from "../../../middlewares/validate.middleware.js";

const router = Router();

router.post("/", authenticate, createStore);
router.put("/:id", authenticate, updateStore);
router.get("/", getStores);
router.get("/:id", getStoreById);
router.get("/products/:id", getAllProductsByStore);
router.get("/products/filter/:id", filterStoreProducts);
router.delete("/:id", deleteStore);

export default router;
