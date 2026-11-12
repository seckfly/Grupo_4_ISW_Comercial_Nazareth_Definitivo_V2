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

Cada ID identifica un elemento. Si su contenido cambia, conserva el ID; un identificador retirado no se asigna a otro elemento. RF-001 a RF-019 y RNF-001 a RNF-007 corresponden al [SRS](SRS.md). Los 34 casos de [pruebas](../pruebas/pruebas.md) usan una secuencia continua, PRU-001 a PRU-034.

La [matriz de trazabilidad](../matrices/trazabilidad.md) registra el caso de uso o ámbito de cada requisito, las clases cuando figuran en el modelo y las pruebas que lo verifican. En la tabla de pruebas, la columna «Requisitos» permite el recorrido inverso desde PRU hacia RF o RNF.
