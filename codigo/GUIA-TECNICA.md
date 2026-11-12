# Comercial Nazareth

Sistema de gestión comercial y portal de clientes con React/Vite, Express, PostgreSQL alojado en Supabase y Supabase Auth.

La [especificación aprobada](docs/SRS.md) define el alcance y los identificadores. [CR-002](docs/cambios/CR-002-migracion-supabase.md) registra el cambio de tecnología en esta implementación.

La [correspondencia completa de requisitos y evidencia](docs/cierre-requisitos.md) distingue implementación, pruebas aisladas y verificaciones alojadas pendientes. Para Compras, Reservas, fotos y contraseña propia, aplicar la [configuración del alcance completo](database/CONFIGURACION-ALCANCE-COMPLETO.md), incluidas las migraciones nuevas 005 y 006. No se aplicaron a la base de trabajo durante las pruebas.

## Instalación

La versión comprobada se indica en `.node-version`. Se requiere Node.js 22 o superior. Desde la carpeta `codigo/`, en PowerShell:

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

## Comprobaciones

```powershell
npm.cmd --prefix backend test
npm.cmd --prefix frontend test
npm.cmd --prefix frontend run build
Invoke-RestMethod http://127.0.0.1:4000/api/health
```

Para la comprobación con el proyecto alojado, inicia y cierra sesión con los perfiles administrador y cliente, comprueba los permisos en la API y verifica que una cuenta inactiva pierde el acceso. La guía describe el recorrido y los estados HTTP esperados.
