# Matriz de trazabilidad de Comercial Nazareth V2

Vínculos entre el [SRS de V2](../docs/SRS.md), los [casos de uso](../docs/CU.md), los [modelos](../modelos/modelos-v2.md) y el [catálogo de pruebas](../pruebas/pruebas.md).

La columna de clases usa los identificadores de la [fuente editable del diagrama](../modelos/clases.drawio). La columna de pruebas identifica escenarios de verificación. Consulta el [informe de verificación](../reportes/verificacion-v2.md) para saber qué comprobaciones se ejecutaron y en qué entorno.

## Requisitos funcionales

| ID | Requisito | Caso de uso o ámbito | Clase del modelo | Pruebas documentadas | CR vinculados |
|---|---|---|---|---|---|
| RF-001 | Registrar venta | CU-001 | CLS-Venta, CLS-LineaVenta, CLS-Producto, CLS-MovimientoInventario | PRU-001, PRU-003, PRU-020, PRU-024 | CR-004, CR-006 |
| RF-002 | Consultar existencias y alertas | CU-006 | CLS-Producto | PRU-002, PRU-024 | CR-004 |
| RF-003 | Identificar proveedor de la orden | CU-008 | CLS-OrdenCompra | PRU-005 | — |
| RF-004 | Registrar compras | CU-008, CU-009 | CLS-OrdenCompra, CLS-LineaOrdenCompra | PRU-006, PRU-025 | CR-005 |
| RF-005 | Registrar recepción | CU-008, CU-009 | CLS-Recepcion, CLS-LineaRecepcion, CLS-Producto, CLS-MovimientoInventario | PRU-008, PRU-025 | CR-005 |
| RF-006 | Acceder según perfil | [CU-011](../docs/CU.md#cu-011-iniciar-y-cerrar-sesión) | CLS-Perfil | PRU-009 | CR-002 |
| RF-007 | Consultar catálogo | CU-003, CU-001, CU-005, CU-008 | CLS-Producto, CLS-Categoria, CLS-ListaProductos, CLS-ProductoEnLista, CLS-Favorito, CLS-Cliente | PRU-007 | — |
| RF-008 | Gestionar promociones | CU-004 | CLS-Promocion, CLS-Producto | PRU-010 | — |
| RF-009 | Gestionar solicitudes y apartados | CU-005, CU-001 | CLS-Reserva, CLS-LineaReserva, CLS-Producto, CLS-Venta | PRU-011, PRU-024 | CR-004 |
| RF-010 | Vincular cliente a la venta | CU-002 (extiende CU-001) | CLS-Cliente, CLS-Venta | PRU-004 | — |
| RF-011 | Consultar clientes frecuentes | [CU-012](../docs/CU.md#cu-012-consultar-clientes-frecuentes) | CLS-Cliente, CLS-Perfil, CLS-Venta | PRU-012 | — |
| RF-012 | Consultar resumen y reportes | [CU-013](../docs/CU.md#cu-013-consultar-resumen-y-reportes) | CLS-Venta, CLS-LineaVenta, CLS-Producto, CLS-MovimientoInventario | PRU-013 | — |
| RF-013 | Administrar accesos | CU-007 | CLS-Perfil, CLS-Cliente | PRU-014, PRU-033 | CR-002, CR-011 |
| RF-014 | Consultar cuenta y beneficios | CU-010, CU-001 | CLS-Cliente, CLS-Beneficio, CLS-Venta | PRU-015, PRU-029, PRU-031 | CR-009, CR-010 |
| RF-015 | Mantener productos e inventario | CU-006 | CLS-Producto, CLS-MovimientoInventario | PRU-016, PRU-017, PRU-018, PRU-019, PRU-024 | CR-001, CR-004 |
| RF-016 | Gestionar fotos y estado de productos | CU-006 | CLS-Producto, CLS-MovimientoInventario, CLS-Promocion, CLS-Reserva, CLS-OrdenCompra | PRU-027, PRU-028 | CR-008 |
| RF-017 | Cambiar la contraseña propia | CU-010 | CLS-Perfil | PRU-030 | CR-009 |
| RF-018 | Gestionar el teléfono propio | CU-010 | CLS-Perfil, CLS-Cliente | PRU-029 | CR-009 |
| RF-019 | Eliminar una cuenta autorizada | CU-007, CU-010 | CLS-Perfil, CLS-Cliente, CLS-Reserva, CLS-Venta | PRU-034 | CR-011 |

## Requisitos no funcionales

| ID | Requisito | Ámbito | Prueba documentada |
|---|---|---|---|
| RNF-001 | Rapidez de registro | CU-001 | PRU-021 |
| RNF-002 | Separación de perfiles | CU-011 | PRU-009 |
| RNF-003 | Tiempo de consulta | CU-003, CU-006, CU-013 | PRU-022 |
| RNF-004 | Integridad de venta | CU-001 | PRU-001 |
| RNF-005 | Consistencia monetaria | CU-001 | PRU-003 |
| RNF-006 | Respaldo recuperable | Respaldo de datos | PRU-023 |
| RNF-007 | Interfaz adaptable | Catálogo, panel y caja | PRU-026 |

## Reglas del negocio

| ID | Regla del negocio | Pruebas documentadas |
|---|---|---|
| BR-001 | Pago digital con importe exacto y confirmación manual | PRU-020 |
| BR-002 | Precio calculado y menor precio promocional vigente | PRU-003, PRU-010 |
| BR-003 | Venta sin cliente asociado | PRU-004 |
| BR-004 | Orden sin aumento de stock; entrada al recibir | PRU-006, PRU-008 |
| BR-005 | Solicitud pendiente, apartado y recojo | PRU-011, PRU-024 |
| BR-006 | Alerta por umbral y decisión de reponer | PRU-002, PRU-006 |
| BR-007 | Proveedor guardado en la orden | PRU-005 |
| BR-008 | Recepción parcial y rechazo de duplicados o exceso | PRU-008 |
| BR-009 | Costo promedio ponderado en recepción | PRU-025 |
| BR-010 | Reclamo, cancelación y canje de un beneficio | PRU-031 |
| BR-011 | Motivo de ajuste y protección de unidades apartadas | PRU-016, PRU-017, PRU-018, PRU-019, PRU-024 |
| BR-012 | Jerarquía y protección de la cuenta principal | PRU-014, PRU-033 |
| BR-013 | Retiro de acceso, datos de contacto y reservas vigentes | PRU-034 |
| BR-014 | Archivo, restauración y baja de productos | PRU-028 |

## Despliegue

CR-003 se vincula al [diagrama de despliegue](../modelos/modelos-v2.md#despliegue) y a PRU-032.
