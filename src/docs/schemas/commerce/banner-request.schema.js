/**
 * @swagger
 * components:
 *   schemas:
 *     BannerRequestCreateBody:
 *       type: object
 *       required:
 *         - title
 *         - startAt
 *       properties:
 *         title:
 *           type: string
 *           maxLength: 120
 *           description: Título del banner
 *         description:
 *           type: string
 *           description: Descripción o texto del banner
 *         imageUrl:
 *           type: string
 *           maxLength: 500
 *           description: URL de la imagen del banner
 *         linkUrl:
 *           type: string
 *           maxLength: 500
 *           description: Enlace relacionado al banner
 *         startAt:
 *           type: string
 *           format: date-time
 *           description: Fecha de inicio de la promoción
 *         endAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           description: Fecha de fin de la promoción (opcional)
 *
 *     BannerRequestResponse:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         storeId:
 *           type: integer
 *         title:
 *           type: string
 *         description:
 *           type: string
 *           nullable: true
 *         imageUrl:
 *           type: string
 *           nullable: true
 *         linkUrl:
 *           type: string
 *           nullable: true
 *         startAt:
 *           type: string
 *           format: date-time
 *         endAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         approvalStatus:
 *           type: string
 *           enum: [PENDING, ACTIVE, REJECTED]
 *         rejectionReason:
 *           type: string
 *           nullable: true
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *
 *     BannerRequestListResponse:
 *       type: object
 *       properties:
 *         data:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/BannerRequestResponse'
 *         pagination:
 *           type: object
 *           properties:
 *             total:
 *               type: integer
 *             page:
 *               type: integer
 *             limit:
 *               type: integer
 *             totalPages:
 *               type: integer
 */

export const bannerRequestSchemas = {};
