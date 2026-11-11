import { heldSql } from '../services/stockService.js'
import { priceSql } from '../services/priceService.js'
export const Product = {
  async list(db) {
    const { rows } = await db.query(
      `SELECT p.id, p.name, p.unit, ${priceSql()} AS sale_price,p.sale_price AS regular_price, (p.current_stock-${heldSql()}) AS current_stock, p.current_stock AS physical_stock, ${heldSql()} AS held_stock,p.image_url, c.name AS category ` +
      'FROM nazareth.products AS p JOIN nazareth.categories AS c ON c.id = p.category_id ' +
      'WHERE p.is_active ORDER BY p.name',
    )
    return rows.map((product) => ({
      ...product,
      sale_price: Number(product.sale_price),
      current_stock: Number(product.current_stock),
    }))
  },
}
