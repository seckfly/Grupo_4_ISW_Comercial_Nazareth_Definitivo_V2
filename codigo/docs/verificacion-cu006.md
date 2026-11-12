# CU-006 · Inventario y CR-001

## Referencia aprobada

La verificación de inventario abarca RF-002, RF-015 y BR-006.

- [SRS](SRS.md).
- [Proceso crítico](proceso-critico.md).
- [Trazabilidad](../../matrices/trazabilidad.md).
- [Pruebas de aceptación](../../pruebas/pruebas.md).

## Implementación

Inventario consulta productos, categorías, costos, precios, saldos y mínimos de PostgreSQL. Conserva las vistas de lista y tarjetas y el formulario lateral. La edición, el ajuste y el historial reutilizan sus paneles y los estilos del proyecto. El código visible de cada producto corresponde a su ID existente en la base.

La alerta usa `is_active AND current_stock <= min_stock_threshold`. Incluye la igualdad al mínimo y excluye los productos inactivos. El filtro Solo alertas permite consultar ese conjunto. La igualdad al mínimo conserva la consulta de inventario. La extensión a órdenes de compra de CU-008 queda para el módulo de compras.

El alta guarda producto y movimiento de stock inicial en una transacción cuando hay existencias iniciales. La edición conserva el stock. Los cambios de existencias pasan por un ajuste con variación y motivo. El servicio valida números con hasta dos decimales, un motivo con contenido y un saldo no negativo, bloquea el producto con `FOR UPDATE` y guarda saldo, movimiento y motivo en una transacción.

Cada ajuste lleva un UUID de solicitud. Repetir una solicitud con los mismos datos recupera el resultado sin duplicar el movimiento. Reutilizarla con otros datos se rechaza. El historial conserva movimientos anteriores, incluidos los creados antes de esta implementación cuyos saldos anteriores y posteriores estén vacíos.

## Migración necesaria

Aplicar [003_inventory_access.sql](../database/migrations/003_inventory_access.sql) en el SQL Editor de Supabase con el rol `postgres`. Las versiones 001 y 002 se conservan. La versión 003 agrega permisos, un identificador de solicitud y su índice único. Inicializa las categorías de la pantalla original que aún no existan.

## Rutas protegidas

Todas las rutas de inventario requieren sesión activa y perfil `admin`. El catálogo público conserva `GET /api/products`.

| Método | Ruta | Operación |
|---|---|---|
| GET | `/api/inventory` | Productos, existencias, mínimos, alertas y categorías. |
| POST | `/api/inventory/products` | Registro y stock inicial. |
| PUT | `/api/inventory/products/:id` | Edición de datos sin sobrescribir stock. |
| GET | `/api/inventory/products/:id/history` | Saldo e historial bajo una misma instantánea de lectura. |
| POST | `/api/inventory/products/:id/adjustments` | Variación, motivo y UUID de solicitud. |

## Verificación reproducible

Ejecutar `npm.cmd --prefix backend test`. Las pruebas de [inventory.test.js](../backend/test/inventory.test.js) levantan la API con identidades de prueba y PostgreSQL embebido en memoria, aplican 001, 002 y 003 y ejecutan las consultas como `nazareth_app`. Los datos y el fallo de guardado se crean exclusivamente en esa base aislada.

| Prueba | Resultado obtenido en el entorno aislado |
|---|---|
| PRU-002 | Activos con stock 4 y 5 alertan con mínimo 5. Stock 6 y el inactivo con stock 4 quedan fuera de las alertas. |
| PRU-016 | Alta con precio 6,70 y stock 10, edición a 7,00 y ajustes 10 → 9 → 8. Ambos motivos y el primer movimiento permanecen en el historial. |
| PRU-017 | Motivo vacío devuelve 400 y conserva stock 10 e historial previo. |
| PRU-018 | Motivo de tres espacios devuelve 400 y conserva stock 10 e historial previo. |
| PRU-019 | Un trigger exclusivo de la prueba comprueba el saldo provisional 9 tras el UPDATE y provoca el fallo al insertar el movimiento. La API devuelve 500. Después del rollback, el stock es 10 y el historial coincide con la instantánea anterior, incluido un ajuste previo. |

También se comprueban permisos, cantidades inválidas, saldo negativo, reintentos simultáneos, cálculo decimal y conservación de productos y movimientos anteriores a 003. PGlite usa una conexión; la prueba serializa el préstamo de esa conexión. La concurrencia entre conexiones independientes de PostgreSQL alojado sigue pendiente de verificación.

Con la configuración real de Supabase se ejecutó una instancia temporal local del mismo Express. La consulta de inventario devolvió 200 para un administrador activo y 403 para Cliente Demo. El cliente recibió 403 en alta, edición, historial y ajuste. La consulta sin sesión devolvió 401. El catálogo alojado estaba vacío y estas comprobaciones conservaron sus datos. Las sesiones de prueba se cerraron al terminar.

Las pruebas del frontend se ejecutan con `npm.cmd --prefix frontend test`. Incluyen el indicador de stock por mínimo configurado, igualdad e inactividad. La compilación se comprueba con `npm.cmd --prefix frontend run build`.

## Pendientes

Aplicar 003 y ejecutar el recorrido administrativo completo en Supabase alojado. La comprobación de datos de prueba aislados no modifica el catálogo alojado. La revisión visual de escritorio y móvil queda pendiente porque el host de acceso al navegador no estuvo disponible durante la implementación.
