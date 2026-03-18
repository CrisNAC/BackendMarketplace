//import { PrismaClient } from "@prisma/client";
import { prisma } from "../../../../src/lib/prisma.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();
//const prisma = new PrismaClient();

export const login = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({
            success: false,
            error: "Debe ingresar email y contraseña",
        });
    }

    try {
        const user = await prisma.users.findFirst({
            where: {
                email,
                status: true,
            },
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                error: "Credenciales incorrectas",
            });
        }

        //Comparamos la password plana con la hasheada
        const passwordMatch = await bcrypt.compare(
            password,
            user.password_hash
        );

        if (!passwordMatch) {
            return res.status(400).json({
                success: false,
                error: "Credenciales incorrectas",
            });
        }

        //Generamos el token
        const token = jwt.sign(
            { id_user: user.id_user, email: user.email, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: "30m" }
        );

        //Enviar token en cookie o json
        res.cookie('userToken', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax',
        });
        res.status(200).json({
            success: true,
            message: "Login exitoso " + token,
            user: {
                id_user: user.id_user,
                name: user.name,
                email: user.email,
                role: user.role,
            },
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            error: "Internal Server Error: Error al iniciar sesion",
        });
    }
};

export const logout = async (req, res) => {
    res.clearCookie("userToken", {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax',
    }).json({ message: "Hasta luego!" });
};

export const userSession = async (req, res) => {
    try {
        const token = req.cookies.userToken;

        if (!token) {
            return res.status(401).json({
                success: false,
                error: "No se encontro el token de autenticacion",
            });
        }

        const token_decodificado = jwt.verify(token, process.env.JWT_SECRET);

        const user = await prisma.users.findFirst({
            where: {
                id_user: token_decodificado.id_user,
                status: true,
            },
            include: {
                store: {
                    where: { status: true },
                    select: { id_store: true }
                }
            }
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                error: "Usuario no encontrado",
            });
        }

        return res.status(200).json({
            success: true,
            user: {
                id_user: user.id_user,
                name: user.name,
                email: user.email,
                phone: user.phone,
                role: user.role,
                id_store: user.store?.id_store ?? null
            },
        });
    } catch (error) {
        console.error("Error al verificar sesion:", error);
        return res.status(401).json({
            success: false,
            error: "Sesión inválida o expirada",
        });
    }
};
