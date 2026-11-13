# Visión y roadmap RUP de Comercial Nazareth

## Documento Visión

Comercial Nazareth necesita registrar ventas y conocer las existencias disponibles para decidir la reposición. El propietario opera ventas, inventario y compras con un perfil administrativo. Los clientes registrados pueden consultar el catálogo, solicitar separaciones y consultar su cuenta. La atención presencial permite vender también a compradores sin cuenta.

La solución web cubre caja con ticket, stock físico y apartado, alertas por mínimo, compras con costo ponderado, reservas con recojo, fidelización y acceso por perfil. Las exclusiones y restricciones se detallan en el [SRS](SRS.md#alcance). Sus criterios de éxito incluyen la confirmación de una venta de hasta tres líneas en menos de 15 s, cero escrituras parciales ante fallos y trazabilidad para los 19 RF. El [informe de verificación](../reportes/verificacion-v2.md) delimita el alcance de las mediciones.

## Línea base e iteraciones

La asignación a fases RUP es retrospectiva y sigue el §5 del informe final. La línea base del repositorio es la [etiqueta v1.0](https://github.com/seckfly/Grupo_4_ISW_Comercial_Nazareth_Definitivo_V2/tree/v1.0). La correspondencia de esa etiqueta con la entrega parcial de la semana 10 queda pendiente de confirmar.

| Fase | Hitos e iteraciones | Artefactos asociados |
|---|---|---|
| Inicio | 26–27 de octubre de 2026. Línea base v1.0. | SRS, casos de uso, modelo de clases, matriz y catálogo de pruebas en v1.0. La Visión se formalizó en el informe final. |
| Elaboración | 27 de octubre–5 de noviembre. CR-001, v1.1 y consolidación v3.0. | [Proceso crítico](proceso-critico.md), [adaptación ágil](agilidad.md), [reporte v1.1](../reportes/reporte-v1.1.md) y [registro de cambios](cambios-v2.md). |
| Construcción | 10–12 de noviembre. Inventario y ajustes, reservas y recojo, compras, pagos, fidelización y cuentas. | [API](../codigo/backend/src/), [interfaz](../codigo/frontend/src/), [migraciones](../codigo/database/migrations/), [pruebas de backend](../codigo/backend/test/) y [pruebas de frontend](../codigo/frontend/src/test/). |
| Transición | 12 de noviembre. Publicación y verificación de V2. | [Modelo de despliegue](../modelos/modelos-v2.md#despliegue), [guía técnica](../codigo/GUIA-TECNICA.md), [alcance y evidencia](alcance-y-evidencia.md) e [informe de verificación](../reportes/verificacion-v2.md). La capacitación al propietario queda sin evidencia en el informe final. |

## Matriz actividades–requisitos

| Actividad | Fase | Requisitos o reglas | Evidencia documental |
|---|---|---|---|
| Delimitar alcance y especificar requisitos | Inicio y Elaboración | RF-001 a RF-019, RNF-001 a RNF-007 | [Visión](#documento-visión) y [SRS](SRS.md). |
| Modelar los casos de uso y el dominio | Elaboración | RF-001 a RF-019 | [Casos de uso](CU.md) y [modelos V2](../modelos/modelos-v2.md). |
| Controlar cambios y riesgos | Elaboración y Construcción | RF, RNF y BR asociados a CR-001 a CR-011 | [Impacto](../matrices/impacto-cr.md), [riesgos](../matrices/riesgos-cr.md) y [registro de CR](cambios-v2.md). |
| Implementar servicios, datos e interfaz | Construcción | RF-001 a RF-019, RNF-002, RNF-004, RNF-005 y RNF-007 | [Alcance y evidencia](alcance-y-evidencia.md). |
| Verificar los flujos y sus restricciones | Construcción y Transición | RF-001 a RF-019, RNF-001 a RNF-007 | [Trazabilidad](../matrices/trazabilidad.md), [escenarios](../pruebas/pruebas.md) y [resultados](../reportes/verificacion-v2.md). |
| Publicar y verificar el entorno | Transición | CR-003 y PRU-032 | [Despliegue](../modelos/modelos-v2.md#despliegue) e [informe de verificación](../reportes/verificacion-v2.md). |

## Riesgos del proyecto

Síntesis del §5.12 del informe final. Los responsables se consignan por rol según el análisis del informe.

| Riesgo | Responsable | Mitigación | Estado documentado |
|---|---|---|---|
| Sobreventa o salida duplicada al recoger una reserva | Líder técnico | Apartar al confirmar y aplicar transacción e idempotencia al recojo. | Control probado en la suite local. |
| Cambios tardíos de alcance | Coordinación | Revisar solicitudes de cambio y sus impactos antes de ampliar el alcance. | Materializado. El informe registra la concentración de cambios del 10 al 12 de noviembre. |
| Restauración de respaldo sin verificar | Operaciones | Ejecutar PRU-023 en bases aisladas con las herramientas de PostgreSQL 18. | Abierto. |
| Error al confirmar manualmente un abono digital | Propietario y operador | Verificar el abono y exigir importe exacto antes de confirmar la venta. | La suite cubre el control de software. La capacitación queda sin acreditar. |
| Desalineación de documentación y código | Calidad | Revisar las trazas al cambiar requisitos, clases o pruebas. | Materializado. El historial y esta revisión registran correcciones de alineación. |
