export const IMAGE = {
    ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
    MAX_SIZE: 5, // en MB
    MB: 1024 * 1024, // bytes en 1 MB
    MAX_SIZE_MB: () => IMAGE.MAX_SIZE * IMAGE.MB
};