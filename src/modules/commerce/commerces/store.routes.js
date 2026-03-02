import { Router } from "express";
import { createStore } from "./store.controller.js";

const router = Router();

router.post("/", createStore);

export default router;