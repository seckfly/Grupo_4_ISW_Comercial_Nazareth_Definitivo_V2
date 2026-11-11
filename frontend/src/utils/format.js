export const currency = (value) => new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(value)
export const formatStoreDateTime = (value = new Date()) => {
  const dateText = new Intl.DateTimeFormat('es-PE', { timeZone: 'America/Lima', weekday: 'long', day: 'numeric', month: 'long' }).format(value)
  const time = new Intl.DateTimeFormat('es-PE', { timeZone: 'America/Lima', hour: 'numeric', minute: '2-digit', hour12: true }).format(value)
  const date = dateText.charAt(0).toUpperCase() + dateText.slice(1)
  const [weekday] = date.split(',')
  const shortDate = new Intl.DateTimeFormat('es-PE', { timeZone: 'America/Lima', day: '2-digit', month: 'short' }).format(value).replace('.', '').replace('-', ' ').toUpperCase()
  return { date, time, weekday, shortDate }
}
export const margin = (cost, price) => price ? Math.round(((price - cost) / price) * 100) : 0
export const stockLevel = (stock) => stock < 5 ? 'critical' : stock < 10 ? 'warning' : 'ok'
