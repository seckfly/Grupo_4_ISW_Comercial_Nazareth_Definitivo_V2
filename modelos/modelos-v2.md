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

## Casos de uso por perfil

![Casos de uso](casos-de-uso.png)

El administrador realiza ventas, inventario, compras, promociones y gestión de credenciales. El cliente consulta el catálogo, solicita o cancela su reserva y usa Mi cuenta. Ambos perfiles pueden gestionar su propia cuenta según sus permisos. [Detalle de casos de uso](../docs/CU.md).

## Clases del dominio

![Diagrama de clases](clases.png)

[Diagrama editable](clases.drawio). Las clases representan el dominio persistido. Las asociaciones se contrastaron con el [esquema comercial](../codigo/database/migrations/001_commercial_schema.sql), los vínculos de [reservas y ventas](../codigo/database/migrations/005_full_scope.sql) y la migración de [beneficios](../codigo/database/migrations/013_loyalty_benefits.sql).

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

## Gestionar inventario

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
