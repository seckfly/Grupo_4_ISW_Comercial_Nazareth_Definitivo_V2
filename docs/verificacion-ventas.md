# CU-001, CU-002 y controles numéricos

## Referencia

Se conservan los identificadores RF-001, RF-010, BR-001, BR-002 y BR-003 del [SRS definitivo](SRS.md). Los escenarios se contrastan con [CU-001 y CU-002](CU.md) y [PRU-001, PRU-003, PRU-004 y PRU-020](../pruebas/pruebas.md).

## Errores encontrados y correcciones

| Hallazgo | Corrección |
|---|---|
| El checkout cargaba productos de muestra, confirmaba en memoria y generaba un ID local. | Catálogo, cálculo y guardado mediante Express. La confirmación y el ticket usan la venta persistida. |
| Ventas mostraba una lista y resúmenes de muestra. | Consulta por periodo a PostgreSQL, filtros de pago y búsqueda, resumen real y detalle persistido. |
| El botón de cliente era inactivo. | Búsqueda por nombre, teléfono o correo y selección opcional. Una nueva venta comienza sin cliente asociado. |
| El servicio omitía el descuento y la validación del efectivo. | El servidor calcula subtotales, descuento fijo y total en centavos, valida el efectivo y guarda recibido y vuelto. |
| El formulario imponía seis dígitos para pagos digitales. | La API admite una referencia opcional. Caja exige el importe exacto y confirmación manual. |
| Variación de existencias usaba `step=0.01`, lo que cambiaba el saldo por centésimas con las flechas. | Control con botones y teclas que cambian exactamente una unidad. La escritura manual conserva signo y hasta dos decimales. |
| El historial mostraba siempre `unid.`. | Muestra la unidad del producto. |
| Descuento de Promociones usaba mínimo 1 y máximo 100 para ambos tipos. | Montos fijos y porcentajes positivos con centésimas, máximo de 100 para porcentaje y límite de almacenamiento para el monto fijo. |

## Cálculo y persistencia

`POST /api/sales/quote` devuelve los precios del servicio y el cálculo del carrito. Las cantidades tienen hasta dos decimales, conforme al almacenamiento existente. Cada subtotal se redondea a centavos antes de sumarse. Un descuento fijo no puede exceder el subtotal. Las funciones numéricas compartidas evitan diferencias de precisión entre formularios y servicio.

Se conserva el descuento fijo global que ya ofrecía el checkout. La integración de campañas por producto y su regla de acumulación con el descuento manual quedan para Promociones.

Al confirmar, el servicio vuelve a consultar los precios y bloquea los productos por ID. Si el precio cambió, solicita revisar el cálculo. La venta, su detalle, los movimientos y los saldos se confirman en una transacción. El UUID de solicitud protege el guardado frente a reintentos. Las salidas conservan saldo anterior y posterior y siguen su flujo sin exigir el motivo de ajuste manual de CR-001.

Las ventas anteriores a la migración pueden leerse aunque carezcan de los nuevos campos. El detalle nuevo conserva nombre y unidad de producto. Los importes de venta y pago se recuperan de los registros guardados.

## Migración

Aplicar [004_sales.sql](../codigo/database/migrations/004_sales.sql) después de 003, con el rol `postgres` en el SQL Editor de Supabase. Las versiones anteriores se conservan. Las columnas nuevas admiten los datos históricos existentes y los permisos de lectura permiten listar ventas y vincular clientes.

## Pruebas ejecutadas

`npm.cmd --prefix backend test` incluye [sales.integration.test.js](../codigo/backend/test/sales.integration.test.js). Esta suite crea un clúster PostgreSQL nativo temporal en localhost, aplica 001 a 004 y ejecuta los servicios con el rol `nazareth_app`. El clúster, sus credenciales aleatorias y los datos se eliminan al finalizar. Supabase alojado no participa en estas pruebas.

| Prueba | Evidencia |
|---|---|
| PRU-001 | Venta de 3 unidades a 6,70, total 20,10 y stock 10 → 7. Cabecera, detalle y salida guardados. La venta vuelve a aparecer tras reiniciar la API. |
| PRU-001, fallo | El trigger exclusivo de prueba comprueba stock provisional 7 después de la escritura y provoca el fallo al registrar la salida. El rollback conserva stock 10 e historial anterior y elimina los registros parciales de venta y detalle. |
| PRU-003 | Total 20,10 y vuelto 29,90 con efectivo 50,00. También se verifica descuento 1,25 y efectivo con centavos. |
| PRU-004 | Dos ventas consecutivas, una vinculada al cliente y otra con cliente nulo. |
| PRU-020 | Los pagos digitales conservan el medio y el importe recibido. Las pruebas validan importe exacto y confirmación manual. |
| Concurrencia real | Dos PID de PostgreSQL distintos. El ajuste espera el bloqueo de la venta. Desde stock 10, venta de 3 y ajuste de -2 terminan en stock 5 y conservan ambos movimientos. También se verifica el rechazo cuando ambas operaciones excederían el saldo. |

La suite de frontend prueba en DOM los botones, las teclas arriba/abajo, la entrada manual negativa, centavos en formularios, exceso de precisión y stock, unidad en historial, ID de confirmación y nueva consulta al montar Ventas. Incluye el campo de descuento de Promociones. La compilación conserva los estilos y componentes existentes.

## Promociones

El servicio usa el precio calculado para las campañas vigentes. Cuando coinciden campañas, aplica el menor precio disponible. [Trazabilidad](../matrices/trazabilidad.md).
