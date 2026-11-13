# Calidad y priorización de requisitos V2

Revisión documental del [SRS](SRS.md) frente al informe final del Grupo 4 (§§2.7–2.9) y al criterio de SRS del Desafío CIIN1252P (p. 5). La revisión abarca los 26 requisitos. La verificabilidad indica que existe un escenario o un procedimiento con un resultado esperado. La ejecución se registra en el [informe de verificación](../reportes/verificacion-v2.md).

## Lista de control

La singularidad se evalúa sobre la capacidad o atributo principal. Las observaciones de requisitos compuestos se conservan cuando los escenarios permiten comprobar cada operación y el ID mantiene la trazabilidad histórica. La [matriz](../matrices/trazabilidad.md) contiene los vínculos a CU, clases y PRU, o al ámbito de verificación de los RNF transversales.

| ID | Singular | Claro | Verificable | Trazable | Resultado de la revisión |
|---|---|---|---|---|---|
| RF-001 | Sí | Sí | Sí | Sí | Atomicidad bajo RNF-004. La suite comprueba la generación del ticket. La comprobación manual de impresión de PRU-001 queda pendiente. |
| RF-002 | Sí | Sí | Sí | Sí | Define alerta para productos activos, incluido el caso de igualdad al mínimo. |
| RF-003 | Sí | Sí | Sí | Sí | Identifica los tres datos persistidos en la orden. |
| RF-004 | Observado | Sí | Sí | Sí | Conserva el ID y distingue compra directa en interfaz, alta pendiente por API y recepción posterior. |
| RF-005 | Sí | Sí | Sí | Sí | Precisa cantidades, stock, movimiento y costo ponderado. |
| RF-006 | Sí | Sí | Sí | Sí | Enlaza el flujo de sesión a CU-011 y PRU-009. |
| RF-007 | Observado | Sí | Sí | Sí | Define disponibilidad y distingue consulta de catálogo y preferencias del portal. |
| RF-008 | Sí | Sí | Sí | Sí | Enumera operaciones y datos de las campañas. |
| RF-009 | Observado | Sí | Sí | Sí | Conserva el ID y distingue solicitud, confirmación y recojo en CU-005 y CU-001. |
| RF-010 | Sí | Sí | Sí | Sí | Aclara que la asociación del cliente es opcional. |
| RF-011 | Sí | Sí | Sí | Sí | Sustituye «frecuencia» por el número de compras completadas y enlaza CU-012. |
| RF-012 | Sí | Sí | Sí | Sí | Define periodos, zona horaria, demanda y actividad reciente, con CU-013. |
| RF-013 | Observado | Sí | Sí | Sí | CU-007 distingue alta, edición, suspensión y retiro según jerarquía. |
| RF-014 | Observado | Sí | Sí | Sí | Distingue consulta de cuenta, reclamo, cancelación y canje. |
| RF-015 | Observado | Sí | Sí | Sí | Distingue alta, edición y ajuste. La validación del motivo tiene escenarios propios. |
| RF-016 | Observado | Sí | Sí | Sí | Conserva CR-008 y distingue fotos, archivo, restauración y baja con sus restricciones. |
| RF-017 | Sí | Sí | Sí | Sí | Define el cambio de contraseña sobre la misma identidad. |
| RF-018 | Sí | Sí | Sí | Sí | Define campo opcional y límites de longitud. |
| RF-019 | Sí | Sí | Sí | Sí | Distingue retiro por titular o por administrador y protege la cuenta principal. |
| RNF-001 | Sí | Sí | Sí | Sí | Umbral de 10 de 10 ventas bajo 15 s. La suite usa una línea por venta. |
| RNF-002 | Sí | Sí | Sí | Sí | Cero opciones administrativas y 100 % de rechazos HTTP 403. Falta ejecución exhaustiva por operación. |
| RNF-003 | Sí | Sí | Sí | Sí | Umbral de 10 de 10 consultas en hasta 3 s por operación. |
| RNF-004 | Sí | Sí | Sí | Sí | Cero cambios parciales después de un fallo simulado. |
| RNF-005 | Sí | Sí | Sí | Sí | Diferencia admisible de S/ 0,00. |
| RNF-006 | Sí | Sí | Sí | Sí | Recuperación del 100 % de los registros comparados. El respaldo diario es propuesta del informe. |
| RNF-007 | Sí | Sí | Sí | Sí | Cero desplazamiento horizontal en los flujos indicados. Los tres anchos propuestos requieren aprobación del equipo. |

## Prioridad respecto de v1.0

El informe final aplica MoSCoW para delimitar la entrega y usa WSJF para ordenar por valor, urgencia, reducción de riesgo y tamaño. Mantiene como Must RF-001, RF-002, RF-007, RF-010 y RF-015, procedentes de REQ-001, REQ-002, REQ-007, REQ-010 y REQ-015. Suma RF-006 y RF-013 como Must por la dependencia del acceso por perfiles tras CR-002. RF-004 y RF-005 entran como Should por la compra mayorista y la recepción de CR-005. RF-003 queda como Could por depender del registro de compras.

## Revisión con interesados

El informe final (§§2.2–2.3) ubica al propietario y al equipo en gestión cercana, a los clientes registrados en comunicación sobre reservas y beneficios, al docente, proveedores de plataforma y autoridad de protección de datos en seguimiento de exigencias, y a compradores sin cuenta y proveedores mayoristas en monitoreo. Las matrices de decisión del §2.8 reconstruyen los criterios a partir de decisiones del proyecto. El acta de validación del SRS con el propietario permanece pendiente de acreditación.
