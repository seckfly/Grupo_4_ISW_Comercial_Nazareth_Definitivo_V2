# Alcance y evidencia de Definitivo V2

La versión cubre ventas, inventario, compras, promociones, reservas, beneficios y administración de accesos. El [SRS](SRS.md) y los [casos de uso](CU.md) describen qué operaciones están disponibles para cada perfil.

| Área | Requisitos | Evidencia de implementación | Escenarios relacionados |
|---|---|---|---|
| Caja y clientes | RF-001, RF-010, RF-011, RF-012 | [Código](../codigo/backend/src/services/saleService.js) | PRU-001, PRU-003, PRU-004, PRU-012, PRU-013, PRU-020 |
| Inventario y productos | RF-002, RF-015, RF-016 | [Código](../codigo/backend/src/services/inventoryService.js) | PRU-002, PRU-016 a PRU-019, PRU-027 y PRU-028 |
| Compras | RF-003 a RF-005 | [Código](../codigo/backend/src/services/purchaseService.js) | PRU-005, PRU-006, PRU-008 y PRU-025 |
| Catálogo y promociones | RF-007 y RF-008 | [Código](../codigo/backend/src/services/promotionService.js) | PRU-007 y PRU-010 |
| Reservas | RF-009 | [Código](../codigo/backend/src/services/reservationService.js) | PRU-011 y PRU-024 |
| Accesos y retiro | RF-006, RF-013, RF-019 | [Código](../codigo/backend/src/services/userService.js) | PRU-009, PRU-014, PRU-033 y PRU-034 |
| Contacto, contraseña y beneficios | RF-014, RF-017, RF-018 | [Código](../codigo/frontend/src/pages/Account/index.jsx) | PRU-015, PRU-029 a PRU-031 |

Los escenarios son criterios de verificación. El [cierre de requisitos](cierre-requisitos.md) registra qué se comprobó en el entorno local y qué queda por ejecutar en el despliegue.
