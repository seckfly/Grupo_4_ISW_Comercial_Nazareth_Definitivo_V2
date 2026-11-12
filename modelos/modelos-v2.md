# Modelos de Comercial Nazareth V2

Los modelos describen los módulos, servicios y entidades del sistema. El modelo de clases representa las entidades del dominio y sus relaciones según el esquema y los servicios.

## Despliegue

```mermaid
flowchart LR
    U["Navegador"] --> F["React/Vite en Vercel"]
    U --> A["Supabase Auth"]
    F --> E["API Express en Render"]
    E --> A
    E --> P["PostgreSQL en Supabase"]
    E --> S["Supabase Storage"]
```

El navegador inicia sesión en Supabase Auth. Express valida la identidad y el rol de cada operación protegida y usa PostgreSQL para las operaciones comerciales. El servicio de fotos usa Storage.

La aplicación web se publica en [Vercel](https://comercial-nazareth-codigo.vercel.app/) y la API Express se aloja en Render. La dirección de la API se configura en el frontend mediante `VITE_API_URL`; el backend limita los orígenes admitidos con `CLIENT_ORIGIN`. PostgreSQL conserva los registros comerciales, Supabase Auth administra la identidad y Storage almacena las fotos de productos.

El diagrama muestra la distribución del sistema y las conexiones entre servicios. La [guía técnica](../codigo/GUIA-TECNICA.md#despliegue-web) describe su configuración y el [informe de verificación](../reportes/verificacion-v2.md) registra las pruebas del sistema.

## Casos de uso por rol

![Casos de uso](casos-de-uso.png)

Humberto Dávalos desempeña los roles de vendedor, administrador, responsable de almacén y responsable de compras con una sesión administrativa. El cliente registrado usa su propio perfil. [Diagrama editable](casos-de-uso.drawio) · [Detalle de casos de uso](../docs/CU.md).

## Clases del dominio

![Diagrama de clases de Comercial Nazareth V2](clases.svg)

[Diagrama editable en Draw.io](clases.drawio) · [Esquema comercial](../codigo/database/migrations/001_commercial_schema.sql) · [Relación entre reservas y ventas](../codigo/database/migrations/005_full_scope.sql) · [Beneficios de fidelización](../codigo/database/migrations/013_loyalty_benefits.sql).

El diagrama reúne las 18 entidades principales del dominio. **Producto** conecta ventas, inventario, compras, reservas y catálogo. Las multiplicidades y vínculos corresponden al esquema relacional. Las operaciones representan responsabilidades del dominio realizadas por los servicios de Express; no son necesariamente métodos JavaScript declarados dentro de cada entidad.

## Reserva y recojo

```mermaid
flowchart TD
    P["Solicitud pendiente"] --> Q{"Confirmar y validar stock"}
    Q -->|Disponible| A["Apartado confirmado"]
    Q -->|Insuficiente| P
    A -->|Edición| P
    A -->|Cancelación o vencimiento| L["Liberar disponibilidad"]
    A -->|Recojo| V["Validar cliente y detalle en Caja"]
    V --> T["Confirmar venta, salida y cierre del apartado"]
```

## CU-006 · Gestionar inventario

![Flujograma de gestionar inventario](actividad-gestionar-inventario.png)

[Diagrama editable](actividad-gestionar-inventario.drawio) · [Proceso CU-006](../docs/proceso-critico.md)

## Compra y recepción

```mermaid
flowchart TD
    A{"Vía de registro"} -->|API de órdenes| B["Guardar orden pendiente"]
    B --> C["Registrar recepción parcial o total"]
    A -->|Compras en la interfaz| D["Guardar compra y recepción juntas"]
    C --> E["Actualizar stock, movimiento y costo"]
    D --> E
    E --> F{"Queda saldo por recibir"}
    F -->|Sí| G["Orden pendiente"]
    F -->|No| H["Compra recibida"]
```
