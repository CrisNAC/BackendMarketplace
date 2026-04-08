// src/docs/schemas/image.schema.js

export const imageSchemas = {

    // ─── RESPONSES ─────────────────────────────────────────────────

    ProductImageResponse: {
        type: "object",
        properties: {
            image_url: {
                type: "string",
                nullable: true,
                example: "https://proyecto.supabase.co/storage/v1/object/public/product-images/1/image.jpg"
            }
        }
    },

    StoreImageResponse: {
        type: "object",
        properties: {
            logo: {
                type: "string",
                nullable: true,
                example: "https://proyecto.supabase.co/storage/v1/object/public/store-logos/1/logo.jpg"
            }
        }
    },

    UserImageResponse: {
        type: "object",
        properties: {
            avatar_url: {
                type: "string",
                nullable: true,
                example: "https://proyecto.supabase.co/storage/v1/object/public/user-avatars/1/avatar.jpg"
            }
        }
    },

    ImageDeleteResponse: {
        type: "object",
        properties: {
            message: { type: "string", example: "Imagen eliminada correctamente" }
        }
    }
};

/**
 * @openapi
 * tags:
 *   - name: Product Images
 *     description: Gestión de imágenes de productos
 *   - name: Store Images
 *     description: Gestión de logos de comercios
 *   - name: User Images
 *     description: Gestión de avatares de usuarios
 */

// ─── PRODUCT IMAGE ────────────────────────────────────────────────

/**
 * @openapi
 * /products/{id}/image:
 *   get:
 *     tags: [Product Images]
 *     summary: Obtener imagen de un producto
 *     description: Endpoint público. Devuelve la URL de la imagen del producto o null si no tiene.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *     responses:
 *       200:
 *         description: URL de la imagen
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ProductImageResponse'
 *       404:
 *         description: Producto no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *
 *   post:
 *     tags: [Product Images]
 *     summary: Subir imagen de un producto
 *     description: Solo ADMIN o SELLER dueño del producto. Enviar como multipart/form-data con campo "image".
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [image]
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Imagen subida correctamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ProductImageResponse'
 *       400:
 *         description: No se recibió archivo o formato inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: No autenticado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthErrorResponse'
 *       403:
 *         description: Sin permisos sobre este producto
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Producto no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *
 *   put:
 *     tags: [Product Images]
 *     summary: Reemplazar imagen de un producto
 *     description: Solo ADMIN o SELLER dueño del producto. Elimina la imagen anterior y sube la nueva.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [image]
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Imagen reemplazada correctamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ProductImageResponse'
 *       400:
 *         description: No se recibió archivo o formato inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: No autenticado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthErrorResponse'
 *       403:
 *         description: Sin permisos sobre este producto
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Producto no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *
 *   delete:
 *     tags: [Product Images]
 *     summary: Eliminar imagen de un producto
 *     description: Solo ADMIN o SELLER dueño del producto.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *     responses:
 *       200:
 *         description: Imagen eliminada correctamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ImageDeleteResponse'
 *       401:
 *         description: No autenticado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthErrorResponse'
 *       403:
 *         description: Sin permisos sobre este producto
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Producto no encontrado o sin imagen
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

// ─── STORE IMAGE ──────────────────────────────────────────────────

/**
 * @openapi
 * /stores/{id}/image:
 *   get:
 *     tags: [Store Images]
 *     summary: Obtener logo de un comercio
 *     description: Endpoint público. Devuelve la URL del logo o null si no tiene.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *     responses:
 *       200:
 *         description: URL del logo
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/StoreImageResponse'
 *       404:
 *         description: Comercio no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *
 *   post:
 *     tags: [Store Images]
 *     summary: Subir logo de un comercio
 *     description: Solo ADMIN o SELLER dueño del comercio.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [image]
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Logo subido correctamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/StoreImageResponse'
 *       400:
 *         description: No se recibió archivo o formato inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: No autenticado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthErrorResponse'
 *       403:
 *         description: Sin permisos sobre este comercio
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Comercio no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *
 *   put:
 *     tags: [Store Images]
 *     summary: Reemplazar logo de un comercio
 *     description: Solo ADMIN o SELLER dueño del comercio.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [image]
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Logo reemplazado correctamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/StoreImageResponse'
 *       400:
 *         description: No se recibió archivo o formato inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: No autenticado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthErrorResponse'
 *       403:
 *         description: Sin permisos sobre este comercio
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Comercio no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *
 *   delete:
 *     tags: [Store Images]
 *     summary: Eliminar logo de un comercio
 *     description: Solo ADMIN o SELLER dueño del comercio.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *     responses:
 *       200:
 *         description: Logo eliminado correctamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ImageDeleteResponse'
 *       401:
 *         description: No autenticado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthErrorResponse'
 *       403:
 *         description: Sin permisos sobre este comercio
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Comercio no encontrado o sin logo
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

// ─── USER IMAGE ───────────────────────────────────────────────────

/**
 * @openapi
 * /users/{id}/image:
 *   get:
 *     tags: [User Images]
 *     summary: Obtener avatar de un usuario
 *     description: Endpoint público. Devuelve la URL del avatar o null si no tiene.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *     responses:
 *       200:
 *         description: URL del avatar
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserImageResponse'
 *       404:
 *         description: Usuario no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *
 *   post:
 *     tags: [User Images]
 *     summary: Subir avatar de un usuario
 *     description: Cualquier usuario autenticado puede subir su propio avatar. ADMIN puede subir el de cualquiera.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [image]
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Avatar subido correctamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserImageResponse'
 *       400:
 *         description: No se recibió archivo o formato inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: No autenticado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthErrorResponse'
 *       403:
 *         description: Sin permisos para modificar este avatar
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
 *
 *   put:
 *     tags: [User Images]
 *     summary: Reemplazar avatar de un usuario
 *     description: Cualquier usuario autenticado puede reemplazar su propio avatar. ADMIN puede reemplazar el de cualquiera.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [image]
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Avatar reemplazado correctamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserImageResponse'
 *       400:
 *         description: No se recibió archivo o formato inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: No autenticado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthErrorResponse'
 *       403:
 *         description: Sin permisos para modificar este avatar
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
 *
 *   delete:
 *     tags: [User Images]
 *     summary: Eliminar avatar de un usuario
 *     description: Cualquier usuario autenticado puede eliminar su propio avatar. ADMIN puede eliminar el de cualquiera.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *     responses:
 *       200:
 *         description: Avatar eliminado correctamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ImageDeleteResponse'
 *       401:
 *         description: No autenticado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthErrorResponse'
 *       403:
 *         description: Sin permisos para modificar este avatar
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Usuario no encontrado o sin avatar
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
