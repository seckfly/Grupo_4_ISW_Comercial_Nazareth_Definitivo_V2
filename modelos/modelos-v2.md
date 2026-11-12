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

```mermaid
flowchart TB
    A["Administrador"] --> C["Caja y clientes · CU-001/002"]
    A --> I["Inventario y promociones · CU-006/004"]
    A --> P["Compras y recepciones · CU-008/009"]
    A --> R["Confirmar apartado y gestionar recojo · CU-005"]
    U["Cliente"] --> K["Consultar catálogo · CU-003"]
    U --> S["Solicitar separación · CU-005"]
    U --> B["Consultar cuenta y reclamar beneficio"]
    A --> M["Cambiar contraseña propia"]
    U --> M
    R --> C
```

## Clases del dominio

```mermaid
classDiagram
    Perfil "1" -- "0..1" Cliente
    Cliente "0..1" -- "0..*" Venta
    Cliente "1" -- "0..*" Reserva
    Cliente "1" -- "0..*" Beneficio
    Cliente "1" -- "0..1" PreferenciasCliente
    Reserva "0..1" -- "0..1" Venta
    Beneficio "0..1" -- "0..1" Venta
    Venta "1" -- "1..*" LineaVenta
    Reserva "1" -- "1..*" LineaReserva
    Producto "1" -- "0..*" LineaVenta
    Producto "1" -- "0..*" LineaReserva
    Producto "1" -- "0..*" Promocion
    Producto "1" -- "0..*" MovimientoInventario
    OrdenCompra "1" -- "1..*" LineaOrden
    Producto "1" -- "0..*" LineaOrden
    OrdenCompra "1" -- "0..*" Recepcion
    Recepcion "1" -- "1..*" LineaRecepcion
    LineaOrden "1" -- "0..*" LineaRecepcion
    Venta "0..1" -- "0..*" MovimientoInventario
    Recepcion "0..1" -- "0..*" MovimientoInventario
```

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

## Ajuste de inventario

```mermaid
flowchart TD
    A["Ingresar cantidad y motivo"] --> B{"Motivo válido y saldo suficiente"}
    B -->|Sí| C["Guardar stock y movimiento"]
    B -->|No| D["Rechazar ajuste"]
    C --> E["Mostrar historial y stock resultante"]
```

La validación del saldo protege las unidades apartadas. La alerta se calcula con el stock físico y el mínimo del producto activo.

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
