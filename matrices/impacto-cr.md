# Impacto CR

Cada fila relaciona el cambio con el comportamiento y la comprobación correspondiente. Consulta el [registro de cambios](../docs/cambios-v2.md) y el [catálogo de pruebas](../pruebas/pruebas.md).

| CR | Requisitos, reglas o casos | Impacto funcional o técnico | Pruebas |
|---|---|---|---|
| CR-001 | RF-015, BR-011, CU-006 | Motivo obligatorio, movimiento y saldo se guardan juntos. | PRU-016 a PRU-019 |
| CR-002 | RF-006, RF-013, RNF-002 | Identidad en Supabase Auth, API Express y persistencia PostgreSQL. | PRU-009 y PRU-014 |
| CR-003 | RNF-001, RNF-003 | Interfaz y API se publican como servicios separados. | PRU-032 |
| CR-004 | RF-002, RF-009, BR-005 | Confirmación aparta unidades. Recojo cierra la reserva con la venta. | PRU-011 y PRU-024 |
| CR-005 | RF-004, RF-005, BR-008, BR-009 | Ingreso directo y recepción parcial actualizan saldo y costo ponderado. | PRU-008 y PRU-025 |
| CR-006 | RF-001, BR-001, RNF-005 | Pago digital con monto exacto y confirmación manual. | PRU-020 |
| CR-007 | RNF-007 | Catálogo, panel y caja se adaptan al tamaño de pantalla. | PRU-026 |
| CR-008 | RF-016, BR-014, CU-006 | Foto opcional, archivo, restauración y baja con historial. | PRU-027 y PRU-028 |
| CR-009 | RF-017, RF-018, CU-010 | Teléfono opcional de ambos perfiles y cambio de contraseña propia. | PRU-029 y PRU-030 |
| CR-010 | RF-014, BR-010 | Reclamo y canje de un beneficio propio vinculado a la venta. | PRU-031 |
| CR-011 | RF-013, RF-019, BR-012, BR-013 | Protección de cuenta principal y retiro autorizado con preservación de referencias. | PRU-033 y PRU-034 |
