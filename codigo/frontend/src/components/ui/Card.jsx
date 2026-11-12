import { stockLevel, quantityLabel } from '../../utils/format'

export function Card({children,className=''}){return <section className={`card ${className}`}>{children}</section>}
export function SectionLabel({children}){return <p className="eyebrow">{children}</p>}
export function StockPill({stock,minimum,isActive=true,unit='unid.'}) {
  let level = 'ok'
  if (minimum === undefined) level = stockLevel(stock)
  else if (isActive && stock <= minimum) level = stock < minimum ? 'critical' : 'warning'
  return <span className={`stock ${level}`}><i/>{quantityLabel(stock, unit)}</span>
}

