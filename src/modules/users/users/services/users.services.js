//import { PrismaClient } from "@prisma/client";
import { prisma } from "../../../../lib/prisma.js";
import bcrypt from "bcrypt";

//const prisma = new PrismaClient();
const SALT_ROUNDS = 10;

export const createUserService = async (data) => {
    const {
        name,
        email,
        password,
        phone
    } = data;

    const existingUser = await prisma.users.findUnique({
        where: { email },
    });

    if (existingUser) {
        const error = new Error("El email ya se encuentra registrado");
        error.statusCode = 409;
        throw error;
    }

    //Hashear la password
    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

    const newUser = await prisma.users.create({
        data: {
            name,
            email,
            password_hash,
            phone: phone ?? null,
            role: "CUSTOMER", //default
        },
        select: {
            id_user: true,
            name: true,
            email: true,
            phone: true,
            role: true,
            status: true,
            created_at: true,
        },
    });

    return newUser;
}

