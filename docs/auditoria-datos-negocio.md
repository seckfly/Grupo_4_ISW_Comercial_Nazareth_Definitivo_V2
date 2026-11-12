# Fuentes de datos del negocio

Registro histórico. Para conocer el alcance y las pruebas de la versión vigente, consulta el [cierre de requisitos](cierre-requisitos.md).

## Muestras retiradas de las rutas de producción

| Origen anterior | Datos presentados como reales | Fuente actual |
| --- | --- | --- |
| `pages/Overview/index.jsx`, `components/ui/AdminBrief.jsx`, `services/mockData.js` | Caja 547,20, proyección 712,40, comparaciones, metas, productos, demanda, ventas y agenda de proveedores | GET `/api/dashboard`, ventas completadas y su detalle; Inventario compartido para alertas |
| `components/layout/AppShell.jsx` | Tres notificaciones, reposición de Inca Kola/Clorox, proveedor, cierre conciliado, puntos del cliente | Productos activos cuyo stock es menor o igual al mínimo, desde InventoryContext; sin avisos comerciales inventados |
| `pages/Reports/index.jsx` | Totales semanales/mensuales, margen, porcentajes y recomendaciones | Mismo servicio y componente de métricas que Resumen |
| `pages/ClientHome/index.jsx` | Compras de agosto, ahorro, productos y beneficios supuestos | GET `/api/customer-sales`, únicamente ventas completadas vinculadas al cliente autenticado |
| `pages/Products/index.jsx` | Catálogo ficticio, selección para Rosa, disponibilidad y actualización fijas, reserva con código aleatorio | GET `/api/products`; favoritos y lista personal local conservados, sin afirmar una reserva enviada |
| `pages/Household/index.jsx` | Predicciones de consumo, productos y porcentajes predefinidos | Catálogo real y lista personal de sesión; sin predicciones de consumo sin respaldo |
| `pages/Account/index.jsx` | Iniciales RC, puntos, nivel, antigüedad, teléfono y oferta ficticios | Nombre y correo del perfil autenticado; edición no conectada señalada como no disponible |
| Componentes desconectados `ClientExtras.jsx`, `ClientConcierge.jsx` | Beneficios, horarios y compras sugeridas de muestra | Archivados como texto en `src/test/fixtures/legacy`, sin rutas ni importaciones de producción |

`mockData.js` se conserva exclusivamente en `src/test/fixtures`; se actualizó su importación en las pruebas. No se eliminaron muestras de pruebas ni registros de PostgreSQL.

Ventas, Inventario, Clientes y Promociones ya consultaban servicios reales; se conservaron los formularios, permisos, transacciones y datos persistidos. El alta independiente de clientes y la escritura del formulario de campañas siguen pendientes como se documentó en la pasada anterior. En backend no se encontraron respuestas de negocio simuladas: el endpoint de dashboard anterior hacía consultas reales, pero sus pantallas no lo utilizaban. Se reemplazó por el servicio compartido ampliado. Los valores predeterminados de conexión y las constantes de identidad/moneda no son métricas de negocio.

## Definiciones y fórmulas

- Todas las fechas operativas se agrupan en `America/Lima`. Últimos 7 días incluye hoy y seis días anteriores; Este mes empieza en el primer día de Lima. Se reutiliza `listSales`, el mismo servicio de Ventas, filtrando ventas completadas. Los días sin operaciones tienen valor cero.
- Caja = suma de `sales.total_amount`. El efectivo recibido y el vuelto nunca se suman a ingresos. Se muestran total, operaciones y efectivo/Yape/Plin por separado para hoy. Los gráficos diarios suman los mismos totales netos de ventas; no suman cantidades monetarias de líneas sin descontar.
- Demanda = suma de cantidades de `sale_items`, agrupada por producto y unidad histórica. No se mezclan Kg y Unidad en un único indicador de unidades. La recaudación junto a cada producto corresponde a sus subtotales de detalle antes del descuento global, que no se atribuye artificialmente a líneas individuales.
- Alerta = producto activo y `stock <= mínimo`. Menú, Resumen, Inventario y Notificaciones comparten el estado de inventario y su criterio, sin un límite artificial de cinco alertas. Cero alertas no genera recomendaciones de reposición.
- Comparación = `(total de hoy / total de ayer completo - 1) × 100`, redondeado a un decimal. Se etiqueta expresamente contra el día completo. Requiere al menos una operación hoy y total positivo ayer; en otro caso, «Aún no hay datos suficientes».
- Proyección = `total de hoy × suma de totales completos de los 7 días anteriores / suma de totales de esos mismos días hasta la hora actual de Lima`, redondeada a centavos. Requiere ventas hoy y total positivo hasta esa hora en cada uno de esos siete días completos. Es una extrapolación al final del día calendario, sin asumir horario de cierre del negocio. Si no se cumplen las condiciones se muestra «Aún no hay datos suficientes».
- Hora más fuerte = hora de Lima con mayor total neto dentro del periodo; en empate, primera hora. Se muestra solo con al menos siete operaciones distribuidas en dos fechas distintas.
- Metas, margen histórico y consumo no tienen configuración o datos históricos suficientes: se informa esa limitación, sin porcentajes, costos históricos reconstruidos ni recomendaciones fijas.
- Actividad = últimas ventas completadas y movimientos reales de entrada/ajuste, ordenados por fecha descendente. La venta no se duplica como actividad de salida. El historial completo de movimientos sigue disponible en Inventario.
- Dashboard consulta dentro de una transacción de solo lectura con aislamiento repeatable read, para que sus agregados compartan una instantánea.

## Actualización y estados

Se conserva InventoryContext: una venta confirmada invalida inventario; un producto o ajuste confirmado actualiza el estado compartido. Entrar a Inventario, Resumen o Reportes vuelve a consultar. Resumen/Reportes consultan también cuando cambia el inventario compartido. Ventas consulta al montar y después de confirmar una venta. Las consultas distinguen carga, fallo con mensaje y resultados vacíos; no sustituyen un error por cifras de ejemplo. No se añadió sincronización en tiempo real entre distintos navegadores.

## Verificación y límites

Se ejecutaron 42 pruebas de frontend y 39 de backend, todas aprobadas, y compilación de producción correcta. Las pruebas nuevas cubren error/vacío/reentrada de Resumen, venta aislada con total 20,10, efectivo 50 y vuelto 29,90, demanda 3 Kg, stock 7, actividad, compras propias del cliente y exclusión de otro usuario; ajustes que cruzan el mínimo; y agrupación justo antes de medianoche en Lima. Se prueba también la proyección con siete días de historial de prueba.

Las escrituras se ejecutan únicamente en el clúster temporal independiente de `nativePostgres`, con migraciones 001–004. La base de trabajo solo se consultó en lectura: al verificar devolvió cero ventas hoy, una venta en los últimos siete días y cero alertas. No se escribieron ni eliminaron sus datos.

Brave no pudo controlarse: inventario de navegadores vacío con `The browser access host is unavailable`, y bloqueo en `cua.getApp({windowId:262420})` por no poder determinar la URL actual con suficiente confianza. No se detectó la pestaña local. Queda pendiente revisar en navegador, en escritorio y ventana estrecha, los paneles reales y el flujo visual de actualización después de vender/ajustar. Las pruebas aisladas no sustituyen esa revisión. La compilación conserva el aviso existente de paquete JavaScript mayor de 500 kB.

No se necesitan migraciones nuevas. Reiniciar Express y Vite para cargar las rutas y pantallas nuevas.
