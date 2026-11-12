export const campaignPriceSql = (product = 'p', promotion = 'pr') => `CASE ${promotion}.discount_type
  WHEN 'percentage' THEN ROUND(${product}.sale_price * (100 - ${promotion}.discount_value) / 100, 2)
  ELSE GREATEST(0, ${product}.sale_price - ${promotion}.discount_value) END`

// Promotions never stack. Lowest applicable registered price wins.
export const priceSql = (alias = 'p') => `LEAST(${alias}.sale_price, COALESCE((
  SELECT MIN(${campaignPriceSql(alias)}) FROM nazareth.promotions pr
  WHERE pr.product_id = ${alias}.id AND pr.status = 'active'
  AND statement_timestamp() BETWEEN pr.start_date AND pr.end_date), ${alias}.sale_price))`
