import { useMemo,useState } from 'react'
import { X,Search,Plus,Minus,Trash2,ArrowRight,ScanLine,UserRound,Tag,WalletCards,Banknote,Check,ChevronDown,ShoppingBasket,ShieldCheck,ReceiptText } from 'lucide-react'
import { products } from '../../services/mockData'
import { currency } from '../../utils/format'
import { buildSaleRecord,cartSummary,formatSaleCreatedAt,filterSaleProducts,paymentState,quickCashSuggestions,receiptMarkup } from '../../utils/sale'

const categories=['Todos','Abarrotes','Bebidas','Limpieza','Lácteos','Conservas']

export default function SaleDrawer({close,saleNumber,onCreated}){
  const [cart,setCart]=useState([{...products[0],qty:1}])
  const [query,setQuery]=useState('')
  const [category,setCategory]=useState('Todos')
  const [pay,setPay]=useState('efectivo')
  const [discount,setDiscount]=useState(0)
  const [cash,setCash]=useState('')
  const [operation,setOperation]=useState('')
  const [receipt,setReceipt]=useState(true)
  const [done,setDone]=useState(false)
  const [createdSale,setCreatedSale]=useState(null)
  const summary=cartSummary(cart,discount,pay==='efectivo'?cash:0)
  const payment=paymentState(pay,summary.total,cash,operation)
  const cashOptions=quickCashSuggestions(summary.total)
  const visible=useMemo(()=>filterSaleProducts(products,query).filter(p=>category==='Todos'||p.category===category),[query,category])
  function add(product){setCart(current=>current.some(item=>item.id===product.id)?current.map(item=>item.id===product.id?{...item,qty:Math.min(item.qty+1,product.stock)}:item):[...current,{...product,qty:1}])}
  function quantity(id,delta){setCart(current=>current.map(item=>item.id===id?{...item,qty:Math.max(1,Math.min(item.stock,item.qty+delta))}:item))}
  function selectPay(method){setPay(method);setCash('');setOperation('')}
  function confirmSale(){
    const createdAt=new Date().toISOString()
    const itemLabel=cart.length===1?cart[0].name:cart[0].name+' y '+(cart.length-1)+' más'
    const record=buildSaleRecord({id:saleNumber,items:itemLabel,pay:pay[0].toUpperCase()+pay.slice(1),total:summary.total,createdAt})
    setCreatedSale(record)
    onCreated?.(record)
    setDone(true)
  }
  function printReceipt(){
    const popup=window.open('','nazareth-receipt','width=420,height=720')
    if(!popup)return
    popup.document.write(receiptMarkup({saleNumber:createdSale?.id||String(saleNumber).padStart(5,'0'),createdAt:createdSale?.createdAt,items:cart,summary,payment:pay[0].toUpperCase()+pay.slice(1),cash,change:summary.change||0}))
    popup.document.close()
    popup.focus()
    popup.print()
  }
  if(done)return <div className="drawer-backdrop"><section className="sale-drawer pos-v2"><div className="sale-success premium-success"><span><Check/></span><p className="eyebrow">Venta registrada</p><h2>{currency(summary.total)}</h2><p>El stock se actualizó y el movimiento quedó guardado en caja.</p>{createdSale&&<small>Registrada el {formatSaleCreatedAt(createdSale.createdAt).date} a las {formatSaleCreatedAt(createdSale.createdAt).time}</small>}<div className="success-receipt"><div><span>Venta</span><strong>#{createdSale?.id}</strong></div><div><span>Pago</span><strong>{pay[0].toUpperCase()+pay.slice(1)}</strong></div><div><span>Unidades</span><strong>{summary.units}</strong></div></div><div className="success-actions"><button onClick={printReceipt}><ReceiptText/>Imprimir comprobante</button><button className="primary" onClick={close}>Volver al resumen <ArrowRight/></button></div></div></section></div>
  return <div className="drawer-backdrop" onMouseDown={event=>event.target===event.currentTarget&&close()}><section className="sale-drawer pos-v2">
    <header className="pos-header"><div><p className="eyebrow">Punto de venta · Caja principal</p><h2>Registrar venta</h2></div><div className="pos-progress"><span className="active"><i>1</i>Productos</span><em/><span className={cart.length?'active':''}><i>2</i>Cobro</span><em/><span><i>3</i>Confirmación</span></div><button className="icon-btn" onClick={close}><X/></button></header>
    <div className="drawer-grid pos-grid"><main className="catalog pos-catalog"><div className="pos-tools"><label className="search"><Search/><input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Busca por nombre, categoría o código" autoFocus/><kbd>⌘ K</kbd></label><button className="scan-button"><ScanLine/>Escanear</button></div><div className="pos-categories">{categories.map(item=><button className={category===item?'active':''} onClick={()=>setCategory(item)} key={item}>{item}</button>)}</div><div className="catalog-meta"><div><p className="eyebrow">Catálogo</p><h3>{visible.length} productos disponibles</h3></div><span>Precios con IGV incluido</span></div><div className="catalog-grid pos-products">{visible.map(product=>{const inCart=cart.find(item=>item.id===product.id);return <button key={product.id} onClick={()=>add(product)} className={inCart?'selected':''}><span className="product-letter">{product.name[0]}</span><div><strong>{product.name}</strong><small>{product.category} · <b className={product.stock<5?'stock-critical':''}>{product.stock} en stock</b></small></div><b>{currency(product.price)}</b><span className="add-product">{inCart?<Check/>:<Plus/>}</span></button>})}</div></main>
      <section className="checkout-panel"><div className="checkout-top"><div><p className="eyebrow">Venta #{String(saleNumber).padStart(5,'0')}</p><h3>Detalle del pedido</h3></div><span>{summary.units} {summary.units===1?'unidad':'unidades'}</span></div><button className="customer-select"><UserRound/><div><span>Cliente</span><strong>Venta sin cliente</strong></div><ChevronDown/></button><div className="ticket-lines pos-lines">{cart.length?cart.map(item=><article key={item.id}><span className="line-thumb">{item.name[0]}</span><div><strong>{item.name}</strong><small>{currency(item.price)} c/u</small></div><div className="qty"><button onClick={()=>quantity(item.id,-1)}><Minus/></button><b>{item.qty}</b><button onClick={()=>quantity(item.id,1)}><Plus/></button></div><b>{currency(item.qty*item.price)}</b><button className="trash" onClick={()=>setCart(current=>current.filter(product=>product.id!==item.id))}><Trash2/></button></article>):<div className="empty-cart"><ShoppingBasket/><strong>La venta está vacía</strong><span>Selecciona productos del catálogo para comenzar.</span></div>}</div>
        <div className="discount-row"><Tag/><span>Descuento</span><input type="number" min="0" max={summary.subtotal} value={discount||''} onChange={event=>setDiscount(event.target.value)} placeholder="S/ 0.00"/></div><div className="price-summary"><div><span>Subtotal</span><strong>{currency(summary.subtotal)}</strong></div>{summary.discount>0&&<div className="discount"><span>Descuento</span><strong>− {currency(summary.discount)}</strong></div>}<div className="grand-total"><span>Total a cobrar</span><strong>{currency(summary.total)}</strong></div></div>
        <div className="payment-studio"><div className="ticket-pay pos-pay"><span>Método de pago</span><div>{[['efectivo',Banknote],['yape',WalletCards],['plin',WalletCards]].map(([method,Icon])=><button className={pay===method?'active':''} onClick={()=>selectPay(method)} key={method}><Icon/><span>{method[0].toUpperCase()+method.slice(1)}</span>{pay===method&&<Check/>}</button>)}</div></div>
          {pay==='efectivo'?<div className="cash-studio"><div className="quick-cash"><span>Pago rápido</span><div>{cashOptions.map(amount=><button key={amount} onClick={()=>setCash(amount)}>S/ {amount}</button>)}</div></div><div className="cash-input premium-cash"><label>Monto recibido<input value={cash} onChange={event=>setCash(event.target.value)} type="number" inputMode="decimal" placeholder="S/ 0.00"/></label><div><span>Vuelto para el cliente</span><strong>{currency(summary.change||0)}</strong></div></div></div>:<div className="digital-payment"><div className={`wallet-mark ${pay}`}><WalletCards/><strong>{pay.toUpperCase()}</strong><span>Cobro digital</span></div><label><span>Código de operación</span><input maxLength="6" inputMode="numeric" value={operation} onChange={event=>setOperation(event.target.value.replace(/\D/g,''))} placeholder="6 dígitos"/></label></div>}
          <button className={`receipt-toggle ${receipt?'active':''}`} onClick={()=>setReceipt(!receipt)}><ReceiptText/><div><strong>Emitir comprobante</strong><span>Ticket de venta al confirmar</span></div><i>{receipt?<Check/>:null}</i></button>
          <div className={`payment-status ${payment.ready?'ready':'pending'}`}><ShieldCheck/><div><strong>{payment.ready?'Cobro listo para confirmar':'Completa el cobro'}</strong><span>{payment.message}</span></div></div>
        </div>
        <button disabled={!cart.length||!payment.ready} className="confirm pos-confirm" onClick={confirmSale}><span>Confirmar venta</span><strong>{currency(summary.total)}</strong><i><ArrowRight/></i></button><small className="checkout-help">Al confirmar, el inventario se descuenta automáticamente.</small>
      </section></div>
  </section></div>
}
