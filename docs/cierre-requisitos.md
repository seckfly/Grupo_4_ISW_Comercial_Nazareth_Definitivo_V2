# Cierre de correspondencia: SRS completo y extensiones

Referencia: [alcance y auditoría inicial](alcance-y-evidencia.md).

**Implementado no equivale a prueba alojada aprobada.** No quedan comportamientos funcionales del SRS intencionadamente ausentes en código; las limitaciones de configuración y evidencia se marcan por separado. Los archivos de código de las tablas son relativos a la carpeta `codigo/`.

## 15 RF

| RF | CU/reglas | Implementación | Evidencia | Estado |
|---|---|---|---|---|
| RF-001 | CU-001 / BR-001–003 | backend/src/services/saleService.js; frontend/src/components/ui/SaleDrawer.jsx | PRU-001,003,020 y componentes: guardado conjunto, fallo, centavos, referencia con/sin referencia; recojo atómico | Implementado y probado en aislamiento; navegador pendiente |
| RF-002 | CU-006 / BR-006 | backend/src/services/inventoryService.js; frontend/src/context/InventoryContext.jsx; frontend/src/pages/Inventory/index.jsx | PRU-002 y pruebas de reservas: físico/apartado/disponible, alertas físicas <= mínimo | Implementado y probado en aislamiento |
| RF-003 | CU-008 / BR-007 | backend/src/services/purchaseService.js; frontend/src/pages/Purchases/index.jsx | PRU-005: razón social, RUC, teléfono persistidos dentro de la orden | Implementado y probado en aislamiento |
| RF-004 | CU-008 / BR-004,006 | backend/src/services/purchaseService.js; frontend/src/pages/Purchases/index.jsx; frontend/src/pages/Inventory/index.jsx | PRU-006: dos líneas, total, estado, ningún incremento; acceso directo y contexto desde stock bajo | Implementado; API probada, recorrido visual pendiente |
| RF-005 | CU-009 / BR-004,008 | backend/src/services/purchaseService.js; frontend/src/pages/Purchases/index.jsx | PRU-008: parcial, acumulación, saldo, exceso, referencia duplicada y restricción de anulación | Implementado y probado en aislamiento |
| RF-006 | Acceso / RNF-002 | frontend/src/context/AuthContext.jsx; backend/src/services/sessionService.js | PRU-009: navegación y middleware con dobles; estado/revocación probados previamente | Implementado; repetición E2E de Auth alojado bloqueada por clave inválida |
| RF-007 | CU-003 | frontend/src/pages/Products/index.jsx; backend/src/services/customerService.js; backend/src/models/Product.js | PRU-007: búsquedas, vacíos y favoritos/lista persistidos por cuenta; consulta administrativa en caja y compras | Implementado; pruebas unitarias/API, navegador pendiente |
| RF-008 | CU-004 / BR-002 | backend/src/routes/promotionRouter.js; backend/src/services/priceService.js; frontend/src/pages/Promotions/index.jsx | PRU-010: crear, editar mismo ID, pausar/activar/eliminar; precio igual en catálogo/cotización; vista previa calculada | Implementado y probado en aislamiento; no se crearon campañas de trabajo |
| RF-009 | CU-005 / BR-005 | backend/src/services/reservationService.js; frontend/src/pages/Products/index.jsx; frontend/src/pages/Reservations/index.jsx | PRU-011: 1–3 distintos, importe servidor, código/collision retry, 24h y sin bloqueo. Pruebas adicionales de apartado/recojo | Implementado y probado en aislamiento; móvil en navegador pendiente |
| RF-010 | CU-002 | backend/src/services/saleService.js; frontend/src/components/ui/SaleDrawer.jsx; frontend/src/pages/ClientHome/index.jsx | PRU-004: Cliente Demo desde componentes de caja; otra venta sin cliente; API de compras propias; nueva venta limpia selección | Implementado y probado en aislamiento; no se cambió venta #1 de trabajo |
| RF-011 | Consulta administrativa | backend/src/services/customerService.js; frontend/src/pages/Customers/index.jsx | PRU-012: contacto, frecuencia calculada de ventas e historial real, sin métricas ficticias | Implementado y probado en aislamiento |
| RF-012 | Resumen/Reportes | backend/src/services/dashboardService.js; frontend/src/pages/Overview/index.jsx; frontend/src/pages/Reports/index.jsx | PRU-013: fechas Lima, ventas, métodos, detalle por unidad y movimientos de entrada/salida/ajuste por periodo | Implementado y probado en aislamiento; conserva 9933241 |
| RF-013 | Administración de accesos | backend/src/models/User.js; frontend/src/pages/Settings/index.jsx; backend/src/services/sessionService.js | PRU-014: validaciones/protección y rechazo de rol probados; SDK administrativo existente | Implementado; prueba completa de crear/editar/desactivar Auth alojado pendiente: SUPABASE_SECRET_KEY HTTP 401 |
| RF-014 | Portal | backend/src/services/customerService.js; backend/src/services/saleService.js; frontend/src/pages/Account/index.jsx; frontend/src/pages/ClientHome/index.jsx | PRU-015: puntos persistidos 37/99 y compras separadas entre dos cuentas, parámetro ajeno ignorado | Implementado y probado en aislamiento; no se inventó acumulación de puntos |
| RF-015 | CU-006 / CR-001 | backend/src/services/inventoryService.js; frontend/src/pages/Inventory/InventoryDrawers.jsx | PRU-016–019: motivos válidos/vacíos/espacios, historial anterior y fallo transaccional; ajustes respetan apartados | Implementado y probado en aislamiento |

## 6 RNF

| RNF | Implementación/evidencia | Escenario | Estado |
|---|---|---|---|
| RNF-001 | backend/test/sales.integration.test.js | PRU-021: diez ventas HTTP locales, precios ya calculados, pago externo excluido; auth de fixture | Medición local aprobada, latencia con Auth alojado pendiente |
| RNF-002 | frontend/src/utils/auth.js; backend/src/services/sessionService.js; backend/src/middleware/role.js | PRU-009 y rechazos API en roles de prueba | Implementado; navegador/Auth alojado pendientes |
| RNF-003 | backend/test/sales.integration.test.js | PRU-022: diez consultas HTTP de productos, stock y resumen con un usuario local | Medición local aprobada; no extrapolar al alojamiento |
| RNF-004 | backend/src/services/saleService.js | PRU-001 y fallo al cerrar el apartado después de escribir venta/stock | Confirmación conjunta y rollback probados |
| RNF-005 | shared/numbers.mjs; backend/src/services/priceService.js | PRU-003,010,020; cotización y pago exactos con centavos | Probado con diferencia S/ 0,00 |
| RNF-006 | backend/scripts/backup.mjs; backend/test-support/nativePostgres.js | PRU-023 pg_dump/pg_restore en dos bases temporales; comparación de tablas | Restauración aislada aprobada; configurar ejecución al cierre real de Humberto |

## 8 reglas

| Regla | Requisitos/código | Evidencia |
|---|---|---|
| BR-001 | RF-001 | PRU-020 con referencia y prueba adicional sin referencia; importe/confirmación manual |
| BR-002 | RF-001,008 | PRU-003/010: centavos, precio promocional compartido, sin acumulación de campañas |
| BR-003 | RF-010 | PRU-004: venta opcionalmente sin cliente, sin heredar selección |
| BR-004 | RF-004,005 | PRU-006/008: orden no aumenta stock, recepción sí |
| BR-005 | RF-009 | PRU-011: solicitud pendiente no bloquea stock ni registra venta; apartado confirmado es extensión separada |
| BR-006 | RF-002,004 | PRU-002/006: igualdad alerta, no crea orden automáticamente; contexto de compra solo por decisión |
| BR-007 | RF-003 | PRU-005: proveedor dentro de orden y sin credenciales |
| BR-008 | RF-005 | PRU-008: parcial, duplicado y exceso, anulación restringida |

## 23 escenarios oficiales

Los nombres de pruebas se resuelven bajo backend/test salvo prefijo frontend (frontend/src/test). Un escenario con cobertura parcial **no se declara aprobado integralmente**. La evidencia aislada no sustituye los pasos de navegador ni la configuración del servicio alojado.

| PRU | Pruebas ejecutables | Estado / límite |
|---|---|---|
| PRU-001 | sales.integration.test.js | Ejecutada: éxito y fallo de venta atómica |
| PRU-002 | inventory.test.js | Ejecutada: activos 4/5/6, mínimo 5 e inactivo 4 |
| PRU-003 | sales.integration.test.js | Ejecutada: precio 6,70 × 3 = 20,10, efectivo 50, vuelto 29,90 |
| PRU-004 | sales.integration.test.js; frontend/checkout.test.jsx | Ejecutada en API/componentes: Cliente Demo, portal propio, otra venta sin cliente y selección limpia; navegador pendiente |
| PRU-005 | sales.integration.test.js | Ejecutada: tres datos del proveedor persistidos |
| PRU-006 | sales.integration.test.js | Ejecutada: stock bajo, orden de dos productos y total, ningún aumento; igualdad no inicia orden |
| PRU-007 | sales.integration.test.js; frontend/catalog.test.js; frontend/checkout.test.jsx | Ejecutada: filtros, vacío y persistencia por cuenta; navegador pendiente |
| PRU-008 | sales.integration.test.js | Ejecutada: recepción parcial, saldo, exceso y duplicados |
| PRU-009 | sessionService.test.js; frontend/auth.test.js | Parcial: navegación, roles y sesiones con dobles. Falta repetir inicio/cierre de sesiones alojadas y UI con claves válidas |
| PRU-010 | sales.integration.test.js; promotionService.test.js; frontend/promotion.test.js | Ejecutada en servicios/API: CRUD/estados/precio; UI CRUD completo en navegador pendiente |
| PRU-011 | sales.integration.test.js; frontend/checkout.test.jsx | Ejecutada: solicitud, código, vencimiento y cero efecto en stock/caja; navegador móvil pendiente |
| PRU-012 | sales.integration.test.js | Ejecutada: identidad, contacto, frecuencia e historial conocido |
| PRU-013 | sales.integration.test.js; frontend/checkout.test.jsx | Ejecutada en servicios/componentes: resumen, métodos, demanda y movimientos por periodo |
| PRU-014 | userService.test.js; sessionService.test.js | Parcial: validación, protección y rol. Falta CRUD real de cuentas en Auth alojado; clave secreta devuelve 401 |
| PRU-015 | sales.integration.test.js | Ejecutada en API aislada: compras y puntos conocidos de dos cuentas separadas; navegador pendiente |
| PRU-016 | inventory.test.js | Ejecutada: alta, precio, ajustes e historial de ambos motivos |
| PRU-017 | inventory.test.js | Ejecutada: motivo vacío rechazado sin cambios |
| PRU-018 | inventory.test.js | Ejecutada: solo espacios rechazados sin cambios |
| PRU-019 | inventory.test.js | Ejecutada: fallo inducido revierte stock/historial y conserva datos anteriores |
| PRU-020 | sales.integration.test.js; frontend/checkout.test.jsx | Ejecutada: Yape/Plin con referencia; también escenario adicional sin referencia, importe exacto y confirmación humana |
| PRU-021 | sales.integration.test.js | Ejecutada: diez ventas equivalentes HTTP locales, todas bajo 15 s; Auth de fixture |
| PRU-022 | sales.integration.test.js | Ejecutada: diez consultas HTTP por tipo locales, todas <=3 s; Auth de fixture |
| PRU-023 | sales.integration.test.js; test-support/nativePostgres.js | Ejecutada: dump, restauración en otra base y comparación; automatización diaria de trabajo por configurar |

## Evidencia adicional solicitada

Resultado final: 49 pruebas de frontend y 53 de backend aprobadas; compilación de producción correcta, con el aviso de tamaño del paquete JavaScript ya existente. Última medición HTTP local: diez ventas, máximo 17 ms; diez consultas por tipo, máximos 5 ms productos, 5 ms stock y 17 ms resumen. Auth es una identidad de fixture en estas mediciones locales. PRU-023 ejecutó pg_dump/pg_restore de PostgreSQL 18 en otra base temporal y comparó los registros.

- Reservas: código único con colisión forzada y reintento; 24 horas exactas; solicitud sin bloqueo ni caja; confirmación contra venta de últimas unidades con conexiones independientes; cancelación y vencimiento liberan disponibilidad; editar/rechazar; ajuste no invade apartados; recojo y cierre atómicos; fallo al cerrar el apartado revierte venta/detalle/movimientos/stock; repetición devuelve una sola venta y otro intento distinto es rechazado.
- Caja: referencia opcional, importe digital exacto y confirmación manual. Ambos QRs de demostración se decodificaron a destinos example.com sin cobro. No se verifica un banco ni se presenta el escaneo como pago confirmado.
- Fotos: API con almacenamiento doble de prueba, MIME/firma/tamaño, rechazo de cliente, alta/edición con/sin imagen, reemplazo/retirada, presentación neutra y previsualización. La conexión Storage real sigue pendiente.
- Contraseña: se prueba confirmación, rechazo de contraseña actual incorrecta, misma identidad, updateUser e inicio posterior con dobles. La prueba alojada se intentó y se bloqueó en createUser con HTTP 401 Invalid API key antes de crear cuentas. No se cambió contraseña alguna de trabajo. Se añadió un script opt-in reproducible.
- Los datos comerciales y la asociación histórica de venta #1 no se tocaron. Las migraciones 005/006 no se aplicaron a la base de trabajo. Las pruebas de escritura usan únicamente nativePostgres/PGlite temporales. El script de Auth/Storage alojado usa usuarios y bucket con UUID propios y no toca filas comerciales; en este intento no creó recursos por el bloqueo.

## Configuración y pendientes concretos

1. Aplicar migración 005 y configuración Storage 006 como explica [CONFIGURACION-ALCANCE-COMPLETO](../codigo/database/CONFIGURACION-ALCANCE-COMPLETO.md).
2. Corregir SUPABASE_SECRET_KEY solo en backend/.env (misma URL/proyecto que las claves publicables). La clave configurada fue rechazada con HTTP 401. No compartir claves en chat ni incorporarlas al frontend.
3. Repetir node scripts/verify-hosted-features.mjs después de configurar. Faltan el cambio real de contraseña y la subida/lectura real de Storage con cuentas temporales.
4. Repetir PRU-009/014 con Auth real y recorrer la UI de compras, promociones, separación móvil y recojo. Brave: cua.getState devolvió browsers vacío y browser access host unavailable; cua.getApp({windowId:262420}) se detuvo por no poder determinar la URL para aplicar la política. No se detectó la pestaña 127.0.0.1:5173. No se usó otra vía para eludirlo.
5. Configurar ejecución de respaldo al horario real de cierre. La restauración aislada está probada; no se inventó un horario ni se ejecutó un restore sobre datos de trabajo.

Las extensiones para actualización posterior del SRS son apartado confirmado/recojo, QR de demostración con importe digital y referencia opcional, fotos y contraseña propia. Se conserva CR-001 y CR-002. La política documentada de campañas coincidentes es menor precio sin acumulación, pendiente de formalización en el SRS. No se inventó una fórmula de acumulación de puntos.

