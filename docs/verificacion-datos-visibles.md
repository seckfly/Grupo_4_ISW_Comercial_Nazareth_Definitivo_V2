# Campañas, clientes e icono de alertas

Registro histórico. Para conocer el alcance y las pruebas de la versión vigente, consulta el [cierre de requisitos](cierre-requisitos.md).

- El icono usa `notice-icon stock-alert`, con el mismo fondo y color anteriores. La regla global `.alert` se conserva. El contenedor vuelve a usar exclusivamente la cuadrícula centrada de `.notice-icon`, sin el padding de `.alert` que desplazaba el triángulo.
- Promociones consulta GET `/api/promotions`. Ya no incorpora campañas, cifras, recomendaciones ni preferencias de muestra desde constantes o localStorage. Se corrigió el paso del rol desde el controlador al modelo para permitir la consulta administrativa completa.
- La consulta de solo lectura a PostgreSQL devolvió 0 campañas. La vista vacía dice «Aún no hay campañas». Los errores se muestran con Reintentar, sin interpretarlos como ausencia de registros.
- Nueva campaña conserva el formulario y carga el catálogo real. Antes guardaba únicamente en localStorage. Su integración de escritura con la API sigue pendiente; ahora el botón está deshabilitado y el formulario informa que el guardado no está disponible. No se creó ninguna campaña ni se eliminaron registros existentes o almacenamiento local.
- Clientes consulta GET `/api/sales/customers?all=true`, con autenticación y autorización administrativa existentes. Reutiliza la consulta de clientes de ventas, habilitando explícitamente el listado sin término solo para esa petición. La búsqueda vacía de Nueva venta sigue devolviendo una lista vacía como antes. Se consultan nombre, correo y teléfono reales; no se inventan historial ni métricas.
- La consulta de solo lectura devolvió 1 cliente registrado. Se retiró Agregar cliente porque era un botón sin acción. El alta comercial independiente sigue pendiente. Las cuentas de acceso y la selección opcional de cliente al vender permanecen disponibles.
- Frontend: 41 pruebas aprobadas; incluye campañas vacías ignorando muestras locales y clientes vacíos sin selección. Backend: 37 pruebas aprobadas en entornos aislados. Compilación de producción correcta, con el aviso existente de tamaño del paquete JavaScript.
- Revisión visual pendiente: `cua.getState()` devolvió `browsers: []` y `The browser access host is unavailable`. Al ejecutar `cua.getApp({windowId:262420})`, el control se detuvo porque no pudo determinar la URL actual con suficiente confianza para aplicar la política. No se detectó la pestaña local. Quedan pendientes el centrado y color del icono y la apertura de ambas pestañas en navegador; las pruebas de componentes y consultas SQL no sustituyen esa revisión.

No se requieren migraciones nuevas. Reiniciar Express para disponer del listado de clientes y la corrección de consulta de campañas.
