# CU-006 · Gestionar inventario

El administrador consulta stock físico, apartado y disponible, revisa las alertas y mantiene el historial de movimientos. El umbral de alerta se compara con el stock físico del producto activo.

Para ajustar el inventario, el administrador selecciona un producto e ingresa la cantidad y el motivo. El servicio rechaza motivos vacíos o compuestos de espacios y comprueba que el saldo no sea inferior a las unidades apartadas. La actualización del stock y el movimiento se guardan en una sola transacción. Los casos PRU-016 a PRU-019 cubren el motivo y la reversión. PRU-024 incluye la protección del stock apartado.

La reposición se registra desde Compras. La entrada de mercadería se produce con el ingreso directo o con la recepción de una orden pendiente.

[Flujo de ajuste de V2](../../modelos/modelos-v2.md#ajuste-de-inventario) · [CU-006](CU.md#cu-006-gestionar-inventario) · [Pruebas](../../pruebas/pruebas.md).
