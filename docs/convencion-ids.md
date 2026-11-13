# Convención de identificadores

| Elemento | Formato | Ejemplo |
|---|---|---|
| Requisito funcional | RF-### | RF-001 |
| Requisito no funcional | RNF-### | RNF-001 |
| Regla del negocio | BR-### | BR-001 |
| Caso de uso | CU-### | CU-001 |
| Clase | CLS-Nombre | CLS-Venta |
| Prueba | PRU-### | PRU-001 |
| Solicitud de cambio | CR-### | CR-001 |

Cada ID identifica un elemento. Conserva el ID al corregir el contenido y reserva los identificadores retirados. Los RF, RNF y BR se definen en el [SRS](SRS.md), los CU en el [catálogo de casos de uso](CU.md), los CLS en el [diagrama editable de clases](../modelos/clases.drawio), los PRU en el [catálogo de pruebas](../pruebas/pruebas.md) y los CR en el [registro de cambios](cambios-v2.md). Escribe los identificadores de clase tal como aparecen en el diagrama, por ejemplo `CLS-LineaOrdenCompra`.

La [matriz de trazabilidad](../matrices/trazabilidad.md) registra el caso de uso o ámbito de cada requisito, las clases del dominio relacionadas y sus escenarios de prueba. El catálogo de pruebas permite el recorrido inverso desde PRU hacia RF, RNF o CR. Para acreditar una ejecución, vincula el PRU con su resultado y entorno en el [informe de verificación](../reportes/verificacion-v2.md).
