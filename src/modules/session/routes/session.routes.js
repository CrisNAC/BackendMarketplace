import Router from "express";
import { login, logout, userSession } from "../controllers/session.controllers.js";

const router = Router();

/**
 * @swagger
 * /api/session:
 *   post:
 *     summary: Iniciar sesión
 *     tags: [Session]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Login exitoso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 *       400:
 *         description: Credenciales incorrectas o campos faltantes
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Usuario no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post("/", login);

/**
 * @swagger
 * /api/session:
 *   delete:
 *     summary: Cerrar sesión
 *     tags: [Session]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Sesión cerrada correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Hasta luego!"
 */
router.delete("/", logout);

/**
 * @swagger
 * /api/session/user-session:
 *   get:
 *     summary: Obtener datos de la sesión activa
 *     tags: [Session]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Sesión activa
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserSessionResponse'
 *       401:
 *         description: No autenticado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get("/user-session", userSession);

export default router;