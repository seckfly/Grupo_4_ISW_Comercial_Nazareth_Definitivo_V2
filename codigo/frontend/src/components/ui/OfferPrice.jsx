import { currency } from '../../utils/format'

export default function OfferPrice({ regularPrice, price, unit }) {
  const discounted = regularPrice != null && Number(regularPrice) > Number(price)
  return <span className="offer-price">
    {discounted && <del aria-label={'Precio anterior ' + currency(regularPrice)}>{currency(regularPrice)}</del>}
    <strong aria-label={discounted ? 'Precio actual ' + currency(price) : undefined}>{currency(price)}</strong>
    {unit && <span className="offer-price-unit"> / {unit}</span>}
  </span>
}
