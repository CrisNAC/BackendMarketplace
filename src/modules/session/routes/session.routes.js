import Router from "express";
import { login, logout, userSession } from "../controllers/session.controllers.js";

const router = Router();

/*---------------------RUTAS PUBLICAS------------------------------*/
router.post('/', login);

router.delete('/', logout);

router.get('/user-session', userSession);
/*-----------------------------------------------------------------*/

export default router;