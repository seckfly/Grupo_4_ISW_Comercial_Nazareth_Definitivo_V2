import { inputError, positiveId } from '../../../shared/numbers.mjs'
import { loyalty } from '../../../shared/loyalty.mjs'
import { customerForUser } from './customerService.js'
import { transaction } from './stockService.js'

const uuid = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i
const benefitFields = `id, discount_amount::float8 AS discount, points_cost AS "pointsCost",
  claimed_at AS "claimedAt", sale_id AS "saleId",
  CASE WHEN sale_id IS NOT NULL THEN 'used' WHEN cancelled_at IS NOT NULL THEN 'cancelled' ELSE 'available' END AS status`

export function benefitId(value) {
  if (typeof value !== 'string' || !uuid.test(value)) throw inputError('El beneficio no es válido')
  return value.toLowerCase()
}

export async function customerBenefits(db, id, availableOnly = false) {
  const { rows } = await db.query(`SELECT ${benefitFields} FROM nazareth.loyalty_benefits
    WHERE customer_id = $1 AND (NOT $2 OR (sale_id IS NULL AND cancelled_at IS NULL))
    ORDER BY claimed_at DESC, id`, [positiveId(id), availableOnly])
  return rows
}

export async function loyaltyAccount(db, userId) {
  const customer = await customerForUser(db, userId, { includeBenefits: true })
  return { ...customer, reward: loyalty }
}

export async function claimBenefit(pool, userId, requestId) {
  const id = benefitId(requestId)
  return transaction(pool, async db => {
    const customer = await customerForUser(db, userId)
    await db.query('SELECT pg_advisory_xact_lock(71244, $1)', [customer.id])
    const account = await loyaltyAccount(db, userId)
    if (account.benefits.some(benefit => benefit.id === id)) return account
    if (account.points < loyalty.points) throw inputError('Aún no tienes suficientes puntos para reclamar el beneficio', 409)
    const { rowCount } = await db.query(`INSERT INTO nazareth.loyalty_benefits (id, customer_id, points_cost, discount_amount)
      VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO NOTHING`, [id, customer.id, loyalty.points, loyalty.discount])
    if (!rowCount) throw inputError('La solicitud ya se utilizó', 409)
    return loyaltyAccount(db, userId)
  })
}

export async function cancelBenefit(pool, userId, id) {
  id = benefitId(id)
  return transaction(pool, async db => {
    const customer = await customerForUser(db, userId)
    await db.query('SELECT pg_advisory_xact_lock(71244, $1)', [customer.id])
    const { rowCount } = await db.query(`UPDATE nazareth.loyalty_benefits SET cancelled_at = COALESCE(cancelled_at, now())
      WHERE id = $1 AND customer_id = $2 AND sale_id IS NULL`, [id, customer.id])
    if (!rowCount) throw inputError('El beneficio ya no está disponible', 409)
    return loyaltyAccount(db, userId)
  })
}

export async function availableBenefit(db, customerId, id, lock = false) {
  if (customerId == null) throw inputError('Selecciona al cliente titular del beneficio')
  const { rows: [benefit] } = await db.query(`SELECT ${benefitFields} FROM nazareth.loyalty_benefits
    WHERE id = $1 AND customer_id = $2 AND sale_id IS NULL AND cancelled_at IS NULL
    ${lock ? 'FOR UPDATE' : ''}`, [id, customerId])
  if (!benefit) throw inputError('El beneficio ya no está disponible para este cliente', 409)
  return benefit
}
