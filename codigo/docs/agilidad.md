# Gestión del trabajo en Comercial Nazareth

El tablero organiza cambios pequeños con criterios de aceptación, límites de trabajo en curso y revisión de vínculos entre requisitos y pruebas.

## 1. Trabajo con agilidad

Los identificadores permiten dividir una mejora y seguir sus efectos sin rehacer todos los documentos. La matriz muestra qué requisito, caso de uso, clase y prueba se relacionan. Los cambios pueden revisarse en una rama y entregarse mediante un PR.

En Comercial Nazareth, la regla de registrar un motivo en los ajustes manuales pertenece a RF-015 y CU-006. Esa relación permite ampliar una prueba concreta conservando las reglas de ventas, catálogo y clientes. La documentación se actualiza junto con el incremento para mantener la trazabilidad.

## 2. Prácticas aplicadas

El trabajo mostrado en el tablero se organizó en seis tarjetas, ordenadas por dependencia y prioridad. Cada una tiene criterios de aceptación y enlaces al repositorio. Los criterios se marcan después de contrastarlos con los archivos o registros correspondientes.

Se limita el trabajo a dos tarjetas en En curso y dos en En revisión. Al revisar se comprueban el alcance, los identificadores, los enlaces y los resultados esperados. Una corrección devuelve la tarjeta a En curso cuando hay capacidad. El cierre exige comprobar los criterios y conservar su evidencia.

## 3. Kanban en Trello

[Tablero Comercial Nazareth — Kanban V2](https://trello.com/b/9LEaT3KG/comercial-nazareth-kanban-v2).

| Estado | Límite | Regla de trabajo |
|---|---|---|
| Por hacer | Sin límite de concurrencia | Tarjetas priorizadas y con criterios de aceptación definidos; trabajo no iniciado. |
| En curso | 2 tarjetas | Iniciar una tarea cuando haya espacio y capacidad para atenderla. |
| En revisión | 2 tarjetas | Contrastar el cambio con sus criterios, la trazabilidad y el SRS. |
| Terminado | Sin límite de concurrencia | Criterios comprobados y evidencias enlazadas; trabajo cerrado. |

### Reglas de concurrencia

El límite de trabajo en curso (WIP) cuenta las tarjetas iniciadas que todavía no han terminado. Se permiten hasta cuatro en conjunto: dos En curso y dos En revisión. Los límites cuentan tarjetas, no personas; varios integrantes pueden colaborar en una misma tarea.

1. Antes de iniciar o mover una tarjeta, comprobar que la etapa de destino tenga espacio. Una etapa llena no recibe otra tarjeta.
2. Priorizar terminar, revisar o desbloquear trabajo existente antes de iniciar más tareas.
3. Una tarjeta bloqueada permanece en su etapa y cuenta dentro del límite. Registrar el impedimento y la acción necesaria para resolverlo.
4. Si una revisión requiere una corrección, devolver la tarjeta a En curso solo cuando haya espacio. Mientras tanto permanece En revisión y sigue contando en su límite.
5. Mover una tarjeta a Terminado cuando cumpla sus criterios de aceptación y tenga la evidencia enlazada.

El control se realiza manualmente antes de cada movimiento. Los límites son visibles en los nombres de las columnas y las reglas completas están en la [tarjeta de Kanban](https://trello.com/c/2DwyXuC1). Se revisan según la capacidad del equipo y la acumulación observada en cada etapa.

| Prioridad | Tarjeta |
|---|---|
| 1 | [Preparar base y alcance ágil](https://trello.com/c/DrED8dls) |
| 2 | [Definir prioridades y criterios de aceptación](https://trello.com/c/RfHgERQk) |
| 3 | [Aplicar Kanban y registrar el recorrido](https://trello.com/c/2DwyXuC1) |
| 4 | [Comprobar fallo al guardar un ajuste](https://trello.com/c/AfN5TOU6) |
| 5 | [Actualizar matriz y comprobar cobertura](https://trello.com/c/dH7rxo0F) |
| 6 | [Documentar y revisar la adaptación](https://trello.com/c/gYZf9zeq) |

## 4. Flujo real aplicado

El incremento documenta PRU-019 para el fallo de guardado de un ajuste manual de RF-015 y CU-006. La prueba parte de stock 10, un historial previo y un motivo válido. Tras un fallo antes de confirmar la transacción, exige stock 10, conservación de los registros anteriores y ausencia de movimientos o motivos guardados parcialmente.

La [tarjeta de PRU-019](https://trello.com/c/AfN5TOU6) registra el siguiente recorrido:

| Movimiento | Acción realizada |
|---|---|
| Por hacer → En curso | Se aborda la documentación del escenario de fallo de guardado. |
| En curso → En revisión | Se revisa que PRU-019 indique las condiciones iniciales, el fallo y el resultado esperado. |
| En revisión → Terminado | Se comprueba que el texto cumple los criterios de aceptación de la tarjeta. |

Antes de trasladar la tarjeta a Terminado se contrastó el texto guardado con sus tres criterios de aceptación. La [prueba](../../pruebas/pruebas.md) describe el escenario y la [matriz](../../matrices/trazabilidad.md) lo vincula con RF-015.

La configuración del tablero también tiene su registro en la [tarjeta de prioridades y criterios](https://trello.com/c/RfHgERQk), con sus tres comprobaciones completas. Las tarjetas conservan sus movimientos y listas de aceptación como evidencia del trabajo.

La actualización de las reglas de concurrencia se registra en dos tarjetas: [documentar las reglas](https://trello.com/c/rCAaVxzg) y [aplicar los límites en Trello](https://trello.com/c/loubRJnf). Durante esta actualización hubo dos tarjetas En curso al mismo tiempo, dentro del máximo acordado. Sus criterios permiten contrastar los límites del documento con las columnas y las reglas del tablero.

