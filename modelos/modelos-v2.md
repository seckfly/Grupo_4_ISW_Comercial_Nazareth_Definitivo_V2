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

## Casos de uso por rol

![Casos de uso](casos-de-uso.png)

Humberto Dávalos desempeña los roles de vendedor, administrador, responsable de almacén y responsable de compras con una sesión administrativa. El cliente registrado usa su propio perfil. [Diagrama editable](casos-de-uso.drawio) · [Detalle de casos de uso](../docs/CU.md).

## Clases del dominio

La venta sirve de punto de partida para leer el modelo. Cada venta guarda sus líneas con el producto, la cantidad y el precio aplicado. Al confirmarla, el sistema actualiza el stock y registra los movimientos de salida. El cliente se vincula si se identifica en Caja.

```mermaid
classDiagram
    direction LR
    class LineaVenta["Línea de venta"]
    class MovimientoInventario["Movimiento de inventario"]
    Cliente "0..1" -- "0..*" Venta : se vincula
    Venta "1" -- "1..*" LineaVenta : contiene
    Producto "1" -- "0..*" LineaVenta : figura en
    Venta "0..1" -- "1..*" MovimientoInventario : genera salidas
    Producto "1" -- "0..*" MovimientoInventario : conserva historial
```

En compras, la orden indica qué se espera recibir y la recepción registra lo que entró al inventario. En reservas, la confirmación aparta unidades y el recojo enlaza la reserva con una venta. Estos recorridos se muestran en los flujos de esta página.

<details>
<summary>Modelo de dominio completo</summary>

![Diagrama completo de clases](clases.png)

El modelo agrupa entidades persistidas, sus atributos principales y sus relaciones. Las líneas de venta, de reserva y de orden guardan el detalle por producto. Consulta el [diagrama editable](clases.drawio), el [esquema comercial](../codigo/database/migrations/001_commercial_schema.sql), los [vínculos entre reservas y ventas](../codigo/database/migrations/005_full_scope.sql) y la [migración de beneficios](../codigo/database/migrations/013_loyalty_benefits.sql).

</details>

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
