import { z } from "zod";

export const IdParamDTO = z.object({
  id: z.string().transform(Number).pipe(z.number().int().positive("id debe ser un ID válido"))
});

export const CustomerIdParamDTO = z.object({
  customerId: z.string().transform(Number).pipe(z.number().int().positive("customerId debe ser un ID válido"))
});

export const CartIdParamDTO = z.object({
  cartId: z.string().transform(Number).pipe(z.number().int().positive("cartId debe ser un ID válido"))
});

export const CartItemIdParamDTO = z.object({
  cartItemId: z.string().transform(Number).pipe(z.number().int().positive("cartItemId debe ser un ID válido"))
});

export const OrderIdParamDTO = z.object({
  orderId: z.string().transform(Number).pipe(z.number().int().positive("orderId debe ser un ID válido"))
});

export const WishlistIdParamDTO = z.object({
  wishlistId: z.string().transform(Number).pipe(z.number().int().positive("wishlistId debe ser un ID válido"))
});

export const ProductIdParamDTO = z.object({
  productId: z.string().transform(Number).pipe(z.number().int().positive("productId debe ser un ID válido"))
});

export const ReportIdParamDTO = z.object({
  reportId: z.string().transform(Number).pipe(z.number().int().positive("reportId debe ser un ID válido"))
});

export const ReviewIdParamDTO = z.object({
  reviewId: z.string().transform(Number).pipe(z.number().int().positive("reviewId debe ser un ID válido"))
});

export const DeliveryIdParamDTO = z.object({
  deliveryId: z.string().transform(Number).pipe(z.number().int().positive("deliveryId debe ser un ID válido"))
});

export const AddressIdParamDTO = z.object({
  id_address: z.string().transform(Number).pipe(z.number().int().positive("id_address debe ser un ID válido"))
});
