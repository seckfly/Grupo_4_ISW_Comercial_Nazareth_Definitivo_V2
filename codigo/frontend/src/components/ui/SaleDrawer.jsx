import { useEffect, useMemo, useRef, useState } from 'react'
import { X, Search, Plus, Trash2, ArrowRight, ArrowLeft, UserRound, Tag, WalletCards, Banknote, Check, ChevronDown, ShoppingBasket, ShieldCheck, ReceiptText } from 'lucide-react'
import { api } from '../../services/api'
import AmountInput from './AmountInput'
import { currency, countLabel, quantityLabel } from '../../utils/format'
import { formatSaleCreatedAt, filterSaleProducts, paymentState, quickCashSuggestions, receiptMarkup } from '../../utils/sale'
import { decimalUnits, decimalText, MONEY_MAX_UNITS } from '../../../../shared/numbers.mjs'
import DecimalInput from './DecimalInput'
import { Skeleton, EmptyState } from './States'

import { digitalPaymentMethods, paymentNames } from '../../../../shared/paymentMethods.mjs'
import { loyalty } from '../../../../shared/loyalty.mjs'
import { usePhoneLayout } from '../../hooks/usePhoneLayout'

function quantityUnits(value) {
  try { return decimalUnits(value) } catch { return 0 }
}

export default function SaleDrawer({ close, onCreated, reservation = null }) {
  const phone = usePhoneLayout()
  const [step, setStep] = useState(reservation ? 'payment' : 'products')
  const phonePayment = phone && step === 'payment'
  const phoneProducts = phone && step === 'products'
  const stepHeading = useRef(null)
  const catalogHeading = useRef(null)
  const grid = useRef(null)
  const [products, setProducts] = useState([])
  const [catalogLoading, setCatalogLoading] = useState(true)
  const [catalogError, setCatalogError] = useState('')
  const [cart, setCart] = useState(()=>reservation?reservation.items.map(item=>({...item,id:item.productId,qty:String(item.quantity),price:item.price,stock:item.quantity})):[])
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('Todos')
  const [pay, setPay] = useState('efectivo')
  const [discount, setDiscount] = useState('')
  const [cash, setCash] = useState('')
  const [verified,setVerified]=useState(false)
  const [receipt, setReceipt] = useState(true)
  const [createdSale, setCreatedSale] = useState(null)
  const [quote, setQuote] = useState(null)
  const [quoteError, setQuoteError] = useState('')
  const [quoting, setQuoting] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [refresh, setRefresh] = useState(0)
  const [requestId, setRequestId] = useState(() => crypto.randomUUID())
  const [choosingCustomer, setChoosingCustomer] = useState(false)
  const [customer, setCustomer] = useState(()=>reservation?{id:reservation.customer_id,name:reservation.customerName}:null)
  const [benefits, setBenefits] = useState([])
  const [selectedBenefit, setSelectedBenefit] = useState('')
  const [benefitError, setBenefitError] = useState('')
  const [customerQuery, setCustomerQuery] = useState('')
  const [customers, setCustomers] = useState([])
  const [customerError, setCustomerError] = useState('')
  const [searching, setSearching] = useState(false)
  const submitting = useRef(false)
  const dialog = useRef(null)

  useEffect(() => {
    const previousFocus = document.activeElement
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    dialog.current?.focus()
    return () => { document.body.style.overflow = overflow; previousFocus?.focus() }
  }, [])

  useEffect(() => {
    if (!phone) return
    if (grid.current) grid.current.scrollTop = 0
    const heading = phonePayment ? stepHeading.current : catalogHeading.current
    heading?.focus({ preventScroll: true })
  }, [phone, phonePayment])

  useEffect(() => {
    let active = true
    setCatalogLoading(true)
    setCatalogError('')
    api.products().then((rows) => {
      if (active) setProducts(rows.map((product) => ({ id: product.id, name: product.name, unit: product.unit, category: product.category, price: product.sale_price, stock: Number(product.current_stock)+Number(reservation?.items.find(item=>item.productId===product.id)?.quantity||0), imageUrl:product.image_url,sku: String(product.id) })))
    }).catch((error) => { if (active) setCatalogError(error.message) })
      .finally(() => { if (active) setCatalogLoading(false) })
    return () => { active = false }
  }, [refresh])

  const customerId = customer?.id ?? null
  const benefitId = benefits.some(benefit => benefit.id === selectedBenefit) ? selectedBenefit : undefined

  useEffect(() => {
    if (!customerId || createdSale) return
    const controller = new AbortController()
    setBenefitError('')
    api.saleBenefits(customerId, controller.signal).then(rows => {
      if (controller.signal.aborted) return
      setBenefits(rows)
      setSelectedBenefit(current => rows.some(benefit => benefit.id === current) ? current : '')
    }).catch(error => {
      if (!controller.signal.aborted) setBenefitError(error.message)
    })
    return () => controller.abort()
  }, [customerId, refresh, createdSale])

  const cartPayload = JSON.stringify(cart.map((item) => ({ productId: item.id, quantity: item.qty })))
  const quoteKey = JSON.stringify([cartPayload, discount, benefitId])
  useEffect(() => {
    setQuote(null)
    setQuoteError('')
    if (!JSON.parse(cartPayload).length || createdSale) { setQuoting(false); return }
    const controller = new AbortController()
    setQuoting(true)
    const timer = setTimeout(() => {
      api.quoteSale({ items: JSON.parse(cartPayload), discount: discount || '0', reservationId: reservation?.id, ...(benefitId ? { benefitId, customerId } : {}) }, controller.signal)
        .then((result) => setQuote({ ...result, inputKey: quoteKey })).catch((error) => { if (!controller.signal.aborted) setQuoteError(error.message) })
        .finally(() => { if (!controller.signal.aborted) setQuoting(false) })
    }, 180)
    return () => { clearTimeout(timer); controller.abort() }
  }, [cartPayload, discount, benefitId, customerId, quoteKey, refresh, createdSale, reservation?.id])

  useEffect(() => {
    const controller = new AbortController()
    setCustomers([])
    setCustomerError('')
    if (!choosingCustomer || !customerQuery.trim()) { setSearching(false); return }
    setSearching(true)
    const timer = setTimeout(() => {
      api.saleCustomers(customerQuery, controller.signal).then(setCustomers)
        .catch((error) => { if (!controller.signal.aborted) setCustomerError(error.message) })
        .finally(() => { if (!controller.signal.aborted) setSearching(false) })
    }, 200)
    return () => { clearTimeout(timer); controller.abort() }
  }, [choosingCustomer, customerQuery])

  function changed() { setRequestId(crypto.randomUUID()); setError('') }
  function chooseCustomer(next) {
    changed()
    if (next?.id !== customer?.id) {
      setBenefits([])
      setSelectedBenefit('')
      setBenefitError('')
    }
    setCustomer(next)
    setChoosingCustomer(false)
  }
  function add(product) {
    const available = decimalUnits(product.stock)
    if (!available || busy) return
    changed()
    setCart((current) => {
      const found = current.find((item) => item.id === product.id)
      if (!found) return [...current, { ...product, qty: decimalText(Math.min(100, available)) }]
      const next = quantityUnits(found.qty) + 100
      if (next > available) return current
      return current.map((item) => item.id === product.id ? { ...item, qty: decimalText(next) } : item)
    })
  }
  function quantity(id, value) {
    changed()
    setCart((current) => current.map((item) => item.id === id ? { ...item, qty: value } : item))
  }
  function selectPay(method) { changed(); setPay(method); setCash(''); setVerified(false) }

  const categories = ['Todos', ...new Set(products.map((product) => product.category))]
  const visible = useMemo(() => filterSaleProducts(products, query).filter((product) => category === 'Todos' || product.category === category), [products, query, category])
  const payment = quote ? paymentState(pay, quote.total, cash, verified) : { ready: false, message: 'Espera el cálculo del servicio' }
  const quoteCurrent = quote && quote.inputKey === quoteKey && !quoting && !quoteError
  const invalidCart = cart.some((item) => quantityUnits(item.qty) <= 0 || quantityUnits(item.qty) > decimalUnits(products.find((product) => product.id === item.id)?.stock ?? item.stock))

  async function confirmSale(event) {
    event.preventDefault()
    if (phoneProducts || submitting.current || !quoteCurrent || invalidCart || !payment.ready) return
    submitting.current = true
    setBusy(true)
    setError('')
    try {
      const sale = await api.createSale({
        items: JSON.parse(cartPayload), discount: discount || '0', customerId, benefitId,
        paymentMethod: pay, cashReceived: cash, digitalReceived: cash, paymentConfirmed: verified,
        requestId, quoteId: quote.quoteId,reservationId:reservation?.id,
      })
      setCreatedSale(sale)
      onCreated?.(sale)
    } catch (error) {
      setError(error.message)
      if (error.status === 409) { setRefresh((value) => value + 1); setRequestId(crypto.randomUUID()) }
    } finally { submitting.current = false; setBusy(false) }
  }

  function printReceipt() {
    if (!createdSale) return
    const popup = window.open('', 'nazareth-receipt', 'width=420,height=720')
    if (!popup) return
    popup.document.write(receiptMarkup({
      saleNumber: createdSale.id, items: createdSale.items.map((item) => ({ ...item, qty: item.quantity, price: item.unitPrice })),
      summary: createdSale, payment: paymentNames[createdSale.paymentMethod],
      cash: createdSale.cashReceived, change: createdSale.change,
    }))
    popup.document.close()
    popup.focus()
    popup.print()
  }
  function keyDown(event) {
    if (event.key === 'Escape' && !busy) close()
    if (event.key !== 'Tab') return
    const elements = [...dialog.current.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled)')]
      .filter(element => !element.closest('[hidden]'))
    if (event.shiftKey && (document.activeElement === elements[0] || document.activeElement === dialog.current)) { event.preventDefault(); elements.at(-1)?.focus() }
    else if (!event.shiftKey && document.activeElement === elements.at(-1)) { event.preventDefault(); elements[0]?.focus() }
  }

  if (createdSale) return <div className="drawer-backdrop"><section className="sale-drawer pos-v2" role="dialog" aria-modal="true" aria-label="Venta registrada" ref={dialog} tabIndex={-1} onKeyDown={keyDown}>
    <div className="sale-success premium-success"><span><Check/></span><p className="eyebrow">Venta registrada</p><h2>{currency(createdSale.total)}</h2><p>El stock se actualizó y el movimiento quedó guardado en caja.</p>
      <small>Registrada el {formatSaleCreatedAt(createdSale.createdAt).date} a las {formatSaleCreatedAt(createdSale.createdAt).time}</small>
      <div className="success-receipt"><div><span>Venta</span><strong>#{createdSale.id}</strong></div><div><span>Pago</span><strong>{paymentNames[createdSale.paymentMethod]}</strong></div><div><span>Unidades</span><strong>{createdSale.items.reduce((sum, item) => sum + item.quantity, 0)}</strong></div></div>
      <div className="success-actions">{receipt && <button onClick={printReceipt}><ReceiptText/>Imprimir comprobante</button>}<button className="primary" onClick={close}>Volver a ventas <ArrowRight/></button></div>
    </div>

  </section></div>

  return <div className="drawer-backdrop"><section className="sale-drawer pos-v2" role="dialog" aria-modal="true" aria-labelledby="sale-title" ref={dialog} tabIndex={-1} onKeyDown={keyDown}>
    <header className="pos-header"><div><p className="eyebrow">Punto de venta · Caja principal</p><h2 id="sale-title">Registrar venta</h2></div><div className="pos-progress"><span className={phonePayment ? '' : 'active'} aria-current={phoneProducts ? 'step' : undefined}><i>1</i>Productos</span><em/><span className={phonePayment || (!phone && cart.length) ? 'active' : ''} aria-current={phonePayment ? 'step' : undefined}><i>2</i>Cobro</span><em/><span><i>3</i>Confirmación</span></div><button className="icon-btn" disabled={busy} onClick={close} aria-label="Cerrar venta"><X/></button></header>
    <div className="drawer-grid pos-grid" ref={grid}>
      <section className="catalog pos-catalog" aria-label="Catálogo de productos" hidden={phonePayment}><div className="pos-tools"><label className="search"><Search/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Busca por nombre, categoría o código" aria-label="Buscar producto en el catálogo"/></label></div>
        <div className="pos-categories">{categories.map((item) => <button className={category === item ? 'active' : ''} onClick={() => setCategory(item)} key={item}>{item}</button>)}</div>
        <div className="catalog-meta"><div><p className="eyebrow">Catálogo</p><h3 ref={catalogHeading} tabIndex={phoneProducts ? -1 : undefined}>{countLabel(visible.length, 'producto', 'productos')}</h3></div><span>Precios con IGV incluido</span></div>
        {catalogLoading ? <Skeleton/> : catalogError ? <div><p className="form-error" role="alert">{catalogError}</p><button className="secondary" onClick={() => setRefresh((value) => value + 1)}>Reintentar</button></div> :
          !visible.length ? <EmptyState icon={<ShoppingBasket/>} title="Sin productos" copy="Revisa el catálogo o cambia la búsqueda."/> :
          <div className="catalog-grid pos-products">{visible.map((product) => {
            const inCart = cart.find((item) => item.id === product.id)
            const full = quantityUnits(inCart?.qty ?? 0) + 100 > decimalUnits(product.stock)
            return <button key={product.id} onClick={() => add(product)} disabled={Boolean(reservation) || busy || product.stock <= 0 || Boolean(inCart && full)} className={inCart ? 'selected' : ''}>
              <span className="product-letter">{product.imageUrl?<img className="catalog-thumb" src={product.imageUrl} alt=""/>:product.name[0]}</span><div><strong>{product.name}</strong><small>{product.category} · <b>{quantityLabel(product.stock, product.unit)}</b></small></div><b>{currency(quote?.items.find((item) => item.productId === product.id)?.unitPrice ?? product.price)}</b><span className="add-product">{inCart ? <Check/> : <Plus/>}</span>
            </button>
          })}</div>}
      </section>
      <form className="checkout-panel" hidden={phoneProducts} onSubmit={confirmSale} aria-busy={busy}>
        <div className="checkout-scroll">
        {phonePayment && !reservation && <button className="secondary mobile-sale-back" type="button" disabled={busy}
          onClick={() => setStep('products')}><ArrowLeft aria-hidden="true"/>Volver a productos</button>}
        <div className="checkout-top"><div><p className="eyebrow">Nueva venta</p><h3 ref={stepHeading} tabIndex={phonePayment ? -1 : undefined}>Detalle del pedido</h3></div><span>{quote ? countLabel(quote.units, 'unidad', 'unidades') : '— unidades'}</span></div>
        <button type="button" className="customer-select" disabled={busy || Boolean(reservation)} onClick={() => setChoosingCustomer((value) => !value)} aria-expanded={choosingCustomer}><UserRound/><div><span>Cliente</span><strong>{customer?.name || 'Venta sin cliente'}</strong></div><ChevronDown/></button>
        {choosingCustomer && <div className="sale-customer-search"><label className="search"><Search/><input aria-label="Buscar cliente registrado" placeholder="Nombre, correo o teléfono" value={customerQuery} onChange={(event) => setCustomerQuery(event.target.value)}/></label>
          <button className="text-btn" type="button" onClick={() => chooseCustomer(null)}>Continuar sin cliente</button>
          {searching && <small role="status">Buscando…</small>}{customerError && <p className="form-error" role="alert">{customerError}</p>}
          {!searching && customerQuery.trim() && !customers.length && !customerError && <small>No se encontraron clientes.</small>}
          {customers.map((item) => <button className="secondary" type="button" key={item.id} onClick={() => chooseCustomer(item)}>{item.name} · {item.phone || item.email}</button>)}
        </div>}
        <div className="ticket-lines pos-lines">{cart.length ? cart.map((item) => <article key={item.id}>
          <span className="line-thumb">{item.name[0]}</span><div><strong>{item.name}</strong><small>{currency(quote?.items.find((line) => line.productId === item.id)?.unitPrice ?? item.price)} / {item.unit}</small></div>
          <DecimalInput label={'Cantidad de ' + item.name} value={item.qty} onChange={(value) => quantity(item.id, value)} minUnits={1} maxUnits={decimalUnits(products.find((product) => product.id === item.id)?.stock ?? item.stock)} disabled={busy || Boolean(reservation)}/>
          <b>{quoteCurrent ? currency(quote.items.find((line) => line.productId === item.id)?.subtotal ?? 0) : '—'}</b>
          <button className="trash" type="button" disabled={busy || Boolean(reservation)} aria-label={'Retirar ' + item.name} onClick={() => { changed(); setCart((current) => current.filter((product) => product.id !== item.id)) }}><Trash2/></button>
        </article>) : <div className="empty-cart"><ShoppingBasket/><strong>La venta está vacía</strong><span>Selecciona productos del catálogo para comenzar.</span></div>}</div>
        <div className="discount-row"><Tag/><span>Descuento</span><AmountInput aria-label="Descuento de la venta en soles" min="0" max={quote?.subtotal ?? '9999999999.99'} step="0.01" inputMode="decimal" value={discount} disabled={busy} onChange={(event) => { changed(); setDiscount(event.target.value) }} placeholder="S/ 0.00"/></div>
        {benefits.length > 0 && <label className="sale-benefit-select">Beneficio de fidelización
          <select value={benefitId ?? ''} disabled={busy} onChange={event => {
            changed()
            setSelectedBenefit(event.target.value)
            setVerified(false)
          }}>
            <option value="">Sin beneficio</option>
            {benefits.map((benefit, index) => <option value={benefit.id} key={benefit.id}>
              {currency(benefit.discount)} de descuento{benefits.length > 1 ? ` · Beneficio ${index + 1}` : ''}
            </option>)}
          </select>
          <small>Para compras desde {currency(loyalty.minimum)} antes del beneficio.</small>
        </label>}
        {benefitError && <p className="form-error" role="alert">{benefitError}</p>}
        {quoteError && <p className="form-error" role="alert">{quoteError}</p>}
        <div className="price-summary" aria-live="polite"><div><span>Subtotal</span><strong>{quoteCurrent ? currency(quote.subtotal) : '—'}</strong></div>{quoteCurrent && quote.discount > (quote.loyaltyDiscount ?? 0) && <div className="discount"><span>Descuento</span><strong>− {currency(quote.discount - (quote.loyaltyDiscount ?? 0))}</strong></div>}{quoteCurrent && quote.loyaltyDiscount > 0 && <div className="discount"><span>Beneficio de fidelización</span><strong>− {currency(quote.loyaltyDiscount)}</strong></div>}</div>
        <div className="payment-studio">
          <div className="ticket-pay pos-pay"><span>Método de pago</span><div>
            <button type="button" className={pay === 'efectivo' ? 'active' : ''} disabled={busy}
              aria-pressed={pay === 'efectivo'} onClick={() => selectPay('efectivo')}><Banknote/><span>Efectivo</span></button>
            <button type="button" className={pay !== 'efectivo' ? 'active' : ''} disabled={busy}
              aria-pressed={pay !== 'efectivo'} onClick={() => { if (pay === 'efectivo') selectPay('') }}>
              <WalletCards/><span>Yape, Plin y otras billeteras digitales</span>
            </button>
          </div></div>
          {pay === 'efectivo' ? <div className="cash-studio"><div className="quick-cash"><span>Pago rápido</span><div>{quickCashSuggestions(quote?.total).map((amount) => <button type="button" disabled={busy || !quoteCurrent} key={amount} onClick={() => { changed(); setCash(String(amount)) }}>S/ {amount}</button>)}</div></div>
            <div className="cash-input premium-cash"><label>Monto recibido<AmountInput value={cash} disabled={busy} onChange={(event) => { changed(); setCash(event.target.value) }} min="0" max={MONEY_MAX_UNITS / 100} step="0.01" inputMode="decimal" placeholder="S/ 0.00" required/></label><div><span>Vuelto para el cliente</span><strong>{quoteCurrent && payment.ready ? currency((decimalUnits(cash, { maxUnits: MONEY_MAX_UNITS }) - decimalUnits(quote.total, { maxUnits: MONEY_MAX_UNITS })) / 100) : '—'}</strong></div></div>
          </div> : <div className="digital-payment">
            <figure className="payment-demo">
              <div className="payment-demo-heading">
                <img className="payment-brand" src="/payment/yape.png" alt="Yape"/>
                <img className="payment-brand" src="/payment/plin.png" alt="Plin"/>
                <strong>Pago digital</strong>
              </div>
              <img className="payment-qr" src="/qr-pago-digital.svg" alt="Código QR"/>
            </figure>
            <label className="digital-wallet-field">Billetera utilizada
              <select value={pay} disabled={busy} required onChange={event => {
                changed(); setPay(event.target.value); setVerified(false)
              }}>
                <option value="">Selecciona la billetera</option>
                {digitalPaymentMethods.map(method => <option key={method} value={method}>{paymentNames[method]}</option>)}
              </select>
            </label>
            <label>Importe recibido<AmountInput min="0" max={MONEY_MAX_UNITS / 100} step="0.01" required disabled={busy} value={cash} onChange={(event) => { changed(); setCash(event.target.value); setVerified(false) }}/></label>
            <label className="access-toggle"><input type="checkbox" checked={verified} disabled={busy} onChange={(event) => { changed(); setVerified(event.target.checked) }}/><span>He comprobado el abono y el importe recibido</span></label>
          </div>}
          <button type="button" className={'receipt-toggle ' + (receipt ? 'active' : '')} disabled={busy} onClick={() => setReceipt((value) => !value)}><ReceiptText/><div><strong>Emitir comprobante</strong><span>Ticket de venta al confirmar</span></div><i>{receipt ? <Check/> : null}</i></button>
          <div className={'payment-status ' + (payment.ready ? 'ready' : 'pending')}><ShieldCheck/><div><strong>{payment.ready ? 'Datos de pago listos' : 'Completa el cobro'}</strong><span>{payment.message}</span></div></div>
        </div>
        {error && <p className="form-error" role="alert">{error}</p>}
        </div>
        <footer className="checkout-footer">
        <div className="grand-total" aria-live="polite"><span>Total a cobrar</span><strong>{quoteCurrent ? currency(quote.total) : '—'}</strong></div>
        <button disabled={busy || !cart.length || !quoteCurrent || invalidCart || !payment.ready} className="confirm pos-confirm" type="submit"><span>{busy ? 'Guardando…' : 'Confirmar venta'}</span><strong>{quoteCurrent ? currency(quote.total) : '—'}</strong><i><ArrowRight/></i></button><small className="checkout-help">Al confirmar, se guarda la venta y su salida de inventario.</small>
        </footer>
      </form>
    </div>
    {phoneProducts && <footer className="mobile-sale-next">
      <div aria-live="polite"><span>Total a cobrar</span><strong>{quoteCurrent ? currency(quote.total) : '—'}</strong></div>
      <button type="button" className="primary" disabled={!cart.length || busy} onClick={() => setStep('payment')}>
        Ir a cobro <ArrowRight aria-hidden="true"/>
      </button>
    </footer>}
  </section></div>
}

