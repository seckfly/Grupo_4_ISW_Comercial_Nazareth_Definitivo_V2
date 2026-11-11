const round=value=>Number(value.toFixed(2))
export function cartSummary(items,discount=0,cashReceived=0){const units=items.reduce((sum,item)=>sum+Number(item.qty),0);const subtotal=round(items.reduce((sum,item)=>sum+Number(item.qty)*Number(item.price),0));const safeDiscount=Math.min(subtotal,Math.max(0,Number(discount)||0));const total=round(subtotal-safeDiscount);const summary={units,subtotal,discount:round(safeDiscount),total};if(Number(cashReceived)>0)summary.change=round(Math.max(0,Number(cashReceived)-total));return summary}
export function filterSaleProducts(products,query){const term=query.trim().toLowerCase();if(!term)return products;return products.filter(product=>`${product.name} ${product.category} ${product.sku||''}`.toLowerCase().includes(term))}
export function paymentState(method,total,cashReceived=0,operation=''){
  if(method==='efectivo'){
    const missing=Math.max(0,Number(total)-(Number(cashReceived)||0))
    return missing>0?{ready:false,message:`Faltan S/ ${missing.toFixed(2)}`}:{ready:true,message:'Cobro listo'}
  }
  return /^\d{6}$/.test(String(operation).trim())?{ready:true,message:'Cobro listo'}:{ready:false,message:'Ingresa los 6 dígitos'}
}
export function quickCashSuggestions(total){
  const amount=Number(total)||0
  const denominations=[10,20,50,100,200]
  return denominations.filter(value=>value>=amount).slice(0,3)
}
const money=value=>`S/ ${Number(value||0).toFixed(2)}`
export function receiptMarkup({saleNumber,items,summary,payment,cash=0,change=0}){
  const lines=items.map(item=>`<tr><td>${item.qty}× ${item.name}</td><td>${money(item.qty*item.price)}</td></tr>`).join('')
  return `<!doctype html><html><head><title>Comprobante ${saleNumber}</title><style>body{font:13px ui-monospace,monospace;width:290px;margin:24px auto;color:#17251c}h1{font-size:18px;text-align:center;margin:0}header p{text-align:center;margin:5px 0}hr{border:0;border-top:1px dashed #777;margin:14px 0}table{width:100%;border-collapse:collapse}td{padding:5px 0}td:last-child{text-align:right}.total{font-size:17px;font-weight:700}.meta{display:flex;justify-content:space-between;margin:5px 0}.thanks{text-align:center;margin-top:18px}@media print{body{margin:0 auto}}</style></head><body><header><h1>COMERCIAL NAZARETH</h1><p>Ascope · La Libertad</p><p>Venta #${saleNumber}</p></header><hr/><table>${lines}</table><hr/><div class="meta"><span>Subtotal</span><b>${money(summary.subtotal)}</b></div>${summary.discount?`<div class="meta"><span>Descuento</span><b>− ${money(summary.discount)}</b></div>`:''}<div class="meta total"><span>TOTAL</span><b>${money(summary.total)}</b></div><hr/><div class="meta"><span>Pago</span><b>${payment}</b></div>${payment==='Efectivo'?`<div class="meta"><span>Recibido</span><b>${money(cash)}</b></div><div class="meta"><span>Vuelto</span><b>${money(change)}</b></div>`:''}<p class="thanks">Gracias por comprar en Nazareth</p></body></html>`
}

export function buildSaleRecord({id,items,pay,total,createdAt=new Date().toISOString()}){
  return {id:String(id).padStart(5,'0'),items,pay,total:Number(total),createdAt}
}

export function formatSaleCreatedAt(createdAt){
  const value=new Date(createdAt)
  return {
    date:new Intl.DateTimeFormat('es-PE',{timeZone:'America/Lima',day:'numeric',month:'long',year:'numeric'}).format(value),
    time:new Intl.DateTimeFormat('es-PE',{timeZone:'America/Lima',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).format(value)
  }
}
