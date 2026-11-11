// Promotions never stack. Lowest applicable registered price wins.
export const priceSql = (alias='p') => `LEAST(${alias}.sale_price,COALESCE((SELECT MIN(
  CASE pr.discount_type WHEN 'percentage' THEN ROUND(${alias}.sale_price*(100-pr.discount_value)/100,2)
  ELSE GREATEST(0,${alias}.sale_price-pr.discount_value) END)
  FROM nazareth.promotions pr WHERE pr.product_id=${alias}.id AND pr.status='active'
  AND statement_timestamp()>=pr.start_date AND statement_timestamp()<=pr.end_date),${alias}.sale_price))`
