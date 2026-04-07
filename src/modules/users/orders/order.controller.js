import {
  createOrderService,
  getOrderShippingQuoteService,
  getOrdersService,
  getStoreOrdersService,
  updateOrderStatusService
} from "./order.service.js";

export const createOrder = async (req, res, next) => {
  try {
    const order = await createOrderService(req.user.id_user, req.body);
    return res.status(201).json(order);
  
  } catch (error) {
    next(error);
  }
};

export const getOrders = async (req, res, next) => {
  try {
    const { customerId } = req.params;
    const orders = await getOrdersService(req.user.id_user, customerId);
    return res.status(200).json(orders);
  
  } catch (error) {
    next(error);
  }
};


export const getStoreOrders = async (req, res, next) => {
  try {
    const { storeId } = req.params;
    const orders = await getStoreOrdersService(req.user.id_user, storeId, req.query);
    return res.status(200).json(orders);
  
  } catch (error) {
    next(error);
  }
};


export const updateOrderStatus = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const { order_status } = req.body;
    const order = await updateOrderStatusService(req.user.id_user, orderId, order_status);
    return res.status(200).json(order);
  
  } catch (error) {
    next(error);
  }
};

export const getOrderShippingQuote = async (req, res, next) => {
  try {
    const quote = await getOrderShippingQuoteService(req.user.id_user, req.body);
    return res.status(200).json(quote);
  } catch (error) {
    next(error);
  }
};