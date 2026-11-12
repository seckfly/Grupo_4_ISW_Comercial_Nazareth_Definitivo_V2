# Reporte de trazabilidad de Comercial Nazareth (v1.1)

Registro histórico. Para conocer el alcance y las pruebas de la versión vigente, consulta el [cierre de requisitos](../docs/cierre-requisitos.md).

CR aplicado: motivo obligatorio en ajustes manuales de RF-015. La comparación se limita a los cinco requisitos revisados para ese cambio.

| Métrica | v1.0 | v1.1 |
|---|---|---|
| RF del alcance de CR-001 | 5 | 5 |
| RF del alcance con prueba documentada | 5 | 5 |
| Cobertura del alcance revisado | 100 % | 100 % |
| Casos de uso | 4 | 4 |
| Clases | 6 | 6 |
| Pruebas documentadas | 6 | 8 |
| Requisitos modificados por CR-001 | No aplica | RF-015 |

Cobertura del alcance revisado: (5 RF con prueba documentada ÷ 5 RF revisados) × 100 = 100 %.

## Cambios frente a v1.0

En v1.0, RF-015 exigía conservar el historial de ajustes, pero no obligaba a indicar su motivo. En v1.1, cada ajuste manual exige un motivo con al menos un carácter distinto de espacios. El motivo se conserva en el historial junto con el ajuste y la actualización del stock en una misma transacción. Un motivo vacío o compuesto únicamente por espacios impide registrar el ajuste y modificar el stock.

| Archivo | Cambio |
|---|---|
| [SRS](../docs/SRS.md) | RF-015 incorpora el motivo obligatorio y su conservación en el historial. |
| [Casos de uso](../docs/CU.md) | CU-006 incorpora el ingreso y la validación del motivo, el guardado conjunto y el rechazo sin cambios cuando el motivo no es válido. |
| [Diagrama editable](../modelos/clases.drawio) y [PNG](../modelos/clases.png) | CLS-MovimientoInventario incorpora el atributo motivo y el método validarMotivo(motivo: String): boolean. registrarAjuste recibe el motivo. Los elementos añadidos o modificados se muestran en naranja. |
| [Pruebas](../pruebas/pruebas.md) | PRU-016 comprueba dos ajustes con sus respectivos motivos. PRU-017 comprueba el rechazo de un motivo vacío y PRU-018, el de un motivo compuesto solo por espacios. |
| [Matriz](../matrices/trazabilidad.md) | RF-015 enlaza las tres pruebas de ajustes y registra CR-001 en la columna Último CR. |

Se modifica un requisito, un caso de uso y una clase. El modelo añade un atributo y un método, y modifica la firma de registrarAjuste. Se actualiza una prueba y se añaden dos. La cobertura permanece en 100 %, con mayor detalle para los escenarios de RF-015.

RF-001, RF-002, RF-007 y RF-010 conservan sus reglas. El motivo obligatorio se aplica a los ajustes manuales; las salidas generadas por ventas mantienen el flujo de CU-001 y el método registrarSalida().
