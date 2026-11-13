# Verificación de Definitivo V2

El [catálogo de pruebas](../pruebas/pruebas.md) describe los escenarios y sus resultados esperados. Aquí se registran las comprobaciones ejecutadas. La [matriz de trazabilidad](../matrices/trazabilidad.md) enlaza 19 requisitos funcionales, 7 no funcionales, 14 reglas de negocio y 34 escenarios.

## Resultados locales

Se revisó el código de [`8f7953a`](https://github.com/seckfly/Grupo_4_ISW_Comercial_Nazareth_Definitivo_V2/commit/8f7953aa7f5fba69ea586772c72e6e4dc7aa1eb9) y se ejecutaron las pruebas con Node.js 24.22.1.

| Comprobación | Resultado | Evidencia |
|---|---|---|
| Compilación y pruebas de frontend | Compilación correcta y 121 pruebas aprobadas. | [Pruebas del frontend](../codigo/frontend/src/test/) |
| Pruebas de backend | 72 aprobadas y 1 omitida. Las pruebas de integración usaron PostgreSQL temporal por TCP. | [Pruebas del backend](../codigo/backend/test/) |
| Tiempos de venta y consulta | PRU-021 y PRU-022 pasaron en la base de prueba local. | [Pruebas de integración](../codigo/backend/test/sales.integration.test.js) |
| Respaldo y restauración | PRU-023 fue excluida de la ejecución local por requerir `pg_dump` y `pg_restore` 18. El script de respaldo admite ejecución manual o programación externa. | [Script de respaldo](../codigo/backend/scripts/backup.mjs) |

En la copia de pruebas se inició PostgreSQL sin socket Unix, porque el entorno solo permitió la conexión local por TCP. La comprobación de fotos y cuentas usó datos de prueba y dobles de los servicios alojados cuando correspondía.

## Reejecución local del 12 de noviembre de 2026

Código de [`e50094d`](https://github.com/seckfly/Grupo_4_ISW_Comercial_Nazareth_Definitivo_V2/commit/e50094d47223154a3d43794286258dd2cec79a81), Windows y Node.js 24.18.0. Se usaron bases temporales y datos de prueba. Las pruebas de servicios alojados usaron dobles donde los prevé la suite.

| Comprobación | Resultado de esta revisión |
|---|---|
| Frontend | Compilación correcta y 121 pruebas aprobadas. |
| Backend | 72 pruebas aprobadas y 1 omitida. La integración usó PostgreSQL temporal. |
| PRU-009 | Se ejecutaron pruebas automatizadas de autenticación y autorización, incluido el rechazo del rol cliente en rutas administrativas de prueba. Quedan pendientes el recorrido de sesión por perfil y la comprobación exhaustiva por operación administrativa. |
| PRU-021 | Diez ventas HTTP de una línea. Máximo reportado de 28 ms frente al umbral de menos de 15 s. Queda por medir el escenario de tres líneas. |
| PRU-022 | Diez consultas HTTP por operación con datos de prueba. Máximos reportados de 17 ms para productos, 16 ms para inventario y 29 ms para resumen, frente al umbral de 3 s. La ejecución usó el catálogo de la suite de integración. |
| PRU-023 | Omitida por falta de `pg_dump` y `pg_restore` de PostgreSQL 18. |
| PRU-026 y PRU-032 | Pendientes en esta revisión. Requieren evidencia por tamaño de pantalla y un recorrido sobre una revisión identificada del entorno publicado, respectivamente. |

Las cifras corresponden a [las pruebas de integración](../codigo/backend/test/sales.integration.test.js). Los resultados de temporización describen la API local. La revisión de las referencias entre artefactos es documental.

## Comportamiento contrastado con el código

- **Ventas e inventario.** Caja valida el importe y registra venta, detalle y salida en una transacción. Un ajuste manual exige motivo y protege las unidades apartadas. Inventario compara el stock físico de los productos activos con su mínimo, incluida la igualdad. [Ventas](../codigo/backend/src/services/saleService.js) · [Inventario](../codigo/backend/src/services/inventoryService.js)
- **Promociones, compras y reservas.** Promociones permite guardar y cambiar el estado de campañas. Una compra directa registra su recepción al guardar. La orden pendiente incrementa stock al recibir. La solicitud de reserva queda pendiente hasta que se confirme y aparte unidades. [Campañas](../codigo/backend/src/routes/promotionRouter.js) · [Compras](../codigo/backend/src/services/purchaseService.js) · [Reservas](../codigo/backend/src/services/reservationService.js)
- **Resumen y reportes.** Los totales usan ventas completadas y periodos de Lima. La comparación enfrenta hoy y ayer hasta la misma hora. La proyección usa los siete días previos y se muestra cuando hay ventas hoy y un total positivo hasta esa hora en cada uno de esos días. [Servicio de resumen](../codigo/backend/src/services/dashboardService.js)
- **Cuentas.** Express autoriza según el perfil activo. El retiro conserva las referencias de ventas y reservas, y la cuenta principal queda protegida. [Servicio de cuentas](../codigo/backend/src/services/userService.js)

## Publicación y alcance de la revisión

El frontend está publicado en [Vercel](https://comercial-nazareth-codigo.vercel.app/) y la API se aloja en Render. Durante el desarrollo se realizaron revisiones funcionales del acceso y de las operaciones comerciales desde la aplicación web publicada.

La ejecución automatizada registrada en este informe corresponde al entorno local descrito arriba. Los escenarios PRU-026 y PRU-032 definen respectivamente la evaluación por dispositivo y el recorrido integral del entorno publicado. La verificación de Supabase Auth y Storage dispone de un script específico descrito en la [configuración del alcance completo](../codigo/database/CONFIGURACION-ALCANCE-COMPLETO.md). La tabla conserva el resultado de PRU-023 de aquella ejecución local. El [tablero Kanban](https://trello.com/b/9LEaT3KG/comercial-nazareth-kanban-v2) registra el cierre del seguimiento de la entrega.

Las notas de inventario, ventas, interfaz y fuentes de datos de revisiones anteriores se pueden consultar en el [historial de documentación](https://github.com/seckfly/Grupo_4_ISW_Comercial_Nazareth_Definitivo_V2/tree/8f7953aa7f5fba69ea586772c72e6e4dc7aa1eb9/docs).
