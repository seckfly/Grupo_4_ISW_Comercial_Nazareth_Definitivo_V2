import { useEffect, useRef } from 'react'
import { Minus, Plus } from 'lucide-react'
import { decimalUnits, decimalText, QUANTITY_MAX_UNITS } from '../../../../shared/numbers.mjs'

export default function DecimalInput({ value, onChange, label, name, signed = false, minUnits = signed ? -QUANTITY_MAX_UNITS : 0, maxUnits = QUANTITY_MAX_UNITS, disabled = false }) {
  const input = useRef(null)
  let units
  let error = ''
  try {
    units = decimalUnits(value, { signed, label })
    if (units < minUnits || units > maxUnits) error = `${label} está fuera del rango disponible`
  } catch (failure) { error = failure.message }
  useEffect(() => { input.current?.setCustomValidity(error) }, [error])

  function canMove(direction) {
    const current = units ?? 0
    const next = current + direction * 100
    return (next >= minUnits && next <= maxUnits) || (direction < 0 && current > maxUnits) || (direction > 0 && current < minUnits)
  }
  function move(direction) {
    if (canMove(direction)) onChange(decimalText((units ?? 0) + direction * 100))
  }
  function keyDown(event) {
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      event.preventDefault()
      move(event.key === 'ArrowUp' ? 1 : -1)
    }
  }

  return <div className="qty decimal-stepper">
    <button type="button" disabled={disabled || !canMove(-1)} onClick={() => move(-1)} aria-label={'Restar 1 a ' + label}><Minus/></button>
    <input ref={input} type="text" inputMode="decimal" role="spinbutton" name={name} aria-label={label}
      aria-valuemin={minUnits / 100} aria-valuemax={maxUnits / 100} aria-valuenow={units === undefined ? undefined : units / 100}
      value={value} onChange={(event) => onChange(event.target.value)} onKeyDown={keyDown} disabled={disabled} required/>
    <button type="button" disabled={disabled || !canMove(1)} onClick={() => move(1)} aria-label={'Sumar 1 a ' + label}><Plus/></button>
  </div>
}
