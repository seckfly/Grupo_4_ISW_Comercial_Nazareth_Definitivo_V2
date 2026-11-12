# Cambios de Definitivo V2

Los Issues documentan cambios observados en el código y las comprobaciones que corresponden a la entrega. Los enlaces muestran la documentación y los componentes relacionados.

| ID | Cambio | Evidencia |
|---|---|---|
| CR-001 | Motivo obligatorio en el ajuste manual | [Análisis de impacto](../matrices/impacto-cr-001.md) |
| [CR-002](https://github.com/seckfly/Grupo_4_ISW_Comercial_Nazareth_Definitivo_V2/issues/1) | Migración a PostgreSQL y Supabase Auth | [Decisión de arquitectura](cambios/CR-002-migracion-supabase.md) |
| [CR-003](https://github.com/seckfly/Grupo_4_ISW_Comercial_Nazareth_Definitivo_V2/issues/2) | Despliegue de Express en Render | [Modelo de despliegue](../modelos/modelos-v2.md#despliegue) · [API en Render](https://nazareth-backend.onrender.com) |
| [CR-004](https://github.com/seckfly/Grupo_4_ISW_Comercial_Nazareth_Definitivo_V2/issues/3) | Apartado de stock y recojo de reservas | [Servicio de reservas](../codigo/backend/src/services/reservationService.js) |
| [CR-005](https://github.com/seckfly/Grupo_4_ISW_Comercial_Nazareth_Definitivo_V2/issues/4) | Ingreso directo de compras y costo promedio | [Servicio de compras](../codigo/backend/src/services/purchaseService.js) |
| [CR-006](https://github.com/seckfly/Grupo_4_ISW_Comercial_Nazareth_Definitivo_V2/issues/5) | Confirmación de pagos digitales en caja | [Servicio de ventas](../codigo/backend/src/services/saleService.js) · [Caja](../codigo/frontend/src/components/ui/SaleDrawer.jsx) |
| [CR-007](https://github.com/seckfly/Grupo_4_ISW_Comercial_Nazareth_Definitivo_V2/issues/6) | Interfaz adaptable por tamaño de pantalla | [Catálogo](../codigo/frontend/src/pages/Products/index.jsx) · [Caja](../codigo/frontend/src/components/ui/SaleDrawer.jsx) |
| [CR-008](https://github.com/seckfly/Grupo_4_ISW_Comercial_Nazareth_Definitivo_V2/issues/7) | Fotos de productos y ciclo de vida del inventario | [Servicio de inventario](../codigo/backend/src/services/inventoryService.js) |
| [CR-009](https://github.com/seckfly/Grupo_4_ISW_Comercial_Nazareth_Definitivo_V2/issues/8) | Teléfono opcional y contraseña de la propia cuenta | [Servicio de clientes](../codigo/backend/src/services/customerService.js) · [Cuenta del cliente](../codigo/frontend/src/pages/Account/index.jsx) |
| [CR-010](https://github.com/seckfly/Grupo_4_ISW_Comercial_Nazareth_Definitivo_V2/issues/9) | Reclamo y canje de beneficios de fidelización | [Servicio de fidelización](../codigo/backend/src/services/loyaltyService.js) |
