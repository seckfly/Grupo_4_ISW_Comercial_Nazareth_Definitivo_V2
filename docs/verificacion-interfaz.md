# Ajustes de presentación de Comercial Nazareth

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
