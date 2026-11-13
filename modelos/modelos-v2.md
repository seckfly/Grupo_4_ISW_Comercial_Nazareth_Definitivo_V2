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

Humberto Dávalos desempeña los roles de vendedor, administrador, responsable de almacén y responsable de compras con una sesión administrativa. El cliente registrado usa su propio perfil. El diagrama general reúne CU-001 a CU-013 dentro del límite del sistema, con los actores fuera de él. [Diagrama general editable](casos-de-uso.drawio) · [Detalle de los 13 casos de uso](../docs/CU.md).

### Sesión y consultas administrativas

![Diagrama UML de CU-011, CU-012 y CU-013](casos-de-uso-sesion-consultas.svg)

[Diagrama editable de CU-011 a CU-013](casos-de-uso-sesion-consultas.drawio).

## Clases del dominio

![Diagrama de clases de Comercial Nazareth V2](clases.svg)

[Diagrama editable en Draw.io](clases.drawio) · [PNG para el informe](clases.png) · [Esquema comercial](../codigo/database/migrations/001_commercial_schema.sql) · [Relación entre reservas y ventas](../codigo/database/migrations/005_full_scope.sql) · [Beneficios de fidelización](../codigo/database/migrations/013_loyalty_benefits.sql).

El diagrama reúne las 18 entidades principales del dominio. **Producto** conecta ventas, inventario, compras, reservas y catálogo. Las multiplicidades reflejan el esquema y las reglas de negocio, incluido el límite de una a tres líneas por reserva (RF-009). La dependencia de Venta hacia Promoción expresa el uso del precio vigente (BR-002). Las firmas tipadas representan responsabilidades del dominio realizadas por los servicios de Express.

La [matriz de trazabilidad](../matrices/trazabilidad.md#requisitos-funcionales) cita los identificadores `CLS-…` de la fuente editable. Las consultas de clientes y reportes se trazan a las entidades que aportan sus datos y a los servicios enlazados en [alcance y evidencia](../docs/alcance-y-evidencia.md).

El informe final (§4) y el diagrama del repositorio muestran 18 clases. `CLS-ProductoEnLista` representa la asociación entre una lista y un producto y se vincula con RF-007.

### Evolución del modelo

| Decisión | Modelo de v1.0 | Modelo V2 | Efecto |
|---|---|---|---|
| Separar categoría e historial de inventario | Producto concentraba la categoría como texto y las operaciones de stock. | `CLS-Categoria` agrupa productos y `CLS-MovimientoInventario` registra la variación y el historial. | Cada movimiento conserva el contexto del ajuste de RF-015. Producto sigue siendo el punto de enlace con ventas y compras. |
| Separar lista y favoritos | Una clase de lista usaba un tipo para distinguir los dos usos. | `CLS-ListaProductos`, `CLS-ProductoEnLista` y `CLS-Favorito` reflejan las estructuras de persistencia. | Las operaciones de RF-007 pueden conservar favoritos al limpiar Mi lista después de una reserva. |

La comparación usa el [modelo de v1.0](https://github.com/seckfly/Grupo_4_ISW_Comercial_Nazareth_Definitivo_V2/blob/v1.0/modelos/clases.drawio), el [modelo V2](clases.drawio) y las [pruebas de integración](../codigo/backend/test/sales.integration.test.js).

## Reserva y recojo

```mermaid
flowchart TD
    P["Solicitud pendiente"] --> Q{"Confirmar y validar stock"}
    Q -->|Disponible| A["Apartado confirmado"]
    Q -->|Insuficiente| E["Rechazar confirmación y conservar la solicitud"]
    E --> P
    P -->|Rechazo, cancelación o vencimiento| X["Cerrar solicitud sin unidades apartadas"]
    A -->|Edición| P
    A -->|Cancelación o vencimiento| L["Liberar disponibilidad"]
    A -->|Recojo| V["Validar cliente y detalle en Caja"]
    V -->|Datos válidos| T["Confirmar venta, salida y cierre del apartado"]
    V -->|Datos inválidos| A
    T -->|Fallo de guardado| R["Revertir venta, salida y cierre"]
    R --> A
```

## CU-006 · Gestionar inventario

![Flujograma de gestionar inventario](actividad-gestionar-inventario.png)

[Diagrama editable](actividad-gestionar-inventario.drawio) · [Fuente en XML](actividad-gestionar-inventario.xml) · [Proceso CU-006](../docs/proceso-critico.md)

El flujograma de inventario usa carriles para distinguir las tareas del operador de las validaciones y escrituras del sistema.

### Secuencia del ajuste manual

```mermaid
sequenceDiagram
    actor H as Responsable de almacén
    participant I as Inventario
    participant A as API Express
    participant D as PostgreSQL
    H->>I: Ingresar variación y motivo
    I->>A: Solicitar ajuste de CLS-Producto
    A->>A: Comprobar sesión, rol y datos
    alt Solicitud válida
        A->>D: Iniciar transacción y bloquear producto
        A->>D: Verificar estado y unidades apartadas
        alt Ajuste permitido y guardado correcto
            A->>D: Actualizar stock y registrar CLS-MovimientoInventario
            A->>D: Confirmar transacción
            A-->>I: Confirmar ajuste
        else Ajuste rechazado o fallo de escritura
            A->>D: Revertir transacción
            A-->>I: Informar rechazo o fallo
        end
    else Solicitud inválida o sin autorización
        A-->>I: Informar rechazo
    end
    I-->>H: Mostrar resultado
```

La secuencia relaciona `ajustarStock(delta, motivo)` y `registrarAjuste(delta, motivo)` del modelo con el [servicio de inventario](../codigo/backend/src/services/inventoryService.js) y PRU-016 a PRU-019.

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
