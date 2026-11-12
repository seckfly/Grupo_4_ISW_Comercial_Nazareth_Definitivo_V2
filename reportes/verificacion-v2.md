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

## Entorno publicado y cierre administrativo

El frontend se encuentra publicado en [Vercel](https://comercial-nazareth-codigo.vercel.app/) y la API se aloja en Render. Durante el desarrollo se hicieron comprobaciones funcionales de acceso y operaciones comerciales en la aplicación publicada; estas revisiones exploratorias no sustituyen una ejecución íntegra, reproducible y documentada de PRU-032.

El informe no contiene una ejecución integral acreditada de PRU-032 (recorrido Vercel/Render), PRU-026 (celular, tablet y escritorio), ni una comprobación integral de Supabase Auth y Storage alojados. PRU-023 fue omitida por falta de las herramientas PostgreSQL requeridas para restaurar. Tampoco se acreditó una programación del respaldo. Esas limitaciones pertenecen a la evidencia de pruebas y no implican que se haya detectado un fallo en las funciones correspondientes.

El 12 de noviembre de 2026 se cerró administrativamente el seguimiento de esas cuatro verificaciones en [Trello](https://trello.com/b/9LEaT3KG/comercial-nazareth-kanban-v2) para dar por concluida la entrega académica. Cerrar una tarjeta de seguimiento no constituye ejecución ni aprobación de una prueba. Los resultados indicados en la tabla de pruebas locales se mantienen sin cambios.

Las notas de inventario, ventas, interfaz y fuentes de datos de revisiones anteriores se pueden consultar en el [historial de documentación](https://github.com/seckfly/Grupo_4_ISW_Comercial_Nazareth_Definitivo_V2/tree/8f7953aa7f5fba69ea586772c72e6e4dc7aa1eb9/docs).
