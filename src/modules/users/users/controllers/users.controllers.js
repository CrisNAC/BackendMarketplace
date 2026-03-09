import {
    createUserService,
    updateUserPasswordService,
    updateUserService,
} from "../services/users.services.js";

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export const registerUser = async (req, res) => {
    try {
        const { name, email, password, phone} = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: "name, email y password son requeridos",
            });
        }

        if (!EMAIL_REGEX.test(email.trim())) {
            return res.status(400).json({
                success: false,
                message: "El formato del email no es válido",
            });
        }

        const user = await createUserService({ 
            name, 
            email: email.trim().toLowerCase(), 
            password, 
            phone 
        });

        return res.status(201).json({
            success: true,
            message: "Usuario registrado exitosamente",
            data: user,
        });

    } catch(error) {
        const statusCode = error.statusCode || 500;
        return res.status(statusCode).json({
            success: false,
            message: error.message || "Error interno del servidor",
        });
    }
}

export const updateUser = async (req, res) => {
    try {
        const { id_user } = req.params;

        const user = await updateUserService(
            req.user?.id_user,
            id_user,
            req.body
        );

        return res.status(200).json({
            success: true,
            message: "Perfil actualizado exitosamente",
            data: user,
        });
    } catch (error) {
        const statusCode = error.statusCode || error.status || 500;
        return res.status(statusCode).json({
            success: false,
            message: error.message || "Error interno del servidor",
        });
    }
}

export const updateUserPassword = async (req, res) => {
    try {
        const { id_user } = req.params;

        const user = await updateUserPasswordService(
            req.user?.id_user,
            id_user,
            req.body
        );

        return res.status(200).json({
            success: true,
            message: "Contrasena actualizada exitosamente",
            data: user,
        });
    } catch (error) {
        const statusCode = error.statusCode || error.status || 500;
        return res.status(statusCode).json({
            success: false,
            message: error.message || "Error interno del servidor",
        });
    }
}
