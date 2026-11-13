# Backlog de historias V2

Historias y prioridades del informe final (§§3.5–3.7), enlazadas a los [casos de uso](CU.md) y al [catálogo de pruebas](../pruebas/pruebas.md). Cada historia conserva un resultado observable y se delimita a las dependencias de su flujo. La aceptación exige que el escenario tenga PRU, que la prueba correspondiente pase, que exista trazabilidad a requisito, caso de uso y clase, y que el flujo se muestre en la aplicación publicada. La existencia de una historia y sus criterios no acredita su cierre.

| HU | Prioridad | Historia | Trazas |
|---|---|---|---|
| HU-01 | Must | Como vendedor quiero cobrar en efectivo con el total correcto para registrar la venta y descontar stock. | RF-001, CU-001, PRU-001 y PRU-003 |
| HU-02 | Must | Como vendedor quiero confirmar el abono de Yape o Plin para registrar un cobro verificado manualmente. | RF-001, CU-001, PRU-020 |
| HU-03 | Must | Como vendedor quiero vincular al cliente registrado para asociar su compra. | RF-010, CU-002, PRU-004 |
| HU-04 | Must | Como cliente quiero buscar por nombre o categoría para conocer precio y disponibilidad. | RF-007, CU-003, PRU-007 |
| HU-05 | Must | Como responsable de almacén quiero ver alertas de mínimo para decidir la reposición. | RF-002, CU-006, PRU-002 |
| HU-06 | Must | Como responsable de almacén quiero indicar un motivo de ajuste para conservar su historial. | RF-015, CU-006, PRU-016 a PRU-019 |
| HU-07 | Should | Como cliente quiero solicitar la separación de hasta tres productos distintos para recogerlos en tienda. | RF-009, CU-005, PRU-011 |
| HU-08 | Should | Como administrador quiero confirmar un apartado y cobrar su recojo para cerrar la reserva con la venta. | RF-009, CU-005 y CU-001, PRU-024 |
| HU-09 | Should | Como responsable de compras quiero registrar la compra recibida para ingresar stock en un paso. | RF-004, CU-008, PRU-025 |
| HU-10 | Should | Como responsable de compras quiero recibir parte de una orden pendiente para controlar el saldo por recibir. | RF-005, CU-009, PRU-008 y PRU-025 |
| HU-11 | Should | Como cliente quiero reclamar un beneficio con mis puntos para usarlo en una compra. | RF-014, CU-010 y CU-001, PRU-031 |
| HU-12 | Should | Como administrador quiero retirar un acceso autorizado para proteger los datos del titular. | RF-019, CU-007, PRU-034 |

## Criterios de aceptación

| HU | Escenario Gherkin |
|---|---|
| HU-01 | **Dado** un producto activo con stock 10 y precio S/ 6,70, **cuando** cobro 3 unidades con S/ 50,00, **entonces** el total es S/ 20,10, el vuelto S/ 29,90 y el stock queda en 7. |
| HU-02 | **Dada** una venta por S/ 35,40, **cuando** elijo Yape y marco la confirmación de un abono por ese importe, **entonces** se registra el pago digital. **Cuando** el importe difiere, **entonces** se solicita corregirlo antes de guardar. |
| HU-03 | **Dada** una venta en curso, **cuando** vinculo un cliente registrado y confirmo, **entonces** queda asociado. **Cuando** confirmo una nueva venta sin seleccionar cliente, **entonces** se guarda sin asociación. |
| HU-04 | **Dado** un producto disponible en una categoría, **cuando** busco por su nombre o categoría, **entonces** veo la coincidencia con precio y disponibilidad. |
| HU-05 | **Dado** un producto activo con stock y mínimo iguales a 5, **cuando** consulto Inventario, **entonces** aparece en las alertas. |
| HU-06 | **Dado** un producto con stock 10, **cuando** ajusto a 9 con motivo «merma», **entonces** se guarda el nuevo stock y el motivo. **Cuando** intento ajustar con motivo vacío, **entonces** se conserva el stock previo al intento. |
| HU-07 | **Dados** tres productos distintos en Mi lista, **cuando** solicito la separación, **entonces** recibo código, estimado y vigencia de 24 horas. |
| HU-08 | **Dada** una solicitud pendiente con disponibilidad, **cuando** confirmo el apartado y cobro su recojo, **entonces** se descuenta el stock físico una vez y la venta cierra el apartado. |
| HU-09 | **Dada** mercadería recibida y los datos del proveedor, **cuando** guardo la compra con una referencia nueva, **entonces** queda recibida y aumenta el stock. |
| HU-10 | **Dada** una orden pendiente de 10 unidades, **cuando** recibo 4, **entonces** el stock aumenta en 4 y queda un saldo de 6 por recibir. |
| HU-11 | **Dado** un cliente con 130 puntos, **cuando** reclama un beneficio de S/ 5,00, **entonces** se comprometen 100 puntos. **Cuando** intenta canjearlo en una venta menor a S/ 30,00, **entonces** no se aplica el descuento. |
| HU-12 | **Dada** una cuenta cliente sin reservas vigentes, **cuando** el administrador confirma el retiro autorizado, **entonces** el acceso queda bloqueado, se retira el contacto y se preservan las referencias comerciales. |

El [informe de verificación](../reportes/verificacion-v2.md) registra los resultados locales. El informe final atribuye las capturas al video de demostración y distingue las historias sin evidencia completa en el entorno publicado.
