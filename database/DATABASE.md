# Configuración de PostgreSQL y Supabase Auth

La aplicación se ejecuta con un proyecto Supabase alojado. Express accede a PostgreSQL con el rol de aplicación `nazareth_app`. React usa Supabase Auth y envía el token de acceso a Express. El esquema de negocio `nazareth` queda privado y sus tablas se consultan a través de Express.

## 1. Aplicar las migraciones

En el SQL Editor del proyecto Supabase, con el rol de administración `postgres`, ejecuta los archivos completos en este orden:

1. [001_commercial_schema.sql](migrations/001_commercial_schema.sql)
2. [002_express_access.sql](migrations/002_express_access.sql)

Cada migración es transaccional. Registra qué archivos aplicaste y ejecuta cada versión una vez por base. Crean objetos en el esquema propio y mantienen los datos que ya existan. Si el esquema o el rol ya existe en ese proyecto, revisa su origen antes de aplicar los archivos. El [script MySQL de origen](comercial_nazareth.sql) se conserva como antecedente y contiene instrucciones destructivas de inicialización. Las migraciones PostgreSQL no lo ejecutan ni importan sus datos.

Mantén `nazareth` fuera de los esquemas expuestos por la Data API. El rol de Express tiene permisos explícitos para las rutas actuales. Las futuras rutas deben ampliar los permisos junto con su migración. El rol no tiene acceso directo a las tablas de Auth ni permisos de administración de la base.

## 2. Configurar el rol de conexión

En el Dashboard, abre **Connect → Session pooler**. Con el cliente `psql` puedes usar el host, puerto y usuario de administración que muestra Supabase. Deja que el cliente solicite la contraseña y, en la sesión de administración, ejecuta:

```text
\password nazareth_app
```

Introduce una contraseña propia en la terminal. Configura `DATABASE_URL` usando el usuario `nazareth_app.<project-ref>`, el host del *Session pooler* y el puerto 5432. Si tu red permite conexión directa al proyecto, el usuario directo es `nazareth_app`. Codifica en la URL los caracteres reservados de la contraseña. Express verifica el certificado TLS y comprueba que la conexión use el rol de aplicación antes de abrir el puerto. Si el certificado raíz del proyecto se necesita en tu entorno, descarga el PEM desde Supabase y configura su ruta mediante `DATABASE_SSL_CA_FILE`. [Conexiones y roles personalizados](https://supabase.com/docs/guides/database/connecting-to-postgres).

## 3. Preparar las primeras cuentas

1. En **Authentication → Users** crea la cuenta administrativa y una cuenta cliente para comprobar el flujo. Usa cuentas con correo confirmado. Mantén deshabilitado el registro público. El alta administrativa corresponde a RF-013.
2. Copia el UUID de cada cuenta. En el SQL Editor, sustituye los UUID de ejemplo por los correspondientes al proyecto y ajusta los nombres. Vincula cada identidad una vez:

```sql
INSERT INTO nazareth.profiles (auth_user_id, name, role, is_protected)
VALUES ('<UUID_ADMIN>'::uuid, 'Administrador de Comercial Nazareth', 'admin', true);

WITH profile AS (
  INSERT INTO nazareth.profiles (auth_user_id, name, role)
  VALUES ('<UUID_CLIENTE>'::uuid, 'Cliente de prueba', 'client')
  RETURNING id, name
)
INSERT INTO nazareth.customers (user_id, name)
SELECT id, name FROM profile;
```

Una identidad de Supabase sin perfil activo carece de acceso a las operaciones protegidas. La cuenta marcada como protegida conserva su rol administrativo y estado activo. Las altas posteriores y las ediciones de correo o contraseña desde Configuración usan una clave secreta en Express. El listado, la edición de datos del perfil y la activación o desactivación usan el rol PostgreSQL de la aplicación.

## 4. Completar los archivos de entorno

Consulta [backend/.env.example](../backend/.env.example) y [frontend/.env.example](../frontend/.env.example). Completa localmente los archivos `backend/.env` y `frontend/.env`. Si ya existen, conserva sus configuraciones ajenas a la migración y actualiza las variables que se indican.

| Archivo | Variable | Valor |
|---|---|---|
| `backend/.env` | `DATABASE_URL` | Cadena PostgreSQL del rol `nazareth_app` con su contraseña, sin parámetros `ssl*`. |
| `backend/.env` | `DATABASE_SSL_CA_FILE` | Opcional. Ruta al certificado raíz en formato PEM, absoluta o relativa a `backend/`. |
| `backend/.env` | `SUPABASE_URL` | URL HTTPS del mismo proyecto. |
| `backend/.env` | `SUPABASE_PUBLISHABLE_KEY` | Clave publicable `sb_publishable_…` del proyecto. |
| `backend/.env` | `SUPABASE_SECRET_KEY` | Clave `sb_secret_…` del proyecto, necesaria para altas y cambios de correo o contraseña desde la aplicación. |
| `backend/.env` | `PORT` | `4000` para el arranque local. |
| `backend/.env` | `CLIENT_ORIGIN` | `http://127.0.0.1:5173` si Vite se abre con esa dirección. |
| `frontend/.env` | `VITE_API_URL` | `http://127.0.0.1:4000/api` para el arranque local. |
| `frontend/.env` | `VITE_SUPABASE_URL` | La misma URL HTTPS del proyecto. |
| `frontend/.env` | `VITE_SUPABASE_PUBLISHABLE_KEY` | La misma clave publicable del proyecto. |

Guarda la clave secreta y la contraseña de base únicamente en el entorno del servidor. Las variables `VITE_*` forman parte de la configuración pública del navegador. [Tipos de clave de Supabase](https://supabase.com/docs/guides/api/api-keys).

## 5. Comprobar el entorno alojado

- Inicia Express y Vite como indica el README. Express debe informar `PostgreSQL conectado` y `GET /api/health` debe responder 200. `GET /api/products` permite comprobar una consulta al catálogo, incluso si todavía está vacío.
- Entra con cada perfil desde el formulario existente. Comprueba que `GET /api/auth/me` devuelva el perfil y que un cliente autenticado reciba 403 al consultar `GET /api/dashboard` o `GET /api/users`.
- Desactiva la cuenta cliente desde la pantalla de Configuración. Su sesión previa debe recibir 403 en una operación protegida y un nuevo inicio tampoco debe conceder acceso. Verifica que la cuenta administrativa protegida no pueda desactivarse ni cambiar a cliente.
- Cierra sesión con cada cuenta. Tras el cierre, `/api/auth/me` debe exigir autenticación. Para comprobar revocación en una prueba controlada, el JWT de la sesión cerrada también debe recibir 401 aunque conserve su vigencia criptográfica. Mantén esos tokens fuera de la evidencia.
- El flujo de CU-006 utilizará las tablas de productos y movimientos. Su operación de ajuste y las pruebas PRU-016 a PRU-019 se implementan en la etapa siguiente.
