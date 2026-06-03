# Reporte de Auditoría BAC

Fecha: 03-06-2026
Alcance: API de pedidos, asignaciones y notificaciones

## Antes
- Cualquier usuario autenticado podía leer los datos de asignación por pedido, entrega o ID de asignación, incluyendo información personal de los pedidos.
- Un SELLER podía crear una asignación de entrega para pedidos fuera de su tienda.
- Un DELIVERY podía actualizar el estado del pedido a DELIVERED sin demostrar que el pedido le había sido asignado.

## Después
- Las lecturas de asignación ahora aplican la propiedad por rol (el SELLER es propietario de la tienda, el CUSTOMER es propietario del pedido y el DELIVERY es propietario de la asignación).
- La creación de asignaciones valida que el SELLER sea propietario de la tienda del pedido y que la entrega pertenezca a la misma tienda.
- Las actualizaciones de estado del DELIVERY requieren una asignación aceptada vinculada al usuario de entrega autenticado.

## Archivos modificados
- src/modules/delivery/delivery-assignments/delivery-assignments.service.js
- src/modules/delivery/delivery-assignments/delivery-assignments.controller.js
- src/modules/users/orders/order.service.js
- tests/unit/delivery/delivery-assignments.test.js
- tests/unit/order/order.test.js
- tests/unit/delivery/delivery-assignments-controller.test.js
- tests/unit/commerce/delivery-assignments.test.js
- tests/e2e/delivery-assignments-create.test.js