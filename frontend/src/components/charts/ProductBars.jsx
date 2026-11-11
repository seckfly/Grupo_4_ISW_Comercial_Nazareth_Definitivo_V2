import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts'

function labelLines(name) {
  const words = String(name).match(/\S{1,19}/g) || ['']
  return words.reduce((lines, word) => {
    const last = lines.length - 1
    if (last >= 0 && `${lines[last]} ${word}`.length <= 19) lines[last] += ` ${word}`
    else lines.push(word)
    return lines
  }, [])
}

function ProductTick({ x, y, payload }) {
  const lines = labelLines(payload.value)
  return <text x={x - 8} y={y} textAnchor="end" fill="#4f584f" fontSize={12}>
    <title>{payload.value}</title>
    {lines.map((line, index) => <tspan x={x - 8} dy={index === 0 ? -((lines.length - 1) * 8) + 4 : 16} key={index}>{line}</tspan>)}
  </text>
}

export default function ProductBars({ data }) {
  const rowHeight = Math.max(48, ...data.map((item) => labelLines(item.name).length * 16 + 12))
  return <div className="product-bars"><ResponsiveContainer width="100%" height={Math.max(270, data.length * rowHeight)}>
    <BarChart data={data} layout="vertical" margin={{ top: 8, right: 12, bottom: 8, left: 0 }}>
      <XAxis type="number" hide/>
      <YAxis dataKey="name" type="category" width={148} axisLine={false} tickLine={false} interval={0} tick={<ProductTick/>}/>
      <Tooltip/>
      <Bar dataKey="sold" name="Unidades vendidas" fill="#274c38" radius={[0, 7, 7, 0]} maxBarSize={26}/>
    </BarChart>
  </ResponsiveContainer></div>
}
