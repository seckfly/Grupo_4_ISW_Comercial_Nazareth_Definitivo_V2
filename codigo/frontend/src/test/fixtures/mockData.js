export const products=[
  {id:1,name:'Arroz Costeño 1 kg',category:'Abarrotes',stock:28,cost:3.8,price:4.8,sold:42,sku:'ABA-001',image:'/products/arroz.jpg',badge:'Más comprado'},
  {id:2,name:'Aceite Primor 900 ml',category:'Abarrotes',stock:4,cost:8.2,price:10.5,sold:31,sku:'ABA-014',image:'/products/aceite.jpg',badge:'Últimas unidades'},
  {id:3,name:'Azúcar rubia 1 kg',category:'Abarrotes',stock:16,cost:3.2,price:4.2,sold:29,sku:'ABA-007',image:'/products/abarrotes.jpg'},
  {id:4,name:'Inca Kola 1.5 L',category:'Bebidas',stock:3,cost:5.5,price:7,sold:38,sku:'BEB-003',image:'/products/bebidas.jpg',badge:'15% menos'},
  {id:5,name:'Leche Gloria evaporada',category:'Lácteos',stock:22,cost:3.4,price:4.5,sold:35,sku:'LAC-002',image:'/products/conservas.jpg'},
  {id:6,name:'Atún Florida',category:'Conservas',stock:12,cost:5,price:6.8,sold:17,sku:'CON-005',image:'/products/conservas.jpg'},
  {id:7,name:'Detergente Bolívar 780 g',category:'Limpieza',stock:7,cost:8.4,price:10.9,sold:14,sku:'LIM-009',image:'/products/abarrotes.jpg'},
  {id:8,name:'Lejía Clorox 680 ml',category:'Limpieza',stock:2,cost:3,price:4.2,sold:12,sku:'LIM-011',image:'/products/abarrotes.jpg',badge:'Pocas unidades'}
]
export const salesTrend=[{d:'Lun',v:386},{d:'Mar',v:442},{d:'Mié',v:398},{d:'Jue',v:521},{d:'Vie',v:478},{d:'Sáb',v:682},{d:'Hoy',v:547}]
export const monthTrend=Array.from({length:30},(_,i)=>({d:`${i+1}`,v:310+((i*71)%290)}))
export const transactions=[{id:'00184',time:'12:42',items:'Arroz, aceite y 2 más',pay:'Yape',total:38.4},{id:'00183',time:'11:58',items:'Leche Gloria × 3',pay:'Efectivo',total:13.5},{id:'00182',time:'11:21',items:'Inca Kola, azúcar',pay:'Plin',total:11.2},{id:'00181',time:'10:46',items:'Detergente Bolívar',pay:'Efectivo',total:10.9},{id:'00180',time:'09:35',items:'Atún Florida × 2',pay:'Yape',total:13.6}]
export const customers=[{name:'Rosa Castillo',visits:24,spent:487.5,last:'Hoy',favorite:'Arroz y leche',initials:'RC',phone:'987 654 321'},{name:'Carlos Méndez',visits:18,spent:329.8,last:'Hace 2 días',favorite:'Bebidas',initials:'CM',phone:'945 123 890'},{name:'Julia Reyes',visits:11,spent:216.4,last:'Hace 5 días',favorite:'Limpieza',initials:'JR',phone:'Sin teléfono'},{name:'Mateo Salazar',visits:9,spent:184.7,last:'Hace 1 semana',favorite:'Conservas',initials:'MS',phone:'972 481 230'}]
export const promotions=[{product:'Inca Kola 1.5 L',discount:'15%',status:'Activa',range:'25 ago — 31 ago',sales:18,revenue:126},{product:'Detergente Bolívar',discount:'S/ 2.00',status:'Programada',range:'1 sep — 7 sep',sales:0,revenue:0},{product:'Atún Florida',discount:'10%',status:'Finalizada',range:'10 ago — 16 ago',sales:13,revenue:84}]
