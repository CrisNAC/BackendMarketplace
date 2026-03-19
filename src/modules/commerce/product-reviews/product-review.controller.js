import { getProductReviewsService } from "./product-review.service.js";

export const getProductReviews = async (req, res) => {
    try {
        const result = await getProductReviewsService(req.params.id, req.query);
        return res.status(200).json(result);
    } catch (error) {
        const status = Number.isInteger(error?.status) && error.status >= 400 && error.status <= 599
            ? error.status
            : 500;
        return res.status(status).json({
            message: status < 500 ? error.message : "Error interno del servidor"
        });
    }
};