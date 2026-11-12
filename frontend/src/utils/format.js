export const currency = (value) => new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(value)
export const countLabel = (value, singular, plural) => `${value} ${Number(value) === 1 ? singular : plural}`
export const quantityLabel = (value, unit) => {
  const units = { Unidad: ['Unidad', 'Unidades'], unidad: ['unidad', 'unidades'], Paquete: ['Paquete', 'Paquetes'], paquete: ['paquete', 'paquetes'] }
  const forms = units[unit]
  return `${value} ${forms ? forms[Math.abs(Number(value)) === 1 ? 0 : 1] : unit}`
}
export const formatStoreDateTime = (value = new Date()) => {
  const dateText = new Intl.DateTimeFormat('es-PE', { timeZone: 'America/Lima', weekday: 'long', day: 'numeric', month: 'long' }).format(value)
  const time = new Intl.DateTimeFormat('es-PE', { timeZone: 'America/Lima', hour: 'numeric', minute: '2-digit', hour12: true }).format(value)
  const date = dateText.charAt(0).toUpperCase() + dateText.slice(1)
  const [weekday] = date.split(',')
  const shortDate = new Intl.DateTimeFormat('es-PE', { timeZone: 'America/Lima', day: '2-digit', month: 'short' }).format(value).replace('.', '').replace('-', ' ').toUpperCase()
  return { date, time, weekday, shortDate }
}
export const formatHourRange = hour => {
  if (hour === null || hour === undefined || hour === '') return null
  const start = Number(hour)
  if (!Number.isInteger(start) || start < 0 || start > 23) return null
  const end = (start + 1) % 24
  return `${String(start).padStart(2, '0')}:00–${String(end).padStart(2, '0')}:00`
}
export const margin = (cost, price) => price ? Math.round(((price - cost) / price) * 100) : 0
export const stockLevel = (stock) => stock < 5 ? 'critical' : stock < 10 ? 'warning' : 'ok'
