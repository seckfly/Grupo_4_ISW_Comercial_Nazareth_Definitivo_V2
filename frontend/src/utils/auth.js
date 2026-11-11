export function visibleNavigation(role) { return role === 'admin' ? ['Resumen','Ventas','Inventario','Promociones','Clientes','Reportes','Configuración'] : ['Resumen','Productos','Promociones','Mi hogar','Mi cuenta'] }
const COMMANDS=[
  {page:'Resumen',label:'Ir al resumen',hint:'Vista general del negocio'},
  {page:'Productos',label:'Explorar productos',hint:'Catálogo, precios y favoritos'},
  {page:'Mi hogar',label:'Abrir mi hogar',hint:'Reposición, presupuesto y planificación'},
  {page:'Ventas',label:'Abrir ventas',hint:'Movimientos y caja'},
  {page:'Inventario',label:'Revisar inventario',hint:'Stock, costos y márgenes'},
  {page:'Promociones',label:'Ver promociones',hint:'Ofertas activas y programadas'},
  {page:'Clientes',label:'Buscar clientes',hint:'Frecuencia e historial'},
  {page:'Reportes',label:'Abrir reportes',hint:'Ventas, margen y rotación'},
  {page:'Configuración',label:'Administrar credenciales',hint:'Usuarios y seguridad'},
  {page:'Mi cuenta',label:'Abrir mi cuenta',hint:'Datos y preferencias'},
]
export function searchCommands(query,role){const allowed=visibleNavigation(role);const normalized=query.trim().toLowerCase();return COMMANDS.filter(c=>allowed.includes(c.page)&&(!normalized||`${c.page} ${c.label} ${c.hint}`.toLowerCase().includes(normalized)))}
export function loyaltyProgress(points,target){const safeTarget=Math.max(1,target);return {percent:Math.min(100,Math.round(points/safeTarget*100)),remaining:Math.max(0,safeTarget-points)}}
