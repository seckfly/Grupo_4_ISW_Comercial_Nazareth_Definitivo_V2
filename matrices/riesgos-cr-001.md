# Matriz de riesgos de solicitudes de cambio

La prioridad estima la consecuencia del fallo. El [catálogo de pruebas](../pruebas/pruebas.md) describe cómo comprobar las medidas de control.

| CR | Prioridad | Riesgo | Control | Pruebas |
|---|---|---|---|---|
| CR-001 | Alto | Stock sin historial o motivo inválido | Validar motivo y revertir ante fallo. | PRU-016 a PRU-019 |
| CR-002 | Alto | Acceso de un rol incorrecto o credenciales incompatibles | Comprobar sesión, perfil activo y permisos del rol de conexión. | PRU-009 y PRU-014 |
| CR-003 | Alto | La interfaz puede quedar apuntando a otra API | Comprobar salud de la API y un recorrido en el despliegue. | PRU-032 |
| CR-004 | Alto | Sobreventa o duplicación de salida por recojo | Validar disponible y mantener atomicidad e idempotencia. | PRU-011 y PRU-024 |
| CR-005 | Alto | Duplicación de ingreso o cálculo incorrecto de costo | Probar referencias repetidas, recepciones parciales y costo ponderado. | PRU-008 y PRU-025 |
| CR-006 | Alto | Registrar un abono sin confirmar | Rechazar montos distintos y comprobar confirmación manual. | PRU-020 |
| CR-007 | Medio | Controles inaccesibles o desplazamiento lateral | Recorrer las vistas por navegador y tamaño, con datos de prueba. | PRU-026 |
| CR-008 | Alto | Retirar productos comprometidos o dejar promociones activas | Validar reservas y órdenes abiertas, y verificar estados de campañas. | PRU-027 y PRU-028 |
| CR-009 | Medio | Persistir un teléfono anterior o dejar desactualizado el perfil | Refrescar sesión y verificar ausencia del contacto tras quitarlo. | PRU-029 y PRU-030 |
| CR-010 | Alto | Canje repetido o aplicado al cliente equivocado | Comprobar titular, mínimo de compra y estado del beneficio. | PRU-031 |
| CR-011 | Alto | Retirar una cuenta protegida o perder referencias comerciales | Validar jerarquía, reservas activas y reintento tras fallo de Auth. | PRU-033 y PRU-034 |
