# Comercial Nazareth

Sistema de gestión comercial y portal de clientes con React/Vite, Express, PostgreSQL alojado en Supabase y Supabase Auth.

La [especificación aprobada](../docs/SRS.md) define el alcance y los identificadores. [CR-002](../docs/cambios/CR-002-migracion-supabase.md) registra el cambio de tecnología en esta implementación.

El [informe de verificación](../reportes/verificacion-v2.md) registra las pruebas ejecutadas. La [configuración del alcance completo](database/CONFIGURACION-ALCANCE-COMPLETO.md) detalla la aplicación de las migraciones 001 a 016.

## Instalación

Instala Node.js 22.22.2 o una revisión posterior de la serie 22, o Node.js 24.15.0 o posterior de la serie 24. Desde la carpeta `codigo/`, en PowerShell:

```powershell
npm.cmd --prefix backend ci --include=optional
npm.cmd --prefix frontend ci --include=optional
```

Usa los archivos de bloqueo incluidos. Las dependencias opcionales incluyen los binarios de Rollup y esbuild para cada plataforma. En Windows, ejecuta esta instalación aunque la copia ya traiga dependencias de otro sistema operativo.

## Configuración y arranque

1. Sigue [la guía de base de datos y Supabase Auth](database/DATABASE.md) para aplicar las migraciones, crear el acceso administrativo y completar las variables locales. Puedes usar directamente un proyecto Supabase alojado.
2. Inicia Express con `npm.cmd --prefix backend run dev`.
3. En otra terminal, inicia Vite con `npm.cmd --prefix frontend run dev -- --host 127.0.0.1`.
4. Abre `http://127.0.0.1:5173`. El formulario usa las cuentas de Supabase Auth vinculadas a un perfil activo.

## Despliegue web

El frontend y el backend se publican como servicios separados. Vercel sirve la aplicación React/Vite; Render ejecuta la API de Express. Los datos se almacenan en PostgreSQL de Supabase, que también gestiona las cuentas con Auth y las fotografías con Storage.

| Servicio | Carpeta en este repositorio | Configuración de publicación |
|---|---|---|
| Vercel (frontend) | `codigo/frontend/` | Instalar con `npm ci`, compilar con `npm run build` y publicar `dist/`. |
| Render (backend) | `codigo/backend/` | Instalar con `npm ci --omit=dev` e iniciar con `npm start`. El servidor escucha en `PORT`. |
| Supabase | `codigo/database/` | PostgreSQL con el esquema `nazareth`, Supabase Auth y Storage; las migraciones están en `database/migrations/`. |

Si el despliegue parte del repositorio independiente `Comercial_Nazareth_Codigo`, las carpetas raíz son `frontend/`, `backend/` y `database/`, sin el prefijo `codigo/`. La rama y el repositorio conectados a cada plataforma deben comprobarse en sus paneles; la copia de código de esta entrega no los identifica por sí sola.

### Variables de entorno

| Servicio | Variable | Uso |
|---|---|---|
| Vercel | `VITE_API_URL` | URL base de Render con el sufijo `/api`. |
| Vercel | `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` | URL de Supabase y clave publicable, usadas para iniciar sesión. |
| Render | `CLIENT_ORIGIN` | Origen del frontend permitido por CORS, por ejemplo `https://comercial-nazareth-codigo.vercel.app` (sin barra final). |
| Render | `DATABASE_URL` | Conexión PostgreSQL mediante el rol `nazareth_app` y TLS. |
| Render | `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` | Configuración de la verificación de identidad. |
| Render | `SUPABASE_SECRET_KEY` | Clave privada necesaria para las operaciones administrativas de Auth y las fotografías en Storage. |
| Render | `DATABASE_SSL_CA_FILE` | Archivo de CA si la conexión requiere un certificado adicional. |

Los archivos `frontend/.env.example` y `backend/.env.example` muestran los nombres de las variables. Los valores privados se configuran en las plataformas y no deben incluirse en Git. `SUPABASE_SECRET_KEY` y `DATABASE_URL` corresponden únicamente al backend.

### Comprobación del sitio publicado

La interfaz publicada se encuentra en [comercial-nazareth-codigo.vercel.app](https://comercial-nazareth-codigo.vercel.app/). La dirección concreta de Render debe consultarse en su panel; no se fija aquí una URL que no se haya contrastado.

Con la API desplegada, la ruta `/api/health` debe responder `{"status":"ok","timezone":"America/Lima"}`. Después se comprueban el inicio y cierre de sesión, los permisos por rol, las operaciones comerciales y la carga de fotografías. Esta lista describe el procedimiento de comprobación, no una certificación de ejecución. Consulta el [informe de verificación de V2](../reportes/verificacion-v2.md) para conocer los resultados demostrados y los controles sin evidencia.

## Comprobaciones

```powershell
npm.cmd --prefix backend test
npm.cmd --prefix frontend test
npm.cmd --prefix frontend run build
Invoke-RestMethod http://127.0.0.1:4000/api/health
```

Para la comprobación con el proyecto alojado, inicia y cierra sesión con los perfiles administrador y cliente, comprueba los permisos en la API y verifica que una cuenta inactiva pierde el acceso. La guía describe el recorrido y los estados HTTP esperados.
