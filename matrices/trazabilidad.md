# Matriz de trazabilidad de Comercial Nazareth V2

Vínculos entre el [SRS de V2](../codigo/docs/SRS.md), los [casos de uso](../codigo/docs/CU.md), los [modelos](../modelos/modelos-v2.md) y el [catálogo de pruebas](../pruebas/pruebas.md).

## Requisitos funcionales

| ID | Requisito | Caso de uso o ámbito | Clase del modelo | Pruebas documentadas | CR vinculados |
|---|---|---|---|---|---|
| RF-001 | Registrar venta | CU-001 | Venta, LíneaVenta, Producto, MovimientoInventario | PRU-001, PRU-003, PRU-020, PRU-024 | CR-004, CR-006 |
| RF-002 | Consultar existencias y alertas | CU-006 | Producto | PRU-002, PRU-024 | CR-004 |
| RF-003 | Identificar proveedor de la orden | CU-008 | OrdenCompra | PRU-005 | — |
| RF-004 | Registrar compras | CU-008, CU-009 | OrdenCompra, LíneaOrden | PRU-006, PRU-025 | CR-005 |
| RF-005 | Registrar recepción | CU-008, CU-009 | Recepción, LíneaRecepción, Producto, MovimientoInventario | PRU-008, PRU-025 | CR-005 |
| RF-006 | Acceder según perfil | Acceso transversal | Perfil | PRU-009 | CR-002 |
| RF-007 | Consultar catálogo | CU-003; también CU-001, CU-005 y CU-008 | Producto, PreferenciasCliente, Cliente | PRU-007 | — |
| RF-008 | Gestionar promociones | CU-004 | Promoción | PRU-010 | — |
| RF-009 | Gestionar solicitudes y apartados | CU-005, CU-001 | Reserva, LíneaReserva, Producto, Venta | PRU-011, PRU-024 | CR-004 |
| RF-010 | Vincular cliente a la venta | CU-002; extiende CU-001 | Cliente, Venta | PRU-004 | — |
| RF-011 | Consultar clientes frecuentes | Consulta administrativa | Cliente, Venta | PRU-012 | — |
| RF-012 | Consultar resumen y reportes | Consulta administrativa | Venta, MovimientoInventario | PRU-013 | — |
| RF-013 | Administrar accesos | Acceso transversal | Perfil, Cliente | PRU-014, PRU-029 | CR-002, CR-009 |
| RF-014 | Consultar cuenta y beneficios | Portal de clientes, CU-001 | Cliente, Beneficio, Venta | PRU-015, PRU-029, PRU-031 | CR-009, CR-010 |
| RF-015 | Mantener productos e inventario | CU-006 | Producto, MovimientoInventario | PRU-016, PRU-017, PRU-018, PRU-019, PRU-024 | CR-001, CR-004 |
| RF-016 | Gestionar fotos y estado de productos | CU-006 | Producto, MovimientoInventario | PRU-027, PRU-028 | CR-008 |
| RF-017 | Cambiar la contraseña propia | Mi cuenta | Perfil | PRU-030 | CR-009 |

## Requisitos no funcionales

| ID | Requisito | Ámbito | Prueba documentada |
|---|---|---|---|
| RNF-001 | Rapidez de registro | CU-001 | PRU-021 |
| RNF-002 | Separación de perfiles | Acceso transversal | PRU-009 |
| RNF-003 | Tiempo de consulta | Consultas de productos, stock y resumen | PRU-022 |
| RNF-004 | Integridad de venta | CU-001 | PRU-001 |
| RNF-005 | Consistencia monetaria | CU-001 | PRU-003 |
| RNF-006 | Respaldo recuperable | Respaldo de datos | PRU-023 |
| RNF-007 | Interfaz adaptable | Catálogo, panel y caja | PRU-026 |

## Reglas del negocio

| ID | Regla verificada | Pruebas documentadas |
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

## Despliegue

CR-003 se vincula al [diagrama de despliegue](../modelos/modelos-v2.md#despliegue) y a PRU-032.
