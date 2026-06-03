const blacklist = new Set();

/**
 * Agrega un token a la blacklist.
 * @param {string} token
 */
export const addToBlacklist = (token) => {
    blacklist.add(token);
};

/**
 * Verifica si un token está en la blacklist.
 * @param {string} token
 * @returns {boolean}
 */
export const isBlacklisted = (token) => {
    return blacklist.has(token);
};

/**
 * Limpia tokens expirados de la blacklist para evitar acumulación de memoria.
 * Se recomienda llamar periódicamente (ej: cada 30 min).
 * @param {Function} isExpired - función que recibe el token y retorna true si expiró
 */
export const cleanExpiredTokens = (isExpired) => {
    for (const token of blacklist) {
        if (isExpired(token)) {
            blacklist.delete(token);
        }
    }
};