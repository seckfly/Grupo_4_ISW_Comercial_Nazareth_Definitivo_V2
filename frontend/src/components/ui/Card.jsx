export function Card({children,className=''}){return <section className={`card ${className}`}>{children}</section>}
export function SectionLabel({children}){return <p className="eyebrow">{children}</p>}
export function StockPill({stock}){const level=stock<5?'critical':stock<10?'warning':'ok';return <span className={`stock ${level}`}><i/>{stock} unid.</span>}
