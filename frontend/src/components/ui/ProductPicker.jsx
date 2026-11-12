import { useEffect, useId, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'

export default function ProductPicker({ productId, query, products, disabled, onSearch, onChoose }) {
  const input = useRef(null)
  const resultsId = useId()
  const [view, setView] = useState(null)
  const term = query.trim().toLocaleLowerCase('es')
  const needsSelection = !productId && Boolean(query)
  const matches = view === 'all' ? products : products.filter(product => product.name.toLocaleLowerCase('es').includes(term))

  useEffect(() => {
    input.current?.setCustomValidity(needsSelection ? 'Selecciona un producto de la lista.' : '')
  }, [needsSelection])

  return <div className="product-picker" onBlur={event => {
    if (!event.currentTarget.contains(event.relatedTarget)) setView(null)
  }} onKeyDown={event => {
    if (event.key === 'Escape' && view) {
      event.stopPropagation()
      setView(null)
      input.current?.focus()
    }
  }}>
    <div className="product-picker-controls">
      <label>Producto<input ref={input} type="search" required autoComplete="off"
        placeholder="Escribe el nombre del producto" value={query} disabled={disabled}
        onFocus={event => { if (productId) event.currentTarget.select() }}
        onChange={event => {
          onSearch(event.target.value)
          setView(event.target.value.trim() ? 'search' : null)
        }}/></label>
      <button type="button" className="secondary product-picker-browse" disabled={disabled}
        aria-expanded={view === 'all'} aria-controls={resultsId}
        onClick={() => setView(view === 'all' ? null : 'all')}>
        Ver productos <ChevronDown aria-hidden="true"/>
      </button>
    </div>
    <div id={resultsId} hidden={!view}>
      {view && (matches.length > 0
        ? <ul className="product-picker-results" aria-label={view === 'all' ? 'Todos los productos' : 'Productos encontrados'}>
          {matches.map(product => <li key={product.id}>
            <button type="button" disabled={disabled} onMouseDown={event => event.preventDefault()} onClick={() => {
              onChoose(product)
              setView(null)
              input.current?.focus()
            }}>{product.name}</button>
          </li>)}
        </ul>
        : <p className="product-picker-empty" role="status">{view === 'all' ? 'Aún no hay productos registrados.' : 'No encontramos ese producto.'}</p>)}
    </div>
  </div>
}
