# Ajustes de presentación de Comercial Nazareth

## Segunda pasada sobre 4cd51f8

- Se retiraron el bloque narrativo y las cifras de demostración del acceso. La marca y el formulario conservan sus componentes y fuentes, con distribución compacta en ventanas estrechas.
- Hasta 900 px, Nueva venta usa un solo desplazamiento para catálogo, pedido y cobro. El pie se conserva en el flujo con comportamiento sticky dentro del pedido; en escritorio se mantiene el catálogo sin margen lateral y el pie independiente.
- Inventario y el indicador lateral comparten el mismo estado cargado desde PostgreSQL. Los cambios de productos y ajustes actualizan ese estado; una venta confirmada vuelve a consultar existencias. Mientras se carga o hay error, el indicador muestra un guion en lugar de un conteo ficticio.
- El ajuste muestra el aviso junto al saldo previsto negativo, bloquea la confirmación y también evita enviar el formulario en ese estado. Se conserva la comprobación transaccional del servidor.
- Las notificaciones se cierran tanto al navegar desde el menú como al cambiar de módulo por otras acciones. Se añadieron nombre accesible al cierre y estado expandido al botón.
- Frontend: 39 pruebas aprobadas, incluidas nuevas comprobaciones de saldo negativo, corrección con incremento de 1 y cierre de notificaciones por navegación, botón y Escape. Compilación correcta, con el aviso existente de tamaño del paquete.
- No se guardaron ventas ni ajustes en la base de trabajo. La comprobación de Windows volvió a bloquear el navegador por no poder determinar su URL para aplicar la política de acceso. Por ello no se verificaron visualmente escritorio ni 727 × 655, tampoco los accesos reales de administrador y cliente ni el recorrido hasta el cobro en navegador. Estas comprobaciones siguen pendientes; las pruebas de componentes no las sustituyen.

Se conservan React, los componentes, Manrope y Newsreader, la paleta verde y crema y los servicios existentes. No hay cambios de esquema ni migraciones nuevas.

## Cambios

- Nueva venta: el catálogo deja de ser un `main` anidado y no recibe el margen del layout. El formulario tiene un cuerpo desplazable y un pie independiente con total y confirmación, sin posicionamiento superpuesto. Pasos, cantidades y cobro tienen etiquetas más legibles. Escanear conserva su estado deshabilitado con una apariencia diferenciada.
- Encabezados: el título principal queda en el contenido; la barra superior compacta muestra el contexto administrativo. En Ventas se conserva Registrar venta como acción principal y se omite la acción duplicada de la barra superior.
- Ventas e Inventario: búsqueda flexible, controles alineados y filtros agrupados; categorías adaptables a varias líneas.
- Historial: tipo y variación juntos, saldos anterior y posterior etiquetados, fecha y responsable. El motivo solo aparece cuando existe y no repite el tipo del movimiento.
- Configuración: columnas de identidad, estado, rol y acciones con dos posiciones reservadas para botones. Las filas de cuentas protegidas mantienen la misma alineación.
- Resumen y Reportes: leyendas mayores y nombres de productos distribuidos en varias líneas en el gráfico de barras.
- Promociones: imágenes de tarjetas más bajas y encabezado Campañas registradas, que incluye campañas finalizadas.
- Cantidades: singular y plural en productos y operaciones; Unidad/Unidades y Paquete/Paquetes conservando las demás unidades del producto, incluidas Kg y abreviaturas.

## Verificación ejecutada

- `npm.cmd test` en `frontend`: 37 pruebas aprobadas, incluidos checkout, importes con centavos, controles decimales, consultas de ventas, historial con la unidad real y alertas de inventario.
- Compilación de Vite para producción: correcta. Se conserva el aviso de paquete JavaScript mayor de 500 kB.
- Los servicios de autenticación, ventas y ajustes no se modificaron. Estas comprobaciones no equivalen a ejecutar de nuevo las pruebas de integración contra Supabase.

## Verificación visual pendiente

No se pudo comprobar visualmente ninguna pantalla. El control de Windows detuvo el acceso al navegador al no poder determinar su URL con suficiente confianza para aplicar la política de acceso. No se empleó otro mecanismo para eludir esa restricción.

Antes de dar por validada la presentación, revisar en escritorio (1366 × 900), ventana estrecha (390 × 844) y una ventana baja: Nueva venta con varios productos y los tres medios de pago; Ventas filtradas; Inventario y su historial; usuarios protegidos y normales en Configuración; gráficos de Resumen y Reportes; tarjetas de Promociones. Comprobar que el pie no tape el cobro, que la búsqueda sea legible y que filtros, acciones y paneles permanezcan en el área visible. Los estilos adaptativos implementados aún requieren esa comprobación en un navegador real.
