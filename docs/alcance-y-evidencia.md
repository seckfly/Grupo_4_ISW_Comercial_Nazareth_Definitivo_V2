# Alcance completo y evidencia de implementación

Referencia aprobada: [SRS](https://github.com/seckfly/Grupo_4_ISW_Comercial_Nazareth_Definitivo/blob/e98e1400cb4fa5ec47eef3585037a0e105af2b11/docs/SRS.md), [CU](https://github.com/seckfly/Grupo_4_ISW_Comercial_Nazareth_Definitivo/blob/e98e1400cb4fa5ec47eef3585037a0e105af2b11/docs/CU.md), [matriz](https://github.com/seckfly/Grupo_4_ISW_Comercial_Nazareth_Definitivo/blob/e98e1400cb4fa5ec47eef3585037a0e105af2b11/matrices/trazabilidad.md) y [23 PRU](https://github.com/seckfly/Grupo_4_ISW_Comercial_Nazareth_Definitivo/blob/e98e1400cb4fa5ec47eef3585037a0e105af2b11/pruebas/pruebas.md).

GitHub consultado antes de editar: main = e98e1400cb4fa5ec47eef3585037a0e105af2b11, comparación identical y sin archivos modificados. Lab 7 no sustituye el alcance completo. Base de implementación: 9933241. React/Vite, Express y CR-002 (Supabase/PostgreSQL/Auth) se mantienen. No se modifica el repositorio definitivo.

## Auditoría inicial

Ausente significa comportamiento no implementado, no simplemente prueba pendiente.

| ID | Requisito / regla | Código y evidencia inicial |
|---|---|---|
| RF-001 | Registrar venta | saleService, SaleDrawer; PRU-001/003/020: ejecutadas; simplificación digital solicitada pendiente |
| RF-002 | Consultar existencias y alertas | inventoryService, InventoryContext; PRU-002 ejecutada |
| RF-003 | Identificar proveedor de la orden | Solo esquema purchase_orders; servicio y pantalla ausentes |
| RF-004 | Registrar orden de compra | Solo esquema; orden y estados ausentes |
| RF-005 | Registrar recepción | Solo esquema; transacción de recepción ausente |
| RF-006 | Acceder según perfil | AuthContext, middleware/auth y users; evidencia automatizada, sesión real histórica disponible |
| RF-007 | Consultar catálogo | Products, api.products; favoritos/listas locales sin aislamiento por cuenta: brecha |
| RF-008 | Gestionar promociones | Promotion modelo/API existentes, formulario sin guardado ni gestión completa: brecha |
| RF-009 | Solicitar separación | Solo esquema, solicitud y apartado ausentes |
| RF-010 | Vincular cliente a la venta | saleService, SaleDrawer, customerSales; PRU-004 existente, cierre portal solicitado pendiente |
| RF-011 | Consultar clientes frecuentes | Consulta de nombre/contacto existente; frecuencia/historial ausentes |
| RF-012 | Consultar resumen y reportes | dashboardService y Analytics, pruebas aisladas existentes; conservar 9933241 |
| RF-013 | Administrar accesos | User, userService, Settings; alta/edición/desactivación y protección implementadas |
| RF-014 | Consultar cuenta y beneficios | Datos y compras propias; puntos persistidos no expuestos: brecha |
| RF-015 | Mantener productos e inventario | inventoryService, InventoryDrawers; PRU-016–019 ejecutadas; CR-001 conservado |
| RNF-001 | Rapidez de registro | Implementado; falta medición formal de diez ventas PRU-021 |
| RNF-002 | Separación de perfiles | Middleware y navegación por rol; pruebas de rechazo existentes |
| RNF-003 | Tiempo de consulta | Implementado; falta medición formal diez consultas por operación PRU-022 |
| RNF-004 | Integridad de venta | Transacción probada con fallo aislado |
| RNF-005 | Consistencia monetaria | Cálculos en centavos, pruebas monetarias existentes |
| RNF-006 | Respaldo recuperable | Guía de respaldo; restauración PRU-023 aún no ejecutada |
| BR-001 | Yape y Plin se registran como método de pago. El código de operación no confirma el pago bancario. | Referencias digitales persistidas; adaptar monto recibido y referencia opcional |
| BR-002 | La venta usa el precio consultado por el servicio y redondea a dos decimales. El cálculo de descuentos debe coincidir entre interfaz y backend. | Redondeo probado; promociones no aplicadas a precios de venta: brecha |
| BR-003 | Una venta puede registrarse sin cliente asociado. | Venta sin cliente probada |
| BR-004 | Una orden de compra no aumenta el stock. El incremento ocurre al confirmar la recepción. | Ausente salvo esquema |
| BR-005 | Una solicitud de separación no confirma una venta ni garantiza el bloqueo de existencias. | Ausente salvo esquema |
| BR-006 | La alerta muestra stock menor o igual al mínimo. CU-008 puede extender CU-006 cuando el stock está por debajo del mínimo y Humberto decide reponer. Si el stock equivale al mínimo, se muestra la alerta, pero esa condición por sí sola no activa CU-008. | Alertas implementadas; contexto de compra ausente |
| BR-007 | Los datos del proveedor se guardan en la orden. El proveedor no tiene credenciales ni un caso de uso independiente. | Ausente salvo esquema |
| BR-008 | Una recepción parcial mantiene pendiente la orden y acumula cantidades recibidas. Se rechazan referencias duplicadas y cantidades superiores al saldo por recibir. | Ausente salvo esquema |

## Escenarios oficiales

Se conservan los 23 identificadores; son escenarios documentados, no aprobaciones automáticas. El cierre por etapa se registra debajo.

# Pruebas de Comercial Nazareth

| ID | Requisitos | Qué se prueba | Resultado esperado |
|---|---|---|---|
| PRU-001 | RF-001, RNF-004 | Con una sesión administrativa activa, usar un producto activo con stock 10 y precio del servicio de S/ 6,70. Registrar una venta de 3 unidades con pago en efectivo de S/ 50,00 y consultar los registros guardados. Como escenario separado, restablecer el estado inicial y repetir la operación provocando un fallo durante el guardado. | En el escenario de éxito se guardan la cabecera, el detalle, el método de pago en efectivo y el movimiento de salida de 3 unidades; el total es S/ 20,10 y el stock queda en 7. En el escenario de fallo, la venta no se confirma, no quedan cabecera, detalle ni movimiento correspondientes al intento y el stock permanece en 10. |
| PRU-002 | RF-002 | Con una sesión administrativa activa de Humberto en su rol de Responsable de almacén, preparar tres productos activos con stock 4, 5 y 6, respectivamente, y un producto inactivo con stock 4. Configurar un mínimo de 5 para los cuatro. Consultar las existencias y comprobar qué productos aparecen en las alertas. | La consulta muestra las existencias correspondientes. La alerta incluye los productos activos con stock 4 y 5; excluye el activo con stock 6 y el producto inactivo con stock 4. |
| PRU-003 | RF-001, RNF-005 | Con una sesión administrativa activa, usar un producto activo con stock suficiente y precio del servicio de S/ 6,70. Registrar una venta de 3 unidades con pago en efectivo de S/ 50,00. Comparar el total mostrado con el total registrado y comprobar el vuelto calculado y mostrado. | El total mostrado y registrado es S/ 20,10. El vuelto calculado y mostrado es S/ 29,90. Los importes se expresan con dos decimales. |
| PRU-004 | RF-010 | Con una sesión administrativa activa, un cliente registrado y un producto activo con stock 10 y precio de S/ 6,70, registrar consecutivamente dos ventas de 3 unidades, con pago en efectivo de S/ 50,00 por venta. Vincular al cliente en la primera; iniciar la segunda sin asociar un cliente. Consultar ambas ventas guardadas. | Las dos ventas se confirman. La primera queda asociada al cliente elegido y la segunda queda sin cliente vinculado, sin conservar la asociación de la primera. |
| PRU-005 | RF-003 | Registrar una orden con razón social, RUC y teléfono del proveedor; volver a consultar la orden. | La orden conserva los tres datos del proveedor dentro de su registro. |
| PRU-006 | RF-004 | Con un producto por debajo del mínimo, decidir registrar una orden con dos productos, cantidades y costos conocidos. Consultar su total, estado y stock. Repetir la consulta con stock igual al mínimo sin iniciar una orden. | La orden conserva proveedor y detalle, calcula el total estimado y queda pendiente sin aumentar el stock. La alerta por igualdad al mínimo no inicia por sí sola una orden. |
| PRU-007 | RF-007 | Desde el portal de un cliente registrado, usar un producto existente cuyo nombre, categoría, precio y disponibilidad se hayan identificado previamente. Buscarlo por nombre y realizar una búsqueda por su categoría; comparar los datos mostrados con los valores de referencia. Buscar después un nombre que no corresponda a ningún producto. Guardar el producto existente en favoritos y en una lista del cliente; volver a consultar ambas selecciones. | Las búsquedas por nombre y categoría muestran las coincidencias correspondientes, con el precio y la disponibilidad esperados. La búsqueda sin coincidencias muestra un estado vacío. Al volver a consultar favoritos y la lista, el producto permanece en ambas selecciones del cliente. |
| PRU-008 | RF-005 | Recibir parcialmente una orden pendiente y consultar cantidades recibidas, saldo, stock y movimientos. Repetir con una referencia duplicada y con una cantidad superior al saldo. | La recepción válida aumenta el stock y registra el movimiento de entrada en la misma transacción; la orden conserva el saldo pendiente. Los intentos duplicado y excedido se rechazan sin cambios. |
| PRU-009 | RF-006, RNF-002 | Iniciar y cerrar sesión como administrador y cliente registrado; revisar la navegación de cada perfil e intentar una operación administrativa protegida con el cliente. | Cada perfil accede a sus funciones. El cliente no ve opciones administrativas y la operación protegida rechaza su rol. Tras cerrar sesión, ninguna de las dos cuentas conserva el acceso anterior. |
| PRU-010 | RF-008 | Crear una campaña por producto con descuento y vigencia; editarla, pausarla, activarla y eliminarla. Comparar el descuento calculado en interfaz y servicio. | La campaña conserva los cambios y responde a cada cambio de estado. El importe descontado coincide en interfaz y servicio para el mismo producto y precio. |
| PRU-011 | RF-009 | Crear una solicitud de separación de hasta tres productos desde el portal y consultar su código, importe estimado, estado y vencimiento. | La solicitud queda registrada con vencimiento de 24 horas. No confirma una venta ni descuenta existencias. |
| PRU-012 | RF-011 | Consultar un cliente identificado con compras conocidas y contrastar nombre, contacto, frecuencia e historial básico. | Los datos y el historial corresponden al cliente consultado. |
| PRU-013 | RF-012 | Seleccionar un periodo con ventas y movimientos conocidos; consultar el resumen de ventas, métodos de pago y productos con movimiento. | Las cifras corresponden al periodo seleccionado y coinciden con los registros preparados. |
| PRU-014 | RF-013 | Como administrador, crear, editar y desactivar una cuenta; intentar la misma operación con un rol no autorizado y verificar la protección de la cuenta administrativa. | Los cambios autorizados se conservan. El rol no autorizado es rechazado y la cuenta administrativa permanece protegida. |
| PRU-015 | RF-014 | Entrar al portal con un cliente registrado que tenga compras y puntos conocidos; consultar la cuenta e intentar acceder a datos de otro cliente. | Se muestran los datos, las compras y los puntos de la cuenta activa; no se muestran los datos de otro cliente. |
| PRU-016 | RF-015 | Con acceso autorizado al mantenimiento de productos y los ajustes de existencias, registrar un producto con precio S/ 6,70 y stock inicial 10; consultar los valores guardados. Actualizar el precio a S/ 7,00. Realizar un primer ajuste manual de stock de 10 a 9 con el motivo "Producto dañado" y consultar su registro en el historial. Realizar un segundo ajuste de 9 a 8 con el motivo "Diferencia de conteo" y volver a consultar el producto y su historial, comprobando que ambos ajustes y sus motivos permanecen disponibles. | El registro inicial conserva el precio S/ 6,70 y stock 10. Después de las modificaciones, el producto conserva el precio S/ 7,00 y stock 8. El historial muestra el ajuste de 10 a 9 con el motivo "Producto dañado" y el de 9 a 8 con "Diferencia de conteo"; registrar el segundo ajuste no elimina ni reemplaza el primero ni su motivo. |
| PRU-017 | RF-015 | Con una sesión administrativa activa y acceso autorizado a los ajustes de existencias, usar un producto con stock 10 e identificar su historial inicial. Intentar un ajuste manual de 10 a 9 dejando el motivo vacío. Consultar el stock y el historial después del intento. | El sistema solicita corregir el motivo. El stock permanece en 10, no se registra el ajuste del intento y el historial conserva sus registros anteriores. |
| PRU-018 | RF-015 | Como escenario independiente, con una sesión administrativa activa y acceso autorizado a los ajustes de existencias, usar un producto con stock 10 e identificar su historial inicial. Intentar un ajuste manual de 10 a 9 introduciendo tres espacios y ningún otro carácter en el motivo. Consultar el stock y el historial después del intento. | El sistema solicita corregir el motivo. El stock permanece en 10, no se registra el ajuste del intento y el historial conserva sus registros anteriores. |
| PRU-019 | RF-015 | Con una sesión administrativa activa y acceso autorizado a los ajustes de existencias, usar un producto con stock 10 y al menos un ajuste anterior en su historial. Identificar y conservar los registros iniciales para compararlos. Intentar un ajuste manual de 10 a 9 con el motivo válido "Producto dañado". Provocar un fallo después de iniciar la escritura de uno de los cambios y antes de confirmar la transacción. Consultar el stock y el historial después del intento. | El sistema informa que el ajuste no se confirmó. El stock permanece en 10 y el historial conserva los registros anteriores sin eliminarlos ni reemplazarlos. No queda un movimiento ni un motivo guardado parcialmente correspondientes al intento fallido. |
| PRU-020 | RF-001 | Registrar por separado una venta con Yape y otra con Plin, con referencia de operación, y consultar los registros y el stock. | Cada venta conserva el método y la referencia ingresada, confirma venta, detalle y salida de stock; la referencia no se presenta como confirmación bancaria automática. |
| PRU-021 | RNF-001 | Medir diez ventas equivalentes de hasta tres líneas, con precios cargados y un administrador; excluir la espera del pago externo. | Cada venta se confirma en menos de 15 segundos en esas condiciones. |
| PRU-022 | RNF-003 | Con un usuario y el catálogo de demostración en entorno local, medir diez consultas de productos, diez de stock y diez del resumen. | Cada consulta responde en tres segundos o menos en las condiciones indicadas. |
| PRU-023 | RNF-006 | Guardar una copia de la base de datos al cierre de la jornada, restaurarla y comparar las ventas y sus registros asociados. | La restauración recupera los registros de la copia, incluidas las ventas de esa jornada. |


## Etapas previstas

1. Auditoría y correspondencia (este documento).
2. Órdenes/recepciones, promociones, clientes/puntos y listas por cuenta.
3. Solicitud de separación y apartado confirmado con disponibilidad y recojo transaccional.
4. QR de demostración, monto recibido digital y referencia opcional.
5. Fotos opcionales y cambio de contraseña propio; configuración Supabase y pruebas.
6. Evidencia aislada, mediciones y restauración; actualización final de la matriz.

Las extensiones de apartado confirmado, QR de demostración, fotos y contraseña propia deberán incorporarse en una futura actualización documental del SRS. No sustituyen CU-001/005 ni CR-001. Ninguna migración nueva se aplicará a la base de trabajo durante las pruebas.


## Etapa 2: alcance aprobado y base transaccional

Implementados servicios y pantallas de compras, recepción parcial, estados y proveedor dentro de la orden. Promociones tiene CRUD real y precio de campaña compartido entre catálogo, cotización y venta. El historial/frecuencia y puntos se consultan desde registros reales, sin fórmula de acumulación inventada. Favoritos y listas se guardan por cliente en PostgreSQL. La migración aditiva 005 prepara también la estructura del apartado; su recorrido se completa en la etapa siguiente.

Evidencia inicial de esta etapa: PRU-005/006/008, PRU-010, PRU-004/012/015 pasan en PostgreSQL aislado. PRU-007 detectó un permiso innecesario en el bloqueo de clientes; se reemplazó por un bloqueo asesor específico sin ampliar privilegios y pasó al repetirla. Frontend: 42 pruebas y compilación correctas. No se aplicó la migración a la base de trabajo. La política de campañas coincidentes aplica el precio menor sin acumular descuentos, como criterio explícito de implementación pendiente de reflejar en el SRS.

## Etapa 3: separación, recojo, pagos digitales y fotos opcionales

PRU-011 y las pruebas de carrera en conexiones PostgreSQL independientes verifican solicitud sin bloqueo, confirmación de últimas unidades frente a venta, cancelación/vencimiento, ajuste protegido y recojo con idempotencia. Se corrigió el permiso UPDATE de reservation_id que la prueba de recojo detectó. Los QRs Yape/Plin se generaron y se decodificaron hacia example.com; el monto digital se compara a dos decimales y requiere confirmación manual. La referencia opcional conserva el escenario con referencia de PRU-020. Las fotos tienen carga administrativa, validación MIME/firma/tamaño y previsualización/reemplazo/retirada.

La suite de backend con 52 casos pasó antes de añadir un caso adicional incondicional de cancelación y vencimiento; esa ampliación se incluye en la verificación final. Se ejecutaron mediciones locales de diez ventas (máximo 14 ms) y diez consultas por operación (máximos 2/2/12 ms en productos/stock/resumen) y una restauración real mediante pg_dump/pg_restore en otra base temporal. Estos resultados locales no equivalen a mediciones del proyecto alojado.

## Etapa 4: contraseña propia y cierre de configuración

Se implementó Mi cuenta para ambos roles con confirmación de nueva contraseña, reautenticación de la misma identidad, actualización y renovación de sesión mediante Supabase Auth. Las pruebas de la función verifican éxito, confirmación distinta y contraseña actual incorrecta sin modificar Auth.

La verificación alojada está **bloqueada**, no aprobada: createUser para una cuenta temporal devolvió HTTP 401 Invalid API key. No se creó cuenta, bucket ni contraseña de trabajo. El script reproducible y las variables exactas están en database/CONFIGURACION-ALCANCE-COMPLETO.md. No se solicitan secretos en chat.

La correspondencia final de los 15 RF, 6 RNF, 8 BR y 23 PRU, distinguiendo implementación y evidencia pendiente, está en [cierre-requisitos.md](cierre-requisitos.md). No se declaran aprobados integralmente PRU-009/014 ni los recorridos de navegador pendientes. Se conserva la asociación original de las ventas históricas; ninguna prueba escribió en datos de trabajo.
