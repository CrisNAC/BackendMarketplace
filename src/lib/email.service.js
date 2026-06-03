import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendPasswordResetEmail = async (email, token) => {
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    const resetUrl = `${frontendUrl}/restablecer-contrasena/${token}`;
    const from = process.env.RESEND_FROM_EMAIL || "OpenMarket <onboarding@resend.dev>";

    const { error } = await resend.emails.send({
        from,
        to: email,
        subject: "Recuperación de contraseña",
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #355347;">Recuperación de contraseña</h2>
                <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta.</p>
                <p>Hacé clic en el botón para crear una nueva contraseña. Este enlace es válido por <strong>10 minutos</strong>.</p>
                <div style="text-align: center; margin: 32px 0;">
                    <a href="${resetUrl}"
                       style="background-color: #355347; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
                        Restablecer contraseña
                    </a>
                </div>
                <p style="color: #666; font-size: 14px;">Si no solicitaste este cambio, ignorá este correo. Tu contraseña no será modificada.</p>
                <p style="color: #666; font-size: 12px;">O copiá este enlace en tu navegador:<br>${resetUrl}</p>
            </div>
        `,
    });

    if (error) {
        throw new Error(`Error al enviar el correo de recuperación: ${error.message}`);
    }
};
