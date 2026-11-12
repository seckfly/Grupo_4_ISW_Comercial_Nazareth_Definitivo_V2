# Comercial Nazareth · Definitivo V2

Grupo 4 · Ingeniería de Software

Sistema de gestión de ventas, inventario, compras y portal de clientes. La carpeta [codigo](codigo/) reúne el backend, la base de datos, el frontend y los módulos compartidos. En [docs/](docs/) están los requisitos, los casos de uso y el registro de cambios.

## Documentación de la entrega

| Documento | Contenido |
|---|---|
| [SRS de V2](docs/SRS.md) | 19 requisitos funcionales, 7 no funcionales y 14 reglas de negocio. |
| [Casos de uso](docs/CU.md) | Flujos de venta, catálogo, promociones, reservas, inventario y compras. |
| [Modelos](modelos/modelos-v2.md) | Despliegue, clases del dominio, casos de uso y flujos de operación. |
| [Matriz de trazabilidad](matrices/trazabilidad.md) | Relaciones entre requisitos, reglas, pruebas y solicitudes de cambio. |
| [Impacto CR](matrices/impacto-cr.md) y [Riesgos CR](matrices/riesgos-cr.md) | Evaluación de todas las solicitudes de cambio. |
| [Pruebas](pruebas/pruebas.md) | Escenarios de aceptación y referencias de evidencia. |
| [Registro de cambios](docs/cambios-v2.md) | Solicitudes de cambio CR-001 a CR-011. |
| [Informe de verificación](reportes/verificacion-v2.md) | Resultados locales y comprobaciones en el entorno publicado. |

## Publicación web

La aplicación está disponible en [Comercial Nazareth (Vercel)](https://comercial-nazareth-codigo.vercel.app/). La interfaz React/Vite se publica en Vercel y la API Node.js/Express se aloja en Render. Supabase proporciona PostgreSQL, autenticación y almacenamiento de fotografías de productos.

El navegador inicia sesión mediante Supabase Auth y envía su token a la API. Express comprueba el acceso y realiza las operaciones sobre la base de datos. El frontend usa `VITE_API_URL` para localizar la API y Render utiliza `CLIENT_ORIGIN` para permitir las solicitudes desde el sitio web.

La [guía técnica](codigo/GUIA-TECNICA.md#despliegue-web) explica la configuración de los servicios. El [informe de verificación](reportes/verificacion-v2.md) distingue las pruebas ejecutadas de los controles sin evidencia de ejecución.

## Cierre de la entrega

La entrega académica V2 se considera cerrada a nivel de implementación y documentación. El [tablero Kanban](https://trello.com/b/9LEaT3KG/comercial-nazareth-kanban-v2) reúne las tareas de desarrollo y el cierre administrativo del seguimiento. Este cierre no equivale a la aprobación de todas las pruebas: las comprobaciones sin evidencia de ejecución permanecen identificadas en el [informe de verificación](reportes/verificacion-v2.md).

## Ejecución

La [guía técnica](codigo/GUIA-TECNICA.md) describe la instalación, las migraciones, el arranque y las pruebas.

## Integrantes

| Integrante | Código |
|---|---|
| Marco Antonio Martell Alvarez | N00471929 |
| Alejandro Horna Quezada | N00475530 |
| Isaí Samuel Bejarano Benites | N00490010 |
| Cesar Jeremin Alonso Chuquimango Reyes | N00480808 |
| Alonso Castillo Davalos | N00491764 |
