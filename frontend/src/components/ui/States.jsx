export function Skeleton({rows=4}){return <div className="skeleton" aria-label="Cargando">{Array.from({length:rows},(_,i)=><i key={i}/>)}</div>}
export function EmptyState({icon,title,copy,action}){return <div className="empty-state">{icon}<h3>{title}</h3><p>{copy}</p>{action}</div>}
