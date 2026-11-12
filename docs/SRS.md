# Especificación de requisitos de software · Comercial Nazareth V2

## Propósito y contexto

El sistema organiza las ventas, las existencias y la reposición de Comercial Nazareth, negocio minorista de abarrotes ubicado en Ascope, La Libertad. Humberto Dávalos es el propietario y único trabajador. Registra sus operaciones en cuadernos y estima el stock mediante revisión visual; necesita conocer las cantidades disponibles para decidir qué comprar y cuánto reponer.

El [registro de cambios](cambios-v2.md) documenta las decisiones del sistema. El [catálogo de pruebas](../pruebas/pruebas.md) establece los escenarios y el [informe de verificación](../reportes/verificacion-v2.md) registra sus resultados y límites de ejecución.

## Alcance

Se incluyen ventas, consulta de productos y existencias, mantenimiento de productos e inventario, promociones, solicitudes de separación, apartados y recojo, consultas del portal y beneficios de clientes, administración de accesos, resúmenes de ventas, órdenes de compra y recepción de mercadería.

La interfaz usa React/Vite y la API usa Express. Los datos se guardan en PostgreSQL alojado en Supabase. Supabase Auth autentica las cuentas y Express comprueba el perfil y autoriza las operaciones. Las fotos opcionales usan Supabase Storage. La entrega web contempla la interfaz en Vercel y la API en Render. El [modelo de despliegue](../modelos/modelos-v2.md#despliegue) recoge esas dependencias.

Quedan fuera del alcance la contabilidad integral, la facturación electrónica, los pagos a proveedores, la apertura y el cierre formal de caja, las notificaciones automáticas y la detección de stock mediante cámaras. El proveedor se comunica con Humberto fuera de la aplicación y no tiene credenciales de acceso.

## Actores y perfiles

| Actor o participante | Relación con el sistema |
|---|---|
| Vendedor | Humberto registra ventas y vincula al cliente cuando se identifica. |
| Administrador | Humberto gestiona promociones y accesos. |
| Responsable de almacén | Humberto consulta existencias y realiza el mantenimiento y los ajustes autorizados. |
| Responsable de compras | Humberto registra órdenes y recepciones. |
| Cliente registrado | Consulta el portal, guarda favoritos y listas y solicita separaciones. |
| Comprador sin registro | Es atendido por el Vendedor y puede comprar sin una cuenta. |
| Proveedor | Entrega mercadería y coordina con Humberto fuera de la aplicación. |

Los cuatro roles internos corresponden al perfil administrativo de Humberto. El cliente registrado utiliza su propio perfil en el portal.

## Requisitos funcionales

| ID | Requisito | Comportamiento requerido | Caso de uso o ámbito |
|---|---|---|---|
| RF-001 | Registrar venta | El sistema debe registrar los productos, cantidades y método de pago de la venta, calcular el total con los precios del servicio y redondear los importes a dos decimales. Una vez confirmada la venta, Caja permite imprimir su ticket. La venta, su detalle y la salida de stock deben confirmarse en una misma transacción; ante un error de guardado, deben revertirse sin cambios parciales. | CU-001 |
| RF-002 | Consultar existencias y alertas | El administrador consulta stock físico, apartado y disponible. La alerta usa el stock físico de productos activos y se activa cuando es menor o igual al mínimo. | CU-006 |
| RF-003 | Identificar proveedor de la orden | El sistema debe guardar razón social, RUC y teléfono del proveedor dentro de la orden, sin exigir un catálogo independiente. | CU-008 |
| RF-004 | Registrar compras | En Compras, el administrador registra mercadería ya recibida con proveedor, líneas, cantidades, costos y referencia. La API también permite crear órdenes pendientes. El módulo consulta sus estados y permite recibir las órdenes pendientes existentes. | CU-008 |
| RF-005 | Registrar recepción | El administrador recibe toda o parte de una orden pendiente. La operación actualiza cantidades, stock, movimientos de entrada y costo unitario ponderado. El ingreso directo registra la compra y su recepción en una sola transacción. | CU-008, CU-009 |
| RF-006 | Acceder según perfil | El administrador y el cliente registrado inician sesión con Supabase Auth y pueden cerrarla. Express valida la identidad y resuelve el perfil activo antes de autorizar la operación. | Acceso transversal |
| RF-007 | Consultar catálogo | El sistema debe permitir buscar productos por nombre y categoría, mostrar su precio y disponibilidad, y guardar favoritos y listas en el portal del cliente registrado. | CU-003 |
| RF-008 | Gestionar promociones | El sistema debe crear, editar, pausar, activar y eliminar campañas por producto, con descuento, vigencia y estado. | CU-004 |
| RF-009 | Gestionar solicitudes y apartados | El cliente solicita hasta tres productos distintos y recibe un código de recojo y un importe estimado. El administrador puede confirmar, editar o rechazar una solicitud vigente. La confirmación aparta unidades disponibles. El recojo enlaza la venta y cierra el apartado en la misma transacción. | CU-005, CU-001 |
| RF-010 | Vincular cliente a la venta | El sistema debe permitir vincular un cliente registrado a la venta cuando el comprador se identifique y registrar la venta sin cliente asociado cuando no se identifique. | CU-002 |
| RF-011 | Consultar clientes frecuentes | El sistema debe mostrar nombre, contacto, frecuencia e historial básico de clientes identificados. | Consulta administrativa |
| RF-012 | Consultar resumen y reportes | El sistema debe mostrar ventas, métodos de pago y productos con movimiento por periodo. | Consulta administrativa |
| RF-013 | Administrar accesos | El administrador crea y gestiona credenciales de clientes. La cuenta principal también puede crear administradores, gestionar otras cuentas administrativas y cambiar roles. La cuenta principal conserva su rol y acceso activo. | CU-007 |
| RF-014 | Consultar cuenta y beneficios | El cliente consulta su contacto, historial de compras y puntos. Puede reclamar o cancelar un beneficio disponible. En caja, el administrador puede canjear un beneficio disponible del cliente asociado a la venta. | CU-010, CU-001 |
| RF-015 | Mantener productos e inventario | El sistema debe permitir registrar productos con su stock inicial, editar datos y precios, y modificar las existencias mediante ajustes autorizados que quedan en el historial. Cada ajuste manual debe incluir un motivo con al menos un carácter distinto de espacios y conservarlo en el historial. Si el motivo está vacío o contiene únicamente espacios, el sistema debe solicitar su corrección sin modificar el stock ni registrar el ajuste. El ajuste, su motivo y la actualización del stock deben guardarse en una misma transacción. Esta condición del motivo no se aplica a las salidas generadas por ventas. | CU-006 |
| RF-016 | Gestionar fotos y estado de productos | El administrador puede asociar, cambiar o retirar la foto opcional de un producto. Puede archivar y restaurar productos, o registrar su baja con confirmación. Las operaciones de inventario validan los apartados vigentes y conservan los movimientos anteriores. | CU-006 |
| RF-017 | Cambiar la contraseña propia | El usuario autenticado puede cambiar su contraseña con la contraseña actual, la nueva y su confirmación. Se actualiza la misma identidad en Supabase Auth. | CU-010 |
| RF-018 | Gestionar el teléfono propio | El cliente y el administrador pueden registrar, cambiar o quitar su teléfono. El teléfono es opcional y, si se informa, contiene de 6 a 15 dígitos y hasta 25 caracteres telefónicos. | CU-010 |
| RF-019 | Eliminar una cuenta autorizada | El titular de una cuenta no protegida puede retirarla con su contraseña actual y confirmación expresa. Un administrador puede retirar accesos según su jerarquía. La cuenta principal no puede eliminarse. | CU-007, CU-010 |

## Requisitos no funcionales

| ID | Requisito | Condición de aceptación |
|---|---|---|
| RNF-001 | Rapidez de registro | Una venta de hasta tres líneas, con precios cargados y un administrador, se confirma en menos de 15 segundos, sin contar la espera de un pago externo. |
| RNF-002 | Separación de perfiles | Las opciones administrativas quedan fuera de la navegación del cliente y las operaciones protegidas rechazan roles no autorizados. |
| RNF-003 | Tiempo de consulta | Productos, stock y resumen responden en tres segundos o menos, con un usuario concurrente y el catálogo de demostración en entorno local. |
| RNF-004 | Integridad de venta | Venta, detalle y movimiento se confirman juntos; ante un error no quedan modificaciones parciales. |
| RNF-005 | Consistencia monetaria | Totales y subtotales usan dos decimales, con diferencia admitida de S/ 0,00 respecto del cálculo redondeado. |
| RNF-006 | Respaldo recuperable | El respaldo de PostgreSQL debe poder restaurarse conservando las ventas. La ejecución al cierre requiere configurar el horario en el entorno de uso. |
| RNF-007 | Interfaz adaptable | El catálogo, el panel administrativo y el registro de venta deben poder usarse en los tamaños de pantalla validados. Los controles y los importes deben quedar accesibles sin desplazamiento horizontal de la página. El resultado se registra por dispositivo en el informe de verificación. |

Para RNF-001 se consideran diez operaciones equivalentes, todas bajo el umbral. Para RNF-003 se miden diez consultas por operación en el entorno indicado. RNF-002 se contrasta con las opciones de navegación y el rechazo de operaciones no autorizadas; RNF-004, con ventas válidas, stock insuficiente y fallos de guardado; RNF-005, con cantidades y precios conocidos; RNF-006, mediante restauración y comparación de los registros conservados.

## Reglas del negocio

| ID | Regla |
|---|---|
| BR-001 | En Yape, Plin y otras billeteras digitales se requiere el importe exacto a dos decimales y confirmación manual del abono. Caja muestra un QR común en el panel digital. La API admite una referencia opcional. |
| BR-002 | La venta usa el precio calculado por el servicio y redondea a dos decimales. Cuando coinciden promociones vigentes, se aplica el menor precio entre el regular y los promocionales |
| BR-003 | Una venta puede registrarse sin cliente asociado. |
| BR-004 | Una orden de compra no aumenta el stock. El incremento ocurre al confirmar la recepción. |
| BR-005 | La solicitud pendiente dura 24 horas y no aparta unidades. La confirmación administrativa aparta unidades vendibles. La cancelación y el vencimiento liberan disponibilidad. El recojo confirma una venta vinculada y descuenta stock físico |
| BR-006 | La alerta se calcula con el stock físico de un producto activo menor o igual al mínimo. El administrador registra la reposición desde Compras. |
| BR-007 | Los datos del proveedor se guardan en la orden. El proveedor no tiene credenciales ni un caso de uso independiente. |
| BR-008 | Una recepción parcial mantiene pendiente la orden y acumula cantidades recibidas. Se rechazan referencias duplicadas y cantidades superiores al saldo por recibir. |
| BR-009 | La recepción actualiza el costo promedio ponderado con las existencias anteriores y el costo de las unidades recibidas. Una compra directa conserva la referencia de recepción. |
| BR-010 | El saldo suma los puntos iniciales y la parte entera del total acumulado de compras confirmadas, y resta los puntos de beneficios que siguen vigentes o ya fueron usados. Reclamar un beneficio consume 100 puntos y genera un descuento de S/ 5,00. En Caja se puede canjear cuando el importe previo al beneficio alcanza S/ 30,00. El beneficio corresponde al cliente titular y puede canjearse una vez. Cancelar un beneficio disponible libera los puntos comprometidos. |
| BR-011 | Un ajuste manual requiere motivo válido, se registra con su movimiento y no puede reducir el stock físico por debajo de las unidades apartadas. |
| BR-012 | Solo el administrador principal puede dar de alta a otro administrador, gestionar otras cuentas administrativas o cambiar roles. La cuenta principal mantiene su rol, su acceso y su protección. |
| BR-013 | El retiro de una cuenta bloquea el acceso, retira sus datos de contacto y conserva sus referencias comerciales. Una reserva pendiente o confirmada que siga vigente bloquea el retiro del cliente. Si falla el retiro de la identidad en Auth, el acceso queda bloqueado y la operación se puede completar después. |
| BR-014 | Archivar o dar de baja requiere resolver reservas vigentes y órdenes con saldo pendiente. Archivar pausa las campañas activas o programadas. Restaurar habilita el producto y deja las campañas pausadas. La baja exige confirmar la palabra ELIMINAR y el stock observado, deja el stock en cero y termina las campañas. |

## Trazabilidad

La [matriz](../matrices/trazabilidad.md) vincula los requisitos y reglas con los [casos de uso](CU.md), los [modelos V2](../modelos/modelos-v2.md) y el [catálogo de pruebas](../pruebas/pruebas.md).
