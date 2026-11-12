# Verificación de Definitivo V2

El [catálogo de pruebas](../pruebas/pruebas.md) describe los escenarios y sus resultados esperados. Aquí se registran las comprobaciones ejecutadas. La [matriz de trazabilidad](../matrices/trazabilidad.md) enlaza 19 requisitos funcionales, 7 no funcionales, 14 reglas de negocio y 34 escenarios.

## Resultados locales

Se revisó el código de [`8f7953a`](https://github.com/seckfly/Grupo_4_ISW_Comercial_Nazareth_Definitivo_V2/commit/8f7953aa7f5fba69ea586772c72e6e4dc7aa1eb9) y se ejecutaron las pruebas con Node.js 24.22.1.

| Comprobación | Resultado | Evidencia |
|---|---|---|
| Compilación y pruebas de frontend | Compilación correcta y 121 pruebas aprobadas. | [Pruebas del frontend](../codigo/frontend/src/test/) |
| Pruebas de backend | 72 aprobadas y 1 omitida. Las pruebas de integración usaron PostgreSQL temporal por TCP. | [Pruebas del backend](../codigo/backend/test/) |
| Tiempos de venta y consulta | PRU-021 y PRU-022 pasaron en la base de prueba local. | [Pruebas de integración](../codigo/backend/test/sales.integration.test.js) |
| Respaldo y restauración | PRU-023 quedó omitida porque el entorno no tenía `pg_dump` y `pg_restore` 18. El script de respaldo se ejecuta manualmente o con un horario configurado fuera de la aplicación. | [Script de respaldo](../codigo/backend/scripts/backup.mjs) |

En la copia de pruebas se inició PostgreSQL sin socket Unix, porque el entorno solo permitió la conexión local por TCP. La comprobación de fotos y cuentas usó datos de prueba y dobles de los servicios alojados cuando correspondía.

## Comportamiento contrastado con el código

- **Ventas e inventario.** Caja valida el importe y registra venta, detalle y salida en una transacción. Un ajuste manual exige motivo y protege las unidades apartadas. Inventario compara el stock físico de los productos activos con su mínimo, incluida la igualdad. [Ventas](../codigo/backend/src/services/saleService.js) · [Inventario](../codigo/backend/src/services/inventoryService.js)
- **Promociones, compras y reservas.** Promociones permite guardar y cambiar el estado de campañas. Una compra directa registra su recepción al guardar. La orden pendiente incrementa stock al recibir. La solicitud de reserva queda pendiente hasta que se confirme y aparte unidades. [Campañas](../codigo/backend/src/routes/promotionRouter.js) · [Compras](../codigo/backend/src/services/purchaseService.js) · [Reservas](../codigo/backend/src/services/reservationService.js)
- **Resumen y reportes.** Los totales usan ventas completadas y periodos de Lima. La comparación enfrenta hoy y ayer hasta la misma hora. La proyección usa los siete días previos y se muestra cuando hay ventas hoy y un total positivo hasta esa hora en cada uno de esos días. [Servicio de resumen](../codigo/backend/src/services/dashboardService.js)
- **Cuentas.** Express autoriza según el perfil activo. El retiro conserva las referencias de ventas y reservas, y la cuenta principal queda protegida. [Servicio de cuentas](../codigo/backend/src/services/userService.js)

## Publicación y alcance de las pruebas

El frontend está publicado en [Vercel](https://comercial-nazareth-codigo.vercel.app/) y la API se aloja en Render. Durante el desarrollo se revisaron el acceso y varias operaciones comerciales desde la aplicación web publicada. Estas revisiones funcionales se distinguen de los escenarios formales del [catálogo de pruebas](../pruebas/pruebas.md).

La evidencia de esta revisión comprende las ejecuciones locales indicadas arriba. Para PRU-032 (recorrido integral del despliegue), PRU-026 (móvil, tablet y escritorio) y la comprobación integral de Auth y Storage alojados, el documento no incluye actas completas de ejecución. La restauración PRU-023 figura como omitida en la tabla porque el entorno utilizado carecía de `pg_dump` y `pg_restore` 18; la programación automática de respaldos tampoco fue verificada. El cierre de seguimiento en [Trello](https://trello.com/b/9LEaT3KG/comercial-nazareth-kanban-v2) corresponde a la organización de la entrega y no altera estos resultados.

Las notas de inventario, ventas, interfaz y fuentes de datos de revisiones anteriores se pueden consultar en el [historial de documentación](https://github.com/seckfly/Grupo_4_ISW_Comercial_Nazareth_Definitivo_V2/tree/8f7953aa7f5fba69ea586772c72e6e4dc7aa1eb9/docs).
