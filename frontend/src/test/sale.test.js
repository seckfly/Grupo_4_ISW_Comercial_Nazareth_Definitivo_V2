import { describe,expect,it } from 'vitest'
import { buildSaleRecord,cartSummary,filterSaleProducts,formatSaleCreatedAt,paymentState,quickCashSuggestions,receiptMarkup } from '../utils/sale.js'
import { products } from './fixtures/mockData.js'

describe('sale checkout logic',()=>{
  it('calculates subtotal, discount and total',()=>expect(cartSummary([{price:4.8,qty:2},{price:10.5,qty:1}],2)).toEqual({units:3,subtotal:20.1,discount:2,total:18.1}))
  it('calculates cash change without returning negative values',()=>expect(cartSummary([{price:4.8,qty:1}],0,10).change).toBe(5.2))
  it('finds products by name, category or sku',()=>expect(filterSaleProducts(products,'beb-003').map(p=>p.name)).toEqual(['Inca Kola 1.5 L']))
  it('requires enough cash before confirming',()=>expect(paymentState('efectivo',4.8,4)).toEqual({ready:false,message:'Faltan S/ 0.80'}))
  it('acepta importe digital exacto y confirmación manual',()=>expect(paymentState('yape',14.5,'14.50',true).ready).toBe(true))
  it('exige la comprobación manual del abono',()=>expect(paymentState('plin',14.5,'14.50',false).ready).toBe(false))
  it('offers practical cash amounts without values below the total',()=>expect(quickCashSuggestions(17.1)).toEqual([20,50,100]))
  it('uses the exact total as the first option when it is already practical',()=>expect(quickCashSuggestions(20)).toEqual([20,50,100]))
  it('builds a printable receipt with items and payment details',()=>{
    const html=receiptMarkup({saleNumber:'00185',items:[{name:'Arroz Costeño 1 kg',qty:2,price:4.8}],summary:{subtotal:9.6,discount:0,total:9.6},payment:'Efectivo',cash:10,change:.4})
    expect(html).toContain('COMERCIAL NAZARETH')
    expect(html).toContain('Arroz Costeño 1 kg')
    expect(html).toContain('S/ 9.60')
  })
  it('keeps the exact creation instant and formats it in Lima',()=>{
    const createdAt='2026-08-28T01:22:08.000Z'
    const sale=buildSaleRecord({id:185,items:'Arroz Costeño 1 kg',pay:'Yape',total:4.8,createdAt})
    expect(sale.createdAt).toBe(createdAt)
    expect(formatSaleCreatedAt(sale.createdAt)).toEqual({date:'27 de agosto de 2026',time:'20:22:08'})
  })
})
