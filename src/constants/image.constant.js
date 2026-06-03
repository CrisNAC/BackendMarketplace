export const IMAGE = {
    ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
    ALLOWED_EXTENSIONS: ['.jpg', '.jpeg', '.png', '.webp'],
    MAX_SIZE: 5,
    MB: 1024 * 1024,
    MAX_SIZE_MB: () => IMAGE.MAX_SIZE * IMAGE.MB
};