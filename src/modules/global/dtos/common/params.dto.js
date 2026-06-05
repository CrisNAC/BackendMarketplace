import { z } from "zod";

export const IdParamDTO = z.object({
  id: z.string().regex(/^[1-9]\d*$/, "id debe ser un ID válido").transform(Number).pipe(z.number().int().positive("id debe ser un ID válido"))
});

export const CustomerIdParamDTO = z.object({
  customerId: z.string().regex(/^[1-9]\d*$/, "customerId debe ser un ID válido").transform(Number).pipe(z.number().int().positive("customerId debe ser un ID válido"))
});

export const CartIdParamDTO = z.object({
  cartId: z.string().regex(/^[1-9]\d*$/, "cartId debe ser un ID válido").transform(Number).pipe(z.number().int().positive("cartId debe ser un ID válido"))
});

export const CartItemIdParamDTO = z.object({
  cartItemId: z.string().regex(/^[1-9]\d*$/, "cartItemId debe ser un ID válido").transform(Number).pipe(z.number().int().positive("cartItemId debe ser un ID válido"))
});

export const OrderIdParamDTO = z.object({
  orderId: z.string().regex(/^[1-9]\d*$/, "orderId debe ser un ID válido").transform(Number).pipe(z.number().int().positive("orderId debe ser un ID válido"))
});

export const WishlistIdParamDTO = z.object({
  wishlistId: z.string().regex(/^[1-9]\d*$/, "wishlistId debe ser un ID válido").transform(Number).pipe(z.number().int().positive("wishlistId debe ser un ID válido"))
});

export const ProductIdParamDTO = z.object({
  productId: z.string().regex(/^[1-9]\d*$/, "productId debe ser un ID válido").transform(Number).pipe(z.number().int().positive("productId debe ser un ID válido"))
});

export const ReportIdParamDTO = z.object({
  reportId: z.string().regex(/^[1-9]\d*$/, "reportId debe ser un ID válido").transform(Number).pipe(z.number().int().positive("reportId debe ser un ID válido"))
});

export const ReviewIdParamDTO = z.object({
  reviewId: z.string().regex(/^[1-9]\d*$/, "reviewId debe ser un ID válido").transform(Number).pipe(z.number().int().positive("reviewId debe ser un ID válido"))
});

export const DeliveryIdParamDTO = z.object({
  deliveryId: z.string().regex(/^[1-9]\d*$/, "deliveryId debe ser un ID válido").transform(Number).pipe(z.number().int().positive("deliveryId debe ser un ID válido"))
});

export const AddressIdParamDTO = z.object({
  id_address: z.string().regex(/^[1-9]\d*$/, "id_address debe ser un ID válido").transform(Number).pipe(z.number().int().positive("id_address debe ser un ID válido"))
});

export const CustomerCartIdParamDTO = z.object({
  customerId: z.string().regex(/^[1-9]\d*$/, "customerId debe ser un ID válido").transform(Number).pipe(z.number().int().positive("customerId debe ser un ID válido")),
  cartId: z.string().regex(/^[1-9]\d*$/, "cartId debe ser un ID válido").transform(Number).pipe(z.number().int().positive("cartId debe ser un ID válido"))
});

export const CustomerWishlistIdParamDTO = z.object({
  customerId: z.string().regex(/^[1-9]\d*$/, "customerId debe ser un ID válido").transform(Number).pipe(z.number().int().positive("customerId debe ser un ID válido")),
  wishlistId: z.string().regex(/^[1-9]\d*$/, "wishlistId debe ser un ID válido").transform(Number).pipe(z.number().int().positive("wishlistId debe ser un ID válido"))
});

export const CustomerWishlistProductIdParamDTO = z.object({
  customerId: z.string().regex(/^[1-9]\d*$/, "customerId debe ser un ID válido").transform(Number).pipe(z.number().int().positive("customerId debe ser un ID válido")),
  wishlistId: z.string().regex(/^[1-9]\d*$/, "wishlistId debe ser un ID válido").transform(Number).pipe(z.number().int().positive("wishlistId debe ser un ID válido")),
  productId: z.string().regex(/^[1-9]\d*$/, "productId debe ser un ID válido").transform(Number).pipe(z.number().int().positive("productId debe ser un ID válido"))
});
