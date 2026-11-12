export function filterCatalog(products, query = '', category = 'Todos') {
  const needle = query.trim().toLocaleLowerCase('es')
  return products.filter((product) => {
    const inCategory = category === 'Todos' || product.category === category
    const searchable = `${product.name} ${product.category}`.toLocaleLowerCase('es')
    return inCategory && (!needle || searchable.includes(needle))
  })
}

export function toggleCatalogItem(items, id) {
  return items.includes(id) ? items.filter((item) => item !== id) : [...items, id]
}

export function createReservation(products,customer){
  const total=Number(products.reduce((sum,product)=>sum+Number(product.price),0).toFixed(2))
  const token=Math.random().toString(36).slice(2,6).toUpperCase().padEnd(4,'0')
  return {code:`NZ-${token}`,customer,items:products.length,total,status:'Pendiente de confirmación'}
}
