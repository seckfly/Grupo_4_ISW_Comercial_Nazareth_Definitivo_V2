export default function AmountInput(props) {
  return <input {...props} className="amount-input" type="number" inputMode="decimal" onKeyDown={(event) => {
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') event.preventDefault()
  }}/>
}
