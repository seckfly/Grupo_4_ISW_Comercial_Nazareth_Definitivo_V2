import { useState } from 'react'
import { currency } from '../../utils/format'
import { Card } from '../../components/ui/Card'

const statusLabel = { available: 'Disponible', used: 'Utilizado', cancelled: 'Cancelado' }

export default function LoyaltyBenefits({ account, busy, error, onClaim, onCancel }) {
  const [confirming, setConfirming] = useState(false)
  const { points, reward, benefits } = account
  const remaining = Math.max(0, reward.points - points)

  return <Card className="account-loyalty">
    <h3>Mis puntos y beneficios</h3>
    <p>{reward.points} puntos equivalen a {currency(reward.discount)} de descuento. Puedes usarlo en tienda en compras desde {currency(reward.minimum)} antes de aplicar el beneficio.</p>
    <p>Acumulas un punto por cada sol entero pagado. Puedes usar el beneficio en compras con promociones.</p>
    <progress aria-label="Avance hacia el próximo beneficio" value={Math.min(points, reward.points)} max={reward.points}/>
    <p>{remaining ? `Te faltan ${remaining} puntos para reclamar un beneficio.` : 'Ya puedes reclamar tu beneficio.'}</p>
    {confirming && remaining === 0 ? <div className="account-benefit-actions">
      <p>Se reservarán {reward.points} puntos hasta que uses el descuento o canceles el beneficio.</p>
      <button type="button" className="primary" disabled={busy} onClick={async () => {
        if (await onClaim()) setConfirming(false)
      }}>Confirmar canje de {reward.points} puntos</button>
      <button type="button" className="secondary" disabled={busy} onClick={() => setConfirming(false)}>Volver</button>
    </div> : <button type="button" className="primary" disabled={busy || remaining > 0} onClick={() => setConfirming(true)}>
      Reclamar {currency(reward.discount)} con {reward.points} puntos
    </button>}
    {error && <p className="form-error" role="alert">{error}</p>}
    {benefits.length > 0 && <ul className="account-benefits" aria-label="Historial de beneficios">
      {benefits.map(benefit => <li key={benefit.id}>
        <div><strong>{currency(benefit.discount)} de descuento</strong><span>{statusLabel[benefit.status]} · {benefit.pointsCost} puntos</span></div>
        {benefit.status === 'available' && <button className="secondary" type="button" disabled={busy}
          onClick={() => onCancel(benefit.id)}>Cancelar y recuperar puntos</button>}
      </li>)}
    </ul>}
  </Card>
}
