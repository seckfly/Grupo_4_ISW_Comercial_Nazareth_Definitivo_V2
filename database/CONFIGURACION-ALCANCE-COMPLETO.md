# Configuración del alcance completo

Se mantienen React/Vite, Express, PostgreSQL alojado, Supabase Auth y las decisiones CR-001/CR-002. No se modificó el repositorio definitivo. Aplicar primero las migraciones anteriores 001–004 si no estuvieran aplicadas. Las 001 y 002 existentes no se reemplazan.

## Migraciones nuevas

1. Aplicar `005_full_scope.sql` mediante SQL Editor o psql con el rol propietario. Es aditiva: agrega idempotencia de separaciones, enlace venta/reserva, importe recibido digital y permisos acotados al rol Express. No actualiza la asociación de ventas históricas ni reescribe referencias anteriores, incluida la venta #1.
2. Aplicar `006_product_photos_supabase.sql` en Supabase. Solo configura el bucket público `product-photos`, máximo 2 MiB, JPEG/PNG/WebP. No agrega acceso de escritura para anon/authenticated ni expone tablas nazareth al frontend. Los endpoints de carga de Express exigen administrador activo; la clave privilegiada solo se usa en backend. El catálogo puede mostrar las imágenes públicas sin revelar credenciales.
3. Reiniciar Express y Vite. En el cliente aparecen Compras, Reservas y Mi cuenta según el perfil. No es necesario ejecutar Supabase local para presentar el proyecto.

No se aplicaron estas migraciones a la base de trabajo durante la implementación. Los ensayos PostgreSQL usaron clústeres temporales independientes.

## Variables locales

Mantener en `backend/.env`: `DATABASE_URL`, `DATABASE_SSL_CA_FILE` si corresponde, `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `CLIENT_ORIGIN`, `PORT`. Mantener en `frontend/.env`: `VITE_API_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`.

La clave `SUPABASE_SECRET_KEY` configurada devolvió HTTP 401 «Invalid API key» durante la verificación alojada. En Supabase Dashboard, abrir Project Settings → API Keys y configurar una clave secreta válida del mismo proyecto en **backend/.env**, nunca en Vite ni en el chat. Confirmar que URL, clave publicable y clave secreta correspondan al mismo proyecto. No copiar claves privilegiadas al repositorio. Este bloqueo también impide verificar en vivo las operaciones administrativas de Auth que necesitan esa clave.

## Fotos

Alta/edición permite cargar y previsualizar una foto antes de guardar el producto, reemplazarla o quitar su asociación. Los productos sin foto usan una presentación neutra. No se aceptan SVG ni archivos mayores de 2 MiB. El servidor comprueba MIME y firma binaria, y las pruebas verifican rechazo de clientes y tipos inválidos. Una carga fallida conserva el dato anterior. Quitar/reemplazar una asociación no borra de forma irreversible el objeto anterior; pueden quedar objetos sin referencia si se abandona un formulario. Su limpieza debe hacerse posteriormente comparando `products.image_url`, sin borrar objetos aún usados.

## Contraseña propia

Mi cuenta está disponible para administrador y cliente. Se solicita contraseña actual, nueva y confirmación. El flujo reautentica la misma identidad en un cliente sin persistencia, llama a Supabase Auth y vuelve a iniciar la sesión con la nueva contraseña. Nunca usa la clave secreta en frontend. El perfil continúa resuelto en Express desde PostgreSQL.

Se utiliza `current_password` con la versión de supabase-js fijada en el proyecto; ver [contraseñas de Supabase](https://supabase.com/docs/guides/auth/passwords) y [seguridad y reautenticación](https://supabase.com/docs/guides/auth/password-security). Mantener la política de seguridad del proyecto. El inicio reciente del verificador atiende la reautenticación requerida; si Supabase exige otro control, se muestra el error y se pide volver a autenticar, sin eludirlo.

Pruebas locales del flujo con dobles de Auth: coincidencia de confirmación, contraseña actual incorrecta, actualización e inicio posterior. **No se declara verificado el cambio real en Supabase**: la creación de la cuenta temporal se bloqueó por la clave inválida antes de crear usuarios o cambiar contraseñas.

Para repetir expresamente las pruebas alojadas una vez configuradas las claves:

```powershell
cd backend
node scripts/verify-hosted-features.mjs
```

El script crea dos usuarios temporales y un bucket con UUID propio, prueba las contraseñas y la carga/lectura de una imagen, rechaza escritura anónima y acceso de cliente a carga, y limpia solo esos recursos. No consulta ni cambia filas comerciales. No imprime claves, contraseñas ni tokens. Si la clave falla, informa el bloqueo sin modificar cuentas de trabajo.

## Separaciones y disponibilidad

La solicitud conserva hasta tres productos distintos, cantidades positivas con hasta dos decimales, precio estimado calculado por el servicio, código único y 24 horas exactas. No cambia stock físico, vendible ni Caja. La confirmación administrativa vuelve a comprobar la disponibilidad dentro de una transacción. Un apartado confirmado se resta del stock vendible mientras no venza. El vencimiento se calcula al consultar y al vender; no necesita un cron ni una actualización destructiva del historial.

Inventario muestra físico, apartado y disponible. Las alertas conservan RF-002/BR-006: se comparan **existencias físicas** de productos activos con el mínimo, incluyendo igualdad; no se cambia esa regla por la existencia de apartados. Un ajuste manual que invada unidades apartadas se rechaza; debe cancelarse o ajustarse primero el apartado. Editar una solicitud libera el apartado anterior y vuelve a Pendiente de confirmación, conservando código y vencimiento.

Recoger y pagar abre Registrar venta con cliente y líneas del apartado. Precio y disponibilidad se calculan otra vez en el servidor. La venta, detalle, salida física y cierre del apartado se confirman juntos. El servidor exige que el detalle y cliente coincidan con el apartado, y conserva idempotencia y rechazo de una segunda venta distinta. Cancelación y vencimiento liberan disponibilidad sin modificar stock físico ni registrar un ingreso ficticio.

## Pagos y promociones

Yape/Plin muestran dos QRs distintos identificados como Demostración. Sus destinos son páginas `example.com` sin petición de dinero. Se decodificaron ambos QRs para comprobar sus URLs. Escanear no confirma un abono. Humberto registra el importe exacto a dos decimales y confirma que comprobó el abono. La referencia de operación es opcional; si se ingresa queda guardada. Los métodos/referencias históricos y el vuelto de efectivo se conservan.

Promociones permite crear, editar, activar, pausar y eliminar campañas reales. Las fechas ingresadas son inclusivas en hora de Lima. El precio promocional usa la misma consulta en catálogo, cotización de venta y solicitud de separación; no es negativo. Si coinciden campañas se aplica el precio menor, sin acumular descuentos. Ese criterio explícito debe formalizarse en la actualización futura del SRS. Los puntos del cliente se leen de `customers.points`; no se agregó una fórmula de acumulación porque el SRS no la define.

## Respaldo recuperable

`npm.cmd run db:backup` en backend guarda un dump personalizado de `nazareth` en `database/backups`, excluido de Git. Configurar `PG_DUMP_PATH` si pg_dump 18 no está en `C:/Program Files/PostgreSQL/18/bin/pg_dump.exe`; `BACKUP_DIRECTORY` permite elegir otro directorio local. Usa TLS y las variables del backend sin poner contraseñas en argumentos.

Ejecutarlo al cierre de cada jornada o programarlo con el horario real elegido por Humberto. No se impuso un horario de cierre no especificado. Proteger las copias y conservar también las identidades de Supabase Auth para restaurar vínculos. Restaurar primero en una base/proyecto separado; no ejecutar pg_restore sobre la base de trabajo sin un procedimiento revisado. La prueba PRU-023 ejecuta pg_dump/pg_restore en dos bases temporales y compara ventas, detalle, movimientos, productos y clientes. Puede configurarse `TEST_PG_DUMP` y `TEST_PG_RESTORE` para otro entorno.

## Actualización documental futura

Registrar sin sustituir CR-001/CR-002: apartado confirmado y recojo transaccional; QR de demostración, importe digital y referencia opcional; fotos opcionales; contraseña propia; criterio de campañas coincidentes. La condición original BR-005 sigue vigente para la **solicitud pendiente**, que no bloquea stock ni confirma venta.
