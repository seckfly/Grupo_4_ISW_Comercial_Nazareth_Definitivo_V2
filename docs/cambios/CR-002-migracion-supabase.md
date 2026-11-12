# CR-002 · Migración tecnológica a Supabase

La integración está implementada. El [informe de verificación](../../reportes/verificacion-v2.md) reúne los resultados locales y las comprobaciones de la versión publicada.

**Línea base:** [SRS de Comercial Nazareth, sección Alcance](../SRS.md#alcance).

| Aspecto | Decisión |
|---|---|
| Plataforma | React/Vite y Express se conservan. PostgreSQL alojado en Supabase sustituye a MySQL. |
| Identidad | Supabase Auth sustituye al acceso de demostración y a los JWT propios. Express verifica la identidad, la vigencia de la sesión y el perfil activo. |
| Acceso a datos | Express usa un rol PostgreSQL de permisos limitados en un esquema privado. El navegador recibe solo configuración publicable y su propia sesión. |
| Alcance | Se conservan los RF, RNF, BR, CU y PRU de la línea base. El cambio documenta la plataforma, sin crear funcionalidades ni condiciones de aceptación nuevas. |
| Referencias de verificación | [Informe de V2](../../reportes/verificacion-v2.md) y pruebas [PRU-009 y PRU-014](../../pruebas/pruebas.md). |

Los vínculos directos de esta etapa son **RF-006**, **RF-013**, **RNF-002**, **PRU-009** y **PRU-014**. La base sirve a los flujos transaccionales de ventas, inventario y recepción. Los escenarios **PRU-021**, **PRU-022** y **PRU-023** describen las comprobaciones de rendimiento y respaldo establecidas en el SRS.

[CR-001](../../matrices/impacto-cr.md) conserva su alcance histórico. RF-015 y CU-006 mantienen la validación del motivo, su historial y la transacción de ajuste con PRU-016 a PRU-019. El esquema y la restricción de motivo forman parte del flujo de ajuste vigente.
