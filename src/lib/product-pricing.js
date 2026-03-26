const toNullableNumber = (value) => {
  if (value === undefined || value === null) {
    return null;
  }

  return Number(value);
};

export const getOriginalProductPrice = (product) => Number(product.price);

export const getOfferProductPrice = (product) => toNullableNumber(product.offer_price);

export const getEffectiveProductPrice = (product) => {
  const originalPrice = getOriginalProductPrice(product);
  const offerPrice = getOfferProductPrice(product);

  return product?.is_offer && offerPrice !== null ? offerPrice : originalPrice;
};

export const getProductPricing = (product) => ({
  price: getEffectiveProductPrice(product),
  originalPrice: getOriginalProductPrice(product),
  offerPrice: getOfferProductPrice(product),
  isOffer: Boolean(product?.is_offer)
});
