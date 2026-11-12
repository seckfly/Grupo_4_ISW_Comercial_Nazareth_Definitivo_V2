# Verificación de Definitivo V2

La revisión documental compara [V1 en 5b3c9b1](https://github.com/seckfly/Grupo_4_ISW_Comercial_Nazareth_Definitivo/tree/5b3c9b1e67bd41b4c9f56c19a77a8d6db10d67c9) con la [implementación 58611e9](https://github.com/seckfly/Comercial_Nazareth_Codigo/tree/58611e91ce6a14d4eefcddbfc54dc789e818f0b4). El [catálogo de pruebas](../pruebas/pruebas.md) registra el resultado esperado de cada escenario.

| Área | Evidencia consultada | Comprobación para la entrega |
|---|---|---|
| Ventas, reservas, compras e inventario | Servicios de código y pruebas aisladas descritas en el informe de origen. | Repetir en la interfaz de la demo con datos de prueba. |
| Autenticación y contraseña | Código de Supabase Auth y pruebas con dobles. El informe de origen registra una ejecución alojada bloqueada. | Confirmar la cuenta de prueba y repetir en el entorno publicado. |
| Teléfono | PR originales 3 y 4, fusionados en la revisión de referencia. | Comprobar el portal con una cuenta con teléfono y otra sin teléfono. |
| Fotos | Ruta de carga, asociación al producto y pruebas aisladas. | Comprobar carga y lectura con Storage alojado. |
| Fidelización | Servicio de reclamo, configuración de puntos y canje en el código. | Probar el flujo completo con un cliente de prueba en la revisión de la demo. |
| Responsividad | Commits del catálogo, caja y panel para pantallas móviles. | Registrar el resultado por tamaño de pantalla en PRU-026. |
| Despliegue | Registro del backend en Render y PR de preparación. | Confirmar la revisión servida y ejecutar PRU-032. |
| Respaldo | El informe de origen describe una restauración en una base temporal. | Configurar la ejecución al cierre en el entorno de uso. |

La [evidencia de origen](https://github.com/seckfly/Comercial_Nazareth_Codigo/blob/58611e91ce6a14d4eefcddbfc54dc789e818f0b4/docs/cierre-requisitos.md) corresponde a la ejecución descrita allí. Este informe deja constancia de la revisión documental y de las verificaciones de la demo pendientes de ejecución.
