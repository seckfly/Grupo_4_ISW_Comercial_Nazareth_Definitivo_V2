# CR-002 · Migración tecnológica a Supabase

**Estado:** implementación de la base técnica preparada para verificar con un proyecto alojado.

**Línea base:** [SRS de Comercial Nazareth, sección Alcance](https://github.com/seckfly/Grupo_4_ISW_Comercial_Nazareth_Definitivo/blob/e98e1400cb4fa5ec47eef3585037a0e105af2b11/docs/SRS.md#alcance).

| Aspecto | Decisión |
|---|---|
| Plataforma | React/Vite y Express se conservan. PostgreSQL alojado en Supabase sustituye a MySQL. |
| Identidad | Supabase Auth sustituye al acceso de demostración y a los JWT propios. Express verifica la identidad, la vigencia de la sesión y el perfil activo. |
| Acceso a datos | Express usa un rol PostgreSQL de permisos limitados en un esquema privado. El navegador recibe solo configuración publicable y su propia sesión. |
| Alcance | Se conservan los RF, RNF, BR, CU y PRU de la línea base. El cambio documenta la plataforma, sin crear funcionalidades ni condiciones de aceptación nuevas. |
| Evidencia pendiente | Aplicación de las migraciones en el proyecto alojado, conexión de Express y recorrido de los dos perfiles con Auth real. Los escenarios PRU mantienen su estado pendiente hasta su ejecución. |

Los vínculos directos de esta etapa son **RF-006**, **RF-013**, **RNF-002**, **PRU-009** y **PRU-014**. La base sirve a los flujos transaccionales de ventas, inventario y recepción. Las evidencias de rendimiento y respaldo se deben obtener en los escenarios de **PRU-021**, **PRU-022** y **PRU-023** conforme al SRS.

[CR-001](https://github.com/seckfly/Grupo_4_ISW_Comercial_Nazareth_Definitivo/blob/e98e1400cb4fa5ec47eef3585037a0e105af2b11/matrices/impacto-cr-001.md) conserva su alcance histórico. RF-015 y CU-006 mantienen la validación del motivo, su historial y la transacción de ajuste con PRU-016 a PRU-019. Esta etapa crea el esquema y la restricción de motivo de ajuste, que se utilizarán en el flujo de la siguiente etapa.
